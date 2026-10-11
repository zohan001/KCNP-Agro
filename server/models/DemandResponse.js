const mongoose = require('mongoose');

/**
 * ============================================
 * DemandResponse — a farmer answering a demand
 * ============================================
 * When a buyer publishes a Demand, farmers who can supply the crop
 * reply here with the price and quantity they can offer. The buyer
 * compares the replies and accepts one, which opens an escrow order
 * at the agreed price. One farmer gets one voice per demand, so the
 * buyer compares people, not spam.
 */

const RESPONSE_STATUSES = ['pending', 'accepted', 'declined', 'withdrawn'];

const demandResponseSchema = new mongoose.Schema(
    {
        demand: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Demand',
            required: true,
            index: true
        },
        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // Price the farmer can supply at, per unit.
        supplyPrice: {
            type: Number,
            required: [true, 'Enter the price you can supply at per unit.'],
            min: [0.01, 'Supply price must be more than zero.']
        },
        quantity: {
            type: Number,
            required: [true, 'Enter how much you can supply.'],
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
            enum: RESPONSE_STATUSES,
            default: 'pending',
            index: true
        },
        // Set when the buyer accepts: the escrow order to be paid.
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null
        },
        respondedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// One response per farmer per demand.
demandResponseSchema.index({ demand: 1, farmer: 1 }, { unique: true });
demandResponseSchema.index({ demand: 1, status: 1, supplyPrice: 1, createdAt: -1 });
demandResponseSchema.index({ farmer: 1, status: 1, createdAt: -1 });

demandResponseSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return obj;
};

module.exports = mongoose.models.DemandResponse || mongoose.model('DemandResponse', demandResponseSchema);
module.exports.RESPONSE_STATUSES = RESPONSE_STATUSES;
