const Product = require('../models/Product');
const ListingEvent = require('../models/ListingEvent');
const { attachEventCounts } = require('./marketInsightsController');
const { logAudit } = require('../db/database');

async function createProduct(req, res) {
    const { title, description, category, price, unit, location, contactEmail, contactPhone, image } = req.body;

    try {
        const product = await Product.create({
            title, description, category, price, unit, location,
            contactEmail, contactPhone, image,
            seller: req.user ? req.user._id : undefined
        });

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
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found.'
            });
        }
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

        const allowed = ['title', 'description', 'category', 'price', 'unit', 'location', 'contactEmail', 'contactPhone', 'image', 'active'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) product[field] = req.body[field];
        });

        await product.save();
        return res.status(200).json({
            success: true,
            message: 'Listing updated.',
            data: { product }
        });
    } catch (err) {
        console.error('[Product] Update failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update listing.'
        });
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

module.exports = { createProduct, getProducts, getMyProducts, getProduct, updateProduct, deleteProduct };
