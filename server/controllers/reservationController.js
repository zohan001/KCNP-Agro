const Reservation = require('../models/Reservation');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const config = require('../config');
const escrow = require('../services/escrow');
const { logAudit } = require('../db/database');
const { classifyCrop } = require('./priceBoardController');

/**
 * ============================================
 * Reservation Controller — buy the next harvest
 * ============================================
 * A buyer reserves part of a listing's coming harvest and puts a deposit
 * into escrow. The farmer gets committed demand and money up front; the
 * buyer gets first call on the crop at an agreed price. The deposit and the
 * balance are ordinary escrow orders, so the protection the marketplace
 * already offers applies here too — this controller only manages the
 * agreement between the two escrow orders.
 *
 * States:
 *   proposed -> awaiting_deposit -> reserved -> fulfilled -> completed
 *                        \-> cancelled            \-> refunded / defaulted
 */

const ACTIVE_STATUSES = ['proposed', 'awaiting_deposit', 'reserved', 'fulfilled'];
const DEPOSIT_HELD_STATUSES = ['paid_in_escrow', 'dispatched', 'delivered', 'released'];

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}

function cropOf(text) {
    const crop = classifyCrop(text);
    return crop ? { key: crop.key, label: crop.label } : { key: 'other', label: 'Other' };
}

function refId(value) {
    return value && value._id ? String(value._id) : String(value);
}

function presentReservation(reservation, viewer) {
    const isBuyer = viewer && refId(reservation.buyer) === String(viewer._id);
    const isSeller = viewer && refId(reservation.seller) === String(viewer._id);
    const party = (user) => (user && user.name
        ? { _id: user._id, name: user.name, rating: user.rating || null }
        : { _id: user });
    return {
        _id: reservation._id,
        listing: reservation.listing,
        cropKey: reservation.cropKey,
        cropLabel: reservation.cropLabel,
        item: reservation.item,
        quantity: reservation.quantity,
        totalValue: reservation.totalValue,
        depositPercent: reservation.depositPercent,
        depositAmount: reservation.depositAmount,
        balanceAmount: reservation.balanceAmount,
        harvestWindowStart: reservation.harvestWindowStart,
        harvestWindowEnd: reservation.harvestWindowEnd,
        terms: reservation.terms || '',
        status: reservation.status,
        depositOrder: reservation.depositOrder || null,
        finalOrder: reservation.finalOrder || null,
        expiresAt: reservation.expiresAt,
        buyer: party(reservation.buyer),
        seller: party(reservation.seller),
        yourRole: isBuyer ? 'buyer' : isSeller ? 'seller' : 'observer',
        isBuyer,
        isSeller,
        actions: nextActions(reservation, viewer),
        timeline: reservation.timeline,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt
    };
}

/**
 * What the viewer can do with this reservation right now. Drives the UI
 * buttons so the page and the server cannot disagree.
 */
function nextActions(reservation, user) {
    if (!user) return [];
    const isBuyer = refId(reservation.buyer) === String(user._id);
    const isSeller = refId(reservation.seller) === String(user._id);
    const isAdmin = user.role === 'admin';
    if (isAdmin) {
        return ['reserved', 'fulfilled'].includes(reservation.status) ? ['resolve'] : [];
    }
    if (isBuyer) {
        switch (reservation.status) {
            case 'proposed': return ['cancel'];
            case 'awaiting_deposit': return ['pay_deposit', 'cancel'];
            case 'fulfilled': return ['pay_balance'];
            default: return [];
        }
    }
    if (isSeller) {
        switch (reservation.status) {
            case 'proposed': return ['accept', 'decline'];
            case 'reserved': return ['fulfil'];
            default: return [];
        }
    }
    return [];
}

/**
 * Bring reservation status in line with the escrow orders that carry its
 * money. Called lazily on read so a deposit paid through the normal order
 * flow is reflected here without any cross-controller coupling.
 */
