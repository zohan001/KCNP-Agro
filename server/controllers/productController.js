const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const ListingEvent = require('../models/ListingEvent');
const { attachEventCounts } = require('./marketInsightsController');
const { logAudit } = require('../db/database');
const { getPlans } = require('./paymentController');
const { classifyCrop } = require('./priceBoardController');

const BATCH_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Short, shareable batch code such as `MNG-8H3K`. The prefix comes from the
 * crop so a farmer can recognise it; the tail keeps it unique.
 *
 * @param {string} prefix
 * @returns {string}
 */
function generateBatchCode(prefix) {
    const p = String(prefix || 'KCN')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 3) || 'KCN';
    let tail = '';
    for (let i = 0; i < 4; i += 1) {
        tail += BATCH_ALPHABET[Math.floor(Math.random() * BATCH_ALPHABET.length)];
    }
    return `${p}-${tail}`;
}

/**
 * Sanitize an optional batch object from the request body. Returns null when
 * the farmer supplied nothing, so listings without provenance stay untouched.
 *
 * @param {Object} body
 * @returns {Object|null}
 */
function parseBatch(body) {
    const raw = body && typeof body.batch === 'object' && body.batch !== null ? body.batch : null;
    if (!raw) return null;
    const harvestDate = raw.harvestDate ? new Date(raw.harvestDate) : null;
    return {
        code: String(raw.code || '').trim().toUpperCase().slice(0, 40),
        harvestDate: harvestDate && !isNaN(harvestDate.getTime()) ? harvestDate : null,
        grade: String(raw.grade || '').trim().slice(0, 40),
        origin: String(raw.origin || '').trim().slice(0, 120),
        note: String(raw.note || '').trim().slice(0, 300)
    };
}

/**
 * True when the farmer actually supplied provenance worth storing.
 */
function hasBatchContent(batch) {
    return Boolean(batch && (batch.code || batch.harvestDate || batch.grade || batch.origin));
}

/**
 * Mint a crop-prefixed code for a traceable listing that has none yet.
 */
function batchPrefixFor(title, description) {
    const crop = classifyCrop(`${title || ''} ${description || ''}`);
    return crop ? crop.label : (title || 'KCN');
}

/**
 * Farmers must hold an active subscription (or an admin grant) to post or
 * edit listings. Only farmers can create/update listings — admins manage and
 * traders/buyers do not sell on the marketplace (routes are guarded by
 * authorize('farmer') upstream, this only enforces the subscription gate).
 */
function requireActiveMembership(req) {
    if (!req.user || req.user.role === 'admin' || req.user.role === 'trader') return null;
    const m = req.user.membership;
    if (m && m.status === 'active' && m.expiresAt && new Date(m.expiresAt) > new Date()) return null;
    return {
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'An active subscription is required to post listings. Choose a plan and subscribe.',
        data: { plans: getPlans() }
    };
}

/**
 * A farmer cannot put produce on the marketplace until an admin has approved
 * their ID. This runs BEFORE the subscription check so an unverified farmer is
 * told to fix their identity rather than being sent to the pricing page first.
 *
 * Only farmers are held to this. Admins manage the catalogue and traders buy,
 * so neither is gated.
 */
function requireVerifiedIdentity(req) {
    if (!req.user || req.user.role !== 'farmer') return null;
    if (req.user.identityVerified) return null;
    return {
        code: 'VERIFICATION_REQUIRED',
        message: 'Verify your identity before listing produce. Upload your National ID (front and back) and a live face photo — it takes a couple of minutes and an admin reviews it.',
        data: { redirect: '/verification' }
    };
}

