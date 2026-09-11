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
