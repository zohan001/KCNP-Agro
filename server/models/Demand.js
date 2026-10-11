const mongoose = require('mongoose');

/**
 * ============================================
 * Demand — what a buyer is looking for
 * ============================================
 * The Marketplace is supply-led: a farmer posts what he has and hopes
 * someone wants it. The middleman wins because he is the one who knows
 * what the market is actually short of. A Demand turns that around — a
 * buyer publishes the crop, quantity and price he needs, and farmers
 * with that crop can come to him instead of guessing what to plant or
 * what to carry to the roadside.
 *
 * A Demand is open to responses (see DemandResponse) and, when a buyer
 * accepts one, becomes a normal escrow Order so the trade is protected.
 */

const DEMAND_STATUSES = ['open', 'matched', 'closed', 'expired'];

const demandSchema = new mongoose.Schema(
    {
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // Normalised crop bucket (mango, maize, ...) so farmers with a
        // matching listing can be shown this demand. 'other' when the
        // free-text does not map to a known coastal-basket crop.
        cropKey: {
            type: String,
            default: 'other',
            index: true
        },
        cropLabel: {
            type: String,
            default: 'Other'
        },
        title: {
            type: String,
            required: [true, 'Say what you are looking for.'],
            trim: true,
            maxlength: [120, 'Title cannot exceed 120 characters.']
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters.']
        },
        quantity: {
            type: Number,
            required: [true, 'Enter how much you need.'],
            min: [0.01, 'Quantity must be more than zero.']
        },
        unit: {
            type: String,
            default: 'unit'
        },
        // What the buyer is willing to pay per unit (optional; some
        // buyers want farmers to quote first).
        targetPrice: {
            type: Number,
            default: null,
            min: [0, 'Target price cannot be negative.']
        },
        location: {
            type: String,
            trim: true,
            maxlength: [120, 'Location cannot exceed 120 characters.']
        },
        neededBy: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: DEMAND_STATUSES,
            default: 'open',
            index: true
        },
        // Set when a response is accepted: the order the buyer should pay.
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        },
        closedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

demandSchema.index({ status: 1, createdAt: -1 });
demandSchema.index({ cropKey: 1, status: 1, createdAt: -1 });
demandSchema.index({ buyer: 1, createdAt: -1 });

demandSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return obj;
};

module.exports = mongoose.models.Demand || mongoose.model('Demand', demandSchema);
module.exports.DEMAND_STATUSES = DEMAND_STATUSES;
