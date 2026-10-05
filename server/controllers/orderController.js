const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const config = require('../config');
const daraja = require('../services/daraja');
const paystack = require('../services/paystack');
const escrow = require('../services/escrow');
const { logAudit } = require('../db/database');

const { EscrowError } = escrow;

/**
 * ============================================
 * Order Controller — escrow purchases
 * ============================================
 * A trader pays the platform, not the farmer. The money sits in escrow
 * until the trader confirms the goods landed. Only then is the farmer
 * paid. Every step is written to the order timeline so both sides — and
 * an admin — can see exactly what happened and when.
 */

/** Accept a browser-captured photo, downscaled client-side, as a data URL. */
function proofPhoto(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(raw)) {
        throw new EscrowError('The photo must be a PNG, JPG or WEBP image.');
    }
    const approxBytes = Math.floor(((raw.length - raw.indexOf(',') - 1) * 3) / 4);
    const max = config.escrow.deliveryProofMaxBytes;
    if (approxBytes > max) {
        throw new EscrowError(`That photo is too large (max ${Math.round(max / 1024 / 1024)}MB). Try again with a smaller photo.`);
    }
    return raw;
}

function toPlainNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Whether this user is allowed to see the order at all.
 */
function canView(order, user) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return String(order.buyer) === String(user._id) || String(order.seller) === String(user._id);
}

/**
 * Shape an order for the client, with the caller's permissions baked in.
 */
function present(order, user) {
    const isBuyer = String(order.buyer) === String(user._id);
    const isSeller = String(order.seller) === String(user._id);
    return {
        _id: order._id,
        reference: order.reference,
        status: order.status,
        statusLabel: escrow.STATUS_LABEL[order.status] || order.status,
        currency: order.currency,
        item: order.item,
        quantity: order.quantity,
        total: order.total,
        payment: {
            provider: order.payment.provider,
            reference: order.payment.reference,
            amountPaid: order.payment.amountPaid,
            paidAt: order.payment.paidAt,
            needsOtp: Boolean(order.payment.needsOtp),
            otpReference: order.payment.otpReference
        },
        delivery: order.delivery,
        escrow: order.escrow,
        dispute: order.dispute,
        timeline: order.timeline,
        buyer: order.buyer,
        seller: order.seller,
        // Never ship the other party's identity documents or raw ID fields.
        counterparty: isBuyer ? { _id: order.seller, role: 'farmer' } : { _id: order.buyer, role: 'trader' },
        yourRole: isBuyer ? 'buyer' : isSeller ? 'seller' : 'observer',
        actions: escrow.nextActions(order, user),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    };
}

/**
 * POST /api/orders — a trader raises an order for a listing.
 * @route POST /api/orders  { productId, quantity }
 */
async function createOrder(req, res) {
    const quantity = toPlainNumber(req.body.quantity, 0);
    if (quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Enter how many units you want to buy.' });
    }
    if (quantity > config.escrow.maxQuantity) {
        return res.status(400).json({
            success: false,
            message: `For orders above ${config.escrow.maxQuantity} units, please contact us directly.`
        });
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product || !product.active) {
            return res.status(404).json({ success: false, message: 'That listing is no longer available.' });
        }
        if (!product.price || product.price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'This item is priced on request. Contact the farmer directly instead.'
            });
        }
        if (product.seller && String(product.seller) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot buy your own listing.' });
        }
        if (!product.seller) {
            return res.status(400).json({
                success: false,
                message: 'This listing has no verified seller attached, so escrow cannot be used.'
            });
        }
        if (product.stock !== null && product.stock !== undefined && quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: product.stock > 0
                    ? `Only ${product.stock} ${product.unit} left in stock.`
                    : 'This listing is sold out.'
            });
        }

        const totals = escrow.computeTotals(product.price, quantity);
        const seller = await User.findById(product.seller).select('isActive role');
        if (!seller || !seller.isActive) {
            return res.status(400).json({ success: false, message: 'This seller is not available right now.' });
        }

        const order = await Order.create({
            reference: escrow.generateReference(),
            product: product._id,
            item: {
                title: product.title,
                unit: product.unit || 'unit',
                unitPrice: escrow.round2(product.price),
                image: product.image || ''
            },
            quantity: escrow.round2(quantity),
            total: totals.total,
            buyer: req.user._id,
            seller: product.seller,
            status: 'awaiting_payment',
            payment: { provider: 'none' },
            timeline: [{
                action: 'placed',
                by: req.user._id,
                note: `Order raised for ${escrow.round2(quantity)} ${product.unit || 'unit'} at KES ${escrow.round2(product.price).toFixed(2)} each.`
            }]
        });

        await logAudit('ORDER_PLACED', `${order.reference} KES ${order.total} ${req.user.email} -> seller ${product.seller}`);

        return res.status(201).json({
            success: true,
            message: 'Order created. Pay now and the money is held safe until your goods arrive.',
            data: { order: present(order, req.user) }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'That listing could not be found.' });
        }
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'We could not create the order. Please try again.' });
        }
        console.error('[Orders] Create failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create the order.' });
    }
}

