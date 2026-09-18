/**
 * ============================================
 * Main Server Entry Point
 * ============================================
 * Creates the Express application, connects to
 * MongoDB, and starts the HTTP server with
 * graceful shutdown handling.
 * ============================================
 */

// Import configuration
const config = require('./config');

// Import the app factory
const createApp = require('./app');

// Import database helpers
const { connectDB, initializeDatabase, closeDatabase } = require('./db/database');

// Import error logging helpers
const { recordError } = require('./services/errorLogger');

// Resolve/auto-generate the JWT signing secret (after the DB is connected).
const { resolveJwtSecret } = require('./services/appSecret');

// Capture uncaught errors and unhandled promise rejections so they are
// recorded to the ErrorLog collection (when the DB is up) instead of only
// being visible in the console.
process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught exception:', err);
    recordError({ level: 'fatal', source: 'process.uncaughtException', error: err })
        .then(() => process.exit(1))
        .catch(() => process.exit(1));
});
process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    console.error('[Process] Unhandled rejection:', err);
    recordError({ level: 'error', source: 'process.unhandledRejection', error: err });
});

/**
 * Bootstrap function - connects to the database,
 * creates the app, and starts the HTTP server.
 *
 * @returns {Promise<void>}
 */
async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Initialize the database (build indexes)
        await initializeDatabase();
        console.log('[Server] Database initialized successfully.');

        // Sync the seed data (demo users, listings with images). Idempotent and
        // cheap on subsequent boots — creates what's missing, attaches images
        // and sellers to existing seed listings. A failure here must not take
        // the server down, so it is logged and startup continues.
        try {
            const { syncSeedData } = require('../scripts/seed-data');
            const seedSummary = await syncSeedData();
            console.log(`[Server] Seed data synced: ${seedSummary.usersCreated} users, ${seedSummary.articlesCreated} articles, ${seedSummary.quizzesCreated} quizzes, ${seedSummary.productsCreated + seedSummary.productsUpdated} listings (${seedSummary.productsUpdated} updated with images)`);
        } catch (err) {
            console.warn('[Server] Seed data sync skipped:', err.message);
        }

        // Resolve the JWT signing secret. In production, a missing JWT_SECRET is
        // generated once and persisted in MongoDB so sessions survive restarts.
        const { secret, source } = await resolveJwtSecret();
        config.jwt.secret = secret;
        if (source === 'env') {
            console.log('[Security] JWT secret loaded from JWT_SECRET.');
        } else if (source === 'database') {
            console.log('[Security] JWT secret loaded from the database (auto-generated on first boot).');
        } else if (source === 'ephemeral') {
            console.warn('[Security] Using an ephemeral JWT secret; sessions will reset on restart.');
        } else {
            console.warn('[Security] Using the development JWT_SECRET. Set JWT_SECRET to a random value before deploying.');
        }

        // Create the Express application
        const app = createApp();

        // Start listening for requests
        const server = app.listen(config.port, () => {
            console.log(`[Server] KCNP Agro server running in ${config.env} mode`);
            console.log(`[Server] Listening on port ${config.port}`);
            console.log(`[Server] http://localhost:${config.port}`);
        });

        // Graceful shutdown handler
        const shutdown = () => {
            console.log('\n[Server] Shutting down gracefully...');
            server.close(() => {
                closeDatabase();
                console.log('[Server] Shutdown complete.');
                process.exit(0);
            });

            // Force shutdown after 10 seconds if graceful fails
            setTimeout(() => {
                console.error('[Server] Forced shutdown due to timeout.');
                process.exit(1);
            }, 10000).unref();
        };

        // Handle shutdown signals
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (err) {
        console.error('[Server] Failed to start:', err.message);
        process.exit(1);
    }
}

// Start the server
startServer();
