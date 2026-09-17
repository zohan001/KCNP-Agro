const User = require('../models/User');
const Product = require('../models/Product');
const Article = require('../models/Article');
const Subscription = require('../models/Subscription');
const Testimonial = require('../models/Testimonial');
const AuditLog = require('../models/AuditLog');
const ErrorLog = require('../models/ErrorLog');
const Notification = require('../models/Notification');
const { logAudit } = require('../db/database');
const { PLANS } = require('./paymentController');

/**
 * Everything behind this controller is protected by authenticate + authorize('admin').
 */

/**
 * GET /api/admin/overview — summary cards for the admin dashboard.
 */
async function overview(req, res) {
    try {
        const [
            farmers, traders, admins, listings, activeListings, articles,
            pendingPayments, activeSubs, totalUsers, unreadNotifications
        ] = await Promise.all([
            User.countDocuments({ role: 'farmer', isActive: true }),
            User.countDocuments({ role: 'trader', isActive: true }),
            User.countDocuments({ role: 'admin' }),
            Product.countDocuments({}),
            Product.countDocuments({ active: true }),
            Article.countDocuments({}),
            Subscription.countDocuments({ status: 'pending' }),
            Subscription.countDocuments({ status: 'active' }),
            User.countDocuments({}),
            Notification.countDocuments({ read: false })
        ]);
        return res.status(200).json({
            success: true,
            data: { farmers, traders, admins, listings, activeListings, articles, pendingPayments, activeSubs, totalUsers, unreadNotifications }
        });
    } catch (err) {
        console.error('[Admin] Overview failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load the admin overview.' });
    }
}

/**
 * GET /api/admin/users — all users with their membership info.
 */
async function listUsers(req, res) {
    try {
        const users = await User.find({}).sort({ createdAt: -1 }).limit(300).lean();
        return res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        console.error('[Admin] List users failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load users.' });
    }
}

/**
 * PUT /api/admin/users/:id — change role, activation, or grant/renew membership.
 * Allowed body fields: { role?, isActive?, grantMembership: { plan?, periodMonths? } }
 */
async function updateUser(req, res) {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        if (req.params.id === String(req.user._id) && (req.body.role && req.body.role !== 'admin' || req.body.isActive === false)) {
            return res.status(400).json({ success: false, message: 'You cannot demote or deactivate yourself.' });
        }

        if (req.body.role && ['farmer', 'trader', 'admin'].includes(req.body.role)) {
            user.role = req.body.role;
        }
        if (typeof req.body.isActive === 'boolean') {
            user.isActive = req.body.isActive;
        }
        if (req.body.grantMembership) {
            const plan = req.body.grantMembership.plan || user.membership.plan;
            const periodMonths = req.body.grantMembership.periodMonths || (PLANS[plan] ? PLANS[plan].periodMonths : 12);
            const p = PLANS[plan] || PLANS.grower;
            user.membership = {
                plan: p.id,
                status: 'active',
                expiresAt: new Date(Date.now() + periodMonths * 30 * 24 * 60 * 60 * 1000)
            };
            await Subscription.create({
                user: user._id,
                plan: p.id,
                amount: p.price,
                periodMonths: p.periodMonths,
                status: 'active',
                expiresAt: user.membership.expiresAt,
                paidAt: new Date(),
                approvedBy: req.user._id,
                mpesaRef: 'GRANT'
            });
        }
        if (req.body.expireMembership) {
            user.membership.status = 'expired';
            user.membership.expiresAt = new Date();
        }

        await user.save();
        logAudit('ADMIN_USER_UPDATE', `Updated user ${user.email}`).catch(() => {});
        return res.status(200).json({ success: true, message: 'User updated.', data: { user: user.toJSON() } });
    } catch (err) {
        console.error('[Admin] Update user failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update the user.' });
    }
}

/**
 * DELETE /api/admin/users/:id — hard delete a user.
 */
