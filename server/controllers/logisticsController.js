const LogisticsProvider = require('../models/LogisticsProvider');
const { logAudit } = require('../db/database');
const { classifyCrop } = require('./priceBoardController');

/**
 * ============================================
 * Logistics Controller — transport & collection registry
 * ============================================
 * The directory of collection points, transporters and cold stores.
 * Anyone signed in can register a service; the public can browse the
 * directory; admins mark the ones they trust as verified partners.
 * This is how the platform "partners, not pretends" on logistics.
 */

const { PROVIDER_TYPES, SERVICES, FEE_MODELS } = LogisticsProvider;

function presentProvider(provider, viewer) {
    const ownerId = provider.owner && provider.owner._id ? provider.owner._id : provider.owner;
    const isOwner = viewer && String(ownerId) === String(viewer._id);
    const isAdmin = viewer && viewer.role === 'admin';
    const owner = provider.owner && provider.owner.name
        ? { _id: provider.owner._id, name: provider.owner.name, rating: provider.owner.rating || null }
        : { _id: ownerId };
    return {
        _id: provider._id,
        type: provider.type,
        name: provider.name,
        description: provider.description || '',
        location: provider.location || '',
        cropsHandled: provider.cropsHandled || [],
        services: provider.services || [],
        capacity: provider.capacity,
        capacityUnit: provider.capacityUnit || '',
        feeModel: provider.feeModel,
        feeNote: provider.feeNote || '',
        contactPhone: isOwner || isAdmin ? (provider.contactPhone || '') : '',
        contactEmail: isOwner || isAdmin ? (provider.contactEmail || '') : '',
        coverageAreas: provider.coverageAreas || [],
        verified: !!provider.verified,
        active: provider.active !== false,
        rating: provider.rating || { average: 0, count: 0 },
        owner,
        isOwner,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt
    };
}

/** Turn free-text crop names into normalised keys, dropping unknowns. */
function normaliseCrops(list) {
    if (!Array.isArray(list)) return [];
    const keys = new Set();
    list.forEach((item) => {
        const crop = classifyCrop(String(item || ''));
        if (crop) keys.add(crop.key);
    });
    return [...keys];
}

function cleanServices(list) {
    if (!Array.isArray(list)) return [];
    return [...new Set(list.map((s) => String(s)).filter((s) => SERVICES.includes(s)))];
}

function cleanAreas(list) {
    if (!Array.isArray(list)) return [];
    return [...new Set(list.map((a) => String(a).trim()).filter(Boolean))].slice(0, 20);
}

/**
 * POST /api/logistics — register a service.
 * @route POST /api/logistics
 */
async function createProvider(req, res) {
    const name = String(req.body.name || '').trim();
    const type = String(req.body.type || '').trim();
    if (!name) {
        return res.status(400).json({ success: false, message: 'Give your service a name.' });
    }
    if (!PROVIDER_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: 'Choose a valid service type.' });
    }

    let capacity = null;
    if (req.body.capacity !== undefined && req.body.capacity !== null && String(req.body.capacity).trim() !== '') {
        capacity = Number(req.body.capacity);
        if (!Number.isFinite(capacity) || capacity < 0) {
            return res.status(400).json({ success: false, message: 'Enter a valid capacity, or leave it blank.' });
        }
    }

    const feeModel = FEE_MODELS.includes(String(req.body.feeModel)) ? String(req.body.feeModel) : 'negotiable';

    try {
        const provider = await LogisticsProvider.create({
            owner: req.user._id,
            type,
            name,
            description: String(req.body.description || '').slice(0, 1000),
            location: String(req.body.location || '').slice(0, 120),
            cropsHandled: normaliseCrops(req.body.cropsHandled),
            services: cleanServices(req.body.services),
            capacity,
            capacityUnit: String(req.body.capacityUnit || '').slice(0, 32),
            feeModel,
            feeNote: String(req.body.feeNote || '').slice(0, 200),
            contactPhone: String(req.body.contactPhone || '').slice(0, 30),
            contactEmail: String(req.body.contactEmail || '').slice(0, 120),
            coverageAreas: cleanAreas(req.body.coverageAreas)
        });

        await logAudit('LOGISTICS_REGISTERED', `${req.user.email} registered ${type} "${name}"`);

        return res.status(201).json({
            success: true,
            message: 'Service registered. Buyers and farmers can now find you.',
            data: { provider: presentProvider(provider, req.user) }
        });
    } catch (err) {
        console.error('[Logistics] Create failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to register your service.' });
    }
}

/**
 * GET /api/logistics — public directory.
 * @route GET /api/logistics?type=transporter&crop=mango&location=kilifi&q=truck&page=1
 */
