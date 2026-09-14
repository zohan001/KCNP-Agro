const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const config = require('../config');
const { sendPasswordResetEmail } = require('../services/mailer');
const { logAudit } = require('../db/database');

function generateToken(user) {
    return jwt.sign({ id: user._id, role: user.role }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    });
}

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

        const user = await User.create({ name, email, password, role });
        const token = generateToken(user);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: { user, token }
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

        const token = generateToken(user);

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

async function getProfile(req, res) {
    return res.status(200).json({
        success: true,
        data: { user: req.user }
    });
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

        if (!emailed) {
            // No SMTP configured — surface the link so the flow still works (dev/staging).
            console.log('[Auth] Password reset link (SMTP disabled):', resetUrl);
            return res.status(200).json({
                success: true,
                message: 'Password reset link generated. Email delivery was not available, so the link is shown below.',
                data: { resetLink: resetUrl, fallback: true }
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

module.exports = { register, login, getProfile, forgotPassword, resetPassword };
