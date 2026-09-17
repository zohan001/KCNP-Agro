/**
 * ============================================
 * Subscription Activation Service
 * ============================================
 * Shared logic for marking a subscription paid and
 * flipping the user's membership to active. Used by
 * the Daraja callback, the Paystack webhook and the
 * provider flows in the payment controller.
 * ============================================
 */

const User = require('../models/User');
const { logAudit } = require('../db/database');

/**
 * Activate a subscription (must be caller-owned assumptions handled upstream).
 *
 * @param {Object} sub     - a Subscription mongoose document
 * @param {Object} opts
 * @param {string} [opts.ref]      - M-Pesa receipt / payment reference
 * @param {string} [opts.provider] - 'daraja' | 'paystack' | 'manual'
 * @param {*}      [opts.raw]      - raw callback/webhook payload to store
 * @returns {Promise<Date>} expiresAt
 */
async function activateSubscription(sub, { ref = '', provider = '', raw = null } = {}) {
    const periodMs = (sub.periodMonths || 1) * 30 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + periodMs);

    sub.status = 'active';
    if (ref) sub.mpesaRef = ref;
    if (provider) sub.provider = provider;
    if (raw !== null && raw !== undefined) sub.rawCallback = raw;
    sub.paidAt = new Date();
    sub.expiresAt = expiresAt;

    await sub.save();
    await User.findByIdAndUpdate(sub.user, {
        membership: {
            plan: sub.plan,
            status: 'active',
            expiresAt
        }
    });

    logAudit(
        'SUBSCRIPTION_ACTIVATED',
        `${provider || 'payment'} ${ref || ''} KES ${sub.amount} activated subscription ${sub._id}`
    ).catch(err => console.error('[Audit] Failed to log:', err.message));

    console.log(`[Subscription] Activated ${sub._id} (${provider}) via ${ref || 'admin grant'}`);
    return expiresAt;
}

module.exports = { activateSubscription };