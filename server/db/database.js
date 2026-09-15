/**
 * ============================================
 * Database Module
 * ============================================
 * Handles the MongoDB connection using Mongoose
 * and exports the connection and helper functions.
 * ============================================
 */

const mongoose = require('mongoose');

// Import audit log model for the logAudit helper
const AuditLog = require('../models/AuditLog');

// Import environment configuration
require('dotenv').config();

/**
 * Establish a connection to MongoDB.
 *
 * Uses the MONGO_URI environment variable.
 *
 * @returns {Promise<void>} Resolves when connected
 */
async function connectDB() {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
        // Fail fast with a clear message if no connection string is provided
        throw new Error(
            'MONGO_URI environment variable is not set. ' +
            'Please provide a MongoDB connection string.'
        );
    }

    try {
        // Connect to MongoDB with connection options
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 15000, // Fail after 15s if no server
            maxPoolSize: 10 // Limit connection pool
        });
        console.log('[DB] Connected to MongoDB successfully.');
    } catch (err) {
        console.error('[DB] Failed to connect to MongoDB:', err.message);
        throw err;
    }
}

/**
 * Initialize the database - creates indexes.
 * Runs after connectDB.
 *
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
    // Ensure indexes are built for models with unique constraints
    // (e.g., NewsletterSubscriber email unique index)
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    await ensureDemoAccounts();
    console.log('[DB] MongoDB indexes initialized.');
}

/**
 * Idempotently ensure demo/seed accounts stay usable:
 *  - seed users are active (isActive true)
 *  - the demo farmer holds an active membership so the marketplace demo works
 */
async function ensureDemoAccounts() {
    try {
        const User = require('../models/User');
        const emails = ['admin@kcnpagro.org', 'farmer@example.com', 'trader@example.com'];
        const update = { $set: { isActive: true } };
        if (User.updateMany) {
            await User.updateMany({ email: { $in: emails } }, update);
        }
        const farmer = await User.findOne({ email: 'farmer@example.com' }).lean();
        if (farmer && (!farmer.membership || farmer.membership.status !== 'active' ||
            !farmer.membership.expiresAt || new Date(farmer.membership.expiresAt) <= new Date())) {
            await User.updateOne({ email: 'farmer@example.com' }, {
                $set: {
                    membership: {
                        plan: 'grower',
                        status: 'active',
                        expiresAt: new Date(Date.now() + 13 * 30 * 24 * 60 * 60 * 1000)
                    }
                }
            });
            console.log('[DB] Demo farmer membership ensured.');
        }
    } catch (err) {
        console.error('[DB] ensureDemoAccounts failed:', err.message);
    }
}

/**
 * Log an action to the audit log collection.
 *
 * @param {string} action - The action performed
 * @param {string|null} details - Additional details about the action
 * @returns {Promise<void>}
 */
async function logAudit(action, details = null) {
    try {
        await AuditLog.create({ action, details });
    } catch (err) {
        console.error('[DB] Failed to log audit action:', err.message);
    }
}

/**
 * Close the MongoDB connection.
 * Used for graceful shutdown.
 *
 * @param {boolean} force - Force close even with pending operations
 * @returns {Promise<void>}
 */
async function closeDatabase(force = false) {
    if (force) {
        await mongoose.connection.close(true);
    } else {
        await mongoose.connection.close();
    }
    console.log('[DB] MongoDB connection closed.');
}

// Export shared database helpers and the mongoose instance
module.exports = {
    connectDB,
    initializeDatabase,
    logAudit,
    closeDatabase,
    mongoose
};
