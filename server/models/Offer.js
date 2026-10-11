const mongoose = require('mongoose');

/**
 * ============================================
 * Offer — a negotiated price on a listing
 * ============================================
 * The middleman's real power is that he is the *only* buyer
 * standing in front of the farmer, so he sets the price. An
 * Offer restores choice: a trader names a price and quantity,
 * the farmer can hold several side by side and accept the best
 * one instead of taking a single take-it-or-leave-it figure.
 *
 * An accepted offer is the farmer's permission to buy at the
 * agreed price, so it can be turned into an escrow Order without
 * haggling again (see offerController.acceptOffer).
 */

const OFFER_STATUSES = ['pending', 'accepted', 'declined', 'withdrawn', 'expired'];

const offerSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true
        },
        // Snapshot so an offer stays readable even if the listing is edited.
        item: {
            title: { type: String, required: true },
            unit: { type: String, default: 'unit' }
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // Price the buyer offers, per unit.
        offerPrice: {
            type: Number,
            required: [true, 'Enter the price you are offering per unit.'],
            min: [0.01, 'Offer price must be more than zero.']
        },
        quantity: {
            type: Number,
            required: [true, 'Enter how many units you want.'],
            min: [0.01, 'Quantity must be more than zero.']
        },
        unit: {
            type: String,
            default: 'unit'
        },
        message: {
            type: String,
            trim: true,
            maxlength: [500, 'Message cannot exceed 500 characters.']
        },
        status: {
            type: String,
            enum: OFFER_STATUSES,
            default: 'pending',
            index: true
        },
        // Set when the farmer accepts: the order the buyer should pay.
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null
        },
        respondedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null }
    },
    { timestamps: true }
);

offerSchema.index({ product: 1, status: 1, createdAt: -1 });
offerSchema.index({ seller: 1, status: 1, createdAt: -1 });
offerSchema.index({ buyer: 1, createdAt: -1 });

offerSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return obj;
};

module.exports = mongoose.models.Offer || mongoose.model('Offer', offerSchema);
module.exports.OFFER_STATUSES = OFFER_STATUSES;
