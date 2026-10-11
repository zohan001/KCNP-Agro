const mongoose = require('mongoose');

/**
 * ============================================
 * Reservation — trade before the harvest
 * ============================================
 * The middleman's power comes from buying at the roadside for cash, then
 * finding a buyer later. A farmer who has a confirmed buyer and a deposit
 * before harvest is no longer at his mercy.
 *
 * A buyer proposes to reserve part of a listing's next harvest at an agreed
 * price and pays a deposit into the same escrow the marketplace already
 * uses. The farmer sees committed demand and money before he plants or
 * picks. When the goods change hands the balance is paid through escrow too,
 * so neither side can walk away from the deal.
 *
 * The deposit and the balance are ordinary escrow Orders (purpose 'deposit'
 * and 'balance') — this document only links them together and tracks the
 * agreement's own lifecycle.
 */

const RESERVATION_STATUSES = [
    'proposed',          // buyer asked to reserve; the farmer must accept
    'awaiting_deposit',  // farmer accepted; a deposit order is open, unpaid
    'reserved',          // deposit held in escrow; harvest still to come
    'fulfilled',         // goods handed over; a balance order is open
    'completed',         // balance paid and delivery confirmed
    'cancelled',         // declined or pulled before any money moved
    'expired',           // proposal or deposit window lapsed
    'refunded',          // deposit returned by an admin
    'defaulted'          // farmer failed to deliver; an admin decided
];

const RESERVATION_TIMELINE = [
    'proposed',
    'accepted',
    'deposit_paid',
    'declined',
    'fulfilled',
    'completed',
    'cancelled',
    'expired',
    'refunded',
    'defaulted',
    'note'
];

const reservationSchema = new mongoose.Schema(
    {
        listing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true
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
        // Normalised crop bucket so reservations line up with the rest of
        // the platform's crop vocabulary (dashboards, price board, demand).
        cropKey: {
            type: String,
            default: 'other',
            index: true
        },
        cropLabel: {
            type: String,
            default: 'Other'
        },
        // Snapshot of the deal so the agreement stays truthful even if the
        // listing is edited or removed afterwards.
        item: {
            title: { type: String, required: true },
            unit: { type: String, default: 'unit' },
            unitPrice: { type: Number, required: true, min: 0 },
            image: { type: String, default: '' },
            // Provenance snapshotted from the listing, carried into both the
            // deposit and the balance escrow orders.
            batch: {
                code: { type: String, default: '' },
                harvestDate: { type: Date, default: null },
                grade: { type: String, default: '' },
                origin: { type: String, default: '' }
            }
        },
        quantity: {
            type: Number,
            required: true,
            min: [0.01, 'Quantity must be more than zero.']
        },
        totalValue: {
            type: Number,
            required: true,
            min: 0
        },
        depositPercent: {
            type: Number,
            default: 20,
            min: 0,
            max: 100
        },
        depositAmount: {
            type: Number,
            required: true,
            min: 0
        },
        balanceAmount: {
            type: Number,
            required: true,
            min: 0
        },
        harvestWindowStart: {
            type: Date,
            default: null
        },
        harvestWindowEnd: {
            type: Date,
            default: null
        },
        terms: {
            type: String,
            default: '',
            maxlength: 1000
        },

        status: {
            type: String,
            enum: RESERVATION_STATUSES,
            default: 'proposed',
            index: true
        },

        // The two escrow orders that carry the money.
        depositOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null
        },
        finalOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null
        },

        expiresAt: { type: Date, default: null },
        acceptedAt: { type: Date, default: null },
        depositPaidAt: { type: Date, default: null },
        fulfilledAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },

        timeline: [
            {
                _id: false,
                at: { type: Date, default: Date.now },
                action: { type: String, enum: RESERVATION_TIMELINE, required: true },
                by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                note: { type: String, default: '', maxlength: 500 }
            }
        ]
    },
    { timestamps: true }
);

reservationSchema.index({ listing: 1, createdAt: -1 });
reservationSchema.index({ seller: 1, status: 1, createdAt: -1 });
reservationSchema.index({ buyer: 1, status: 1, createdAt: -1 });

/**
 * Append a permanent entry to the reservation's history.
 *
 * @param {string} action - one of RESERVATION_TIMELINE
 * @param {Object} [opts]
 * @param {string} [opts.by] - user id responsible
 * @param {string} [opts.note] - human readable detail
 */
reservationSchema.methods.record = function record(action, { by = null, note = '' } = {}) {
    this.timeline.push({ action, by, note });
    return this;
};

reservationSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return obj;
};

module.exports = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);
module.exports.RESERVATION_STATUSES = RESERVATION_STATUSES;
module.exports.RESERVATION_TIMELINE = RESERVATION_TIMELINE;
