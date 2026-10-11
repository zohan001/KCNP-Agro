const Demand = require('../models/Demand');
const DemandResponse = require('../models/DemandResponse');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const escrow = require('../services/escrow');
const { logAudit } = require('../db/database');
const { classifyCrop } = require('./priceBoardController');

/**
 * ============================================
 * Demand Controller — the reverse marketplace
 * ============================================
 * The middleman's edge is knowing what the market wants before he
 * buys. A Demand lets a buyer say it out loud — crop, quantity and
 * price — so every farmer with that crop can answer. An accepted
 * answer becomes a normal escrow order, so the protection the
 * platform already offers applies to demand-led trades too.
 */

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}

function cropOf(text) {
    const crop = classifyCrop(text);
    return crop ? { key: crop.key, label: crop.label } : { key: 'other', label: 'Other' };
}

function presentDemand(demand, viewer, responseCount) {
    const isOwner = viewer && String(demand.buyer && demand.buyer._id ? demand.buyer._id : demand.buyer) === String(viewer._id);
    const buyer = demand.buyer && demand.buyer.name
        ? { _id: demand.buyer._id, name: demand.buyer.name, rating: demand.buyer.rating || null }
        : { _id: demand.buyer };
    return {
        _id: demand._id,
        cropKey: demand.cropKey,
        cropLabel: demand.cropLabel,
        title: demand.title,
        description: demand.description || '',
        quantity: demand.quantity,
        unit: demand.unit,
        targetPrice: demand.targetPrice,
        location: demand.location || '',
        neededBy: demand.neededBy,
        status: demand.status,
        order: demand.order || null,
        buyer,
        isOwner,
        responseCount: typeof responseCount === 'number' ? responseCount : undefined,
        createdAt: demand.createdAt,
        updatedAt: demand.updatedAt
    };
}

function presentResponse(response, viewer) {
    const isFarmer = viewer && String(response.farmer && response.farmer._id ? response.farmer._id : response.farmer) === String(viewer._id);
    const farmer = response.farmer && response.farmer.name
        ? { _id: response.farmer._id, name: response.farmer.name, rating: response.farmer.rating || null }
        : { _id: response.farmer };
    return {
        _id: response._id,
        demand: response.demand,
        supplyPrice: response.supplyPrice,
        quantity: response.quantity,
        unit: response.unit,
        message: response.message || '',
        status: response.status,
        order: response.order || null,
        farmer,
        isFarmer,
        respondedAt: response.respondedAt,
        createdAt: response.createdAt
    };
}

/** Attach response counts to a list of demands in one round trip. */
async function withResponseCounts(demands) {
    if (!demands.length) return [];
    const ids = demands.map((d) => d._id);
    const counts = await DemandResponse.aggregate([
        { $match: { demand: { $in: ids } } },
        { $group: { _id: '$demand', n: { $sum: 1 } } }
    ]).catch(() => []);
    const byId = {};
    counts.forEach((c) => { byId[String(c._id)] = c.n; });
    return demands.map((d) => presentDemand(d, null, byId[String(d._id)] || 0));
}

/**
 * POST /api/demands — a buyer says what they are looking for.
 * @route POST /api/demands  { title, description, quantity, unit, targetPrice, location, neededBy }
 */
async function createDemand(req, res) {
    const quantity = toNumber(req.body.quantity);
    const title = String(req.body.title || '').trim();
    if (!title) {
        return res.status(400).json({ success: false, message: 'Say what you are looking for.' });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Enter how much you need.' });
    }
    let targetPrice = null;
    if (req.body.targetPrice !== undefined && req.body.targetPrice !== null && String(req.body.targetPrice).trim() !== '') {
        targetPrice = toNumber(req.body.targetPrice);
        if (!Number.isFinite(targetPrice) || targetPrice < 0) {
            return res.status(400).json({ success: false, message: 'Enter a valid target price, or leave it blank.' });
        }
    }
    let neededBy = null;
    if (req.body.neededBy) {
        const d = new Date(req.body.neededBy);
        if (!isNaN(d.getTime())) neededBy = d;
    }

    try {
        const crop = cropOf(`${title} ${req.body.description || ''}`);
        const demand = await Demand.create({
            buyer: req.user._id,
            cropKey: crop.key,
            cropLabel: crop.label,
            title,
            description: String(req.body.description || '').slice(0, 1000),
            quantity: escrow.round2(quantity),
            unit: String(req.body.unit || 'unit').slice(0, 32),
            targetPrice: targetPrice === null ? null : escrow.round2(targetPrice),
            location: String(req.body.location || '').slice(0, 120),
            neededBy
        });

        await logAudit('DEMAND_POSTED', `${req.user.email} wants ${demand.quantity} ${demand.unit} of "${demand.title}"`);

        return res.status(201).json({
            success: true,
            message: 'Demand posted. Farmers with this crop can now answer you.',
            data: { demand: presentDemand(demand, req.user, 0) }
        });
    } catch (err) {
        console.error('[Demand] Create failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to post your demand.' });
    }
}

