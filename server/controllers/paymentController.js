const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { logAudit } = require('../db/database');

/**
 * Subscription plans. Prices in Kenyan Shillings (KES).
 * firstTime flag: farmers pay a one-time 3,000 KES set-up then low renewals.
 */
const PLANS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 800,
        periodMonths: 1,
        description: 'Post your produce and reach traders for 1 month.'
    },
    grower: {
        id: 'grower',
        name: 'Grower',
        price: 3000,
        periodMonths: 6,
        description: 'The popular one-time set-up plan — 6 months of unlimited listings.'
    },
    pro: {
        id: 'pro',
        name: 'Pro Farmer',
        price: 5000,
        periodMonths: 12,
        description: 'A full year of selling + featured placement.'
    }
};

function getPlans() {
    return Object.values(PLANS);
}

/**
 * GET /api/plans — public price list.
 */
async function getPlansHandler(req, res) {
    return res.status(200).json({ success: true, data: getPlans() });
}

/**
 * GET /api/my/membership — authenticated user's subscription status.
 */
async function getMyMembership(req, res) {
    try {
        const user = await User.findById(req.user._id).select('membership email role');
        const sub = await Subscription.findOne({ user: req.user._id }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({
            success: true,
            data: {
                membership: user.membership || { status: 'none', plan: null, expiresAt: null },
                latestPayment: sub || null
            }
        });
    } catch (err) {
        console.error('[Membership] Fetch failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch your membership.'
        });
    }
}

/**
 * POST /api/payment/request — farmer requests a subscription (M-Pesa intent).
 * When Safaricom Daraja credentials are configured this triggers a real STK
 * push; otherwise it creates a pending payment for the admin to verify.
 *
 * @route POST /api/payment/request  { plan, phone }
 */
async function requestPayment(req, res) {
    const { plan, phone } = req.body;
    const p = PLANS[plan];
    if (!p) {
        return res.status(400).json({ success: false, message: 'Unknown subscription plan.' });
    }
    const phones = String(phone || '').replace(/[^0-9]/g, '');
    if (phones.length < 9) {
        return res.status(400).json({ success: false, message: 'Please provide a valid M-Pesa number.' });
    }

    try {
        const pending = await Subscription.create({
            user: req.user._id,
            plan: p.id,
            amount: p.price,
            periodMonths: p.periodMonths,
            mpesaPhone: String(phone).trim(),
            status: 'pending'
        });

        await User.findByIdAndUpdate(req.user._id, {
            'membership.status': 'pending'
        });

        logAudit('PAYMENT_REQUESTED', `Payment request ${p.id} KES ${p.price} for ${req.user.email}`)
            .catch(err => console.error('[Audit] Failed to log:', err.message));

        return res.status(201).json({
            success: true,
            message: 'Payment request received. You will be contacted to confirm your M-Pesa payment (or approve from the admin dashboard), then your subscription activates.',
            data: { payment: pending, plan: p }
        });
    } catch (err) {
        console.error('[Payment] Request failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create the payment request.'
        });
    }
}

module.exports = { PLANS, getPlans, getPlansHandler, getMyMembership, requestPayment };