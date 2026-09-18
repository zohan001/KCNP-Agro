/**
 * ============================================
 * Application Secret Resolution
 * ============================================
 * Resolves the JWT signing secret so the app
 * can start cleanly even when JWT_SECRET is
 * not supplied by the host.
 *
 * Preference order:
 *   1. A real JWT_SECRET environment variable.
 *   2. Outside production: the development default.
 *   3. Production without an env secret: generate a
 *      cryptographically random secret and persist it in
 *      MongoDB so it survives restarts/redeploys.
 *   4. If persistence fails, fall back to an ephemeral
 *      random secret (site stays up; sessions reset on
 *      restart) and warn loudly.
 * ============================================
 */

const crypto = require('crypto');
const config = require('../config');
const AppSecret = require('../models/AppSecret');

const DEV_DEFAULT = 'dev-secret-change-in-production';
const SECRET_KEY = 'jwt_secret';
const SECRET_BYTES = 48; // 96 hex characters

function generateSecret() {
    return crypto.randomBytes(SECRET_BYTES).toString('hex');
}

/**
 * Resolve the JWT signing secret.
 *
 * @returns {Promise<{ secret: string, source: 'env'|'default'|'database'|'ephemeral' }>}
 */
async function resolveJwtSecret() {
    // 1. An explicitly configured secret always wins.
    if (config.jwt.secret && config.jwt.secret !== DEV_DEFAULT) {
        return { secret: config.jwt.secret, source: 'env' };
    }

    // 2. Development/test keep the well-known default for convenience.
    if (config.env !== 'production') {
        return { secret: config.jwt.secret || DEV_DEFAULT, source: 'default' };
    }

    // 3. Production: generate once and persist.
    try {
        const generated = generateSecret();
        const doc = await AppSecret.findOneAndUpdate(
            { key: SECRET_KEY },
            { $setOnInsert: { key: SECRET_KEY, value: generated } },
            { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        );
        if (doc && doc.value) {
            return { secret: doc.value, source: 'database' };
        }
        throw new Error('persisted secret document is empty');
    } catch (err) {
        // Concurrent first boot can race on the unique index.
        if (err && err.code === 11000) {
            const existing = await AppSecret.findOne({ key: SECRET_KEY }).catch(() => null);
            if (existing && existing.value) {
                return { secret: existing.value, source: 'database' };
            }
        }
        console.error(
            '[Security] Could not persist an auto-generated JWT_SECRET, using an ' +
            'ephemeral one. Sessions will be invalidated on every restart. Error:',
            err.message
        );
        return { secret: generateSecret(), source: 'ephemeral' };
    }
}

module.exports = { resolveJwtSecret, DEV_DEFAULT };
