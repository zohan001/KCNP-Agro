/**
 * ============================================
 * M-Pesa (Daraja) Callback Controller
 * ============================================
 * Receives the STK push result from Safaricom at
 * POST /mpesa/callback and activates the matching
 * subscription when the payment succeeds.
 * ============================================
 */

const Subscription = require('../models/Subscription');
const { logAudit } = require('../db/database');
const { parseCallback } = require('../services/daraja');
const { activateSubscription } = require('../services/subscriptions');
const config = require('../config');

/**
 * POST /mpesa/callback — Safaricom STK callback. Must respond 200 quickly,
 * always with a valid Daraja result object so Safaricom does not retry.
 */
async function stkCallback(req, res) {
    if (!config.mpesaConfigured()) {
        return res.status(200).json({ ResultCode: 1, ResultDesc: 'Daraja not configured' });
    }

    const parsed = parseCallback(req.body);
    if (!parsed || !parsed.checkoutRequestId) {
        return res.status(200).json({ ResultCode: 1, ResultDesc: 'Malformed callback payload' });
    }

    try {
        const sub = await Subscription.findOne({ checkoutRequestId: parsed.checkoutRequestId });
        if (!sub) {
            console.warn('[Mpesa] Callback for unknown CheckoutRequestID:', parsed.checkoutRequestId);
            return res.status(200).json({ ResultCode: 1, ResultDesc: 'Unknown CheckoutRequestID' });
        }

        if (parsed.resultCode === 0 && parsed.receipt) {
            await activateSubscription(sub, {
                ref: parsed.receipt,
                provider: 'daraja',
                raw: req.body
            });
            return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
        }

        // Payment cancelled or failed — keep the subscription pending so the
        // farmer can retry and the admin can still act on it.
        sub.rawCallback = req.body;
        await sub.save();
        logAudit('PAYMENT_CANCELLED',
            `M-Pesa callback ${parsed.resultCode} (${parsed.resultDesc}) for subscription ${sub._id}`)
            .catch(err => console.error('[Audit] Failed to log:', err.message));
        console.warn(`[Mpesa] Non-success callback for ${sub._id}:`, parsed.resultCode, parsed.resultDesc);
        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (err) {
        console.error('[Mpesa] Callback handling failed:', err.message);
        return res.status(200).json({ ResultCode: 1, ResultDesc: 'Processing error' });
    }
}

module.exports = { stkCallback };