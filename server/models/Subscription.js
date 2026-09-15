const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        plan: {
            type: String,
            enum: ['starter', 'grower', 'pro'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        periodMonths: {
            type: Number,
            required: true
        },
        mpesaPhone: {
            type: String,
            default: ''
        },
        mpesaRef: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['pending', 'active', 'expired', 'cancelled', 'denied'],
            default: 'pending'
        },
        expiresAt: {
            type: Date,
            default: null
        },
        paidAt: {
            type: Date,
            default: null
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

subscriptionSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return obj;
};

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);