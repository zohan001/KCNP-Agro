/**
 * ============================================
 * Validation Middleware
 * ============================================
 * Provides reusable validation functions for
 * incoming requests to ensure data integrity
 * and security.
 * ============================================
 */

const { passwordProblems } = require('../services/passwordPolicy');

/**
 * Validate a contact message submission.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
function validateContactMessage(req, res, next) {
    const { name, email, subject, message } = req.body;
    const errors = [];

    // Validate name
    if (!name || !name.trim()) {
        errors.push({ field: 'name', message: 'Full name is required.' });
    } else if (name.trim().length < 2 || name.trim().length > 100) {
        errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters.' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
        errors.push({ field: 'email', message: 'Email address is required.' });
    } else if (!emailRegex.test(email)) {
        errors.push({ field: 'email', message: 'Please provide a valid email address.' });
    }

    // Validate subject (optional field, but if provided should be a string)
    if (subject && typeof subject !== 'string') {
        errors.push({ field: 'subject', message: 'Subject must be a string.' });
    }

    // Validate message
    if (!message || !message.trim()) {
        errors.push({ field: 'message', message: 'Message is required.' });
    } else if (message.trim().length < 10) {
        errors.push({ field: 'message', message: 'Message must be at least 10 characters long.' });
    } else if (message.trim().length > 1000) {
        errors.push({ field: 'message', message: 'Message cannot exceed 1000 characters.' });
    }

    // If there are errors, return 400 with error details
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    // Trim the input and sanitize
    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.organization = (req.body.organization || '').trim();
    req.body.subject = subject || 'general';
    req.body.message = message.trim();

    next();
}

/**
 * Validate a newsletter subscription.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
function validateNewsletter(req, res, next) {
    const { email } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !email.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Email address is required.',
            errors: [{ field: 'email', message: 'Email address is required.' }]
        });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address.',
            errors: [{ field: 'email', message: 'Please provide a valid email address.' }]
        });
    }

    // Normalize email
    req.body.email = email.trim().toLowerCase();

    next();
}

/**
 * Global error handling middleware.
 * Catches any unhandled errors in the application.
 *
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
    console.error('[ERROR]', err.message);
    console.error(err.stack);

    // Persist the error for admin review (best-effort, never blocking).
    const { recordError } = require('../services/errorLogger');
    recordError({
        level: err.level === 'fatal' ? 'fatal' : 'error',
        source: err.source || 'http',
        error: err,
        method: req.method,
        url: req.originalUrl || req.url,
        status: err.status || 500
    }).catch(() => {});

    // Return a generic error message - don't leak internals
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

/**
 * 404 handler for unknown API routes.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void}
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: 'Resource not found.'
    });
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(req, res, next) {
    const { name, email, password, role } = req.body;
    const errors = [];

    if (!name || !name.trim()) {
        errors.push({ field: 'name', message: 'Name is required.' });
    } else if (name.trim().length < 2 || name.trim().length > 100) {
        errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters.' });
    }

    if (!email || !email.trim()) {
        errors.push({ field: 'email', message: 'Email is required.' });
    } else if (!emailRegex.test(email)) {
        errors.push({ field: 'email', message: 'Please provide a valid email address.' });
    }

    passwordProblems(password).forEach((message) => {
        errors.push({ field: 'password', message });
    });

    if (role && role !== 'farmer' && role !== 'trader') {
        errors.push({ field: 'role', message: 'Role must be either farmer or trader.' });
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.role = role || 'farmer';
    next();
}

function validateLogin(req, res, next) {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'email', message: 'Email is required.' }]
        });
    }
    if (!password) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'password', message: 'Password is required.' }]
        });
    }

    req.body.email = email.trim().toLowerCase();
    next();
}

function validateForgotPassword(req, res, next) {
    const { email } = req.body;

    if (!email || !email.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'email', message: 'Email is required.' }]
        });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'email', message: 'Please provide a valid email address.' }]
        });
    }

    req.body.email = email.trim().toLowerCase();
    next();
}

function validateResetPassword(req, res, next) {
    const { token, password } = req.body;
    const errors = [];

    if (!token || typeof token !== 'string' || token.length < 16) {
        errors.push({ field: 'token', message: 'A valid reset token is required.' });
    }

    passwordProblems(password).forEach((message) => {
        errors.push({ field: 'password', message });
    });

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    next();
}

function validateProduct(req, res, next) {
    const { title, description, category, price, unit, location, contactEmail, contactPhone, image } = req.body;
    const errors = [];

    if (!title || !title.trim()) {
        errors.push({ field: 'title', message: 'Title is required.' });
    } else if (title.trim().length < 3 || title.trim().length > 200) {
        errors.push({ field: 'title', message: 'Title must be between 3 and 200 characters.' });
    }

    if (!description || !description.trim()) {
        errors.push({ field: 'description', message: 'Description is required.' });
    } else if (description.trim().length < 10 || description.trim().length > 2000) {
        errors.push({ field: 'description', message: 'Description must be between 10 and 2000 characters.' });
    }

    const validCategories = ['seeds', 'tools', 'fertilizer', 'livestock', 'produce', 'equipment', 'services', 'other'];
    if (!category || !validCategories.includes(category)) {
        errors.push({ field: 'category', message: 'Valid category is required.' });
    }

    if (price === undefined || price === null || price === '') {
        errors.push({ field: 'price', message: 'Price is required.' });
    } else if (isNaN(Number(price))) {
        errors.push({ field: 'price', message: 'Price must be a number.' });
    } else if (Number(price) <= 0) {
        errors.push({ field: 'price', message: 'Price must be greater than zero.' });
    }

    if (!unit || !unit.trim()) {
        errors.push({ field: 'unit', message: 'Unit is required.' });
    } else if (unit.trim().length > 30) {
        errors.push({ field: 'unit', message: 'Unit cannot exceed 30 characters.' });
    }

    if (!location || !location.trim()) {
        errors.push({ field: 'location', message: 'Location is required.' });
    } else if (location.trim().length > 200) {
        errors.push({ field: 'location', message: 'Location cannot exceed 200 characters.' });
    }

    if (!contactEmail || !contactEmail.trim()) {
        errors.push({ field: 'contactEmail', message: 'Contact email is required.' });
    } else if (!emailRegex.test(contactEmail)) {
        errors.push({ field: 'contactEmail', message: 'Please provide a valid contact email.' });
    }

    if (!contactPhone || !contactPhone.trim()) {
        errors.push({ field: 'contactPhone', message: 'Contact phone is required.' });
    } else if (contactPhone.trim().length > 30) {
        errors.push({ field: 'contactPhone', message: 'Phone cannot exceed 30 characters.' });
    }

    if (image !== undefined && image !== null && image !== '') {
        if (typeof image !== 'string') {
            errors.push({ field: 'image', message: 'Image must be a valid data URL.' });
        } else if (image.length > 6000000) {
            errors.push({ field: 'image', message: 'Image is too large (max 5 MB).' });
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    req.body.title = title.trim();
    req.body.description = description.trim();
    req.body.price = Number(price);
    req.body.unit = unit.trim();
    req.body.location = location.trim();
    req.body.contactEmail = contactEmail.trim().toLowerCase();
    req.body.contactPhone = contactPhone.trim();
    next();
}

function validateArticle(req, res, next) {
    const { title, content, category } = req.body;
    const errors = [];

    if (!title || !title.trim()) {
        errors.push({ field: 'title', message: 'Title is required.' });
    }

    if (!content || !content.trim()) {
        errors.push({ field: 'content', message: 'Content is required.' });
    } else if (content.trim().length < 50) {
        errors.push({ field: 'content', message: 'Content must be at least 50 characters.' });
    }

    if (!category) {
        errors.push({ field: 'category', message: 'Category is required.' });
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    req.body.title = title.trim();
    next();
}

function validateQuiz(req, res, next) {
    const { title, questions } = req.body;
    const errors = [];

    if (!title || !title.trim()) {
        errors.push({ field: 'title', message: 'Quiz title is required.' });
    }

    if (!questions || !Array.isArray(questions) || questions.length < 1) {
        errors.push({ field: 'questions', message: 'At least one question is required.' });
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    req.body.title = title.trim();
    next();
}

// Export all validation and error handling middleware
module.exports = {
    validateContactMessage,
    validateNewsletter,
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
    validateProduct,
    validateArticle,
    validateQuiz,
    errorHandler,
    notFoundHandler
};
