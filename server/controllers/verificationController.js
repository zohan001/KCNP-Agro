const FarmerVerification = require('../models/FarmerVerification');
const User = require('../models/User');
const { logAudit } = require('../db/database');

const MAX_IMAGE = 1_000_000; // a bit over 1MB, since we downscale client-side

function asDataUrl(value, field) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(raw)) {
        throw new Error(`${field} must be a PNG, JPG or WEBP image.`);
    }
    const approx = Math.floor(((raw.length - raw.indexOf(',') - 1) * 3) / 4);
    if (approx > MAX_IMAGE * 2) {
        throw new Error(`${field} is too large. Try again with a smaller copy.`);
    }
    return raw;
}

async function ensureRecord(userId) {
    const rec = await FarmerVerification.findOne({ user: userId });
    if (rec) return rec;
    return FarmerVerification.create({ user: userId, status: 'draft', timeline: [{ action: 'created', by: userId }] });
}

async function getMyVerification(req, res) {
    try {
        const rec = await ensureRecord(req.user._id);
        return res.status(200).json({ success: true, data: { verification: rec } });
    } catch (err) {
        console.error('[Verification] Get mine failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load your verification.' });
    }
}

async function saveVerification(req, res) {
    try {
        const rec = await ensureRecord(req.user._id);
        if (rec.status === 'approved') {
            return res.status(409).json({
                success: false,
                message: 'Your ID has already been approved — no changes needed.'
            });
        }

        const idFront = asDataUrl(req.body.idFront, 'ID Front');
        const idBack = asDataUrl(req.body.idBack, 'ID Back');
        const facePhoto = asDataUrl(req.body.facePhoto, 'Face Photo');

        if (!idFront || !idBack || !facePhoto) {
            return res.status(400).json({
                success: false,
                message: 'Upload ID front, ID back and a live face photo.'
            });
        }

        rec.idFront = idFront;
        rec.idBack = idBack;
        rec.facePhoto = facePhoto;
        rec.faceCaptureAt = new Date();
        rec.deviceInfo = String(req.body.deviceInfo || '').slice(0, 200);
        if (rec.status !== 'submitted' && rec.status !== 'under_review') {
            rec.status = 'draft';
        }
        rec.record('saved', { by: req.user._id, note: 'Documents and face photo saved (private).' });
        await rec.save();

        return res.status(200).json({
            success: true,
            message: 'Your documents have been saved privately. You can request an admin review when ready.',
            data: { verification: rec }
        });
    } catch (err) {
        console.error('[Verification] Save failed:', err.message);
        return res.status(400).json({ success: false, message: err.message });
    }
}

async function requestReview(req, res) {
    try {
        const rec = await ensureRecord(req.user._id);
        if (!rec.idFront || !rec.idBack || !rec.facePhoto) {
            return res.status(400).json({
                success: false,
                message: 'Please upload your ID and face photo before requesting a review.'
            });
        }
        if (rec.status === 'approved') {
            return res.status(409).json({ success: false, message: 'Already approved.' });
        }
        rec.status = 'submitted';
        rec.record('submitted', { by: req.user._id, note: 'Farmer requested admin review.' });
        await rec.save();
        await logAudit('VERIFICATION_SUBMITTED', `Verification submitted by ${req.user.email}`);

        return res.status(200).json({
            success: true,
            message: 'Submitted for review. An admin will check and approve or ask for more info.',
            data: { verification: rec }
        });
    } catch (err) {
        console.error('[Verification] Request review failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to request a review.' });
    }
}

async function adminListVerifications(req, res) {
    try {
        const filter = {};
        if (req.query.status) filter.status = String(req.query.status);
        const recs = await FarmerVerification.find(filter)
            .populate('user', 'name email phone role')
            .sort({ updatedAt: -1 })
            .limit(150);
        return res.status(200).json({ success: true, data: { verifications: recs } });
    } catch (err) {
        console.error('[Verification] Admin list failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load verification requests.' });
    }
}

async function adminApprove(req, res) {
    try {
        const rec = await FarmerVerification.findById(req.params.id);
        if (!rec) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        rec.status = 'approved';
        rec.approvedAt = new Date();
        rec.reviewedBy = req.user._id;
        rec.reviewedAt = new Date();
        rec.rejectionReason = '';
        rec.record('approved', { by: req.user._id, note: 'Approved by admin.' });
        await rec.save();
        await User.findByIdAndUpdate(rec.user, {
            $set: {
                identityVerified: true,
                identityVerifiedAt: new Date()
            }
        }).catch(() => {});
        await logAudit('VERIFICATION_APPROVED', `Verification approved by ${req.user.email} for user ${rec.user}`);
        return res.status(200).json({ success: true, message: 'Verification approved.', data: { verification: rec } });
    } catch (err) {
        console.error('[Verification] Approve failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to approve.' });
    }
}

async function adminReject(req, res) {
    try {
        const rec = await FarmerVerification.findById(req.params.id);
        if (!rec) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        const reason = String(req.body.reason || '').slice(0, 500);
        if (reason.length < 10) {
            return res.status(400).json({ success: false, message: 'Give the farmer a clear reason to fix it.' });
        }
        rec.status = 'rejected';
        rec.reviewedBy = req.user._id;
        rec.reviewedAt = new Date();
        rec.rejectionReason = reason;
        rec.record('rejected', { by: req.user._id, note: reason.slice(0, 200) });
        await rec.save();
        await logAudit('VERIFICATION_REJECTED', `Verification rejected by ${req.user.email} for user ${rec.user}: ${reason.slice(0, 120)}`);
        return res.status(200).json({ success: true, message: 'Verification rejected. The farmer can resubmit.', data: { verification: rec } });
    } catch (err) {
        console.error('[Verification] Reject failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to reject.' });
    }
}

module.exports = {
    getMyVerification,
    saveVerification,
    requestReview,
    adminListVerifications,
    adminApprove,
    adminReject
};