const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { logAudit } = require('../db/database');
const config = require('../config');
const daraja = require('../services/daraja');
const paystack = require('../services/paystack');
const { activateSubscription } = require('../services/subscriptions');

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
 * POST /api/payment/request — farmer requests a subscription.
 * Provider order: Paystack (preferred) → Daraja STK → manual admin approval.
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
            status: 'pending',
            provider: 'manual'
        });

        await User.findByIdAndUpdate(req.user._id, {
            'membership.status': 'pending'
        });

        logAudit('PAYMENT_REQUESTED', `Payment request ${p.id} KES ${p.price} for ${req.user.email}`)
            .catch(err => console.error('[Audit] Failed to log:', err.message));

        // 1) Preferred provider: Paystack Charge API (triggers the M-Pesa
        //    prompt itself; result arrives via the paystack webhook).
        if (config.paystackConfigured()) {
            try {
                const reference = `KCNP${pending._id}`;
                const resp = await paystack.charge({
                    email: req.user.email,
                    amountKes: p.price,
                    phone: String(phone).trim(),
                    reference,
                    metadata: {
                        plan: p.id,
                        user: String(req.user._id),
                        subscription: String(pending._id)
                    }
                });
                const data = resp.data || {};
                const status = String(data.status || '').toLowerCase();

                pending.provider = 'paystack';
                pending.paystackReference = reference;
                await pending.save();

                if (status === 'success') {
                    await activateSubscription(pending, {
                        ref: reference,
                        provider: 'paystack',
                        raw: data
                    });
                    return res.status(201).json({
                        success: true,
                        message: 'Payment confirmed. Your subscription is now active.',
                        data: { payment: pending, plan: p }
                    });
                }

                if (status === 'send_otp') {
                    logAudit('PAYSTACK_OTP_REQUIRED',
                        `Paystack ${reference} needs OTP for ${req.user.email}`)
                        .catch(() => {});
                    return res.status(201).json({
                        success: true,
                        needsOtp: true,
                        otpReference: reference,
                        message: data.display_text
                            || 'Enter the OTP sent to your phone to complete the payment.',
                        data: { payment: pending, plan: p, paystack: { reference, status } }
                    });
                }

                if (status === 'failed' || status === 'timeout') {
                    return res.status(402).json({
                        success: false,
                        message: data.message || 'Payment could not be started. Please try again.'
                    });
                }

                // pay_offline / pending — waiting for the farmer to approve.
                logAudit('PAYSTACK_CHARGE_INITIATED',
                    `Paystack ${reference} KES ${p.price} to ${String(phone).trim()} for ${req.user.email}`)
                    .catch(err => console.error('[Audit] Failed to log:', err.message));

                return res.status(201).json({
                    success: true,
                    message: 'M-Pesa prompt sent to your phone. Enter your M-Pesa PIN at the prompt to complete the payment — your subscription activates automatically.',
                    data: {
                        payment: pending,
                        plan: p,
                        paystack: { reference, status }
                    }
                });
            } catch (err) {
                console.error('[Payment] Paystack charge failed, trying next provider:', err.message);
            }
        }

        // 2) Fallback: Daraja STK push.
        if (config.mpesaConfigured()) {
            try {
                const resp = await daraja.stkPush(
                    String(phone).trim(),
                    p.price,
                    `KCNP${p.id}`,
                    `${p.name} subscription`
                );
                const accepted = resp && (String(resp.ResponseCode) === '0' || resp.ResponseCode === 0);

                if (accepted && resp.CheckoutRequestID) {
                    pending.provider = 'daraja';
                    pending.merchantRequestId = resp.MerchantRequestID || '';
                    pending.checkoutRequestId = resp.CheckoutRequestID;
                    await pending.save();

                    logAudit('MPESA_STK_SENT',
                        `STK ${resp.CheckoutRequestID} KES ${p.price} to ${String(phone).trim()} for ${req.user.email}`)
                        .catch(err => console.error('[Audit] Failed to log:', err.message));

                    return res.status(201).json({
                        success: true,
                        message: 'M-Pesa prompt sent to your phone. Enter your PIN on the M-Pesa screen to complete the payment — your subscription activates automatically.',
                        data: {
                            payment: pending,
                            plan: p,
                            stk: {
                                checkoutRequestId: resp.CheckoutRequestID,
                                responseDescription: resp.ResponseDescription || ''
                            }
                        }
                    });
                }

                console.error('[Payment] STK push not accepted by Daraja:', resp);
            } catch (err) {
                console.error('[Payment] STK push failed, falling back to manual verification:', err.message);
            }
        }

        // 3) Manual: pending + admin approval.
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

/**
 * POST /api/payment/otp — submit the OTP Paystack requested after a charge.
 *
 * @route POST /api/payment/otp  { reference, otp }
 */
async function submitPaymentOtp(req, res) {
    const { reference, otp } = req.body;
    if (!reference || !otp) {
        return res.status(400).json({ success: false, message: 'Reference and OTP are required.' });
    }

    try {
        const sub = await Subscription.findOne({
            paystackReference: String(reference).trim(),
            user: req.user._id
        });
        if (!sub) {
            return res.status(404).json({ success: false, message: 'Payment request not found.' });
        }

        const resp = await paystack.submitOtp(reference, otp);
        const data = resp.data || {};
        const status = String(data.status || '').toLowerCase();

        if (status === 'success') {
            await activateSubscription(sub, {
                ref: data.reference || reference,
                provider: 'paystack',
                raw: data
            });
            return res.status(200).json({
                success: true,
                message: 'Payment confirmed. Your subscription is now active.',
                data: { payment: sub }
            });
        }

        if (status === 'failed' || status === 'timeout') {
            return res.status(402).json({
                success: false,
                message: data.message || 'Payment failed. Please try again.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Processing your payment. It will confirm automatically.'
        });
    } catch (err) {
        console.error('[Payment] OTP submit failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit the OTP. Please try again.'
        });
    }
}

module.exports = {
    PLANS,
    getPlans,
    getPlansHandler,
    getMyMembership,
    requestPayment,
    submitPaymentOtp
};