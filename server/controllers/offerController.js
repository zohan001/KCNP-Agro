const Offer = require('../models/Offer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const escrow = require('../services/escrow');
const { logAudit } = require('../db/database');

/**
 * ============================================
 * Offer Controller — price negotiation
 * ============================================
 * An offer turns a listing's asking price into a conversation the
 * farmer can win. Several traders can bid on the same listing; the
 * farmer compares them and accepts one. Accepting creates an escrow
 * order at the agreed price, so the negotiation flows straight into
 * the protected payment rail that already exists.
 */

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}

function present(offer, viewer) {
    const isSeller = viewer && String(offer.seller) === String(viewer._id);
    const buyer = offer.buyer && offer.buyer.name
        ? { _id: offer.buyer._id || offer.buyer, name: offer.buyer.name }
        : { _id: offer.buyer };
    return {
        _id: offer._id,
        product: offer.product,
        item: offer.item,
        offerPrice: offer.offerPrice,
        quantity: offer.quantity,
        unit: offer.unit,
        message: offer.message || '',
        status: offer.status,
        order: offer.order || null,
        buyer,
        // Only the farmer needs to see who bid; a buyer sees their own offer.
        seller: isSeller ? undefined : offer.seller,
        respondedAt: offer.respondedAt,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt
    };
}

/**
 * POST /api/products/:id/offers — a buyer names a price and quantity.
 * @route POST /api/products/:id/offers  { offerPrice, quantity, message }
 */
async function createOffer(req, res) {
    const offerPrice = toNumber(req.body.offerPrice);
    const quantity = toNumber(req.body.quantity);

    if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
        return res.status(400).json({ success: false, message: 'Enter the price you are offering per unit.' });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Enter how many units you want to buy.' });
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product || !product.active) {
            return res.status(404).json({ success: false, message: 'That listing is no longer available.' });
        }
        if (!product.seller) {
            return res.status(400).json({ success: false, message: 'This listing has no verified seller attached.' });
        }
        if (String(product.seller) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot make an offer on your own listing.' });
        }

        const offer = await Offer.create({
            product: product._id,
            item: { title: product.title, unit: product.unit || 'unit' },
            seller: product.seller,
            buyer: req.user._id,
            offerPrice: escrow.round2(offerPrice),
            quantity: escrow.round2(quantity),
            unit: product.unit || 'unit',
            message: String(req.body.message || '').slice(0, 500)
        });

        await logAudit('OFFER_MADE', `${req.user.email} offered KES ${offer.offerPrice}/${offer.unit} x ${offer.quantity} on "${product.title}"`);

        return res.status(201).json({
            success: true,
            message: 'Offer sent. The farmer will see it next to any other bids.',
            data: { offer: present(offer, req.user) }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'That listing could not be found.' });
        }
        console.error('[Offers] Create failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to send your offer.' });
    }
}

/**
 * GET /api/products/:id/offers — the farmer's view of all bids on a listing.
 * Only the listing's seller (or an admin) may see competing offers.
 * @route GET /api/products/:id/offers
 */
async function listOffersForProduct(req, res) {
    try {
        const product = await Product.findById(req.params.id).select('seller title');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        const isOwner = req.user && String(product.seller) === String(req.user._id);
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the listing owner can see its offers.' });
        }

        const offers = await Offer.find({ product: product._id })
            .populate('buyer', 'name rating')
            .sort({ status: 1, offerPrice: -1, createdAt: -1 })
            .limit(100);

        return res.status(200).json({
            success: true,
            count: offers.length,
            data: offers.map((o) => present(o, req.user))
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        console.error('[Offers] List for product failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load offers.' });
    }
}

/**
 * GET /api/offers/mine — offers I made as a buyer.
 * @route GET /api/offers/mine
 */
async function listMyOffers(req, res) {
    try {
        const offers = await Offer.find({ buyer: req.user._id })
            .populate('seller', 'name rating')
            .sort({ createdAt: -1 })
            .limit(100);
        return res.status(200).json({ success: true, data: offers.map((o) => present(o, req.user)) });
    } catch (err) {
        console.error('[Offers] List mine failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load your offers.' });
    }
}

/**
 * GET /api/offers/received — offers received on my listings.
 * @route GET /api/offers/received?status=pending
 */
async function listReceivedOffers(req, res) {
    try {
        const filter = { seller: req.user._id };
        if (req.query.status) filter.status = String(req.query.status);

        const offers = await Offer.find(filter)
            .populate('buyer', 'name rating')
            .sort({ status: 1, offerPrice: -1, createdAt: -1 })
            .limit(100);
        return res.status(200).json({ success: true, data: offers.map((o) => present(o, req.user)) });
    } catch (err) {
        console.error('[Offers] List received failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load received offers.' });
    }
}

