const ListingEvent = require('../models/ListingEvent');
const Product = require('../models/Product');

const DAY = 24 * 60 * 60 * 1000;

function normalizeLocation(location) {
    if (!location) return 'Unknown';
    const region = location.split(',')[0].trim();
    return region || 'Unknown';
}

function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const VIEW_DEDUP_HOURS = 24;
const HOUR = 3600 * 1000;

async function recordEvent(req, res, type) {
    try {
        const product = await Product.findById(req.params.id).select('_id active');
        if (!product || !product.active) {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }

        const visitor = req.headers['x-visitor-id'] || String(req.ip || '').replace(/^::ffff:/, '');
        const ip = req.ip ? String(req.ip).replace(/^::ffff:/, '') : '';

        if (type === 'view') {
            const since = new Date(Date.now() - VIEW_DEDUP_HOURS * HOUR);
            const existing = await ListingEvent.findOne({
                product: product._id,
                type: 'view',
                visitor,
                createdAt: { $gte: since }
            });
            if (existing) {
                return res.status(200).json({ success: true, deduped: true });
            }
            await ListingEvent.create({ product: product._id, type, ip, visitor });
            return res.status(201).json({ success: true, deduped: false });
        }

        if (type === 'interest') {
            const existing = await ListingEvent.findOne({
                product: product._id,
                type: 'interest',
                visitor
            });
            if (existing) {
                await existing.deleteOne();
                return res.status(200).json({ success: true, added: false });
            }
            await ListingEvent.create({ product: product._id, type, ip, visitor });
            return res.status(201).json({ success: true, added: true });
        }

        return res.status(400).json({ success: false, message: 'Unknown activity type.' });
    } catch (err) {
        console.error(`[ListingEvent] ${type} failed:`, err.message);
        return res.status(500).json({ success: false, message: 'Failed to record activity.' });
    }
}

async function recordView(req, res) {
    return recordEvent(req, res, 'view');
}

async function recordInterest(req, res) {
    return recordEvent(req, res, 'interest');
}

// Attach 30-day view/interest counts to an array of Product docs (mutates each doc).
async function attachEventCounts(products, since = new Date(Date.now() - 30 * DAY)) {
    if (!products.length) return;
    const ids = products.map(p => p._id);
    const counts = await ListingEvent.aggregate([
        { $match: { product: { $in: ids }, createdAt: { $gte: since } } },
        { $group: { _id: { product: '$product', type: '$type' }, n: { $sum: 1 } } }
    ]);
    const map = {};
    counts.forEach(c => {
        const key = String(c._id.product);
        if (!map[key]) map[key] = { views: 0, interest: 0 };
        if (c._id.type === 'view') map[key].views = c.n;
        else map[key].interest = c.n;
    });
    products.forEach(p => {
        const m = map[String(p._id)] || { views: 0, interest: 0 };
        p.views30d = m.views;
        p.interest30d = m.interest;
    });
}

