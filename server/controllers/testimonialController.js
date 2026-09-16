const Testimonial = require('../models/Testimonial');
const { logAudit } = require('../db/database');

/**
 * POST /api/testimonials — logged-in farmers/traders submit their feedback.
 * Admins cannot leave testimonials; each user may have one pending at a time.
 */
async function createTestimonial(req, res) {
    try {
        if (req.user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Administrator accounts cannot leave testimonials.' });
        }
        const pending = await Testimonial.findOne({ user: req.user._id, status: 'pending' });
        if (pending) {
            return res.status(400).json({ success: false, message: 'You already have a testimonial awaiting approval.' });
        }

        const message = String(req.body.message || '').trim();
        if (message.length < 5) {
            return res.status(400).json({ success: false, message: 'Please write a short testimonial (at least 5 characters).' });
        }
        if (message.length > 1000) {
            return res.status(400).json({ success: false, message: 'Testimonial is too long (max 1000 characters).' });
        }
        let rating = parseInt(req.body.rating, 10);
        if (!rating || rating < 1) rating = 5;
        rating = Math.min(5, Math.max(1, rating));

        const testimonial = await Testimonial.create({
            user: req.user._id,
            name: req.user.name,
            role: req.user.role,
            message,
            rating
        });

        logAudit('TESTIMONIAL_SUBMITTED', `Testimonial by ${req.user.email}`).catch(() => {});

        return res.status(201).json({
            success: true,
            message: 'Thank you! Your testimonial was submitted and will appear once an admin approves it.',
            data: { testimonial }
        });
    } catch (err) {
        console.error('[Testimonial] Create failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to submit your testimonial.' });
    }
}

/**
 * GET /api/testimonials — public list of approved testimonials for the home page.
 * Featured testimonials sort first, then the newest.
 */
async function getPublicTestimonials(req, res) {
    try {
        const testimonials = await Testimonial.find({ status: 'approved' })
            .sort({ featured: -1, createdAt: -1 })
            .limit(9)
            .lean();
        return res.status(200).json({ success: true, count: testimonials.length, data: testimonials });
    } catch (err) {
        console.error('[Testimonial] List failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load testimonials.' });
    }
}

module.exports = { createTestimonial, getPublicTestimonials };