/**
 * ============================================
 * Google reCAPTCHA v2 Verification
 * ============================================
 * Server-side validation of the checkbox token the
 * frontend submits. Uses Google's siteverify API.
 * ============================================
 */

const config = require('../config');

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verify a reCAPTCHA v2 response token with Google.
 *
 * @param {string} token    - the g-recaptcha-response token from the form
 * @param {string} [remoteIp] - client IP (optional, recommended)
 * @returns {Promise<boolean>} true when Google accepts the token
 */
async function verifyRecaptchaToken(token, remoteIp) {
    if (!config.recaptchaConfigured() || !token) return false;

    const ac = new AbortController();
    const guard = setTimeout(() => ac.abort(), 10000);
    try {
        const body = `secret=${encodeURIComponent(config.recaptcha.secretKey)}&response=${encodeURIComponent(token)}`;
        const ip = remoteIp ? `&remoteip=${encodeURIComponent(remoteIp)}` : '';

        const res = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body + ip,
            signal: ac.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!data || data.success !== true) {
            console.warn('[Recaptcha] Verification rejected:', data && data['error-codes']
                ? data['error-codes'].join(', ') : 'unknown reason');
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Recaptcha] Verification request failed:', err.message);
        return false;
    } finally {
        clearTimeout(guard);
    }
}

/**
 * Express middleware. When reCAPTCHA is configured it requires a valid
 * `recaptchaToken` on the request body; otherwise it passes through so
 * development/staging keep working without Google keys.
 */
function requireRecaptcha(req, res, next) {
    if (!config.recaptchaConfigured()) return next();

    const token = String((req.body && req.body.recaptchaToken) || '');
    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Please verify you are not a robot.'
        });
    }

    verifyRecaptchaToken(token, req.ip)
        .then(ok => {
            if (!ok) {
                return res.status(400).json({
                    success: false,
                    message: 'Please verify you are not a robot.'
                });
            }
            return next();
        })
        .catch(() => {
            return res.status(400).json({
                success: false,
                message: 'Please verify you are not a robot.'
            });
        });
}

module.exports = { verifyRecaptchaToken, requireRecaptcha };