#!/usr/bin/env node
/**
 * ============================================
 * Make a user THE super admin (strictly one)
 * ============================================
 * Usage: node scripts/promote-admin.js <email>
 *
 * Connects to MONGO_URI (from .env or the shell), sets the matching
 * user to role 'admin' + isRoot true and ensures the account is active.
 *
 * Only ONE super admin may exist. This script refuses to run while a
 * different admin account already exists, so it is safe to re-run for
 * the same user. Rescue path: pass --force to replace the current admin.
 * ============================================
 */

require('dotenv').config();

async function main() {
    const email = (process.argv[2] || '').trim().toLowerCase();
    const force = process.argv.includes('--force');
    if (!email) {
        console.error('[Promote] Usage: node scripts/promote-admin.js <email> [--force]');
        process.exit(1);
    }

    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
        console.error('[Promote] MONGO_URI environment variable is required.');
        process.exit(1);
    }

    const { connectDB, closeDatabase } = require('../server/db/database');
    const User = require('../server/models/User');

    try {
        await connectDB();
        const found = await User.findOne({ email });
        if (!found) {
            console.error(`[Promote] No user found with email "${email}".`);
            process.exitCode = 1;
            return;
        }

        const existingAdmin = await User.findOne({
            $or: [{ role: 'admin' }, { isRoot: true }],
            _id: { $ne: found._id }
        });
        if (existingAdmin && !force) {
            console.error(
                `[Promote] Refused: only one super admin is allowed and ` +
                `"${existingAdmin.email}" already holds that role. ` +
                `Re-run with --force to transfer it to "${email}".`
            );
            process.exitCode = 1;
            return;
        }

        await User.updateOne(
            { _id: found._id },
            { $set: { role: 'admin', isRoot: true, isActive: true } }
        );

        if (existingAdmin && force) {
            await User.updateOne(
                { _id: existingAdmin._id },
                { $set: { role: 'farmer', isRoot: false } }
            );
            console.log(`[Promote] Previous admin "${existingAdmin.email}" demoted to farmer.`);
        }

        console.log(`[Promote] Done: "${email}" is now THE super admin (God mode).`);
        console.log(`[Promote] Sign out and back in, then open /admin.`);
    } catch (err) {
        console.error('[Promote] Failed:', err.message);
        process.exitCode = 1;
    } finally {
        await closeDatabase();
    }
}

main();