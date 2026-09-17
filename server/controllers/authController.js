const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const config = require('../config');
const { sendPasswordResetEmail, sendActivationEmail } = require('../services/mailer');
const { logAudit } = require('../db/database');

function generateToken(user) {
    return jwt.sign({ id: user._id, role: user.role }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    });
}

function hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Register a new account. The account is created in a pending state and an
 * activation email is sent. If email delivery is unavailable, the activation
 * link is returned so the flow still works.
 *
 * @route POST /api/auth/register
 */
async function register(req, res) {
    const { name, email, password, role } = req.body;

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const user = await User.create({
            name,
            email,
            password,
            role,
            isActive: false,
            activationToken: hashToken(rawToken),
            activationExpires: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
        });

        const baseUrl = config.frontendUrl || `${req.protocol}://${req.get('host')}`;
        const activationUrl = `${baseUrl}/activate?token=${rawToken}`;

        const emailed = await sendActivationEmail(email, activationUrl);

        const publicUser = user.toJSON();
        if (emailed.status === 'sent') {
            logAudit('USER_REGISTERED', `Registered pending user ${email}`)
                .catch(err => console.error('[Audit] Failed to log:', err.message));
            return res.status(201).json({
                success: true,
                message: 'Account created. We sent an activation link to your email — click it to activate your account.',
                data: { user: publicUser, activationSent: true }
            });
        }

        // Email could not be delivered — surface the activation link so the flow still works.
        console.log('[Auth] Activation link (email not delivered):', activationUrl);
        logAudit('USER_REGISTERED', `Registered pending user ${email}`)
            .catch(err => console.error('[Audit] Failed to log:', err.message));
        return res.status(201).json({
            success: true,
            message: 'Account created. Email delivery is unavailable, so your activation link is shown below.',
            data: { user: publicUser, activationSent: false, activationLink: activationUrl }
        });
    } catch (err) {
        console.error('[Auth] Registration failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
}

async function login(req, res) {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                code: 'ACTIVATION_REQUIRED',
                message: 'Your account is not activated yet. Please check your inbox for the activation email.'
            });
        }

        const token = generateToken(user);

        // httpOnly session cookie — the primary transport going forward. Not
        // readable from JavaScript, so XSS cannot exfiltrate the JWT.
        res.cookie(config.auth.cookieName, token, {
            httpOnly: true,
            secure: config.auth.cookieSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: config.auth.cookieMaxAge
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: { user, token }
        });
    } catch (err) {
        console.error('[Auth] Login failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
}

/**
 * POST /api/auth/logout — clears the session cookie.
 */
function logout(req, res) {
    res.clearCookie(config.auth.cookieName, {
        httpOnly: true,
        secure: config.auth.cookieSecure,
        sameSite: 'lax',
        path: '/'
    });
    return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
    });
}

async function getProfile(req, res) {
    return res.status(200).json({
        success: true,
        data: { user: req.user }
    });
}

/**
 * Activate an account using the token from the activation email.
 *
 * @route POST /api/auth/activate  { token }
 */
async function activate(req, res) {
    const { token } = req.body;

    try {
        const tokenHash = hashToken(String(token || ''));
        const user = await User.findOne({
            activationToken: tokenHash,
            activationExpires: { $gt: new Date() }
        }).select('+activationToken +activationExpires');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'This activation link is invalid or has expired. Please request a new one.'
            });
        }

        user.isActive = true;
        user.activationToken = undefined;
        user.activationExpires = undefined;
        await user.save();

        logAudit('USER_ACTIVATED', `Activated account ${user.email}`)
            .catch(err => console.error('[Audit] Failed to log:', err.message));

        return res.status(200).json({
            success: true,
            message: 'Your account has been activated. You can now log in.'
        });
    } catch (err) {
        console.error('[Auth] Activate failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to activate your account. Please try again.'
        });
    }
}

/**
 * Resend the activation email to a pending account.
 *
 * @route POST /api/auth/resend-activation  { email }
 */
async function resendActivation(req, res) {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email }).select('+activationToken +activationExpires');
        if (!user || user.isActive) {
            // Keep responses uniform — do not reveal account status.
            return res.status(200).json({
                success: true,
                message: 'If that email is registered and pending activation, a new activation link has been sent.'
            });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        user.activationToken = hashToken(rawToken);
        user.activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await user.save();

        const baseUrl = config.frontendUrl || `${req.protocol}://${req.get('host')}`;
        const activationUrl = `${baseUrl}/activate?token=${rawToken}`;

        const emailed = await sendActivationEmail(email, activationUrl);
        if (emailed.status !== 'sent') {
            return res.status(200).json({
                success: true,
                message: 'A new activation link has been generated.',
                data: { activationLink: activationUrl }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'If that email is registered and pending activation, a new activation link has been sent.'
        });
    } catch (err) {
        console.error('[Auth] Resend activation failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to resend the activation link. Please try again.'
        });
    }
}

/**
 * Forgot password — generates a reset token, stores a hash of it on the
 * user record, and emails a reset link. For security the response is the
 * same whether or not the email exists. When SMTP is NOT configured, the
 * reset link is returned so the flow still works during development/staging.
 *
 * @route POST /api/auth/forgot-password
 * @param {Object} req - Express request object { email }
 * @param {Object} res - Express response object
 * @returns {void}
 */
async function forgotPassword(req, res) {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        const resetLinkVisible = !config.mailConfigured();
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If that email is registered, a password reset link has been sent.',
                ...(resetLinkVisible && { data: { resetLink: null, fallback: true } })
            });
        }

        // Generate a raw token and store only its hash (safer if the DB leaks)
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

        user.passwordResetToken = tokenHash;
        user.passwordResetExpires = expires;
        await user.save();

        const baseUrl = config.frontendUrl || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

        const emailed = await sendPasswordResetEmail(email, resetUrl);

        if (emailed.status !== 'sent') {
            // Email could not be delivered — surface the link so the flow still works.
            console.log('[Auth] Password reset link (email not delivered):', resetUrl);
            const reason = emailed.status === 'unconfigured'
                ? 'Password reset link generated. SMTP is not configured, so the link is shown below.'
                : 'Password reset link generated. Email delivery failed, so the link is shown below.';
            const data = { resetLink: resetUrl, fallback: true };
            if (emailed.code) data.emailError = emailed.code;
            return res.status(200).json({
                success: true,
                message: reason,
                data
            });
        }

        return res.status(200).json({
            success: true,
            message: 'If that email is registered, a password reset link has been sent.'
        });
    } catch (err) {
        console.error('[Auth] Forgot password failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to process your request. Please try again.'
        });
    }
}

/**
 * Reset password — accepts the token from the email and a new password.
 *
 * @route POST /api/auth/reset-password
 * @param {Object} req - Express request object { token, password }
 * @param {Object} res - Express response object
 * @returns {void}
 */
async function resetPassword(req, res) {
    const { token, password } = req.body;

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: tokenHash,
            passwordResetExpires: { $gt: new Date() }
        }).select('+passwordResetToken +passwordResetExpires');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'This reset link is invalid or has expired. Please request a new one.'
            });
        }

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        logAudit('PASSWORD_RESET', `Password reset for ${user.email}`)
            .catch(err => console.error('[Audit] Failed to log:', err.message));

        return res.status(200).json({
            success: true,
            message: 'Your password has been reset successfully. You can now log in with your new password.'
        });
    } catch (err) {
        console.error('[Auth] Reset password failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset your password. Please try again.'
        });
    }
}

module.exports = { register, login, logout, getProfile, activate, resendActivation, forgotPassword, resetPassword };