async function deleteUser(req, res) {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        if (req.params.id === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }
        await User.findByIdAndDelete(req.params.id);
        await Subscription.deleteMany({ user: req.params.id }).catch(() => {});
        logAudit('ADMIN_USER_DELETE', `Deleted user ${user.email}`).catch(() => {});
        return res.status(200).json({ success: true, message: 'User deleted.' });
    } catch (err) {
        console.error('[Admin] Delete user failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to delete the user.' });
    }
}

/**
 * GET /api/admin/subscriptions — all payments with user info.
 */
async function listSubscriptions(req, res) {
    try {
        const subs = await Subscription.find({})
            .sort({ createdAt: -1 })
            .limit(300)
            .populate('user', 'name email role')
            .lean();
        return res.status(200).json({ success: true, count: subs.length, data: subs });
    } catch (err) {
        console.error('[Admin] List subscriptions failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load subscriptions.' });
    }
}

async function setSubscriptionStatus(req, res, status) {
    try {
        const sub = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ success: false, message: 'Payment not found.' });

        sub.status = status;
        if (status === 'active') {
            sub.paidAt = new Date();
            sub.expiresAt = new Date(Date.now() + sub.periodMonths * 30 * 24 * 60 * 60 * 1000);
            sub.approvedBy = req.user._id;
            await User.findByIdAndUpdate(sub.user, {
                membership: { plan: sub.plan, status: 'active', expiresAt: sub.expiresAt }
            });
        } else if (status === 'denied' || status === 'cancelled') {
            // Only reset membership if the user has no other active subscription.
            const active = await Subscription.findOne({
                user: sub.user, status: 'active', _id: { $ne: sub._id }
            });
            if (!active) {
                await User.findByIdAndUpdate(sub.user, {
                    'membership.status': 'none',
                    'membership.plan': null,
                    'membership.expiresAt': null
                });
            }
        }
        await sub.save();
        logAudit('ADMIN_SUB_UPDATE', `Payment ${status}: ${sub.plan} for ${sub.user}`).catch(() => {});
        // Resolve the "waiting for approval" notification for this payment.
        await Notification.updateMany({ refId: sub._id, read: false }, { $set: { read: true } }).catch(() => {});
        return res.status(200).json({ success: true, message: `Payment ${status}.`, data: { subscription: sub } });
    } catch (err) {
        console.error('[Admin] Payment update failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update the payment.' });
    }
}

/**
 * GET /api/admin/listings — every marketplace listing (incl. hidden).
 */
async function listProducts(req, res) {
    try {
        const products = await Product.find({})
            .sort({ createdAt: -1 })
            .limit(300)
            .populate('seller', 'name email')
            .lean();
        return res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
        console.error('[Admin] List products failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load listings.' });
    }
}

/**
 * PUT /api/admin/listings/:id — show/hide or edit a listing.
 */
async function updateListing(req, res) {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Listing not found.' });
        if (typeof req.body.active === 'boolean') product.active = req.body.active;
        ['title', 'description', 'price', 'unit', 'category', 'location'].forEach(f => {
            if (req.body[f] !== undefined) product[f] = req.body[f];
        });
        await product.save();
        logAudit('ADMIN_LISTING_UPDATE', `Listing ${product.title}`).catch(() => {});
        return res.status(200).json({ success: true, message: 'Listing updated.', data: { product } });
    } catch (err) {
        console.error('[Admin] Update listing failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update the listing.' });
    }
}

/**
 * DELETE /api/admin/listings/:id
 */
async function deleteListing(req, res) {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Listing not found.' });
        await Product.findByIdAndDelete(req.params.id);
        logAudit('ADMIN_LISTING_DELETE', `Listing ${product.title}`).catch(() => {});
        return res.status(200).json({ success: true, message: 'Listing deleted.' });
    } catch (err) {
        console.error('[Admin] Delete listing failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to delete the listing.' });
    }
}

/**
 * GET /api/admin/audit-log — recent audit events.
 */
