/**
 * ============================================
 * Error Logger Service
 * ============================================
 * Best-effort persistence of runtime errors into
 * the ErrorLog collection. Never throws — a broken
 * logger must not take the app down.
 * ============================================
 */

const ErrorLog = require('../models/ErrorLog');

/**
 * Record an error into the database.
 *
 * @param {Object} opts
 * @param {string} [opts.level]   - 'error' | 'fatal'
 * @param {string} [opts.source]  - where it happened ('http', process...)
 * @param {Error}  [opts.error]   - the error object
 * @param {string} [opts.method]
 * @param {string} [opts.url]
 * @param {number} [opts.status]
 * @returns {Promise<void>}
 */
async function recordError({ level = 'error', source = 'http', error = null, method = '', url = '', status = 500 } = {}) {
    const message = (error && error.message) ? error.message : String(error || 'Unknown error');
    const stack = (error && error.stack) ? error.stack : '';
    try {
        await ErrorLog.create({
            level,
            source,
            message: String(message).slice(0, 2000),
            stack: String(stack).slice(0, 8000),
            method,
            url: String(url).slice(0, 500),
            status
        });
    } catch (err) {
        // Logging must never break the request/response cycle.
        console.error('[ErrorLog] Failed to persist error:', err.message);
    }
}

module.exports = { recordError };