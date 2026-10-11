const Product = require('../models/Product');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

/**
 * Human-friendly labels for the order and reservation timeline actions. The
 * public trace page shows these instead of raw database tokens.
 */
const ACTION_LABELS = {
    listed: 'Harvest listed',
    placed: 'Order placed',
    payment_started: 'Payment started',
    paid_in_escrow: 'Funds held in escrow',
    dispatched: 'Dispatched',
    delivered: 'Delivered',
    delivery_confirmed: 'Delivery confirmed',
    released: 'Funds released to farmer',
    dispute_opened: 'Dispute opened',
    dispute_resolved: 'Dispute resolved',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    proposed: 'Harvest reserved',
    accepted: 'Reservation accepted',
    deposit_paid: 'Deposit held in escrow',
    declined: 'Reservation declined',
    fulfilled: 'Harvest delivered',
    completed: 'Reservation completed',
    expired: 'Reservation expired',
    defaulted: 'Reservation defaulted',
    note: 'Update'
};

/**
 * Resolve who did something without ever exposing the buyer's identity.
 * The farmer is identified from the listing; unknown actors read as buyers.
 */
function actorFor(entryBy, sellerId) {
    if (!entryBy) return 'Platform';
    return String(entryBy) === String(sellerId) ? 'Farmer' : 'Buyer';
}

/**
 * Public provenance for a single batch code. Aggregates the listing, the
 * farmer and every escrow trade tied to it into one timeline. Deliberately
 * leaks no buyer identity.
 */
async function getTrace(req, res) {
    try {
        const code = String(req.params.code || '').trim().toUpperCase();
        if (!code) {
            return res.status(400).json({ success: false, message: 'A batch code is required.' });
        }

        const product = await Product.findOne({ 'batch.code': code }).lean();
        if (!product || !product.batch || !product.batch.code) {
            return res.status(404).json({ success: false, message: 'No trace found for that batch code.' });
        }

        const [orders, reservations, seller] = await Promise.all([
            Order.find({ product: product._id }).select('reference item quantity status timeline createdAt').lean(),
            Reservation.find({ listing: product._id }).select('cropLabel quantity status timeline createdAt').lean(),
            product.seller
                ? User.findById(product.seller).select('name rating identityVerified').lean()
                : Promise.resolve(null)
        ]);

        const events = [];
        events.push({
            at: product.createdAt,
            actor: 'Farmer',
            action: 'listed',
            label: ACTION_LABELS.listed
        });

        orders.forEach((order) => {
            (order.timeline || []).forEach((entry) => {
                events.push({
                    at: entry.at,
                    actor: actorFor(entry.by, product.seller),
                    action: entry.action,
                    label: ACTION_LABELS[entry.action] || entry.action
                });
            });
        });

        reservations.forEach((reservation) => {
            (reservation.timeline || []).forEach((entry) => {
                events.push({
                    at: entry.at,
                    actor: actorFor(entry.by, product.seller),
                    action: entry.action,
                    label: ACTION_LABELS[entry.action] || entry.action
                });
            });
        });

        events.sort((a, b) => new Date(a.at) - new Date(b.at));

        return res.status(200).json({
            success: true,
            data: {
                batch: {
                    code: product.batch.code,
                    harvestDate: product.batch.harvestDate || null,
                    grade: product.batch.grade || '',
                    origin: product.batch.origin || '',
                    note: product.batch.note || ''
                },
                listing: {
                    title: product.title,
                    category: product.category,
                    location: product.location || '',
                    image: product.image || '',
                    unit: product.unit || 'unit',
                    listedAt: product.createdAt
                },
                farmer: {
                    name: seller ? seller.name : 'KCNP farmer',
                    verified: seller ? !!seller.identityVerified : false,
                    rating: seller && seller.rating
                        ? { average: seller.rating.average || 0, count: seller.rating.count || 0 }
                        : { average: 0, count: 0 }
                },
                summary: {
                    orders: orders.length,
                    reservations: reservations.length,
                    events: events.length
                },
                events
            }
        });
    } catch (err) {
        console.error('[Trace] Lookup failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load traceability data.' });
    }
}

module.exports = { getTrace, ACTION_LABELS };