/**
 * GET /api/demands — public list of open demands.
 * @route GET /api/demands?crop=mango&location=kilifi&q=mango&status=open&page=1
 */
async function listDemands(req, res) {
    try {
        const filter = { status: 'open' };
        if (req.query.status && ['open', 'matched', 'closed', 'expired'].includes(String(req.query.status))) {
            filter.status = String(req.query.status);
        }
        if (req.query.crop) filter.cropKey = String(req.query.crop).toLowerCase();
        if (req.query.location) filter.location = { $regex: String(req.query.location).slice(0, 60), $options: 'i' };
        if (req.query.q) filter.$or = [
            { title: { $regex: String(req.query.q).slice(0, 60), $options: 'i' } },
            { description: { $regex: String(req.query.q).slice(0, 60), $options: 'i' } }
        ];

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

        const [demands, total] = await Promise.all([
            Demand.find(filter)
                .populate('buyer', 'name rating')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Demand.countDocuments(filter)
        ]);

        const withCounts = await withResponseCounts(demands);

        return res.status(200).json({
            success: true,
            count: withCounts.length,
            total,
            page,
            pages: Math.ceil(total / limit) || 1,
            data: withCounts
        });
    } catch (err) {
        console.error('[Demand] List failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load demands.' });
    }
}

/**
 * GET /api/demands/mine — demands I posted.
 * @route GET /api/demands/mine
 */
async function listMyDemands(req, res) {
    try {
        const demands = await Demand.find({ buyer: req.user._id })
            .populate('buyer', 'name rating')
            .sort({ createdAt: -1 })
            .limit(100);
        const withCounts = await withResponseCounts(demands);
        return res.status(200).json({ success: true, count: withCounts.length, data: withCounts });
    } catch (err) {
        console.error('[Demand] List mine failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load your demands.' });
    }
}

/**
 * GET /api/demands/matching — open demands whose crop matches a crop I sell.
 * Used by the farmer dashboard to surface work worth answering.
 * @route GET /api/demands/matching
 */
async function listMatchingDemands(req, res) {
    try {
        const products = await Product.find({ seller: req.user._id, active: true }).select('title description').limit(500).lean();
        const keys = new Set();
        products.forEach((p) => {
            const crop = classifyCrop(`${p.title} ${p.description || ''}`);
            if (crop) keys.add(crop.key);
        });
        if (!keys.size) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }
        const demands = await Demand.find({ status: 'open', cropKey: { $in: [...keys] } })
            .populate('buyer', 'name rating')
            .sort({ createdAt: -1 })
            .limit(50);
        const withCounts = await withResponseCounts(demands);
        return res.status(200).json({ success: true, count: withCounts.length, data: withCounts });
    } catch (err) {
        console.error('[Demand] List matching failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load matching demands.' });
    }
}

/**
 * GET /api/demands/:id — one demand. Responses are only shown to the owner.
 * @route GET /api/demands/:id
 */
async function getDemand(req, res) {
    try {
        const demand = await Demand.findById(req.params.id).populate('buyer', 'name rating');
        if (!demand) {
            return res.status(404).json({ success: false, message: 'Demand not found.' });
        }
        const isOwner = req.user && String(demand.buyer._id) === String(req.user._id);
        const isAdmin = req.user && req.user.role === 'admin';

        const count = await DemandResponse.countDocuments({ demand: demand._id });
        const data = presentDemand(demand, req.user, count);

        if (isOwner || isAdmin) {
            const responses = await DemandResponse.find({ demand: demand._id })
                .populate('farmer', 'name rating')
                .sort({ status: 1, supplyPrice: 1, createdAt: -1 })
                .limit(100);
            data.responses = responses.map((r) => presentResponse(r, req.user));
        }
        return res.status(200).json({ success: true, data: { demand: data } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Demand not found.' });
        }
        console.error('[Demand] Get failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load the demand.' });
    }
}