async function auditLog(req, res) {
    try {
        const entries = await AuditLog.find({}).sort({ createdAt: -1 }).limit(80).lean();
        return res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (err) {
        console.error('[Admin] Audit log failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load the audit log.' });
    }
}

/**
 * GET /api/admin/testimonials — all submitted testimonials (any status).
 */
async function listTestimonials(req, res) {
    try {
        const testimonials = await Testimonial.find({})
            .sort({ createdAt: -1 })
            .limit(300)
            .populate('user', 'name email role')
            .lean();
        return res.status(200).json({ success: true, count: testimonials.length, data: testimonials });
    } catch (err) {
        console.error('[Admin] List testimonials failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load testimonials.' });
    }
}

/**
 * PUT /api/admin/testimonials/:id — approve/reject and toggle featured.
 * Body: { status?: 'pending'|'approved'|'rejected', featured?: boolean }
 */
async function updateTestimonial(req, res) {
    try {
        const testimonial = await Testimonial.findById(req.params.id);
        if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found.' });

        if (req.body.status && ['pending', 'approved', 'rejected'].includes(req.body.status)) {
            testimonial.status = req.body.status;
        }
        if (typeof req.body.featured === 'boolean') {
            testimonial.featured = req.body.featured;
        }

        await testimonial.save();
        logAudit('ADMIN_TESTIMONIAL_UPDATE', `Testimonial by ${testimonial.name} → ${testimonial.status}`).catch(() => {});
        return res.status(200).json({ success: true, message: 'Testimonial updated.', data: { testimonial } });
    } catch (err) {
        console.error('[Admin] Update testimonial failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update the testimonial.' });
    }
}

/**
 * DELETE /api/admin/testimonials/:id
 */
async function deleteTestimonial(req, res) {
    try {
        const testimonial = await Testimonial.findById(req.params.id);
        if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found.' });
        await Testimonial.findByIdAndDelete(req.params.id);
        logAudit('ADMIN_TESTIMONIAL_DELETE', `Deleted testimonial by ${testimonial.name}`).catch(() => {});
        return res.status(200).json({ success: true, message: 'Testimonial deleted.' });
    } catch (err) {
        console.error('[Admin] Delete testimonial failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to delete the testimonial.' });
    }
}

/**
 * GET /api/admin/logs — recent persisted error logs.
 * Query: ?level=error|fatal
 */
async function listErrorLogs(req, res) {
    try {
        const filter = {};
        if (req.query.level && ['error', 'fatal'].includes(req.query.level)) {
            filter.level = req.query.level;
        }
        const entries = await ErrorLog.find(filter).sort({ createdAt: -1 }).limit(100).lean();
        return res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (err) {
        console.error('[Admin] Error logs failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load error logs.' });
    }
}

/**
 * GET /api/admin/notifications — admin notifications (newest first, unread first).
 */
async function listNotifications(req, res) {
    try {
        const entries = await Notification.find({})
            .sort({ read: 1, createdAt: -1 })
            .limit(50)
            .lean();
        const unread = entries.filter(n => !n.read).length;
        return res.status(200).json({ success: true, count: entries.length, unread, data: entries });
    } catch (err) {
        console.error('[Admin] Notifications failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
    }
}

/**
 * POST /api/admin/notifications/:id/read — mark a notification as read.
 */
async function markNotificationRead(req, res) {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        return res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
        console.error('[Admin] Mark notification failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update the notification.' });
    }
}

/**
 * POST /api/admin/notifications/read-all — clear all notifications.
 */
async function markAllNotificationsRead(req, res) {
    try {
        await Notification.updateMany({ read: false }, { $set: { read: true } });
        return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
        console.error('[Admin] Clear notifications failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to clear notifications.' });
    }
}

module.exports = {
    overview,
    listUsers,
    updateUser,
    deleteUser,
    listSubscriptions,
    listProducts,
    updateListing,
    deleteListing,
    auditLog,
    setSubscriptionStatus,
    listTestimonials,
    updateTestimonial,
    deleteTestimonial,
    listErrorLogs,
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead
};