async function reconcile(reservations) {
    if (!reservations.length) return reservations;
    const ids = reservations.map((r) => r._id);
    let orders = [];
    try {
        orders = await Order.find({ reservation: { $in: ids } }).select('reservation purpose status payment');
    } catch (err) {
        return reservations;
    }
    const deposit = {};
    const balance = {};
    orders.forEach((o) => {
        if (o.purpose === 'deposit') deposit[refId(o.reservation)] = o;
        else if (o.purpose === 'balance') balance[refId(o.reservation)] = o;
    });

    const saves = [];
    reservations.forEach((r) => {
        if (typeof r.record !== 'function') return;
        const d = deposit[String(r._id)];
        if (r.status === 'awaiting_deposit' && d && DEPOSIT_HELD_STATUSES.includes(d.status)) {
            r.status = 'reserved';
            r.depositPaidAt = (d.payment && d.payment.paidAt) || new Date();
            r.record('deposit_paid', { note: 'Deposit received into escrow. The harvest is reserved.' });
            if (typeof r.save === 'function') saves.push(r.save());
        }
        const b = balance[String(r._id)];
        if (r.status === 'fulfilled' && b && b.status === 'released') {
            r.status = 'completed';
            r.completedAt = new Date();
            r.record('completed', { note: 'Balance paid and delivery confirmed. Deal closed.' });
            if (typeof r.save === 'function') saves.push(r.save());
        }
    });
    await Promise.all(saves).catch(() => {});
    return reservations;
}

/**
 * POST /api/products/:id/reserve — a buyer asks to reserve the next harvest.
 * @route POST /api/products/:id/reserve
 *   { quantity, unitPrice?, depositPercent?, harvestWindowStart?, harvestWindowEnd?, terms? }
 */
async function createReservation(req, res) {
    const quantity = toNumber(req.body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Enter how much you want to reserve.' });
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product || !product.active) {
            return res.status(404).json({ success: false, message: 'That listing is no longer available.' });
        }
        if (!product.seller) {
            return res.status(400).json({ success: false, message: 'This listing has no seller attached, so a reservation cannot be made.' });
        }
        if (String(product.seller) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot reserve your own listing.' });
        }

        let unitPrice = product.price;
        if (req.body.unitPrice !== undefined && req.body.unitPrice !== null && String(req.body.unitPrice).trim() !== '') {
            unitPrice = toNumber(req.body.unitPrice);
        }
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            return res.status(400).json({ success: false, message: 'Agree a price per unit for the reservation.' });
        }

        let depositPercent = config.escrow.reservationDepositPercent;
        if (req.body.depositPercent !== undefined && req.body.depositPercent !== null && String(req.body.depositPercent).trim() !== '') {
            depositPercent = toNumber(req.body.depositPercent);
        }
        if (!Number.isFinite(depositPercent) || depositPercent < 0 || depositPercent > 100) {
            return res.status(400).json({ success: false, message: 'The deposit must be between 0% and 100%.' });
        }

        const existing = await Reservation.findOne({
            listing: product._id,
            buyer: req.user._id,
            status: { $in: ACTIVE_STATUSES }
        });
        if (existing) {
            return res.status(409).json({ success: false, message: 'You already have an active reservation on this listing.' });
        }

        const parseDate = (value) => {
            if (!value) return null;
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        };

        const totals = escrow.computeTotals(unitPrice, quantity);
        const depositAmount = escrow.round2((totals.total * depositPercent) / 100);
        const balanceAmount = escrow.round2(totals.total - depositAmount);
        const crop = cropOf(`${product.title} ${product.description || ''}`);
        const expiryDays = Math.max(parseInt(config.escrow.reservationExpiryDays, 10) || 7, 1);

        const reservation = await Reservation.create({
            listing: product._id,
            buyer: req.user._id,
            seller: product.seller,
            cropKey: crop.key,
            cropLabel: crop.label,
            item: {
                title: product.title,
                unit: product.unit || 'unit',
                unitPrice: escrow.round2(unitPrice),
                image: product.image || ''
            },
            quantity: escrow.round2(quantity),
            totalValue: totals.total,
            depositPercent,
            depositAmount,
            balanceAmount,
            harvestWindowStart: parseDate(req.body.harvestWindowStart),
            harvestWindowEnd: parseDate(req.body.harvestWindowEnd),
            terms: String(req.body.terms || '').slice(0, 1000),
            expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
            timeline: [{
                action: 'proposed',
                by: req.user._id,
                note: `Reserve ${escrow.round2(quantity)} ${product.unit || 'unit'} at KES ${escrow.round2(unitPrice).toFixed(2)} each; ${depositPercent}% deposit (KES ${depositAmount.toFixed(2)}).`
            }]
        });

        await logAudit('RESERVATION_PROPOSED', `${req.user.email} wants to reserve ${reservation.quantity} ${reservation.item.unit} of "${product.title}"`);

        return res.status(201).json({
            success: true,
            message: 'Reservation proposed. The farmer will accept or decline — money only moves once you both agree.',
            data: { reservation: presentReservation(reservation, req.user) }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'That listing could not be found.' });
        }
        console.error('[Reservation] Create failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to propose the reservation.' });
    }
}

