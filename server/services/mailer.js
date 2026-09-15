/**
 * ============================================
 * Mailer Service
 * ============================================
 * Sends transactional emails (currently used for
 * password resets). Uses nodemailer with SMTP
 * credentials from the environment. If no SMTP is
 * configured, sendPasswordResetEmail resolves to
 * false so the caller can fall back to showing
 * the reset link directly on screen.
 * ============================================
 */

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

/**
 * Lazily create the nodemailer transport when SMTP
 * credentials are configured.
 *
 * @returns {Object|null} nodemailer transporter or null
 */
function getTransporter() {
    if (transporter) return transporter;
    if (!(config.mail.host && config.mail.user && config.mail.pass)) return null;

    transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        auth: {
            user: config.mail.user,
            pass: config.mail.pass
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000
    });
    return transporter;
}

function parseFrom(raw) {
    const m = String(raw || '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (m) return { name: m[1].trim() || undefined, email: m[2].trim() };
    return { email: String(raw || '').trim() };
}

/**
 * Send via Brevo's HTTP API (port 443) — used as a fallback when SMTP
 * (ports 465/587) is unreachable, which some hosts block.
 *
 * @returns {Promise<Object|null>} result object, or null if no API key.
 */
async function sendViaBrevoHttp(to, subject, text, html) {
    const key = config.mail.apiKey;
    if (!key) return null;

    const sender = parseFrom(config.mail.from);
    const body = {
        sender: { name: sender.name, email: sender.email },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html
    };

    const ac = new AbortController();
    const guard = setTimeout(() => ac.abort(), 12000);
    try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': key,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body),
            signal: ac.signal
        });
        if (res.ok) return { status: 'sent' };
        const detail = await res.text().catch(() => '');
        return { status: 'error', code: 'Brevo HTTP ' + res.status + (detail ? ': ' + detail.slice(0, 140) : '') };
    } catch (err) {
        return { status: 'error', code: 'Brevo HTTP ' + (err.name === 'AbortError' ? 'timeout' : err.message) };
    } finally {
        clearTimeout(guard);
    }
}

/**
 * Send a transactional email through the best available channel
 * (Brevo HTTP API first, then SMTP). Returns { status, code }.
 */
async function deliver(to, subject, text, html) {
    let httpError = null;
    if (config.mail.apiKey) {
        const viaHttp = await sendViaBrevoHttp(to, subject, text, html);
        if (viaHttp.status === 'sent') return viaHttp;
        httpError = viaHttp.code;
        console.error('[Mailer] Brevo HTTP failed:', httpError);
    }

    const transport = getTransporter();
    if (transport) {
        try {
            const guard = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('SMTP send timed out')), 12000);
            });
            await Promise.race([
                transport.sendMail({ from: config.mail.from, to, subject, text, html }),
                guard
            ]);
            return { status: 'sent' };
        } catch (err) {
            console.error('[Mailer] SMTP failed:', err.message, err.address ? '-> ' + err.address + ':' + err.port : '');
        }
    } else {
        console.warn('[Mailer] SMTP not configured.');
    }

    if (config.mail.apiKey) {
        console.error('[Mailer] Brevo HTTP already attempted above; all email paths failed.');
        return { status: 'error', code: httpError || 'EALLFAILED' };
    }
    console.warn('[Mailer] No SMTP or Brevo key configured.');
    return { status: 'unconfigured' };
}

/**
 * Send a password reset email to the given address.
 *
 * @param {string} to - Recipient email address
 * @param {string} resetUrl - Full reset link including the token
 * @returns {Promise<Object>} { status, code }
 */
async function sendPasswordResetEmail(to, resetUrl) {
    const subject = 'Reset your KCNP Agro password';

    // Plain text body for simple clients
    const text = [
        'Hello,',
        '',
        'You requested a password reset for your KCNP Agro account.',
        'Use the link below to choose a new password. This link is valid for 60 minutes.',
        '',
        resetUrl,
        '',
        'If you did not request this, you can safely ignore this email — your password will not change.',
        '',
        'Regards,',
        'The KCNP Agro Team'
    ].join('\n');

    // HTML body with a styled button
    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #16a34a; margin: 0 0 16px;">Reset your password</h2>
            <p style="color: #334155; line-height: 1.6;">Hello,</p>
            <p style="color: #334155; line-height: 1.6;">You requested a password reset for your KCNP Agro account. Click the button below to choose a new password.</p>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">This link is valid for <strong>60 minutes</strong>. If you did not request a reset, you can safely ignore this email — your password will not change.</p>
            <div style="text-align: center; margin: 24px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 12px;">If the button does not work, copy and paste this link into your browser:<br><a href="${resetUrl}" style="color: #16a34a; word-break: break-all;">${resetUrl}</a></p>
        </div>
    `;

    return deliver(to, subject, text, html);
}

/**
 * Send an account-activation email to the given address.
 *
 * @param {string} to - Recipient email address
 * @param {string} activationUrl - Full activation link including the token
 * @returns {Promise<Object>} { status, code }
 */
async function sendActivationEmail(to, activationUrl) {
    const subject = 'Activate your KCNP Agro account';

    const text = [
        'Hello,',
        '',
        'Welcome to KCNP Agro! Your account is ready, but you need to activate it first.',
        'Click the link below to verify your email. This link is valid for 48 hours.',
        '',
        activationUrl,
        '',
        'If you did not create this account, you can safely ignore this email.',
        '',
        'Regards,',
        'The KCNP Agro Team'
    ].join('\n');

    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #16a34a; margin: 0 0 16px;">Welcome to KCNP Agro</h2>
            <p style="color: #334155; line-height: 1.6;">Hello,</p>
            <p style="color: #334155; line-height: 1.6;">Your account has been created. To finish setting it up, please verify your email address by clicking the button below.</p>
            <p style="color: #64748b; font-size: 13px; line-height: 1.6;">This link is valid for <strong>48 hours</strong>. If you did not create this account, you can safely ignore this email.</p>
            <div style="text-align: center; margin: 24px 0;">
                <a href="${activationUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Activate My Account</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 12px;">If the button does not work, copy and paste this link into your browser:<br><a href="${activationUrl}" style="color: #16a34a; word-break: break-all;">${activationUrl}</a></p>
        </div>
    `;

    return deliver(to, subject, text, html);
}

module.exports = { sendPasswordResetEmail, sendActivationEmail };