/**
 * POST /api/orders/:id/pay — hand the money to escrow.
 * Provider order mirrors subscriptions: Paystack -> Daraja STK -> manual.
 * @route POST /api/orders/:id/pay  { phone }
 */
async function payOrder(req, res) {
    const phoneRaw = String(req.body.phone || '').trim();
    const digits = phoneRaw.replace(/[^0-9]/g, '');
    if (digits.length < 9) {
        return res.status(400).json({ success: false, message: 'Enter the M-Pesa number you will pay from.' });
    }

    try {
        const order = await Order.findOne({ _id: req.params.id, buyer: req.user._id });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        if (order.status !== 'awaiting_payment') {
            return res.status(409).json({ success: false, message: 'This order has already been paid.' });
        }

        order.record('payment_started', { by: req.user._id, note: `M-Pesa payment started from ${phoneRaw}.` });
        await order.save();

        // 1) Paystack — prompts M-Pesa directly.
        if (config.paystackConfigured()) {
            try {
                const reference = `ESC${order._id}${Date.now().toString().slice(-4)}`;
                const resp = await paystack.charge({
                    email: req.user.email,
                    amountKes: order.total,
                    phone: phoneRaw,
                    reference,
                    metadata: {
                        order: String(order._id),
                        reference: order.reference,
                        escrow: 'order'
                    }
                });
                const data = resp.data || {};
                const status = String(data.status || '').toLowerCase();

                if (status === 'success') {
                    escrow.holdFunds(order, { by: req.user._id, provider: 'paystack', reference, mpesaPhone: phoneRaw });
                    await order.save();
                    await logAudit('ESCROW_FUNDS_HELD', `${order.reference} KES ${order.total} held via Paystack ${reference}`);
                    return res.status(200).json({
                        success: true,
                        message: 'Payment received. Your money is held safely until you confirm the goods.',
                        data: { order: present(order, req.user) }
                    });
                }

                if (status === 'send_otp') {
                    order.payment.provider = 'paystack';
                    order.payment.reference = reference;
                    order.payment.needsOtp = true;
                    order.payment.otpReference = reference;
                    await order.save();
                    return res.status(200).json({
                        success: true,
                        needsOtp: true,
                        otpReference: reference,
                        message: data.display_text || 'Enter the OTP sent to your phone to release your money to escrow.',
                        data: { order: present(order, req.user) }
                    });
                }

                if (status === 'failed' || status === 'timeout') {
                    return res.status(402).json({ success: false, message: data.message || 'Payment could not be started. Please try again.' });
                }

                // Charge pending: the M-Pesa prompt is on the buyer's phone.
                return res.status(200).json({
                    success: true,
                    message: 'Approve the M-Pesa prompt on your phone. The money moves into escrow the moment it lands and never goes straight to the farmer.',
                    data: { order: present(order, req.user), paystack: { reference, status } }
                });
            } catch (err) {
                console.error('[Orders] Paystack charge failed:', err.message);
            }
        }

        // 2) Daraja STK push.
        if (config.mpesaConfigured()) {
            try {
                const resp = await daraja.stkPush(
                    phoneRaw,
                    order.total,
                    order.reference,
                    `Escrow ${order.reference}`
                );
                const accepted = resp && (String(resp.ResponseCode) === '0' || resp.ResponseCode === 0);
                if (accepted && resp.CheckoutRequestID) {
                    order.payment.provider = 'daraja';
                    order.payment.reference = String(resp.CheckoutRequestID);
                    order.payment.mpesaPhone = phoneRaw;
                    await order.save();
                    return res.status(200).json({
                        success: true,
                        message: 'M-Pesa prompt sent. Enter your PIN to complete it — the money is held by the platform until you receive the goods.',
                        data: { order: present(order, req.user) }
                    });
                }
            } catch (err) {
                console.error('[Orders] STK push failed:', err.message);
            }
        }

        // 3) Manual — an admin confirms the paybill transfer, then escrow
        //    holds the funds. Nothing is released until delivery either way.
        escrow.alertAdmins(
            'escrow_payment_pending',
            `Order ${order.reference}: KES ${order.total} claimed paid by ${req.user.email || req.user._id} from ${phoneRaw}. Confirm on the paybill to move it into escrow.`,
            order._id
        );
        order.payment.provider = 'manual';
        order.payment.mpesaPhone = phoneRaw;
        await order.save();

        return res.status(200).json({
            success: true,
            message: 'We will confirm your M-Pesa transfer, then hold the money safely until you receive the goods.',
            data: { order: present(order, req.user) }
        });
    } catch (err) {
        console.error('[Orders] Pay failed:', err.message);
        return res.status(500).json({ success: false, message: 'We could not start the payment. Please try again.' });
    }
}

