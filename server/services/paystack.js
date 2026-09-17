/**
 * ============================================
 * Paystack Service (Kenya M-Pesa)
 * ============================================
 * Triggers M-Pesa charges via the Paystack Charge
 * API and verifies webhook signatures. Paystack
 * handles the STK push to the farmer's phone; the
 * result arrives as a charge.success webhook.
 * ============================================
 */

const crypto = require('crypto');
const config = require('../config');

const BASE = 'https://api.paystack.co';

/**
 * Convert a local phone (07XX..., 7XX..., 2547...) into the
 * international 2547XXXXXXXXX format, or a 254-corrected form.
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizePhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (/^2547/.test(digits)) return digits;
    if (/^07/.test(digits)) return '254' + digits.slice(1);
    if (/^7/.test(digits)) return '254' + digits;
    return digits;
}

/**
 * Authenticated fetch against api.paystack.co.
 *
 * @param {string} path
 * @param {Object} opts
 * @returns {Promise<Object>} the full Paystack response body
 */
async function request(path, { method = 'GET', body } = {}) {
    const ac = new AbortController();
    const guard = setTimeout(() => ac.abort(), 20000);
    try {
        const res = await fetch(BASE + path, {
            method,
            headers: {
                Authorization: `Bearer ${config.paystack.secretKey}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: ac.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.status === false) {
            throw new Error(`Paystack ${res.status} ${method} ${path}: ${data.message || res.statusText}`);
        }
        return data;
    } finally {
        clearTimeout(guard);
    }
}

/**
 * Start an M-Pesa charge. Amount is KES; Paystack charges in the smallest
 * currency unit (cents). Response data.status can be 'pay_offline',
 * 'send_otp', 'success', 'failed' or 'timeout'.
 *
 * @param {Object} opts
 * @param {string} opts.email      - customer email
 * @param {number} opts.amountKes  - amount in KES
 * @param {string} opts.phone      - customer's M-Pesa number
 * @param {string} opts.reference  - unique transaction reference
 * @param {Object} [opts.metadata] - extra data echoed in webhooks
 * @returns {Promise<Object>}
 */
function charge({ email, amountKes, phone, reference, metadata = {} }) {
    return request('/charge', {
        method: 'POST',
        body: {
            email,
            amount: Math.round(amountKes * 100),
            currency: config.paystack.currency,
            reference,
            metadata,
            mobile_money: {
                phone: normalizePhone(phone),
                provider: 'mpesa'
            }
        }
    });
}

/**
 * Submit the OTP the customer received (required when the charge
 * response status is 'send_otp').
 *
 * @param {string} reference
 * @param {string} otp
 * @returns {Promise<Object>}
 */
function submitOtp(reference, otp) {
    return request('/charge/submit_otp', {
        method: 'POST',
        body: { reference, otp: String(otp).trim() }
    });
}

/**
 * Check the status of a pending charge (call >= 10s after initiating).
 *
 * @param {string} reference
 * @returns {Promise<Object>}
 */
function checkCharge(reference) {
    return request('/charge/' + encodeURIComponent(reference));
}

/**
 * Confirm a webhook actually came from Paystack. The signature is an
 * HMAC-SHA512 of the RAW request body using the Paystack secret key,
 * sent in the x-paystack-signature header.
 *
 * @param {Buffer|string} rawBody  - the raw body bytes
 * @param {string} signature       - header value
 * @returns {boolean}
 */
function verifySignature(rawBody, signature) {
    if (!rawBody || !signature || !config.paystack.secretKey) return false;
    const hash = crypto.createHmac('sha512', config.paystack.secretKey)
        .update(rawBody)
        .digest('hex');
    try {
        const a = Buffer.from(hash, 'utf8');
        const b = Buffer.from(String(signature), 'utf8');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

module.exports = { charge, submitOtp, checkCharge, verifySignature, normalizePhone };