const mongoose = require('mongoose');

/**
 * ============================================
 * LogisticsProvider — transport & collection registry
 * ============================================
 * The middleman is not only a buyer; he is also the farmer's transport
 * and collection point. A platform that deletes him without replacing
 * those services loses the farmer his route to market. So we do not
 * pretend to own trucks or warehouses — we register the people who
 * already do, verify them, and make them findable and accountable.
 *
 * One document describes either a collection point (where produce is
 * bulked and sorted), a transporter (who moves it) or a cold store.
 * Admins mark trusted ones `verified`, which is shown as a partner badge.
 */

const PROVIDER_TYPES = ['collection_point', 'transporter', 'cold_storage'];
const SERVICES = ['bulking', 'grading', 'sorting', 'weighing', 'storage', 'cold_chain', 'haulage', 'packaging', 'credit'];
const FEE_MODELS = ['negotiable', 'free', 'per_load', 'per_km', 'per_kg', 'commission'];

const logisticsProviderSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: PROVIDER_TYPES,
            required: [true, 'Choose what kind of service you offer.'],
            index: true
        },
        name: {
            type: String,
            required: [true, 'Give your service a name.'],
            trim: true,
            maxlength: [120, 'Name cannot exceed 120 characters.']
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters.']
        },
        // Free text, matching how listings describe location (county/town).
        location: {
            type: String,
            trim: true,
            maxlength: [120, 'Location cannot exceed 120 characters.']
        },
        // Normalised crop buckets handled (mango, maize, ...). Empty means
        // "any crop". Kept as keys so the directory can filter cleanly.
        cropsHandled: [{
            type: String,
            index: true
        }],
        services: [{
            type: String,
            enum: SERVICES
        }],
        // Optional scale, e.g. 40 (bag) or 8 (tonne) per day/trip.
        capacity: {
            type: Number,
            default: null,
            min: [0, 'Capacity cannot be negative.']
        },
        capacityUnit: {
            type: String,
            default: '',
            trim: true,
            maxlength: [32, 'Capacity unit cannot exceed 32 characters.']
        },
        feeModel: {
            type: String,
            enum: FEE_MODELS,
            default: 'negotiable'
        },
        feeNote: {
            type: String,
            default: '',
            trim: true,
            maxlength: [200, 'Fee note cannot exceed 200 characters.']
        },
        contactPhone: {
            type: String,
            default: '',
            trim: true,
            maxlength: [30, 'Phone cannot exceed 30 characters.']
        },
        contactEmail: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
            maxlength: [120, 'Email cannot exceed 120 characters.']
        },
        // Areas the service covers, e.g. ["Kilifi", "Mombasa", "Kwale"].
        coverageAreas: [{
            type: String,
            trim: true,
            maxlength: [80, 'Coverage area cannot exceed 80 characters.']
        }],
        verified: {
            type: Boolean,
            default: false,
            index: true
        },
        verifiedAt: { type: Date, default: null },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        active: {
            type: Boolean,
            default: true,
            index: true
        },
        // Reputation mirror, like User.rating, so the directory can show a
        // score without aggregating on every page view.
        rating: {
            average: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0, min: 0 }
        }
    },
    { timestamps: true }
);

logisticsProviderSchema.index({ type: 1, active: 1, createdAt: -1 });
logisticsProviderSchema.index({ location: 1, type: 1 });
logisticsProviderSchema.index({ owner: 1, createdAt: -1 });

logisticsProviderSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return obj;
};

module.exports = mongoose.models.LogisticsProvider || mongoose.model('LogisticsProvider', logisticsProviderSchema);
module.exports.PROVIDER_TYPES = PROVIDER_TYPES;
module.exports.SERVICES = SERVICES;
module.exports.FEE_MODELS = FEE_MODELS;