async function createProduct(req, res) {
    const { title, description, category, price, unit, location, contactEmail, contactPhone, image } = req.body;

    try {
        const verifyReq = requireVerifiedIdentity(req);
        if (verifyReq) {
            return res.status(403).json({ success: false, ...verifyReq });
        }

        const subReq = requireActiveMembership(req);
        if (subReq) {
            return res.status(402).json({ success: false, ...subReq });
        }

        const batch = parseBatch(req.body);
        if (hasBatchContent(batch) && !batch.code) {
            batch.code = generateBatchCode(batchPrefixFor(title, description));
        }

        const base = {
            title, description, category, price, unit, location,
            contactEmail, contactPhone, image,
            stock: req.body.stock !== undefined ? req.body.stock : null,
            seller: req.user ? req.user._id : undefined
        };
        if (hasBatchContent(batch)) base.batch = batch;

        // A generated code can rarely collide with an existing one; retry a
        // couple of times rather than failing the farmer's listing.
        let product;
        for (let attempt = 0; ; attempt += 1) {
            try {
                product = await Product.create(base);
                break;
            } catch (err) {
                if (err.code === 11000 && base.batch && base.batch.code && attempt < 3) {
                    base.batch.code = generateBatchCode(batchPrefixFor(title, description));
                    continue;
                }
                throw err;
            }
        }

        logAudit('PRODUCT_CREATED', `Product: ${title} by ${contactEmail}`)
            .catch(err => console.error('[Audit] Failed to log:', err.message));

        return res.status(201).json({
            success: true,
            message: 'Listing created successfully.',
            data: { product }
        });
    } catch (err) {
        console.error('[Product] Create failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create listing.'
        });
    }
}

/**
 * Attach each listing's seller name, verified flag and rating in a single
 * lookup, so the marketplace can show reputation on every card without an
 * aggregate query per listing.
 */
async function attachSellerRatings(products) {
    const ids = [...new Set(products.filter((p) => p.seller).map((p) => String(p.seller)))];
    if (!ids.length) return;
    const users = await User.find({ _id: { $in: ids } }).select('name rating identityVerified').lean();
    const byId = {};
    users.forEach((u) => { byId[String(u._id)] = u; });
    products.forEach((p) => {
        const u = p.seller ? byId[String(p.seller)] : null;
        p.sellerName = u ? u.name : '';
        p.sellerVerified = u ? !!u.identityVerified : false;
        p.sellerRating = u && u.rating ? { average: u.rating.average || 0, count: u.rating.count || 0 } : { average: 0, count: 0 };
    });
}

async function getProducts(req, res) {
    try {
        const { category, search, seller, page = 1, limit = 20 } = req.query;
        const filter = { active: true };

        if (category) filter.category = category;
        if (seller) filter.seller = seller;
        if (search) filter.$text = { $search: search };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [products, total] = await Promise.all([
            Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
            Product.countDocuments(filter)
        ]);

        await attachEventCounts(products);
        await attachSellerRatings(products);

        return res.status(200).json({
            success: true,
            count: products.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: products
        });
    } catch (err) {
        console.error('[Product] Fetch failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch listings.'
        });
    }
}

async function getMyProducts(req, res) {
    try {
        const products = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 }).lean();
        await attachEventCounts(products);
        return res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (err) {
        console.error('[Product] Fetch mine failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch your listings.'
        });
    }
}

async function getProduct(req, res) {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found.'
            });
        }
        await attachSellerRatings([product]);
        return res.status(200).json({
            success: true,
            data: { product }
        });
    } catch (err) {
        console.error('[Product] Fetch by ID failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch listing.'
        });
    }
}

async function updateProduct(req, res) {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found.'
            });
        }

        if (req.user && product.seller && product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own listings.'
            });
        }

        const verifyReq = requireVerifiedIdentity(req);
        if (verifyReq) {
            return res.status(403).json({ success: false, ...verifyReq });
        }

        const subReq = requireActiveMembership(req);
        if (subReq) {
            return res.status(402).json({ success: false, ...subReq });
        }

        const allowed = ['title', 'description', 'category', 'price', 'unit', 'location', 'contactEmail', 'contactPhone', 'image', 'active', 'stock'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) product[field] = req.body[field];
        });

        if (req.body.batch !== undefined) {
            const batch = parseBatch(req.body);
            if (hasBatchContent(batch)) {
                if (!batch.code) batch.code = generateBatchCode(batchPrefixFor(product.title, product.description));
                product.batch = batch;
            } else {
                product.batch = undefined;
            }
        }

        await product.save();
        return res.status(200).json({
            success: true,
            message: 'Listing updated.',
            data: { product }
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'That batch code is already used by another listing.' });
        }
        console.error('[Product] Update failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update listing.'
        });
    }
}

