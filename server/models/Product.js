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
        }
    },
    { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
