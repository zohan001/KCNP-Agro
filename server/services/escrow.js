/**
 * ============================================
 * Escrow Service
 * ============================================
 * The rules that keep both sides honest. Money moves in exactly one
 * direction — platform -> farmer — and only when a delivery has been
 * accounted for.
 *
 *   awaiting_payment -> paid_in_escrow -> dispatched -> delivered -> released
 *                                                 \-> disputed -> resolved
 *
 * Two safeguards matter:
 *   1. The farmer never gets paid before the goods are confirmed to have
 *      reached the trader. No "trust me brother, I sent it".
 *   2. The farmer's money can never be frozen forever: if a buyer goes
 *      quiet after dispatch, the hold auto-releases after
 *      ESCROW_AUTO_RELEASE_DAYS (unless a dispute is open).
 */

const Order = require('../models/Order');
const config = require('../config');
const { logAudit } = require('../db/database');
const { notifyAdmins } = require('./notifications');

const STATUS_LABEL = {
    awaiting_payment: 'Awaiting payment',
    paid_in_escrow: 'Payment held in escrow',
    dispatched: 'Dispatched — in transit',
    delivered: 'Delivered — confirm receipt',
    released: 'Completed — funds released',
    disputed: 'Under dispute',
    cancelled: 'Cancelled',
    refunded: 'Refunded to buyer'
};

/** Terminal states — nothing further happens without admin action. */
const CLOSED_STATUSES = ['released', 'cancelled', 'refunded'];

const DISPATCH_METHODS = ['farrier', 'courier', 'pickup', 'other'];

class EscrowError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'EscrowError';
        this.status = status;
    }
}

/**
 * Round to 2 decimals, avoiding float drift like 10.005000000000002.
 *
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Work out what everyone gets.
 *
 * @param {number} unitPrice
 * @param {number} quantity
 * @returns {{total: number, platformFee: number, farmerPayout: number}}
 */
function computeTotals(unitPrice, quantity) {
    const price = round2(unitPrice);
    const qty = round2(quantity);
    const total = round2(price * qty);
    const percent = Math.min(Math.max(Number(config.escrow.platformFeePercent) || 0, 0), 100);
    const platformFee = round2((total * percent) / 100);
    return {
        total,
        platformFee,
        farmerPayout: round2(total - platformFee)
    };
}

/**
 * Human-friendly order reference, e.g. KCNP-8H3K2QD.
 *
 * @returns {string}
 */
