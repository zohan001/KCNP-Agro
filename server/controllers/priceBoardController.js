const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * ============================================
 * Price Board — what produce is really selling for
 * ============================================
 * The middleman's edge is information: he knows the going price and
 * the farmer does not. The Price Board takes that away. It merges
 * three honest sources into one public board:
 *
 *   1. Asking prices on live listings.
 *   2. Sale prices farmers recorded with "mark as sold".
 *   3. Prices from completed escrow orders.
 *
 * Prices are grouped by crop and unit (kg, bag, piece...) so medians
 * are never computed across mixed units.
 */

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;

// The coastal basket the pitch is built around, plus a few staples.
const CROPS = [
    { key: 'mango', label: 'Mango', terms: ['mango', 'ngowe', 'embe', 'apple mango', 'boribo'] },
    { key: 'cashew', label: 'Cashew', terms: ['cashew', 'korosho'] },
    { key: 'coconut', label: 'Coconut', terms: ['coconut', 'nazi', 'copra'] },
    { key: 'maize', label: 'Maize', terms: ['maize', 'mahindi', 'corn'] },
    { key: 'rice', label: 'Rice', terms: ['rice', 'mpunga', 'paddy'] },
    { key: 'banana', label: 'Banana', terms: ['banana', 'ndizi'] },
    { key: 'tomato', label: 'Tomato', terms: ['tomato', 'nyanya'] },
    { key: 'cassava', label: 'Cassava', terms: ['cassava', 'muhogo', 'cassava'] }
];

const CROP_BY_TERM = {};
CROPS.forEach(c => c.terms.forEach(t => { CROP_BY_TERM[t] = c; }));

/** Map a free-text title/description to one of the known crops. */
function classifyCrop(text) {
    const hay = String(text || '').toLowerCase();
    if (!hay) return null;
    let best = null;
    let bestLen = 0;
    CROPS.forEach(crop => {
        crop.terms.forEach(term => {
            if (hay.includes(term) && term.length > bestLen) {
                best = crop;
                bestLen = term.length;
            }
        });
    });
    return best;
}

function unitOf(value) {
    return String(value || 'unit').trim().toLowerCase() || 'unit';
}

function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const m = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return Math.round(m * 100) / 100;
}

function locationOf(value) {
    if (!value) return '';
    return String(value).split(',')[0].trim();
}

/**
 * GET /api/price-board — public, no auth.
 * @route GET /api/price-board?crop=mango
 */
async function getPriceBoard(req, res) {
    try {
        const since = new Date(Date.now() - WINDOW_DAYS * DAY);

        const [listings, releasedOrders] = await Promise.all([
            Product.find({ category: 'produce' })
                .select('title description price unit location active sale createdAt')
                .limit(2000)
                .lean(),
            Order.find({ status: 'released', createdAt: { $gte: since } })
                .select('item quantity total createdAt')
                .limit(500)
                .lean()
        ]);

        // bucket key: cropKey|unit -> { crop, unit, ask[], sold[], lastAt, lastPrice }
        const buckets = {};
        function bucket(crop, unit) {
            const key = `${crop.key}|${unit}`;
            if (!buckets[key]) {
                buckets[key] = {
                    crop: crop.key,
                    label: crop.label,
                    unit,
                    askingPrices: [],
                    soldPrices: [],
                    lastSoldAt: null,
                    lastSoldPrice: null
                };
            }
            return buckets[key];
        }

        listings.forEach(p => {
            const crop = classifyCrop(`${p.title} ${p.description || ''}`);
            if (!crop) return;
            const unit = unitOf(p.unit);
            const b = bucket(crop, unit);
            if (p.active && Number(p.price) > 0) {
                b.askingPrices.push(Number(p.price));
            }
            const sale = p.sale || {};
            if (sale.soldAt && Number(sale.soldPrice) > 0) {
                b.soldPrices.push(Number(sale.soldPrice));
                if (!b.lastSoldAt || new Date(sale.soldAt) > new Date(b.lastSoldAt)) {
                    b.lastSoldAt = sale.soldAt;
                    b.lastSoldPrice = Number(sale.soldPrice);
                }
            }
        });

        releasedOrders.forEach(o => {
            const crop = classifyCrop(o.item && o.item.title);
            if (!crop) return;
            const unit = unitOf(o.item && o.item.unit);
            if (!(Number(o.item && o.item.unitPrice) > 0)) return;
            const b = bucket(crop, unit);
            b.soldPrices.push(Number(o.item.unitPrice));
            if (!b.lastSoldAt || new Date(o.createdAt) > new Date(b.lastSoldAt)) {
                b.lastSoldAt = o.createdAt;
                b.lastSoldPrice = Number(o.item.unitPrice);
            }
        });

        const filterCrop = req.query.crop ? String(req.query.crop).toLowerCase() : null;

        const crops = Object.values(buckets)
            .filter(b => !filterCrop || b.crop === filterCrop)
            .filter(b => b.askingPrices.length || b.soldPrices.length)
            .map(b => ({
                crop: b.crop,
                label: b.label,
                unit: b.unit,
                listings: b.askingPrices.length,
                asking: b.askingPrices.length ? {
                    min: Math.min(...b.askingPrices),
                    max: Math.max(...b.askingPrices),
                    median: median(b.askingPrices)
                } : null,
                sold: b.soldPrices.length ? {
                    count: b.soldPrices.length,
                    median: median(b.soldPrices),
                    last: b.lastSoldPrice,
                    lastAt: b.lastSoldAt
                } : null
            }))
            .sort((a, b) => a.label.localeCompare(b.label) || a.unit.localeCompare(b.unit));

        // A short, human-readable feed of recent recorded sales.
        const recentSales = [];
        listings.forEach(p => {
            const crop = classifyCrop(`${p.title} ${p.description || ''}`);
            const sale = p.sale || {};
            if (crop && sale.soldAt && Number(sale.soldPrice) > 0) {
                recentSales.push({
                    crop: crop.key,
                    label: crop.label,
                    price: Number(sale.soldPrice),
                    unit: unitOf(sale.unit || p.unit),
                    location: locationOf(p.location),
                    at: sale.soldAt,
                    via: sale.channel || 'direct'
                });
            }
        });
        releasedOrders.forEach(o => {
            const crop = classifyCrop(o.item && o.item.title);
            if (crop && Number(o.item && o.item.unitPrice) > 0) {
                recentSales.push({
                    crop: crop.key,
                    label: crop.label,
                    price: Number(o.item.unitPrice),
                    unit: unitOf(o.item.unit),
                    location: '',
                    at: o.createdAt,
                    via: 'escrow'
                });
            }
        });
        recentSales.sort((a, b) => new Date(b.at) - new Date(a.at));

        return res.status(200).json({
            success: true,
            data: {
                generatedAt: new Date().toISOString(),
                currency: 'KES',
                windowDays: WINDOW_DAYS,
                method: 'Asking prices from live listings, plus recorded sale prices (farmer mark-as-sold and completed escrow orders). Prices are grouped by crop and unit.',
                crops,
                recentSales: recentSales.slice(0, 12)
            }
        });
    } catch (err) {
        console.error('[Price Board] Failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to build the price board.' });
    }
}

module.exports = { getPriceBoard, classifyCrop, median, unitOf, WINDOW_DAYS, CROPS };