/**
 * POST /api/orders/:id/otp — finish a Paystack OTP payment.
 * @route POST /api/orders/:id/otp  { otp }
 */
async function submitOrderOtp(req, res) {
    const { otp } = req.body;
    const reference = String(req.body.reference || '').trim();
    if (!otp) {
        return res.status(400).json({ success: false, message: 'Enter the OTP from your phone.' });
    }
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            buyer: req.user._id,
            'payment.otpReference': reference
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'That payment could not be found.' });
        }
        const resp = await paystack.submitOtp(reference, String(otp));
        const status = String((resp.data || {}).status || '').toLowerCase();

        if (status === 'success') {
            escrow.holdFunds(order, { by: req.user._id, provider: 'paystack', reference, mpesaPhone: order.payment.mpesaPhone });
            order.payment.needsOtp = false;
            await order.save();
            await logAudit('ESCROW_FUNDS_HELD', `${order.reference} KES ${order.total} held via Paystack OTP ${reference}`);
            return res.status(200).json({
                success: true,
                message: 'Payment confirmed. Your money is held safely until you confirm the goods.',
                data: { order: present(order, req.user) }
            });
        }
        if (status === 'failed' || status === 'timeout') {
            return res.status(402).json({ success: false, message: (resp.data || {}).message || 'Payment failed. Please try again.' });
        }
        return res.status(200).json({ success: true, message: 'Processing your payment.' });
    } catch (err) {
        console.error('[Orders] OTP failed:', err.message);
        return res.status(500).json({ success: false, message: 'Could not submit the OTP.' });
    }
}

/**
 * POST /api/orders/:id/dispatch — farmer reports the goods on the move.
 * @route POST /api/orders/:id/dispatch
 *   { method, carrierName, trackingCode, expectedAt, notes, proofPhoto }
 */
