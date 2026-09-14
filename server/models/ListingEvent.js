const mongoose = require('mongoose');

const listingEventSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ['view', 'interest'],
            required: true
        },
        ip: {
            type: String
        },
        visitor: {
            type: String,
            index: true
        }
    },
    { timestamps: true }
);

listingEventSchema.index({ product: 1, type: 1, createdAt: -1 });
listingEventSchema.index({ type: 1, createdAt: -1 });
listingEventSchema.index({ createdAt: -1 });
listingEventSchema.index({ product: 1, type: 1, visitor: 1 });

module.exports = mongoose.models.ListingEvent || mongoose.model('ListingEvent', listingEventSchema);