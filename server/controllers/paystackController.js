/**
 * ============================================
 * Paystack Webhook Controller
 * ============================================
 * Receives Paystack charge.success / charge.failed
 * events at POST /paystack/webhook and activates
 * the matching subscription.
 * ============================================
 */

const Subscription = require('../models/Subscription');
const { logAudit } = require('../db/database');
const paystack = require('../services/paystack');
const { activateSubscription } = require('../services/subscriptions');
const config = require('../config');

function findSubscriptionByReference(reference) {
    return Subscription.findOne({
        $or: [
            { paystackReference: reference },
            { mpesaRef: reference }
        ]
    });
}

/**
 * POST /paystack/webhook — Paystack posts events here. Always acknowledge
 * quickly; activation happens asynchronously after the signature is checked.
 */
async function webhook(req, res) {
    if (!config.paystackConfigured()) {
        return res.sendStatus(200);
    }

    const signature = req.headers['x-paystack-signature'];
    if (!paystack.verifySignature(req.rawBody, signature)) {
        console.warn('[Paystack] Rejected webhook: bad signature');
        return res.sendStatus(401);
    }

    const event = req.body;
    const data = event && event.data;

    try {
        if (event && event.event === 'charge.success' && data) {
            const sub = await findSubscriptionByReference(data.reference);
            if (!sub) {
                console.warn('[Paystack] charge.success for unknown reference:', data.reference);
                return res.sendStatus(200);
            }

            // Sanity-check the amount (Paystack reports cents).
            const expected = sub.amount * 100;
            if (typeof data.amount === 'number' && data.amount !== expected) {
                console.warn(
                    `[Paystack] Amount mismatch for ${data.reference}: got ${data.amount}, expected ${expected}`
                );
            }

            await activateSubscription(sub, {
                ref: data.reference,
                provider: 'paystack',
                raw: data
            });
        } else if (event && event.event === 'charge.failed' && data) {
            await Subscription.updateOne(
                { paystackReference: data.reference },
                { $set: { rawCallback: data } }
            );
            logAudit('PAYMENT_CANCELLED',
                `Paystack ${data.reference} failed (${data.gateway_response || ''})`)
                .catch(err => console.error('[Audit] Failed to log:', err.message));
        }
    } catch (err) {
        console.error('[Paystack] Webhook handling failed:', err.message);
    }

    return res.sendStatus(200);
}

module.exports = { webhook };