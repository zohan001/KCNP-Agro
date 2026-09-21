/**
 * ============================================
 * Google reCAPTCHA Verification
 * ============================================
 * Server-side validation of a reCAPTCHA token the
 * frontend mints in the background. Uses Google's
 * siteverify API. Works with invisible v2 keys and
 * v3 keys alike; when Google returns a score (v3)
 * it must clear RECAPTCHA_MIN_SCORE.
 * ============================================
 */

const config = require('../config');

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verify a reCAPTCHA response token with Google.
 *
 * @param {string} token    - the token sent from the browser
 * @param {string} [remoteIp] - client IP (optional, recommended)
 * @param {string} [expectedAction] - expected v3 action (optional)
 * @returns {Promise<boolean>} true when Google accepts the token
 */
async function verifyRecaptchaToken(token, remoteIp, expectedAction) {
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
        // v3 tokens carry a confidence score (0.0-1.0). Reject bots that fall
        // below the configured threshold. v2 invisible tokens have no score, so
        // the check is skipped for them.
        if (typeof data.score === 'number' && data.score < config.recaptcha.minScore) {
            console.warn('[Recaptcha] Score too low:', data.score);
            return false;
        }
        // When an action was expected, make sure the token was minted for it.
        if (expectedAction && data.action && String(data.action) !== String(expectedAction)) {
            console.warn(`[Recaptcha] Action mismatch: expected ${expectedAction}, got ${data.action}`);
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