async function dispatchOrder(req, res) {
    try {
        const order = await Order.findOne({ _id: req.params.id, seller: req.user._id });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        const photo = proofPhoto(req.body.proofPhoto);

        escrow.markDispatched(order, {
            by: req.user._id,
            method: String(req.body.method || 'other'),
            carrierName: req.body.carrierName,
            trackingCode: req.body.trackingCode,
            expectedAt: req.body.expectedAt || null,
            notes: req.body.notes,
            proofPhoto: photo
        });

        // Reserve the stock now that the goods are committed to a buyer.
        if (typeof order.quantity === 'number') {
            await Product.updateOne(
                { _id: order.product, $expr: { $or: [{ $eq: ['$stock', null] }, { $gte: ['$stock', order.quantity] }] } },
                { $inc: { stock: -order.quantity } }
            );
        }

        await order.save();
        await logAudit('ORDER_DISPATCHED', `${order.reference} dispatched by ${req.user.email} (${order.delivery.method})`);
        return res.status(200).json({
            success: true,
            message: 'Dispatch recorded. The buyer has been asked to confirm when the goods arrive.',
            data: { order: present(order, req.user) }
        });
    } catch (err) {
        if (err instanceof EscrowError) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.error('[Orders] Dispatch failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to record the dispatch.' });
    }
}

/**
 * POST /api/orders/:id/confirm — buyer confirms receipt, which releases the
 * money to the farmer.
 * @route POST /api/orders/:id/confirm  { receivedBy, receiverPhone, proofPhoto }
 */
async function confirmOrder(req, res) {
    try {
        const order = await Order.findOne({ _id: req.params.id, buyer: req.user._id });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        const photo = proofPhoto(req.body.proofPhoto);

        escrow.confirmDelivery(order, {
            by: req.user._id,
            receivedBy: req.body.receivedBy,
            receiverPhone: req.body.receiverPhone,
            proofPhoto: photo
        });
        // Delivery is only ever recorded once a day so a double tap cannot
        // inflate the countdown.
        order.delivery.autoReleaseAt = order.delivery.autoReleaseAt || escrow.autoReleaseDate();
        escrow.releaseFunds(order, {
            by: req.user._id,
            note: 'Buyer confirmed the goods arrived, so the farmer was paid.'
        });
        await order.save();

        await logAudit('ESCROW_RELEASED', `${order.reference} KES ${order.total} released to farmer after buyer confirmation`);

        return res.status(200).json({
            success: true,
            message: 'Delivery confirmed. The farmer has been paid and your order is closed.',
            data: { order: present(order, req.user) }
        });
    } catch (err) {
        if (err instanceof EscrowError) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.error('[Orders] Confirm failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to confirm the delivery.' });
    }
}

/**
 * POST /api/orders/:id/dispute — freeze an order so an admin can judge it.
 * @route POST /api/orders/:id/dispute  { reason }
 */
async function disputeOrder(req, res) {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || !canView(order, req.user)) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        escrow.openDispute(order, { by: req.user._id, reason: req.body.reason });
        await order.save();
        escrow.alertAdmins(
            'order_dispute',
            `Dispute on ${order.reference} (${order.status === 'disputed' ? 'funds frozen' : ''}) raised by ${req.user.email}. Reason: ${String(req.body.reason).slice(0, 120)}`,
            order._id
        );
        await logAudit('ORDER_DISPUTED', `${order.reference} disputed by ${req.user.email}`);
        return res.status(200).json({
            success: true,
            message: 'Dispute raised. The money is frozen while an admin reviews both sides.',
            data: { order: present(order, req.user) }
        });
    } catch (err) {
        if (err instanceof EscrowError) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.error('[Orders] Dispute failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to raise the dispute.' });
    }
}

/**
 * GET /api/orders — everything I bought or sold.
 * @route GET /api/orders?role=buyer|seller|all&status=...
 */
async function listMyOrders(req, res) {
    try {
        // Close out anything whose delivery window has passed before reading.
        await escrow.releaseOverdueOrders();

        const role = String(req.query.role || 'all').toLowerCase();
        const filter = {};
        if (role === 'buyer') filter.buyer = req.user._id;
        else if (role === 'seller') filter.seller = req.user._id;
        else {
            filter.$or = [{ buyer: req.user._id }, { seller: req.user._id }];
        }
        if (req.query.status) filter.status = String(req.query.status);

        const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
        return res.status(200).json({
            success: true,
            data: orders.map((order) => present(order, req.user))
        });
    } catch (err) {
        console.error('[Orders] List failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load your orders.' });
    }
}

/**
 * GET /api/orders/:id — one order, with its full accountability trail.
 * @route GET /api/orders/:id
 */