/**
 * POST /api/products/:id/sold — the farmer records that the produce has gone,
 * and at what price. Most produce sells offline, so this is how a real trade
 * (and the price that was actually paid) enters the platform instead of the
 * listing silently going stale. It closes the listing and feeds the Price
 * Board, which is the transparency our value proposition rests on.
 *
 * @route POST /api/products/:id/sold
 *   { soldPrice, soldQuantity, unit?, buyerId?, buyerName?, channel?, note? }
 */
async function markSold(req, res) {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        if (req.user && product.seller && product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You can only mark your own listings as sold.' });
        }
        if (product.sale && product.sale.soldAt) {
            return res.status(409).json({ success: false, message: 'This listing is already marked sold.' });
        }

        const soldPrice = req.body.soldPrice === undefined || req.body.soldPrice === ''
            ? null
            : Number(req.body.soldPrice);
        const soldQuantity = req.body.soldQuantity === undefined || req.body.soldQuantity === ''
            ? null
            : Number(req.body.soldQuantity);

        if (soldPrice !== null && (!Number.isFinite(soldPrice) || soldPrice < 0)) {
            return res.status(400).json({ success: false, message: 'Sold price must be a positive number.' });
        }
        if (soldQuantity !== null && (!Number.isFinite(soldQuantity) || soldQuantity < 0)) {
            return res.status(400).json({ success: false, message: 'Sold quantity must be a positive number.' });
        }

        const channels = ['direct', 'middleman', 'market', 'escrow', 'other'];
        const channel = channels.includes(req.body.channel) ? req.body.channel : 'direct';

        // An optional registered buyer (for a later two-sided review). An
        // invalid id must not blow up the save, so it is simply ignored.
        let buyerId = null;
        if (req.body.buyerId) {
            if (!mongoose.isValidObjectId(req.body.buyerId)) {
                return res.status(400).json({ success: false, message: 'That buyer reference is not valid.' });
            }
            buyerId = req.body.buyerId;
        }

        product.sale = {
            soldAt: new Date(),
            soldPrice: soldPrice === null ? null : Math.round(soldPrice * 100) / 100,
            soldQuantity,
            unit: String(req.body.unit || product.unit || 'unit'),
            buyer: buyerId,
            buyerName: String(req.body.buyerName || '').slice(0, 120),
            channel,
            note: String(req.body.note || '').slice(0, 500)
        };
        product.active = false;
        await product.save();

        logAudit('PRODUCT_SOLD', `Product: ${product.title} marked sold${soldPrice !== null ? ` at KES ${product.sale.soldPrice}/${product.sale.unit}` : ''} by ${req.user ? req.user.email : 'system'}`)
            .catch(err => console.error('[Audit] Failed to log:', err.message));

        return res.status(200).json({
            success: true,
            message: 'Marked sold. Thanks — this price now helps other farmers see the real market.',
            data: { product }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }
        console.error('[Product] Mark sold failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to mark the listing as sold.' });
    }
}

async function deleteProduct(req, res) {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found.'
            });
        }

        if (req.user && product.seller && product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own listings.'
            });
        }

        await Product.findByIdAndDelete(req.params.id);
        await ListingEvent.deleteMany({ product: req.params.id }).catch(() => {});
        return res.status(200).json({
            success: true,
            message: 'Listing deleted.'
        });
    } catch (err) {
        console.error('[Product] Delete failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete listing.'
        });
    }
}

module.exports = { createProduct, getProducts, getMyProducts, getProduct, updateProduct, markSold, deleteProduct, generateBatchCode, parseBatch };