/**
 * POST /api/demands/:id/close — the buyer closes their own demand.
 * @route POST /api/demands/:id/close
 */
async function closeDemand(req, res) {
    try {
        const demand = await Demand.findOne({ _id: req.params.id, buyer: req.user._id });
        if (!demand) {
            return res.status(404).json({ success: false, message: 'Demand not found.' });
        }
        if (demand.status === 'closed') {
            return res.status(200).json({ success: true, message: 'Demand already closed.', data: { demand: presentDemand(demand, req.user) } });
        }
        demand.status = 'closed';
        demand.closedAt = new Date();
        await demand.save();
        await DemandResponse.updateMany(
            { demand: demand._id, status: 'pending' },
            { $set: { status: 'declined', respondedAt: new Date() } }
        ).catch(() => {});
        return res.status(200).json({ success: true, message: 'Demand closed.', data: { demand: presentDemand(demand, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Demand not found.' });
        }
        console.error('[Demand] Close failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to close the demand.' });
    }
}

/**
 * POST /api/demands/:id/respond — a farmer offers to supply.
 * @route POST /api/demands/:id/respond  { supplyPrice, quantity, message }
 */
async function createResponse(req, res) {
    const supplyPrice = toNumber(req.body.supplyPrice);
    const quantity = toNumber(req.body.quantity);
    if (!Number.isFinite(supplyPrice) || supplyPrice <= 0) {
        return res.status(400).json({ success: false, message: 'Enter the price you can supply at per unit.' });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Enter how much you can supply.' });
    }

    try {
        const demand = await Demand.findById(req.params.id);
        if (!demand || demand.status !== 'open') {
            return res.status(404).json({ success: false, message: 'That demand is no longer open.' });
        }
        if (String(demand.buyer) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot respond to your own demand.' });
        }

        const response = await DemandResponse.create({
            demand: demand._id,
            farmer: req.user._id,
            supplyPrice: escrow.round2(supplyPrice),
            quantity: escrow.round2(quantity),
            unit: demand.unit || 'unit',
            message: String(req.body.message || '').slice(0, 500)
        });

        await logAudit('DEMAND_RESPONSE', `${req.user.email} can supply ${response.quantity} ${response.unit} at KES ${response.supplyPrice} for demand "${demand.title}"`);

        return res.status(201).json({
            success: true,
            message: 'Answer sent. The buyer will compare it with other farmers.',
            data: { response: presentResponse(response, req.user) }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'That demand could not be found.' });
        }
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'You have already answered this demand.' });
        }
        console.error('[Demand] Respond failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to send your answer.' });
    }
}

/**
 * GET /api/demands/:id/responses — the buyer compares the answers.
 * @route GET /api/demands/:id/responses
 */
async function listResponsesForDemand(req, res) {
    try {
        const demand = await Demand.findById(req.params.id).select('buyer title');
        if (!demand) {
            return res.status(404).json({ success: false, message: 'Demand not found.' });
        }
        const isOwner = String(demand.buyer) === String(req.user._id);
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the buyer can see answers to this demand.' });
        }
        const responses = await DemandResponse.find({ demand: demand._id })
            .populate('farmer', 'name rating')
            .sort({ status: 1, supplyPrice: 1, createdAt: -1 })
            .limit(100);
        return res.status(200).json({ success: true, count: responses.length, data: responses.map((r) => presentResponse(r, req.user)) });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Demand not found.' });
        }
        console.error('[Demand] List responses failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load answers.' });
    }
}

/**
 * GET /api/responses/mine — answers I (a farmer) have sent.
 * @route GET /api/responses/mine
 */
async function listMyResponses(req, res) {
    try {
        const responses = await DemandResponse.find({ farmer: req.user._id })
            .populate('demand', 'title cropLabel unit status')
            .sort({ createdAt: -1 })
            .limit(100);
        return res.status(200).json({ success: true, count: responses.length, data: responses.map((r) => presentResponse(r, req.user)) });
    } catch (err) {
        console.error('[Demand] List my responses failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load your answers.' });
    }
}

/**
 * POST /api/responses/:id/accept — the buyer accepts an answer, opening an
 * escrow order at the agreed price. No listing is involved, so the order
 * carries the demand reference instead of a product.
 * @route POST /api/responses/:id/accept
 */