/**
 * POST /api/offers/:id/accept — the farmer accepts a bid and an escrow order
 * is opened at the agreed price, ready for the buyer to pay.
 * @route POST /api/offers/:id/accept
 */
async function acceptOffer(req, res) {
    try {
        const offer = await Offer.findOne({ _id: req.params.id, seller: req.user._id });
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        }
        if (offer.status !== 'pending') {
            return res.status(409).json({ success: false, message: `This offer is already ${offer.status}.` });
        }

        const product = await Product.findById(offer.product);
        if (!product || !product.active) {
            return res.status(409).json({ success: false, message: 'That listing is no longer available to sell.' });
        }
        if (product.stock !== null && product.stock !== undefined && offer.quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: product.stock > 0
                    ? `Only ${product.stock} ${product.unit} left in stock.`
                    : 'This listing is sold out.'
            });
        }

        const buyer = await User.findById(offer.buyer).select('isActive');
        if (!buyer || !buyer.isActive) {
            return res.status(400).json({ success: false, message: 'That buyer is no longer available.' });
        }

        const totals = escrow.computeTotals(offer.offerPrice, offer.quantity);
        const order = await Order.create({
            reference: escrow.generateReference(),
            product: product._id,
            item: {
                title: product.title,
                unit: product.unit || 'unit',
                unitPrice: escrow.round2(offer.offerPrice),
                image: product.image || ''
            },
            quantity: escrow.round2(offer.quantity),
            total: totals.total,
            buyer: offer.buyer,
            seller: offer.seller,
            status: 'awaiting_payment',
            payment: { provider: 'none' },
            timeline: [{
                action: 'placed',
                by: req.user._id,
                note: `Offer accepted: ${escrow.round2(offer.quantity)} ${product.unit || 'unit'} at KES ${escrow.round2(offer.offerPrice).toFixed(2)} each.`
            }]
        });

        offer.status = 'accepted';
        offer.order = order._id;
        offer.respondedAt = new Date();
        await offer.save();

        // Any other pending bids on the same listing are now moot.
        await Offer.updateMany(
            { product: product._id, status: 'pending', _id: { $ne: offer._id } },
            { $set: { status: 'declined', respondedAt: new Date() } }
        ).catch(() => {});

        await logAudit('OFFER_ACCEPTED', `${req.user.email} accepted an offer on "${product.title}" -> order ${order.reference}`);

        return res.status(200).json({
            success: true,
            message: `Accepted. ${buyer.name || 'The buyer'} now pays into escrow at the agreed price.`,
            data: { offer: present(offer, req.user), orderId: order._id, orderReference: order.reference }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        }
        console.error('[Offers] Accept failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to accept the offer.' });
    }
}

/**
 * POST /api/offers/:id/decline — the farmer turns a bid down.
 * @route POST /api/offers/:id/decline
 */
async function declineOffer(req, res) {
    try {
        const offer = await Offer.findOne({ _id: req.params.id, seller: req.user._id });
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        }
        if (offer.status !== 'pending') {
            return res.status(409).json({ success: false, message: `This offer is already ${offer.status}.` });
        }
        offer.status = 'declined';
        offer.respondedAt = new Date();
        await offer.save();
        return res.status(200).json({ success: true, message: 'Offer declined.', data: { offer: present(offer, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        }
        console.error('[Offers] Decline failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to decline the offer.' });
    }
}

/**
 * POST /api/offers/:id/withdraw — the buyer pulls their own bid.
 * @route POST /api/offers/:id/withdraw
 */
async function withdrawOffer(req, res) {
    try {
        const offer = await Offer.findOne({ _id: req.params.id, buyer: req.user._id });
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        }
        if (offer.status !== 'pending') {
            return res.status(409).json({ success: false, message: `This offer is already ${offer.status}.` });
        }
        offer.status = 'withdrawn';
        offer.respondedAt = new Date();
        await offer.save();
        return res.status(200).json({ success: true, message: 'Offer withdrawn.', data: { offer: present(offer, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        }
        console.error('[Offers] Withdraw failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to withdraw the offer.' });
    }
}

module.exports = {
    createOffer,
    listOffersForProduct,
    listMyOffers,
    listReceivedOffers,
    acceptOffer,
    declineOffer,
    withdrawOffer
};
