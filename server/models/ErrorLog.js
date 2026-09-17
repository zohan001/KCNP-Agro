/**
 * ============================================
 * Error Log Model
 * ============================================
 * Persists application errors so they can be
 * reviewed in the admin dashboard without
 * shipping logs off to a third-party service.
 * ============================================
 */

const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema(
    {
        level: {
            type: String,
            enum: ['error', 'fatal'],
            default: 'error'
        },
        source: {
            type: String,
            trim: true,
            default: 'http'
        },
        message: {
            type: String,
            trim: true,
            default: ''
        },
        stack: {
            type: String,
            default: ''
        },
        method: {
            type: String,
            default: ''
        },
        url: {
            type: String,
            default: ''
        },
        status: {
            type: Number,
            default: 500
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

errorLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.ErrorLog || mongoose.model('ErrorLog', errorLogSchema);