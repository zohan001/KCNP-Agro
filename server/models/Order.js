const mongoose = require('mongoose');

/**
 * ============================================
 * Order — a purchase held in escrow
 * ============================================
 * The record that makes the platform accountable:
 *
 *   1. A trader raises an order for a listing.
 *   2. The trader pays. The money is HELD by the
 *      platform — status `paid_in_escrow`. The
 *      farmer is not paid yet.
 *   3. The farmer marks the goods dispatched with
 *      courier details and proof.
 *   4. The trader confirms the goods reached them.
 *   5. Only then is the money released to the farmer
 *      (status `released`).
 *
 * If anything goes wrong the trader raises a dispute
 * and an admin resolves it from the admin dashboard.
 * Funds are never moved on the seller's say-so alone.
 *
 * Every state change is appended to `timeline`, which
 * is the permanent, tamper-evident history we show to
 * both sides.
 */

const TIMELINE_ACTIONS = [
    'placed',
    'payment_started',
    'paid_in_escrow',
    'dispatched',
    'delivered',
    'delivery_confirmed',
    'released',
    'dispute_opened',
    'dispute_resolved',
    'cancelled',
    'refunded'
];

const orderSchema = new mongoose.Schema(
    {
        reference: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true
        },
        // Snapshot of the listing so history stays truthful even if the
        // farmer later edits the title, price or photo.
        item: {
            title: { type: String, required: true },
            unit: { type: String, default: 'unit' },
            unitPrice: { type: Number, required: true, min: 0 },
            image: { type: String, default: '' }
        },
        quantity: {
            type: Number,
            required: true,
            min: [0.01, 'Quantity must be more than zero.']
        },
        total: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            default: 'KES'
        },

        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        status: {
            type: String,
            enum: [
                'awaiting_payment',
                'paid_in_escrow',
                'dispatched',
                'delivered',
                'released',
                'disputed',
                'cancelled',
                'refunded'
            ],
            default: 'awaiting_payment',
            index: true
        },

        // Where the money is right now.
        payment: {
            provider: {
                type: String,
                enum: ['none', 'paystack', 'daraja', 'manual'],
                default: 'none'
            },
            reference: { type: String, default: '', index: true },
            mpesaPhone: { type: String, default: '' },
            amountPaid: { type: Number, default: 0 },
            paidAt: { type: Date, default: null },
            needsOtp: { type: Boolean, default: false },
            otpReference: { type: String, default: '' }
        },

        // Delivery trail: who moved what, when, and proof that they did.
        delivery: {
            method: {
                type: String,
                enum: ['none', 'farrier', 'courier', 'pickup', 'other'],
                default: 'none'
            },
            carrierName: { type: String, default: '' },
            trackingCode: { type: String, default: '' },
            dispatchedAt: { type: Date, default: null },
            expectedAt: { type: Date, default: null },
            deliveredAt: { type: Date, default: null },
            receivedBy: { type: String, default: '' },
            receiverPhone: { type: String, default: '' },
            notes: { type: String, default: '', maxlength: 500 },
            proofPhoto: { type: String, default: '' },
            // Funds auto-release this long after dispatch IF nothing is wrong,
            // so a buyer who goes quiet can never freeze a farmer's money.
            autoReleaseAt: { type: Date, default: null }
        },

        // Escrow bookkeeping.
        escrow: {
            heldAt: { type: Date, default: null },
            releasedAt: { type: Date, default: null },
            releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            platformFee: { type: Number, default: 0 },
            farmerPayout: { type: Number, default: 0 },
            farmerPayoutReference: { type: String, default: '' },
            payoutConfirmedAt: { type: Date, default: null }
        },

        dispute: {
            reason: { type: String, default: '', maxlength: 1000 },
            openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            openedAt: { type: Date, default: null },
            resolution: { type: String, default: '', maxlength: 1000 },
            resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            resolvedAt: { type: Date, default: null }
        },

        timeline: [
            {
                _id: false,
                at: { type: Date, default: Date.now },
                action: { type: String, enum: TIMELINE_ACTIONS, required: true },
                by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                note: { type: String, default: '', maxlength: 500 }
            }
        ]
    },
    { timestamps: true }
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ status: 1, 'delivery.autoReleaseAt': 1 });

/**
 * Append a permanent entry to the order's history.
 *
 * @param {mongoose.Document} order
 * @param {string} action - one of TIMELINE_ACTIONS
 * @param {Object} [opts]
 * @param {string} [opts.by] - user id responsible
 * @param {string} [opts.note] - human readable detail
 */
orderSchema.methods.record = function record(action, { by = null, note = '' } = {}) {
    this.timeline.push({ action, by, note });
    return this;
};

orderSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return obj;
};

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports.TIMELINE_ACTIONS = TIMELINE_ACTIONS;