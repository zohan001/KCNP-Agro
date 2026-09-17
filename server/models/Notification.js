/**
 * ============================================
 * Notification Model
 * ============================================
 * Admin-facing notifications (e.g. a payment is
 * waiting for manual approval).
 * ============================================
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['payment_pending_approval', 'payment_failed', 'system'],
            default: 'system'
        },
        message: {
            type: String,
            required: [true, 'Message is required.'],
            trim: true
        },
        refId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        read: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

notificationSchema.index({ read: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);