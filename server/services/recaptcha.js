/**
 * ============================================
 * Google reCAPTCHA Verification
 * ============================================
 * Server-side validation of a reCAPTCHA token the
 * frontend mints in the background. Uses Google's
 * siteverify API. Works with invisible v2 keys and
 * v3 keys alike; when Google returns a score (v3)
 * it must clear RECAPTCHA_MIN_SCORE.
 *
 * Only account REGISTRATION is gated by this
 * middleware. Login, password reset and payments
 * deliberately do NOT require a captcha: they sit
 * behind rate limiting and, for login, the password
 * itself, and putting a captcha in front of them
 * locked real members out whenever Google's script
 * was slow, blocked by an extension, or the network
 * dropped.
 *
 * Because an invisible widget can fail to render at
 * all, a missing token is NEVER treated as proof of
 * a bot. A missing token simply means the captcha
 * could not be reached, so the request falls through
 * to the cheap server-side heuristics in
 * `passesHeuristicChecks`. The same is true when
 * Google REFUSES a token we did send: a rejection
 * with a wrong/stale secret, a key whose domain list
 * does not cover this host, or a Google outage all
 * look identical from here and none of them prove a
 * bot — an attacker skips the captcha entirely by
 * sending no token at all. Rejecting on Google's
 * verdict therefore locked real members out while
 * adding no protection, so a rejected token falls
 * back to the same heuristics (and is logged).
 * ============================================
 */

const config = require('../config');

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/** Fields a human never sees or fills. Any value means a bot filled the form. */
const HONEYPOT_FIELDS = ['website', 'company_website', 'fax'];

/** Minimum plausible time between a page render and a submit. */
const MIN_FILL_MS = 1200;

/** How far into the future a client timestamp is allowed to sit. */
const MAX_CLOCK_SKEW_MS = 60000;

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
            // These lines are the only way to learn WHY Google refused
            // (invalid-input-secret = keys do not pair up, a hostname in
            // error-codes = the key's domain list excludes this host, ...).
            // Check them in the host's logs before touching the config.
            console.warn('[Recaptcha] Verification rejected:', data && data['error-codes']
                ? data['error-codes'].join(', ') : 'unknown reason',
                '| hostname:', data.hostname || 'n/a');
            return false;
        }
        // v3 tokens carry a confidence score (0.0-1.0). Reject bots that fall
        // below the configured threshold. v2 invisible tokens have no score, so
        // the check is skipped for them.
        if (typeof data.score === 'number' && data.score < config.recaptcha.minScore) {
            console.warn('[Recaptcha] Score too low:', data.score, '| hostname:', data.hostname || 'n/a');
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
 * Cheap checks that need no third party: an untouched honeypot field and a
 * human-plausible time on the form. Used only when no captcha token could be
 * minted, so that a blocked or slow Google script can never lock a real
 * member out of the platform.
 *
 * @param {Object} req - Express request object
 * @returns {{ ok: boolean, reason?: string }}
 */
function passesHeuristicChecks(req) {
    const body = (req && req.body) || {};

    for (const field of HONEYPOT_FIELDS) {
        const value = body[field];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return { ok: false, reason: 'honeypot' };
        }
    }

    const startedAt = Number(body.formStartedAt);
    if (Number.isFinite(startedAt) && startedAt > 0) {
        const elapsed = Date.now() - startedAt;
        // A stamp from the future means a tampered or badly skewed client.
        // Checked first: every future stamp is also "too fast" to fill in.
        if (elapsed < -MAX_CLOCK_SKEW_MS) return { ok: false, reason: 'bad-timestamp' };
        if (elapsed < MIN_FILL_MS) return { ok: false, reason: 'too-fast' };
    }

    return { ok: true };
}

/**
 * Express middleware for registration. A request is accepted when reCAPTCHA
 * vouches for it (token Google accepts), when the captcha never ran at all, or
 * when Google refused a token we sent but the cheap heuristics below still
 * look human. Only a submission that trips a heuristic — a honeypot field or
 * an impossible fill time — is rejected.
 */
function requireRecaptcha(req, res, next) {
    if (!config.recaptchaConfigured()) return next();

    const token = String((req.body && req.body.recaptchaToken) || '');

    // Captcha unavailable or unusable: the widget never ran (offline,
    // blocked, slow) or Google would not accept what it minted (mispaired
    // keys, a domain list that excludes this host, a Google hiccup). Either
    // way the captcha has nothing to say about this visitor, so the request
    // falls through to the heuristics instead of failing a genuine member.
    const fallBackToHeuristics = () => {
        const verdict = passesHeuristicChecks(req);
        if (!verdict.ok) {
            console.warn(`[Recaptcha] Blocked registration (${verdict.reason}${token ? ', token rejected' : ', no token'})`);
            return res.status(400).json({
                success: false,
                message: 'Your submission was flagged as automated. Please reload the page and try again.'
            });
        }
        if (token) {
            console.warn('[Recaptcha] Allowing registration on heuristics after Google rejected the token.');
        }
        return next();
    };

    if (!token) return fallBackToHeuristics();

    verifyRecaptchaToken(token, req.ip)
        .then(ok => (ok ? next() : fallBackToHeuristics()))
        .catch(() => fallBackToHeuristics());
}

module.exports = { verifyRecaptchaToken, requireRecaptcha, passesHeuristicChecks };