async function acceptResponse(req, res) {
    try {
        const response = await DemandResponse.findById(req.params.id);
        if (!response) {
            return res.status(404).json({ success: false, message: 'Answer not found.' });
        }
        const demand = await Demand.findById(response.demand);
        if (!demand) {
            return res.status(404).json({ success: false, message: 'That demand no longer exists.' });
        }
        if (String(demand.buyer) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the buyer can accept an answer.' });
        }
        if (demand.status !== 'open') {
            return res.status(409).json({ success: false, message: `You have already ${demand.status === 'matched' ? 'accepted an answer to' : 'closed'} this demand.` });
        }
        if (response.status !== 'pending') {
            return res.status(409).json({ success: false, message: `This answer is already ${response.status}.` });
        }

        const farmer = await User.findById(response.farmer).select('isActive role name');
        if (!farmer || !farmer.isActive) {
            return res.status(400).json({ success: false, message: 'That farmer is not available right now.' });
        }

        const totals = escrow.computeTotals(response.supplyPrice, response.quantity);
        const order = await Order.create({
            reference: escrow.generateReference(),
            product: null,
            demand: demand._id,
            item: {
                title: demand.title,
                unit: response.unit || demand.unit || 'unit',
                unitPrice: escrow.round2(response.supplyPrice),
                image: ''
            },
            quantity: escrow.round2(response.quantity),
            total: totals.total,
            buyer: demand.buyer,
            seller: response.farmer,
            status: 'awaiting_payment',
            payment: { provider: 'none' },
            timeline: [{
                action: 'placed',
                by: req.user._id,
                note: `Demand answer accepted: ${escrow.round2(response.quantity)} ${response.unit || 'unit'} at KES ${escrow.round2(response.supplyPrice).toFixed(2)} each.`
            }]
        });

        response.status = 'accepted';
        response.order = order._id;
        response.respondedAt = new Date();
        await response.save();

        demand.status = 'matched';
        demand.order = order._id;
        await demand.save();

        await DemandResponse.updateMany(
            { demand: demand._id, status: 'pending', _id: { $ne: response._id } },
            { $set: { status: 'declined', respondedAt: new Date() } }
        ).catch(() => {});

        await logAudit('DEMAND_MATCHED', `${req.user.email} accepted ${farmer.name || 'a farmer'}'s answer on "${demand.title}" -> order ${order.reference}`);

        return res.status(200).json({
            success: true,
            message: `Accepted. ${farmer.name || 'The farmer'} supplies at the agreed price — pay into escrow to lock it in.`,
            data: { response: presentResponse(response, req.user), orderId: order._id, orderReference: order.reference }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Answer not found.' });
        }
        console.error('[Demand] Accept failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to accept the answer.' });
    }
}

/**
 * POST /api/responses/:id/decline — the buyer turns an answer down.
 * @route POST /api/responses/:id/decline
 */
async function declineResponse(req, res) {
    try {
        const response = await DemandResponse.findById(req.params.id);
        if (!response) {
            return res.status(404).json({ success: false, message: 'Answer not found.' });
        }
        const demand = await Demand.findById(response.demand).select('buyer');
        if (!demand || String(demand.buyer) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the buyer can decline an answer.' });
        }
        if (response.status !== 'pending') {
            return res.status(409).json({ success: false, message: `This answer is already ${response.status}.` });
        }
        response.status = 'declined';
        response.respondedAt = new Date();
        await response.save();
        return res.status(200).json({ success: true, message: 'Answer declined.', data: { response: presentResponse(response, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Answer not found.' });
        }
        console.error('[Demand] Decline failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to decline the answer.' });
    }
}

/**
 * POST /api/responses/:id/withdraw — a farmer pulls their own answer.
 * @route POST /api/responses/:id/withdraw
 */
async function withdrawResponse(req, res) {
    try {
        const response = await DemandResponse.findOne({ _id: req.params.id, farmer: req.user._id });
        if (!response) {
            return res.status(404).json({ success: false, message: 'Answer not found.' });
        }
        if (response.status !== 'pending') {
            return res.status(409).json({ success: false, message: `This answer is already ${response.status}.` });
        }
        response.status = 'withdrawn';
        response.respondedAt = new Date();
        await response.save();
        return res.status(200).json({ success: true, message: 'Answer withdrawn.', data: { response: presentResponse(response, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Answer not found.' });
        }
        console.error('[Demand] Withdraw failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to withdraw the answer.' });
    }
}

module.exports = {
    createDemand,
    listDemands,
    listMyDemands,
    listMatchingDemands,
    getDemand,
    closeDemand,
    createResponse,
    listResponsesForDemand,
    listMyResponses,
    acceptResponse,
    declineResponse,
    withdrawResponse
};
