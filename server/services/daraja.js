/**
 * ============================================
 * Daraja (Safaricom M-Pesa) STK Push Service
 * ============================================
 * Handles the OAuth token, the STK push request
 * and parsing of the STK callback payload. Uses
 * the global fetch (Node >= 18), matching the
 * rest of the codebase.
 * ============================================
 */

const config = require('../config');

let cachedToken = null;

/**
 * Convert a local phone (07XX..., 7XX..., 2547...) into
 * the international 2547XXXXXXXXX format Safaricom expects.
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
 * Compute the Daraja STK timestamp (YYYYMMDDHHmmss).
 *
 * @returns {string}
 */
function mpesaTimestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Fetch (and cache) an OAuth access token.
 *
 * @returns {Promise<string>} bearer token
 */
async function getAccessToken() {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.value;
    }

    const d = config.daraja;
    const auth = Buffer.from(`${d.consumerKey}:${d.consumerSecret}`).toString('base64');
    const url = `${d.baseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

    const ac = new AbortController();
    const guard = setTimeout(() => ac.abort(), 12000);
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Basic ${auth}` }
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(`OAuth ${res.status}: ${detail.slice(0, 160)}`);
        }
        const data = await res.json();
        if (!data.access_token) {
            throw new Error(`OAuth returned no token: ${JSON.stringify(data).slice(0, 160)}`);
        }
        const expiresIn = parseInt(data.expires_in, 10) || 3599;
        cachedToken = {
            value: data.access_token,
            expiresAt: Date.now() + (expiresIn - 60) * 1000
        };
        return cachedToken.value;
    } finally {
        clearTimeout(guard);
    }
}

/**
 * Trigger an STK push (Lipa na M-Pesa Online / PayBill).
 *
 * @param {string} phone     - Farmer's M-Pesa number (local or 254 format)
 * @param {number} amount    - Amount in KES
 * @param {string} accountRef- AccountReference sent to M-Pesa (<= 12 chars)
 * @param {string} [desc]    - Transaction description (<= 20 chars)
 * @returns {Promise<Object>} the raw Daraja STK response
 */
async function stkPush(phone, amount, accountRef, desc) {
    const d = config.daraja;
    const token = await getAccessToken();
    const ts = mpesaTimestamp();
    const password = Buffer.from(`${d.shortcode}${d.passkey}${ts}`).toString('base64');
    const party = normalizePhone(phone);

    const body = {
        BusinessShortCode: d.shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: party,
        PartyB: d.shortcode,
        PhoneNumber: party,
        CallBackURL: d.callbackUrl,
        AccountReference: String(accountRef || 'KCNP').slice(0, 12),
        TransactionDesc: String(desc || 'Subscription').slice(0, 20)
    };

    const url = `${d.baseUrl()}/mpesa/stkpush/v1/processrequest`;
    const ac = new AbortController();
    const guard = setTimeout(() => ac.abort(), 15000);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: ac.signal
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(`STK ${res.status}: ${detail.slice(0, 160)}`);
        }
        return await res.json();
    } finally {
        clearTimeout(guard);
    }
}

/**
 * Parse a Daraja STK callback body into a usable object.
 *
 * @param {Object} raw - the raw POST body from Safaricom
 * @returns {Object|null}
 */
function parseCallback(raw) {
    const cb = raw && raw.Body && raw.Body.stkCallback ? raw.Body.stkCallback : null;
    if (!cb) return null;

    const meta = {};
    if (cb.CallbackMetadata && Array.isArray(cb.CallbackMetadata.Item)) {
        for (const item of cb.CallbackMetadata.Item) {
            if (item && item.Name) meta[item.Name] = item.Value;
        }
    }

    return {
        resultCode: cb.ResultCode,
        resultDesc: cb.ResultDesc,
        merchantRequestId: cb.MerchantRequestID || '',
        checkoutRequestId: cb.CheckoutRequestID || '',
        receipt: meta.MpesaReceiptNumber || '',
        transactionDate: meta.TransactionDate || '',
        phone: meta.PhoneNumber || ''
    };
}

module.exports = { getAccessToken, stkPush, parseCallback, normalizePhone };