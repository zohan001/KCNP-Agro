/**
 * ============================================
 * Express Application Factory
 * ============================================
 * Creates and configures the Express application
 * with middleware, routes, static files, and
 * error handling. Exported independently of
 * server startup for testability.
 * ============================================
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import configuration
const config = require('./config');

// Import routes
const apiRoutes = require('./routes/api');

// Import error handling middleware
const { errorHandler, notFoundHandler } = require('./middleware/validation');

/**
 * Create and configure the Express application.
 *
 * @returns {Object} The configured Express app
 */
function createApp() {
    const app = express();

    // ==============================
    // Apply Security Middleware
    // ==============================

    // Use helmet for security headers.
    //
    // IMPORTANT: the app intentionally runs plain inline <script> blocks and
    // inline onclick="" handlers (no bundler), and loads Google Fonts. Helmet's
    // DEFAULT CSP (`script-src 'self'`) blocks ALL of that, so every page's
    // JavaScript silently never ran in the browser (login redirects, article
    // loading, stats, etc. all appeared frozen). The directives below keep the
    // protections we want while explicitly allowing the inline scripts/styles
    // this frontend depends on.
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"]
            }
        }
    }));

    // Enable CORS for cross-origin requests
    app.use(cors({
        origin: config.cors.origin,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
        credentials: false
    }));

    // Parse JSON request bodies with a size limit
    app.use(express.json({ limit: '10mb' }));

    // Parse URL-encoded request bodies
    app.use(express.urlencoded({ extended: false }));

    // Apply rate limiting to all API requests
    const limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Too many requests, please try again later.'
        }
    });

    // Apply rate limiter to API routes
    app.use('/api', limiter);

    // Looser limit for lightweight buyer demand signals so listing views and
    // interest clicks are never cut short during busy browsing.
    const eventsLimiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: 900,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Too many requests, please try again later.'
        }
    });
    app.use(['/api/products/:id/view', '/api/products/:id/interest'], eventsLimiter);

    // ==============================
    // Static Files
    // ==============================

    // Serve static frontend files from public directory
    app.use(express.static('public'));

    // Legal pages (serve the static HTML at clean /privacy and /terms URLs)
    app.get('/privacy', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'privacy.html'));
    });
    app.get('/terms', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'terms.html'));
    });

    // App pages (clean URLs for the SPA sections)
    const pageRoutes = [
        ['/marketplace', 'marketplace.html'],
        ['/education', 'education.html'],
        ['/login', 'login.html'],
        ['/register', 'register.html'],
        ['/dashboard', 'dashboard.html'],
        ['/forgot-password', 'forgot-password.html'],
        ['/reset-password', 'reset-password.html'],
        ['/market-insights', 'market-insights.html']
    ];
    pageRoutes.forEach(([pathName, file]) => {
        app.get([pathName, `${pathName}/`], (req, res) => {
            // Never cache HTML pages: the frontend changes often and stale
            // "Loading..." states confuse users after an update.
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.sendFile(path.join(__dirname, '..', 'public', file));
        });
    });

    // ==============================
    // API Routes
    // ==============================

    // Mount all API routes under /api
    app.use('/api', apiRoutes);

    // ==============================
    // Error Handling
    // ==============================

    // Handle 404 for unknown API routes
    app.use('/api', notFoundHandler);

    // Global error handler
    app.use(errorHandler);

    return app;
}

// Export the app factory
module.exports = createApp;
