/**
 * ============================================
 * Admin Notification Service
 * ============================================
 * Creates notifications for the admin dashboard.
 * ============================================
 */

const Notification = require('../models/Notification');

/**
 * Notify the admins. Deduplicates identical, still-unread notifications
 * for the same reference so spammy events don't pile up.
 *
 * @param {Object} opts
 * @param {string} opts.type   - 'payment_pending_approval' | 'payment_failed' | 'system'
 * @param {string} opts.message
 * @param {string} [opts.refId] - related document id
 * @returns {Promise<void>}
 */
async function notifyAdmins({ type = 'system', message, refId = null }) {
    if (!message) return;
    try {
        const existing = refId
            ? await Notification.findOne({ type, refId, message, read: false })
            : await Notification.findOne({ type, message, read: false });
        if (existing) return;
        await Notification.create({ type, message, refId });
    } catch (err) {
        console.error('[Notification] Failed to create notification:', err.message);
    }
}

module.exports = { notifyAdmins };