/**
 * GET /api/reservations/mine?role=buyer|seller — reservations on either side.
 * @route GET /api/reservations/mine
 */
async function listMyReservations(req, res) {
    try {
        const role = String(req.query.role || 'buyer').toLowerCase();
        const filter = role === 'seller' ? { seller: req.user._id } : { buyer: req.user._id };
        const reservations = await Reservation.find(filter)
            .populate('buyer', 'name rating')
            .populate('seller', 'name rating')
            .sort({ createdAt: -1 })
            .limit(100);
        await reconcile(reservations);
        return res.status(200).json({
            success: true,
            role,
            count: reservations.length,
            data: reservations.map((r) => presentReservation(r, req.user))
        });
    } catch (err) {
        console.error('[Reservation] List mine failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load your reservations.' });
    }
}

/**
 * GET /api/products/:id/reservations — proposals on my listing (owner/admin).
 * @route GET /api/products/:id/reservations
 */
async function listReservationsForListing(req, res) {
    try {
        const product = await Product.findById(req.params.id).select('seller title');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        const isOwner = String(product.seller) === String(req.user._id);
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the farmer can see reservations on this listing.' });
        }
        const reservations = await Reservation.find({ listing: product._id })
            .populate('buyer', 'name rating')
            .populate('seller', 'name rating')
            .sort({ createdAt: -1 })
            .limit(100);
        await reconcile(reservations);
        return res.status(200).json({ success: true, count: reservations.length, data: reservations.map((r) => presentReservation(r, req.user)) });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        console.error('[Reservation] List for listing failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load reservations.' });
    }
}

/**
 * GET /api/reservations/:id — one reservation (buyer, seller or admin).
 * @route GET /api/reservations/:id
 */