async function getOrder(req, res) {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || !canView(order, req.user)) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        return res.status(200).json({ success: true, data: { order: present(order, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.error('[Orders] Get failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load the order.' });
    }
}

/**
 * GET /api/orders/admin/list — every order, for the admin dashboard.
 * @route GET /api/orders/admin/list?status=&needsAttention=1
 */
async function adminListOrders(req, res) {
    try {
        await escrow.releaseOverdueOrders();

        const filter = {};
        if (req.query.status) filter.status = String(req.query.status);
        if (req.query.needsAttention === '1') {
            filter.$or = [
                { status: 'disputed' },
                { status: 'awaiting_payment', 'payment.provider': 'manual' },
                { status: 'dispatched', 'delivery.autoReleaseAt': { $lte: new Date() } }
            ];
        }

        const orders = await Order.find(filter)
            .populate('buyer', 'name email')
            .populate('seller', 'name email')
            .sort({ createdAt: -1 })
            .limit(200);

        return res.status(200).json({
            success: true,
            data: orders.map((order) => {
                const plain = order.toObject();
                plain.statusLabel = escrow.STATUS_LABEL[plain.status] || plain.status;
                plain.actions = escrow.nextActions(plain, req.user);
                return plain;
            })
        });
    } catch (err) {
        console.error('[Orders] Admin list failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load orders.' });
    }
}

/**
 * POST /api/orders/:id/resolve — admin settles a dispute.
 * @route POST /api/orders/:id/resolve  { resolution, outcome, splitPercentToFarmer }
 */
async function adminResolveOrder(req, res) {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        escrow.resolveDispute(order, {
            by: req.user._id,
            resolution: req.body.resolution,
            outcome: req.body.outcome,
            splitPercentToFarmer: req.body.splitPercentToFarmer
        });
        await order.save();
        await logAudit('ORDER_RESOLVED', `${order.reference} settled as ${order.status} by ${req.user.email}`);
        return res.status(200).json({
            success: true,
            message: order.status === 'released'
                ? 'Settled. The farmer has been paid.'
                : 'Settled. The buyer has been refunded.',
            data: { order }
        });
    } catch (err) {
        if (err instanceof EscrowError) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.error('[Orders] Resolve failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to settle the order.' });
    }
}

/**
 * POST /api/orders/:id/release — admin releases an overdue order.
 * @route POST /api/orders/:id/release  { payoutReference }
 */
async function adminReleaseOrder(req, res) {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        escrow.releaseFunds(order, {
            by: req.user._id,
            payoutReference: req.body.payoutReference,
            automatic: false
        });
        await order.save();
        await logAudit('ORDER_RELEASED', `${order.reference} released manually by ${req.user.email}`);
        return res.status(200).json({
            success: true,
            message: 'Funds released to the farmer.',
            data: { order }
        });
    } catch (err) {
        if (err instanceof EscrowError) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.error('[Orders] Admin release failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to release the funds.' });
    }
}

/**
 * POST /api/orders/:id/hold — admin confirms a manual M-Pesa transfer and
 * moves it into escrow.
 * @route POST /api/orders/:id/hold  { reference }
 */
async function adminHoldOrder(req, res) {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        escrow.holdFunds(order, {
            by: req.user._id,
            provider: 'manual',
            reference: req.body.reference,
            mpesaPhone: order.payment.mpesaPhone
        });
        await order.save();
        await logAudit('ESCROW_FUNDS_HELD', `${order.reference} moved into escrow manually by ${req.user.email}`);
        return res.status(200).json({
            success: true,
            message: 'Payment confirmed and held in escrow.',
            data: { order }
        });
    } catch (err) {
        if (err instanceof EscrowError) {
            return res.status(err.status).json({ success: false, message: err.message });
        }
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.error('[Orders] Admin hold failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to hold the funds.' });
    }
}

module.exports = {
    createOrder,
    payOrder,
    submitOrderOtp,
    dispatchOrder,
    confirmOrder,
    disputeOrder,
    listMyOrders,
    getOrder,
    adminListOrders,
    adminResolveOrder,
    adminReleaseOrder,
    adminHoldOrder
};