async function getMarketInsights(req, res) {
    try {
        const products = await Product.find({ active: true })
            .select('title category price location createdAt updatedAt')
            .lean();

        const now = Date.now();
        const since30 = new Date(now - 30 * DAY);
        const prior30 = new Date(now - 60 * DAY);

        const [events30, eventsPrior, eventsAll] = await Promise.all([
            ListingEvent.aggregate([
                { $match: { createdAt: { $gte: since30 } } },
                { $group: { _id: { product: '$product', type: '$type' }, n: { $sum: 1 } } }
            ]),
            ListingEvent.aggregate([
                { $match: { createdAt: { $gte: prior30, $lt: since30 } } },
                { $group: { _id: '$type', n: { $sum: 1 } } }
            ]),
            ListingEvent.aggregate([{ $group: { _id: '$type', n: { $sum: 1 } } }])
        ]);

        const eventMap = {};
        events30.forEach(c => {
            const key = String(c._id.product);
            if (!eventMap[key]) eventMap[key] = { views: 0, interest: 0 };
            if (c._id.type === 'view') eventMap[key].views = c.n;
            else eventMap[key].interest = c.n;
        });

        function sumType(list, type) {
            return list.reduce((s, x) => {
                const id = x._id && x._id.type !== undefined ? x._id.type : x._id;
                return id === type ? s + (x.n || 0) : s;
            }, 0);
        }
        const views30d = sumType(events30, 'view');
        const interest30d = sumType(events30, 'interest');
        const viewsPrior = sumType(eventsPrior, 'view');
        const interestPrior = sumType(eventsPrior, 'interest');
        const viewsAll = sumType(eventsAll, 'view');
        const interestAll = sumType(eventsAll, 'interest');

        const totals = {
            listings: products.length,
            views30d,
            interest30d,
            viewsAll,
            interestAll,
            viewsChange: viewsPrior > 0 ? Math.round(((views30d - viewsPrior) / viewsPrior) * 100) : null,
            interestChange: interestPrior > 0 ? Math.round(((interest30d - interestPrior) / interestPrior) * 100) : null
        };

        const catMap = {};
        products.forEach(p => {
            if (!catMap[p.category]) catMap[p.category] = [];
            catMap[p.category].push(p);
        });

        const categories = Object.keys(catMap).map(cat => {
            const list = catMap[cat];
            const prices = list.map(p => p.price || 0).filter(n => n > 0);
            return {
                category: cat,
                listings: list.length,
                avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
                medianPrice: median(prices),
                views30d: list.reduce((s, p) => s + (eventMap[String(p._id)] ? eventMap[String(p._id)].views : 0), 0),
                interest30d: list.reduce((s, p) => s + (eventMap[String(p._id)] ? eventMap[String(p._id)].interest : 0), 0)
            };
        });
        categories.sort((a, b) => b.listings - a.listings);

        const segMap = {};
        products.forEach(p => {
            const key = p.category + '|' + normalizeLocation(p.location);
            if (!segMap[key]) {
                segMap[key] = {
                    category: p.category,
                    location: normalizeLocation(p.location),
                    listings: 0,
                    prices: [],
                    views30d: 0,
                    interest30d: 0
                };
            }
            const s = segMap[key];
            s.listings += 1;
            if (p.price && p.price > 0) s.prices.push(p.price);
            const ev = eventMap[String(p._id)];
            if (ev) {
                s.views30d += ev.views;
                s.interest30d += ev.interest;
            }
        });

        let maxSupply = 0;
        let maxDemand = 0;
        Object.keys(segMap).forEach(k => {
            const s = segMap[k];
            maxSupply = Math.max(maxSupply, s.listings);
            maxDemand = Math.max(maxDemand, s.interest30d * 3 + s.views30d);
        });

        const segments = Object.keys(segMap).map(k => {
            const s = segMap[k];
            const demandSignal = s.interest30d * 3 + s.views30d;
            const supply = maxSupply > 0 ? Math.round((s.listings / maxSupply) * 100) : 0;
            const demand = maxDemand > 0 ? Math.round((demandSignal / maxDemand) * 100) : 0;
            let balance;
            if (demand === 0 && supply === 0) {
                balance = 'no-signal';
            } else if (s.views30d + s.interest30d === 0) {
                balance = 'no-signal';
            } else if (demand - supply >= 15) {
                balance = 'opportunity';
            } else if (demand - supply <= -15) {
                balance = 'oversupply';
            } else {
                balance = 'balanced';
            }
            return {
                category: s.category,
                location: s.location,
                listings: s.listings,
                avgPrice: s.prices.length ? Math.round(s.prices.reduce((a, b) => a + b, 0) / s.prices.length) : 0,
                medianPrice: median(s.prices),
                views30d: s.views30d,
                interest30d: s.interest30d,
                supply,
                demand,
                balance
            };
        });
        segments.sort((a, b) => b.listings - a.listings);

        const opportunities = segments
            .filter(s => s.balance === 'opportunity')
            .sort((a, b) => b.demand - a.demand)
            .slice(0, 6);

        let note = null;
        if (!products.length) note = 'no-listings';
        else if (!totals.views30d && !totals.interest30d) note = 'no-activity';

        return res.status(200).json({
            success: true,
            data: { generatedAt: new Date().toISOString(), totals, categories, segments, opportunities, note }
        });
    } catch (err) {
        console.error('[Market Insights] Failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to compute market insights.' });
    }
}

module.exports = { recordView, recordInterest, getMarketInsights, attachEventCounts };