async function getReservation(req, res) {
    try {
        const reservation = await Reservation.findById(req.params.id)
            .populate('buyer', 'name rating')
            .populate('seller', 'name rating');
        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        const allowed = req.user.role === 'admin' ||
            refId(reservation.buyer) === String(req.user._id) ||
            refId(reservation.seller) === String(req.user._id);
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'You are not part of this reservation.' });
        }
        await reconcile([reservation]);
        return res.status(200).json({ success: true, data: { reservation: presentReservation(reservation, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        console.error('[Reservation] Get failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load the reservation.' });
    }
}

/**
 * POST /api/reservations/:id/accept — the farmer agrees, opening the deposit
 * escrow order.
 * @route POST /api/reservations/:id/accept
 */
async function acceptReservation(req, res) {
    try {
        const reservation = await Reservation.findOne({ _id: req.params.id, seller: req.user._id });
        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        if (reservation.status !== 'proposed') {
            return res.status(409).json({ success: false, message: `This reservation is already ${reservation.status}.` });
        }

        const depositOrder = await Order.create({
            reference: escrow.generateReference(),
            product: reservation.listing,
            reservation: reservation._id,
            purpose: 'deposit',
            item: {
                title: `Deposit (${reservation.depositPercent}%) — ${reservation.item.title}`,
                unit: 'deposit',
                unitPrice: reservation.depositAmount,
                image: reservation.item.image || ''
            },
            quantity: 1,
            total: reservation.depositAmount,
            buyer: reservation.buyer,
            seller: reservation.seller,
            status: 'awaiting_payment',
            payment: { provider: 'none' },
            timeline: [{
                action: 'placed',
                by: req.user._id,
                note: `Deposit to reserve ${reservation.quantity} ${reservation.item.unit} at KES ${reservation.item.unitPrice.toFixed(2)} each.`
            }]
        });

        reservation.depositOrder = depositOrder._id;
        reservation.status = 'awaiting_deposit';
        reservation.acceptedAt = new Date();
        reservation.record('accepted', { by: req.user._id, note: `Accepted. Deposit order ${depositOrder.reference} opened.` });
        await reservation.save();

        await logAudit('RESERVATION_ACCEPTED', `${req.user.email} accepted reservation ${reservation._id} -> deposit order ${depositOrder.reference}`);

        return res.status(200).json({
            success: true,
            message: 'Accepted. The buyer now pays the deposit into escrow to lock in the harvest.',
            data: { reservation: presentReservation(reservation, req.user), depositOrderId: depositOrder._id, depositReference: depositOrder.reference }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        console.error('[Reservation] Accept failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to accept the reservation.' });
    }
}

/**
 * POST /api/reservations/:id/decline — the farmer turns the proposal down.
 * @route POST /api/reservations/:id/decline
 */
async function declineReservation(req, res) {
    try {
        const reservation = await Reservation.findOne({ _id: req.params.id, seller: req.user._id });
        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        if (reservation.status !== 'proposed') {
            return res.status(409).json({ success: false, message: `This reservation is already ${reservation.status}.` });
        }
        reservation.status = 'cancelled';
        reservation.cancelledAt = new Date();
        reservation.record('declined', { by: req.user._id, note: 'Declined by the farmer.' });
        await reservation.save();
        return res.status(200).json({ success: true, message: 'Reservation declined.', data: { reservation: presentReservation(reservation, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        console.error('[Reservation] Decline failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to decline the reservation.' });
    }
}

/**
 * POST /api/reservations/:id/fulfil — the farmer hands the harvest over,
 * opening the balance escrow order.
 * @route POST /api/reservations/:id/fulfil
 */
async function fulfilReservation(req, res) {
    try {
        const reservation = await Reservation.findOne({ _id: req.params.id, seller: req.user._id });
        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        if (reservation.status !== 'reserved') {
            return res.status(409).json({ success: false, message: 'The buyer has not paid the deposit into escrow yet, so the harvest cannot be marked as delivered.' });
        }

        // A 100% deposit leaves no balance: the deal closes on hand-over.
        if (reservation.balanceAmount <= 0) {
            reservation.status = 'completed';
            reservation.completedAt = new Date();
            reservation.fulfilledAt = new Date();
            reservation.record('fulfilled', { by: req.user._id, note: 'Harvest delivered; deposit covered the full value.' });
            reservation.record('completed', { by: req.user._id, note: 'Reservation complete.' });
            await reservation.save();
            return res.status(200).json({ success: true, message: 'Reservation complete.', data: { reservation: presentReservation(reservation, req.user) } });
        }

        const finalOrder = await Order.create({
            reference: escrow.generateReference(),
            product: reservation.listing,
            reservation: reservation._id,
            purpose: 'balance',
            item: {
                title: `Balance — ${reservation.item.title}`,
                unit: reservation.item.unit,
                unitPrice: reservation.balanceAmount,
                image: reservation.item.image || ''
            },
            quantity: 1,
            total: reservation.balanceAmount,
            buyer: reservation.buyer,
            seller: reservation.seller,
            status: 'awaiting_payment',
            payment: { provider: 'none' },
            timeline: [{
                action: 'placed',
                by: req.user._id,
                note: `Balance on ${reservation.quantity} ${reservation.item.unit} reserved at KES ${reservation.item.unitPrice.toFixed(2)} each.`
            }]
        });

        reservation.finalOrder = finalOrder._id;
        reservation.status = 'fulfilled';
        reservation.fulfilledAt = new Date();
        reservation.record('fulfilled', { by: req.user._id, note: `Harvest handed over. Balance order ${finalOrder.reference} opened.` });
        await reservation.save();

        await logAudit('RESERVATION_FULFILLED', `${req.user.email} delivered reservation ${reservation._id} -> balance order ${finalOrder.reference}`);

        return res.status(200).json({
            success: true,
            message: 'Harvest recorded as delivered. The buyer now pays the balance into escrow.',
            data: { reservation: presentReservation(reservation, req.user), finalOrderId: finalOrder._id, finalReference: finalOrder.reference }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        console.error('[Reservation] Fulfil failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to record the delivery.' });
    }
}

/**
 * POST /api/reservations/:id/cancel — either side pulls out before any money
 * is held.
 * @route POST /api/reservations/:id/cancel
 */
async function cancelReservation(req, res) {
    try {
        const reservation = await Reservation.findOne({
            _id: req.params.id,
            $or: [{ buyer: req.user._id }, { seller: req.user._id }]
        });
        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        if (['reserved', 'fulfilled'].includes(reservation.status)) {
            return res.status(409).json({ success: false, message: 'A deposit is already held for this reservation. Ask an admin to resolve it instead.' });
        }
        if (!['proposed', 'awaiting_deposit'].includes(reservation.status)) {
            return res.status(409).json({ success: false, message: `This reservation is already ${reservation.status}.` });
        }
        reservation.status = 'cancelled';
        reservation.cancelledAt = new Date();
        reservation.record('cancelled', { by: req.user._id, note: 'Cancelled before any money was held.' });
        await reservation.save();
        return res.status(200).json({ success: true, message: 'Reservation cancelled.', data: { reservation: presentReservation(reservation, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        console.error('[Reservation] Cancel failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to cancel the reservation.' });
    }
}

/**
 * POST /api/reservations/:id/resolve — admin decides a stuck reservation.
 * @route POST /api/reservations/:id/resolve  { outcome: 'refund'|'defaulted'|'cancel', note }
 */
async function adminResolveReservation(req, res) {
    const outcome = String(req.body.outcome || '').toLowerCase();
    const map = { refund: 'refunded', defaulted: 'defaulted', cancel: 'cancelled', complete: 'completed' };
    if (!map[outcome]) {
        return res.status(400).json({ success: false, message: 'Choose an outcome: refund, defaulted, cancel or complete.' });
    }
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        reservation.status = map[outcome];
        if (reservation.status === 'completed') reservation.completedAt = new Date();
        if (reservation.status === 'cancelled') reservation.cancelledAt = new Date();
        const action = { refund: 'refunded', defaulted: 'defaulted', cancel: 'cancelled', complete: 'completed' }[outcome];
        reservation.record(action, {
            by: req.user._id,
            note: `Admin decision (${outcome}): ${String(req.body.note || '').slice(0, 300)}`
        });
        await reservation.save();
        await logAudit('RESERVATION_RESOLVED', `Reservation ${reservation._id} set to ${reservation.status} by ${req.user.email}`);
        return res.status(200).json({ success: true, message: `Reservation marked ${reservation.status}.`, data: { reservation: presentReservation(reservation, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }
        console.error('[Reservation] Resolve failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to resolve the reservation.' });
    }
}

module.exports = {
    createReservation,
    listMyReservations,
    listReservationsForListing,
    getReservation,
    acceptReservation,
    declineReservation,
    fulfilReservation,
    cancelReservation,
    adminResolveReservation
};