function generateReference() {
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let tail = '';
    for (let i = 0; i < 7; i += 1) {
        tail += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return `KCNP-${tail}`;
}

/**
 * Auto-release date for a dispatch made now.
 *
 * @returns {Date}
 */
function autoReleaseDate() {
    const days = Math.max(parseInt(config.escrow.autoReleaseDays, 10) || 7, 1);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * The money is now held by the platform.
 *
 * @param {import('mongoose').Document} order
 * @param {Object} opts
 * @param {import('mongoose').Types.ObjectId|null} opts.by
 * @param {string} opts.provider
 * @param {string} [opts.reference]
 * @param {string} [opts.mpesaPhone]
 */
function holdFunds(order, { by = null, provider = 'manual', reference = '', mpesaPhone = '' } = {}) {
    if (order.status !== 'awaiting_payment') {
        throw new EscrowError(`Payment cannot be accepted while the order is "${STATUS_LABEL[order.status] || order.status}".`, 409);
    }
    const totals = computeTotals(order.item.unitPrice, order.quantity);
    order.payment = {
        ...order.payment,
        provider,
        reference,
        mpesaPhone,
        amountPaid: totals.total,
        paidAt: new Date()
    };
    order.total = totals.total;
    order.escrow = {
        ...order.escrow,
        heldAt: new Date(),
        platformFee: totals.platformFee,
        farmerPayout: totals.farmerPayout
    };
    order.status = 'paid_in_escrow';
    order.record('paid_in_escrow', {
        by,
        note: `KES ${totals.total.toFixed(2)} held by the platform. The farmer is paid once you confirm delivery.`
    });
}

/**
 * The seller reports the goods on the move.
 *
 * @param {import('mongoose').Document} order
 * @param {Object} opts
 * @param {import('mongoose').Types.ObjectId|null} opts.by
 * @param {string} opts.method
 * @param {string} [opts.carrierName]
 * @param {string} [opts.trackingCode]
 * @param {Date|null} [opts.expectedAt]
 * @param {string} [opts.notes]
 * @param {string} [opts.proofPhoto]
 */
function markDispatched(order, {
    by = null,
    method = 'other',
    carrierName = '',
    trackingCode = '',
    expectedAt = null,
    notes = '',
    proofPhoto = ''
} = {}) {
    if (order.status !== 'paid_in_escrow') {
        throw new EscrowError(`Only orders awaiting dispatch can be marked as sent (this one is "${STATUS_LABEL[order.status] || order.status}").`, 409);
    }
    if (!DISPATCH_METHODS.includes(method)) {
        throw new EscrowError('Choose how the goods are being delivered.');
    }
    if (method !== 'pickup' && !trackingCode.trim() && !carrierName.trim() && !proofPhoto) {
        throw new EscrowError('Add a tracking code, a carrier name, or a photo of the handover — the buyer needs something to check.');
    }
    const now = new Date();
    order.delivery = {
        ...order.delivery,
        method,
        carrierName: carrierName.trim(),
        trackingCode: trackingCode.trim(),
        dispatchedAt: now,
        expectedAt: expectedAt ? new Date(expectedAt) : null,
        notes: String(notes || '').slice(0, 500),
        proofPhoto,
        autoReleaseAt: autoReleaseDate()
    };
    order.status = 'dispatched';
    order.record('dispatched', {
        by,
        note: `Sent by ${method}${carrierName.trim() ? ` (${carrierName.trim()})` : ''}${trackingCode.trim() ? `, tracking ${trackingCode.trim()}` : ''}.`
    });
}

/**
 * The buyer says it arrived.
 *
 * @param {import('mongoose').Document} order
 * @param {Object} opts
 * @param {import('mongoose').Types.ObjectId|null} opts.by
 * @param {string} [opts.receivedBy]
 * @param {string} [opts.receiverPhone]
 * @param {string} [opts.notes]
 * @param {string} [opts.proofPhoto]
 */
function confirmDelivery(order, { by = null, receivedBy = '', receiverPhone = '', notes = '', proofPhoto = '' } = {}) {
    if (order.status !== 'dispatched') {
        throw new EscrowError(`This order cannot be confirmed as delivered yet (it is "${STATUS_LABEL[order.status] || order.status}").`, 409);
    }
    order.delivery = {
        ...order.delivery,
        deliveredAt: new Date(),
        receivedBy: String(receivedBy || '').slice(0, 120),
        receiverPhone: String(receiverPhone || '').slice(0, 40),
        notes: order.delivery.notes,
        proofPhoto: proofPhoto || order.delivery.proofPhoto
    };
    order.status = 'delivered';
    order.record('delivered', {
        by,
        note: receivedBy ? `Received by ${String(receivedBy).slice(0, 120)}.` : 'Buyer confirmed the goods arrived.'
    });
}

/**
 * Release the held money to the farmer. This is the only step that pays out.
 *
 * @param {import('mongoose').Document} order
 * @param {Object} opts
 * @param {import('mongoose').Types.ObjectId|null} opts.by
 * @param {string} [opts.payoutReference]
 * @param {string} [opts.note]
 * @param {boolean} [opts.automatic] - released by the auto-release sweep
 */
function releaseFunds(order, { by = null, payoutReference = '', note = '', automatic = false } = {}) {
    const releasable = ['delivered', 'dispatched'];
    if (!releasable.includes(order.status)) {
        throw new EscrowError(`Funds can only be released from an in-transit or delivered order (this one is "${STATUS_LABEL[order.status] || order.status}").`, 409);
    }
    if (order.status === 'dispatched' && !automatic && !(order.delivery.autoReleaseAt && order.delivery.autoReleaseAt.getTime() <= Date.now())) {
        throw new EscrowError('The buyer has not confirmed delivery yet, so the money stays held. You can confirm it yourself once the auto-release date passes.', 409);
    }
    const totals = computeTotals(order.item.unitPrice, order.quantity);
    const now = new Date();
    order.escrow = {
        ...order.escrow,
        heldAt: order.escrow.heldAt || order.payment.paidAt || now,
        releasedAt: now,
        releasedBy: by,
        platformFee: totals.platformFee,
        farmerPayout: totals.farmerPayout,
        farmerPayoutReference: String(payoutReference || '').slice(0, 120),
        payoutConfirmedAt: now
    };
    order.status = 'released';
    order.record('released', {
        by,
        note: note || `KES ${totals.farmerPayout.toFixed(2)} released to the farmer${automatic ? ' (automatic release after the delivery window)' : ''}.`
    });
}

/**
 * Freeze the order — nothing moves until an admin decides.
 *
 * @param {import('mongoose').Document} order
 * @param {Object} opts
 * @param {import('mongoose').Types.ObjectId|null} opts.by
 * @param {string} opts.reason
 * @param {boolean} [opts.admin]
 */
function openDispute(order, { by = null, reason = '', admin = false } = {}) {
    if (CLOSED_STATUSES.includes(order.status)) {
        throw new EscrowError(`A ${STATUS_LABEL[order.status].toLowerCase()} order cannot be disputed.`, 409);
    }
    if (order.status === 'disputed') {
        throw new EscrowError('This order is already under dispute.', 409);
    }
    if (String(reason).trim().length < 10) {
        throw new EscrowError('Tell us what went wrong in at least a sentence so an admin can judge it fairly.');
    }
    order.dispute = {
        ...order.dispute,
        reason: String(reason).slice(0, 1000),
        openedBy: by,
        openedAt: new Date()
    };
    const previous = order.status;
    order.status = 'disputed';
    order.record('dispute_opened', {
        by,
        note: `${admin ? 'Escalated by admin' : 'Dispute raised'} on a ${STATUS_LABEL[previous] || previous} order: ${String(reason).slice(0, 200)}`
    });
    return previous;
}

/**
 * Admin closes a dispute and decides where the money goes.
 *
 * @param {import('mongoose').Document} order
 * @param {Object} opts
 * @param {import('mongoose').Types.ObjectId|null} opts.by
 * @param {string} opts.resolution
 * @param {'release'|'refund'|'split'} opts.outcome
 * @param {number} [opts.splitPercentToFarmer]
 */
function resolveDispute(order, { by = null, resolution = '', outcome = 'release', splitPercentToFarmer = 50 } = {}) {
    if (order.status !== 'disputed') {
        throw new EscrowError('There is no open dispute on this order.', 409);
    }
    if (!['release', 'refund', 'split'].includes(outcome)) {
        throw new EscrowError('Choose whether to release, refund or split the money.');
    }
    if (String(resolution).trim().length < 5) {
        throw new EscrowError('Write a short note explaining the decision.');
    }
    const totals = computeTotals(order.item.unitPrice, order.quantity);
    const now = new Date();
    order.dispute = {
        ...order.dispute,
        resolution: String(resolution).slice(0, 1000),
        resolvedBy: by,
        resolvedAt: now
    };

    if (outcome === 'release' || outcome === 'split') {
        const percent = outcome === 'release' ? 100 : Math.min(Math.max(Number(splitPercentToFarmer), 0), 100);
        const payout = round2((totals.total * percent) / 100);
        order.escrow = {
            ...order.escrow,
            releasedAt: now,
            releasedBy: by,
            platformFee: outcome === 'release' ? totals.platformFee : round2(payout - (totals.total - totals.farmerPayout)),
            farmerPayout: outcome === 'release' ? totals.farmerPayout : payout,
            payoutConfirmedAt: now
        };
        order.status = 'released';
    } else {
        order.status = 'refunded';
        order.escrow = { ...order.escrow, releasedAt: null, farmerPayout: 0 };
    }

    order.record('dispute_resolved', {
        by,
        note: `${outcome === 'release' ? 'Released to farmer' : outcome === 'refund' ? 'Refunded to buyer' : `Split — ${round2(Number(splitPercentToFarmer))}% to farmer`}: ${String(resolution).slice(0, 200)}`
    });
}

/**
 * Cancel before any money is held.
 *
 * @param {import('mongoose').Document} order
 * @param {Object} opts
 * @param {import('mongoose').Types.ObjectId|null} opts.by
 * @param {string} [opts.note]
 */
function cancelOrder(order, { by = null, note = '' } = {}) {
    if (order.status !== 'awaiting_payment') {
        throw new EscrowError('Money is already held for this order. Raise a dispute instead so an admin can sort it out.', 409);
    }
    order.status = 'cancelled';
    order.record('cancelled', { by, note: note || 'Cancelled before payment.' });
}

/**
 * Release every order whose delivery window has closed with no dispute.
 * Called lazily from the list endpoints, so a quiet buyer cannot hold a
 * farmer's money hostage past the agreed window.
 *
 * @returns {Promise<number>} how many orders were released
 */
async function releaseOverdueOrders() {
    try {
        const due = await Order.find({
            status: 'dispatched',
            'delivery.autoReleaseAt': { $lte: new Date() }
        }).limit(100);

        let count = 0;
        for (const order of due) {
            try {
                releaseFunds(order, { by: null, automatic: true });
                await order.save();
                count += 1;
                await logAudit('ESCROW_AUTO_RELEASED', `${order.reference} released automatically after the delivery window`);
            } catch (err) {
                console.error('[Escrow] Auto-release failed for', order.reference, err.message);
            }
        }
        return count;
    } catch (err) {
        console.error('[Escrow] Overdue sweep failed:', err.message);
        return 0;
    }
}

/**
 * Remind admins about orders that need a human.
 *
 * @param {string} type
 * @param {string} message
 * @param {import('mongoose').Types.ObjectId} refId
 */
function alertAdmins(type, message, refId) {
    notifyAdmins({ type, message, refId }).catch((err) =>
        console.error('[Escrow] Admin notification failed:', err.message)
    );
}

/**
 * What this user can do with this order right now. Drives the buttons in
 * the UI so the page and the server can never disagree.
 *
 * @param {import('mongoose').Document} order
 * @param {Object} user
 * @returns {string[]}
 */
function nextActions(order, user) {
    if (!user) return [];
    const isBuyer = String(order.buyer) === String(user._id);
    const isSeller = String(order.seller) === String(user._id);
    const isAdmin = user.role === 'admin';

    if (isAdmin) {
        if (order.status === 'disputed') return ['resolve_dispute'];
        if (order.status === 'dispatched' && order.delivery.autoReleaseAt &&
            order.delivery.autoReleaseAt.getTime() <= Date.now()) return ['admin_release'];
        return [];
    }
    if (isBuyer) {
        switch (order.status) {
            case 'awaiting_payment': return ['pay'];
            case 'paid_in_escrow': return [];
            case 'dispatched': return ['confirm_received', 'dispute'];
            case 'delivered': return [];
            default: return [];
        }
    }
    if (isSeller) {
        switch (order.status) {
            case 'paid_in_escrow': return ['mark_dispatched'];
            case 'delivered': return ['acknowledge_payout'];
            default: return [];
        }
    }
    return [];
}

module.exports = {
    EscrowError,
    STATUS_LABEL,
    CLOSED_STATUSES,
    DISPATCH_METHODS,
    round2,
    computeTotals,
    generateReference,
    autoReleaseDate,
    holdFunds,
    markDispatched,
    confirmDelivery,
    releaseFunds,
    openDispute,
    resolveDispute,
    cancelOrder,
    releaseOverdueOrders,
    alertAdmins,
    nextActions
};