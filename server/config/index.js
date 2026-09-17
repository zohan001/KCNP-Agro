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
    // In production we default to SAME-ORIGIN (no cross-origin access) unless
    // CORS_ORIGIN is explicitly set. In development '*' keeps local tooling happy.
    cors: {
        origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production'
            ? (process.env.FRONTEND_URL || '')
            : '*')
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

    // Auth session cookie (httpOnly JWT transport). The token is ALSO accepted
    // via the Authorization header for backwards compatibility / API tooling.
    auth: {
        cookieName: process.env.AUTH_COOKIE_NAME || 'kcnp_session',
        cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // matches JWT_EXPIRES_IN default
        cookieSecure: process.env.NODE_ENV === 'production'
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

    // Paystack (Kenya M-Pesa via Charge API + webhook)
    // Leave PAYSTACK_SECRET_KEY empty to fall back to Daraja or manual approval.
    paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY || '',
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
        currency: process.env.PAYSTACK_CURRENCY || 'KES'
    },

    // Google reCAPTCHA v2 (checkbox) — protects auth + payment forms.
    // Leave RECAPTCHA_SECRET_KEY empty to disable verification (dev/staging).
    recaptcha: {
        siteKey: process.env.RECAPTCHA_SITE_KEY || '',
        secretKey: process.env.RECAPTCHA_SECRET_KEY || ''
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
    },

    // Whether Paystack secret key is configured (preferred M-Pesa provider)
    paystackConfigured() {
        return Boolean(this.paystack.secretKey);
    },

    // Whether reCAPTCHA verification is enabled (both keys supplied)
    recaptchaConfigured() {
        return Boolean(this.recaptcha.siteKey && this.recaptcha.secretKey);
    },

    // A hard-coded JWT secret is only ever acceptable outside production.
    // Returns true when the deployed secret is safe to run with.
    jwtSecretSecure() {
        return Boolean(this.jwt.secret && this.jwt.secret !== 'dev-secret-change-in-production');
    }
};
