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
        max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10)      // 300 requests per window
    },

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },

    // Frontend base URL (used to build password reset links)
    frontendUrl: process.env.FRONTEND_URL || '',

    // SMTP / email configuration (used for password reset emails)
    mail: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || 'KCNP Agro <no-reply@kcnpagro.org>',
        apiKey: process.env.BREVO_API_KEY || ''
    },

    // M-Pesa (Safaricom Daraja) STK Push configuration
    daraja: {
        environment: (process.env.MPESA_ENV || 'sandbox').toLowerCase(),
        consumerKey: process.env.MPESA_CONSUMER_KEY || '',
        consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
        passkey: process.env.MPESA_PASSKEY || '',
        shortcode: process.env.MPESA_SHORTCODE || '',
        callbackUrl: process.env.MPESA_CALLBACK_URL || '',
        baseUrl() {
            return this.environment === 'production'
                ? 'https://api.safaricom.co.ke'
                : 'https://sandbox.safaricom.co.ke';
        }
    },

    // Whether any email delivery path has been configured (SMTP or Brevo HTTP API)
    mailConfigured() {
        return Boolean((this.mail.host && this.mail.user && this.mail.pass) || this.mail.apiKey);
    },

    // Whether the Daraja M-Pesa credentials have been supplied. When false the
    // payment flow falls back to manual (pending + admin approval).
    mpesaConfigured() {
        return Boolean(
            this.daraja.consumerKey &&
            this.daraja.consumerSecret &&
            this.daraja.passkey &&
            this.daraja.shortcode &&
            this.daraja.callbackUrl
        );
    }
};
