const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { logAudit } = require('../db/database');

/**
 * ============================================
 * Review Controller — reputation from real trades
 * ============================================
 * A review is only accepted when it can be tied to a completed
 * trade: a released escrow order, or a listing the farmer marked
 * sold to a registered buyer. Both sides may review each other
 * once. The subject's User.rating is updated atomically so a
 * profile always shows a live, honest score.
 */

function clampRating(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 1 || n > 5) return null;
    return n;
}

/** Resolve which trade a review refers to and who the two parties are. */
async function resolveTrade({ orderId, productId }, author) {
    if (orderId) {
        const order = await Order.findById(orderId);
        if (!order) return { error: { status: 404, message: 'Trade not found.' } };
        if (order.status !== 'released') {
            return { error: { status: 409, message: 'You can review only once the trade is completed.' } };
        }
        const isBuyer = String(order.buyer) === String(author._id);
        const isSeller = String(order.seller) === String(author._id);
        if (!isBuyer && !isSeller) {
            return { error: { status: 403, message: 'You were not part of this trade.' } };
        }
        return {
            trade: {
                order: order._id,
                product: order.product,
                context: 'escrow',
                authorRole: isBuyer ? 'buyer' : 'seller',
                subject: isBuyer ? order.seller : order.buyer
            }
        };
    }

    if (productId) {
        const product = await Product.findById(productId);
        if (!product) return { error: { status: 404, message: 'Listing not found.' } };
        const sale = product.sale || {};
        if (!sale.soldAt || !sale.buyer) {
            return { error: { status: 409, message: 'This listing has not been marked sold to a registered buyer yet.' } };
        }
        const isSeller = product.seller && String(product.seller) === String(author._id);
        const isBuyer = String(sale.buyer) === String(author._id);
        if (!isSeller && !isBuyer) {
            return { error: { status: 403, message: 'You were not part of this trade.' } };
        }
        return {
            trade: {
                order: null,
                product: product._id,
                context: 'listing',
                authorRole: isSeller ? 'seller' : 'buyer',
                subject: isSeller ? sale.buyer : product.seller
            }
        };
    }

    return { error: { status: 400, message: 'Tell us which trade this review is about.' } };
}

/** Atomically fold a new rating into the subject's running average. */
async function applyRating(subjectId, rating) {
    // $ifNull guards accounts created before the rating field existed.
    const countExpr = { $add: [{ $ifNull: ['$rating.count', 0] }, 1] };
    const priorSum = {
        $multiply: [{ $ifNull: ['$rating.average', 0] }, { $ifNull: ['$rating.count', 0] }]
    };
    const update = [
        {
            $set: {
                rating: {
                    count: countExpr,
                    average: { $round: [{ $divide: [{ $add: [priorSum, rating] }, countExpr] }, 2] }
                }
            }
        }
    ];
    return User.findByIdAndUpdate(subjectId, update, { new: true }).select('name rating');
}

/**
 * POST /api/reviews — leave a review for the other side of a finished trade.
 * @route POST /api/reviews  { orderId? , productId?, rating, comment? }
 */
async function createReview(req, res) {
    const rating = clampRating(req.body.rating);
    if (rating === null) {
        return res.status(400).json({ success: false, message: 'Choose a rating from 1 to 5.' });
    }

    try {
        const resolved = await resolveTrade(
            { orderId: req.body.orderId, productId: req.body.productId },
            req.user
        );
        if (resolved.error) {
            return res.status(resolved.error.status).json({ success: false, message: resolved.error.message });
        }
        const { trade } = resolved;

        // One review per author per trade.
        const existing = await Review.findOne(
            trade.order
                ? { order: trade.order, author: req.user._id }
                : { product: trade.product, author: req.user._id }
        );
        if (existing) {
            return res.status(409).json({ success: false, message: 'You have already reviewed this trade.' });
        }

        const review = await Review.create({
            order: trade.order,
            product: trade.product,
            context: trade.context,
            author: req.user._id,
            subject: trade.subject,
            authorRole: trade.authorRole,
            rating,
            comment: String(req.body.comment || '').slice(0, 1000)
        });

        const subject = await applyRating(trade.subject, rating);
        await logAudit('REVIEW_CREATED', `${req.user.email} rated ${subject ? subject.email || subject._id : trade.subject} ${rating}/5`);

        return res.status(201).json({
            success: true,
            message: 'Thanks — your review is now on their profile.',
            data: {
                review,
                subject: subject ? { _id: subject._id, name: subject.name, rating: subject.rating } : null
            }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Trade not found.' });
        }
        console.error('[Reviews] Create failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to save your review.' });
    }
}

/**
 * GET /api/users/:id/reviews — a profile's public reputation.
 * @route GET /api/users/:id/reviews
 */
async function listReviewsForUser(req, res) {
    try {
        const user = await User.findById(req.params.id).select('name role rating');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const reviews = await Review.find({ subject: user._id })
            .populate('author', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json({
            success: true,
            data: {
                user: { _id: user._id, name: user.name, role: user.role },
                summary: user.rating,
                count: reviews.length,
                reviews: reviews.map((r) => ({
                    _id: r._id,
                    rating: r.rating,
                    comment: r.comment,
                    authorRole: r.authorRole,
                    context: r.context,
                    author: r.author ? { _id: r.author._id, name: r.author.name } : null,
                    createdAt: r.createdAt
                }))
            }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        console.error('[Reviews] List failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load reviews.' });
    }
}

/**
 * GET /api/reviews/mine — reviews I have written, so I don't review twice.
 * @route GET /api/reviews/mine
 */
async function listMyReviews(req, res) {
    try {
        const reviews = await Review.find({ author: req.user._id })
            .sort({ createdAt: -1 })
            .limit(100);
        return res.status(200).json({ success: true, data: reviews });
    } catch (err) {
        console.error('[Reviews] List mine failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load your reviews.' });
    }
}

module.exports = { createReview, listReviewsForUser, listMyReviews };
