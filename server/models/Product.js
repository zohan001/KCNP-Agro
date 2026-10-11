const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required.'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters.'],
            maxlength: [200, 'Title cannot exceed 200 characters.']
        },
        description: {
            type: String,
            required: [true, 'Description is required.'],
            trim: true,
            minlength: [10, 'Description must be at least 10 characters.'],
            maxlength: [2000, 'Description cannot exceed 2000 characters.']
        },
        category: {
            type: String,
            required: [true, 'Category is required.'],
            enum: ['seeds', 'tools', 'fertilizer', 'livestock', 'produce', 'equipment', 'services', 'other'],
            default: 'other'
        },
        price: {
            type: Number,
            min: [0, 'Price cannot be negative.'],
            default: 0
        },
        unit: {
            type: String,
            trim: true,
            default: 'unit'
        },
        // Optional stock tracking. `null` means "quantity agreed on M-Pesa
        // at checkout", which is how most produce is actually sold, so the
        // existing listings keep working untouched. When a number is set,
        // escrow orders reserve that much and the card shows what is left.
        stock: {
            type: Number,
            min: [0, 'Stock cannot be negative.'],
            default: null
        },
        location: {
            type: String,
            trim: true,
            maxlength: [200, 'Location cannot exceed 200 characters.']
        },
        contactEmail: {
            type: String,
            required: [true, 'Contact email is required.'],
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address.']
        },
        contactPhone: {
            type: String,
            trim: true,
            maxlength: [30, 'Phone cannot exceed 30 characters.']
        },
        image: {
            type: String,
            trim: true
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        active: {
            type: Boolean,
            default: true
        },
        // Optional provenance. When a farmer adds a batch, the listing becomes
        // traceable: a public /trace/:code page shows where the produce came
        // from and every escrow trade tied to it. Left blank, the listing
        // works exactly as before and simply carries no trace.
        batch: {
            code: { type: String, trim: true, uppercase: true, maxlength: 40 },
            harvestDate: { type: Date, default: null },
            grade: { type: String, trim: true, maxlength: 40 },
            origin: { type: String, trim: true, maxlength: 120 },
            note: { type: String, trim: true, maxlength: 300 }
        },
        // Set when the farmer records that the produce has been sold. Most
        // produce changes hands offline, so this is how we capture the real
        // trade — and its price — instead of only counting listings. It feeds
        // the Price Board, which is the transparency our pitch rests on.
        sale: {
            soldAt: { type: Date, default: null },
            soldPrice: { type: Number, default: null, min: [0, 'Sold price cannot be negative.'] },
            soldQuantity: { type: Number, default: null, min: [0, 'Sold quantity cannot be negative.'] },
            unit: { type: String, default: '' },
            buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            buyerName: { type: String, default: '', trim: true, maxlength: 120 },
            channel: { type: String, enum: ['direct', 'middleman', 'market', 'escrow', 'other'], default: 'direct' },
            note: { type: String, default: '', trim: true, maxlength: 500 }
        }
    },
    { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ createdAt: -1 });
// A batch code identifies one harvest on the public trace page, so it must be
// unique — but only among listings that actually have one (sparse).
productSchema.index({ 'batch.code': 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