async function listProviders(req, res) {
    try {
        const filter = { active: true };
        if (req.query.type && PROVIDER_TYPES.includes(String(req.query.type))) {
            filter.type = String(req.query.type);
        }
        if (req.query.crop) {
            const crop = classifyCrop(String(req.query.crop));
            if (crop) filter.cropsHandled = crop.key;
        }
        if (req.query.location) filter.location = { $regex: String(req.query.location).slice(0, 60), $options: 'i' };
        if (req.query.q) filter.$or = [
            { name: { $regex: String(req.query.q).slice(0, 60), $options: 'i' } },
            { description: { $regex: String(req.query.q).slice(0, 60), $options: 'i' } }
        ];

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

        const [providers, total] = await Promise.all([
            LogisticsProvider.find(filter)
                .populate('owner', 'name rating')
                // Verified partners first, then newest.
                .sort({ verified: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            LogisticsProvider.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            count: providers.length,
            total,
            page,
            pages: Math.ceil(total / limit) || 1,
            data: providers.map((p) => presentProvider(p, req.user))
        });
    } catch (err) {
        console.error('[Logistics] List failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load the directory.' });
    }
}

/**
 * GET /api/logistics/mine — services I registered.
 * @route GET /api/logistics/mine
 */
async function listMine(req, res) {
    try {
        const providers = await LogisticsProvider.find({ owner: req.user._id })
            .populate('owner', 'name rating')
            .sort({ createdAt: -1 })
            .limit(100);
        return res.status(200).json({ success: true, count: providers.length, data: providers.map((p) => presentProvider(p, req.user)) });
    } catch (err) {
        console.error('[Logistics] List mine failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load your services.' });
    }
}

/**
 * GET /api/logistics/:id — one service.
 * @route GET /api/logistics/:id
 */
async function getProvider(req, res) {
    try {
        const provider = await LogisticsProvider.findById(req.params.id).populate('owner', 'name rating');
        if (!provider || provider.active === false) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        return res.status(200).json({ success: true, data: { provider: presentProvider(provider, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        console.error('[Logistics] Get failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load the service.' });
    }
}

/**
 * PUT /api/logistics/:id — owner (or admin) edits a service.
 * @route PUT /api/logistics/:id
 */
async function updateProvider(req, res) {
    try {
        const provider = await LogisticsProvider.findById(req.params.id);
        if (!provider || provider.active === false) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        if (String(provider.owner) !== String(req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the owner can edit this service.' });
        }

        if (req.body.name !== undefined) {
            const name = String(req.body.name).trim();
            if (!name) return res.status(400).json({ success: false, message: 'Give your service a name.' });
            provider.name = name.slice(0, 120);
        }
        if (req.body.type !== undefined && PROVIDER_TYPES.includes(String(req.body.type))) provider.type = String(req.body.type);
        if (req.body.description !== undefined) provider.description = String(req.body.description).slice(0, 1000);
        if (req.body.location !== undefined) provider.location = String(req.body.location).slice(0, 120);
        if (req.body.cropsHandled !== undefined) provider.cropsHandled = normaliseCrops(req.body.cropsHandled);
        if (req.body.services !== undefined) provider.services = cleanServices(req.body.services);
        if (req.body.capacity !== undefined) {
            if (req.body.capacity === null || String(req.body.capacity).trim() === '') {
                provider.capacity = null;
            } else {
                const capacity = Number(req.body.capacity);
                if (!Number.isFinite(capacity) || capacity < 0) {
                    return res.status(400).json({ success: false, message: 'Enter a valid capacity, or leave it blank.' });
                }
                provider.capacity = capacity;
            }
        }
        if (req.body.capacityUnit !== undefined) provider.capacityUnit = String(req.body.capacityUnit).slice(0, 32);
        if (req.body.feeModel !== undefined && FEE_MODELS.includes(String(req.body.feeModel))) provider.feeModel = String(req.body.feeModel);
        if (req.body.feeNote !== undefined) provider.feeNote = String(req.body.feeNote).slice(0, 200);
        if (req.body.contactPhone !== undefined) provider.contactPhone = String(req.body.contactPhone).slice(0, 30);
        if (req.body.contactEmail !== undefined) provider.contactEmail = String(req.body.contactEmail).slice(0, 120);
        if (req.body.coverageAreas !== undefined) provider.coverageAreas = cleanAreas(req.body.coverageAreas);

        await provider.save();
        return res.status(200).json({ success: true, message: 'Service updated.', data: { provider: presentProvider(provider, req.user) } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        console.error('[Logistics] Update failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update the service.' });
    }
}

/**
 * DELETE /api/logistics/:id — owner (or admin) removes a service. Soft
 * delete so any orders/history that referenced it stay readable.
 * @route DELETE /api/logistics/:id
 */
async function deleteProvider(req, res) {
    try {
        const provider = await LogisticsProvider.findById(req.params.id);
        if (!provider || provider.active === false) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        if (String(provider.owner) !== String(req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only the owner can remove this service.' });
        }
        provider.active = false;
        await provider.save();
        return res.status(200).json({ success: true, message: 'Service removed from the directory.' });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        console.error('[Logistics] Delete failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to remove the service.' });
    }
}

/**
 * POST /api/logistics/:id/verify — an admin vouches for a partner.
 * @route POST /api/logistics/:id/verify  { verified?: boolean }
 */
async function verifyProvider(req, res) {
    try {
        const provider = await LogisticsProvider.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        const verified = req.body.verified === undefined ? true : !!req.body.verified;
        provider.verified = verified;
        provider.verifiedAt = verified ? new Date() : null;
        provider.verifiedBy = verified ? req.user._id : null;
        await provider.save();

        await logAudit('LOGISTICS_VERIFIED', `${req.user.email} marked logistics "${provider.name}" as ${verified ? 'verified' : 'unverified'}`);

        return res.status(200).json({
            success: true,
            message: verified ? 'Marked as a verified partner.' : 'Verification removed.',
            data: { provider: presentProvider(provider, req.user) }
        });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        console.error('[Logistics] Verify failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update verification.' });
    }
}

module.exports = {
    createProvider,
    listProviders,
    listMine,
    getProvider,
    updateProvider,
    deleteProvider,
    verifyProvider,
    // exported for tests
    normaliseCrops,
    cleanServices
};
