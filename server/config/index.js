/**
 * ============================================
 * Server Configuration
 * ============================================
 * Centralized configuration loaded from
 * environment variables with sensible defaults.
 * ============================================
 */

require('dotenv').config();

module.exports = {
    // Server port
    port: process.env.PORT || 3000,

    // Node environment
    env: process.env.NODE_ENV || 'development',

    // MongoDB connection string
    mongoURI: process.env.MONGO_URI,

    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || '*'
    },

    // Rate limiting configuration (per IP)
    rateLimit: {
        windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes by default
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)      // 100 requests per window
    },

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },

    // Frontend base URL (used to build password reset links)
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // SMTP / email configuration (used for password reset emails)
    mail: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || 'KCNP Agro <no-reply@kcnpagro.org>'
    },

    // Whether SMTP credentials have been configured
    mailConfigured() {
        return Boolean(this.mail.host && this.mail.user && this.mail.pass);
    }
};
