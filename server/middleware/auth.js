const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

/**
 * Resolve the JWT either from the Authorization header (Bearer ...) or from
 * the httpOnly session cookie. The header is preferred for API tooling; the
 * cookie is used when no usable header is present.
 *
 * @param {Object} req
 * @returns {{ token: string|null, source: 'header'|'cookie'|null }}
 */
function resolveToken(req) {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
        const t = header.slice(7).trim();
        if (t) return { token: t, source: 'header' };
    }
    const cookieToken = req.cookies && req.cookies[config.auth.cookieName];
    if (cookieToken) return { token: cookieToken, source: 'cookie' };
    return { token: null, source: null };
}

async function authenticate(req, res, next) {
    const resolved = resolveToken(req);
    if (!resolved.token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please provide a valid token.'
        });
    }

    // CSRF hardening for cookie-authenticated mutations. Because the browser
    // attaches the session cookie automatically, a cross-site request wearing
    // it must be rejected. Two checks, both must pass:
    //   1. The Origin/Referer must be same-host as the request (browsers send
    //      Origin on every cross-origin POST; a forged cross-site request's
    //      Origin would name the attacker's site).
    //   2. The body, when present, must be JSON — our API only accepts JSON, so
    //      any classic <form> (urlencoded/multipart) submission is refused.
    const method = req.method.toUpperCase();
    if (resolved.source === 'cookie' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const host = req.get('host') || '';
        const origin = req.get('origin') || '';
        const referer = req.get('referer') || '';
        let sameOrigin = false;
        if (origin) {
            try { sameOrigin = new URL(origin).host === host; } catch (e) { sameOrigin = false; }
        } else if (referer) {
            try { sameOrigin = new URL(referer).host === host; } catch (e) { sameOrigin = false; }
        }
        if (!sameOrigin) {
            return res.status(403).json({
                success: false,
                message: 'Request blocked by CSRF protection.'
            });
        }
        const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (req.headers['content-type'] && contentType !== 'application/json') {
            return res.status(403).json({
                success: false,
                message: 'Request blocked by CSRF protection.'
            });
        }
    }

    try {
        const decoded = jwt.verify(resolved.token, config.jwt.secret);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists.'
            });
        }
        req.user = user;
        req.authSource = resolved.source;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
}

async function optionalAuthenticate(req, res, next) {
    const resolved = resolveToken(req);
    if (!resolved.token) return next();

    try {
        const decoded = jwt.verify(resolved.token, config.jwt.secret);
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
            req.user = user;
            req.authSource = resolved.source;
        }
        next();
    } catch (err) {
        // Invalid token: continue unauthenticated instead of rejecting.
        next();
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action.'
            });
        }
        next();
    };
}

module.exports = { authenticate, optionalAuthenticate, authorize };