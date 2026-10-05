const FarmerVerification = require('../models/FarmerVerification');
const User = require('../models/User');
const Product = require('../models/Product');
const { logAudit } = require('../db/database');
const { notifyAdmins } = require('../services/notifications');

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

        // An admin has to know a request is waiting, otherwise nothing happens
        // until they happen to open the tab.
        await notifyAdmins({
            type: 'verification_submitted',
            message: `${req.user.name || req.user.email} submitted ID documents for verification.`,
            refId: rec._id
        }).catch((err) => console.error('[Verification] Admin notify failed:', err.message));

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

/**
 * Queue metadata only — never the images.
 *
 * The three documents are ~1MB of base64 each. Returning them with the list
 * meant a queue of 20 farmers pulled ~60MB into the browser before an admin
 * could read a single name. The review UI fetches one submission's images when
 * that farmer is actually opened, via adminGetVerification.
 */
async function adminListVerifications(req, res) {
    try {
        const filter = {};
        if (req.query.status) filter.status = String(req.query.status);
        const recs = await FarmerVerification.find(filter)
            .populate('user', 'name email phone role identityVerified')
            .sort({ updatedAt: -1 })
            .limit(150);

        // Surface any record whose status and the account's identityVerified
        // flag disagree. Re-running the decision repairs it, because that path
        // always rewrites the flag and reverts it if the record write fails.
        const verifications = recs.map((rec) => {
            const farmer = rec.user;
            const accountMissing = !farmer;
            const unlocked = Boolean(farmer && farmer.identityVerified);
            const shouldBeUnlocked = rec.status === 'approved';
            const disagrees = !accountMissing && unlocked !== shouldBeUnlocked;
            let repairReason = null;
            if (accountMissing) {
                repairReason = 'The linked account no longer exists.';
            } else if (disagrees) {
                repairReason = shouldBeUnlocked
                    ? 'Approved, but the account is still locked. Approve again to repair.'
                    : 'Not approved, but the account is still unlocked. Reject again to repair.';
            }
            return Object.assign(rec.toObject(), {
                idFront: undefined,
                idBack: undefined,
                facePhoto: undefined,
                hasImages: Boolean(rec.idFront && rec.idBack && rec.facePhoto),
                needsRepair: accountMissing || disagrees,
                repairReason
            });
        });

        // Drives the count badge on the admin tab.
        const pending = await FarmerVerification.countDocuments({
            status: { $in: ['submitted', 'under_review'] }
        });

        return res.status(200).json({ success: true, data: { verifications, pending } });
    } catch (err) {
        console.error('[Verification] Admin list failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load verification requests.' });
    }
}

/**
 * One submission, images included. This is the only admin endpoint that
 * returns identity documents, and it is what marks the record as being looked
 * at so two admins don't decide the same submission in parallel.
 */
async function adminGetVerification(req, res) {
    try {
        const rec = await FarmerVerification.findById(req.params.id)
            .populate('user', 'name email phone role identityVerified');
        if (!rec) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        if (rec.status === 'submitted') {
            rec.status = 'under_review';
            rec.record('review_opened', { by: req.user._id, note: 'Opened for review.' });
            await rec.save();
        }
        return res.status(200).json({ success: true, data: { verification: rec } });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        console.error('[Verification] Admin get failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load the submission.' });
    }
}

/**
 * Set or clear the `identityVerified` flag on the farmer's account.
 *
 * Returns a result instead of throwing, because every caller has to decide
 * what to do about a failure rather than pretend it did not happen.
 *
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {boolean} verified
 * @returns {Promise<{ ok: boolean, error: string|null }>}
 */
async function applyIdentityFlag(userId, verified) {
    try {
        const user = await User.findByIdAndUpdate(userId, {
            $set: {
                identityVerified: verified,
                identityVerifiedAt: verified ? new Date() : null
            }
        }, { new: true }).select('_id');

        if (!user) {
            return { ok: false, error: 'The farmer account no longer exists.' };
        }
        return { ok: true, error: null };
    } catch (err) {
        console.error('[Verification] identityVerified write failed for', String(userId), '-', err.message);
        return { ok: false, error: err.message };
    }
}

/**
 * Record an admin decision and keep the account flag in step with it.
 *
 * The marketplace gate reads `User.identityVerified` while admins read the
 * FarmerVerification record, so a half-applied decision is the worst outcome:
 * the admin believes the farmer is unlocked while the farmer still cannot
 * list. Standalone mongod has no multi-document transactions, so this writes
 * the flag first, the record second, and puts the flag back if the record
 * write fails. Both orderings leave the two in agreement unless the revert
 * itself fails, which is logged loudly and audited.
 *
 * @param {Object} req
 * @param {import('mongoose').Document} rec
 * @param {{ approved: boolean, note: string, reason?: string }} decision
 * @returns {Promise<{ status?: number, message?: string, ok?: boolean }>}
 */
async function applyDecision(req, rec, { approved, note, reason = '' }) {
    const farmer = await User.findById(rec.user)
        .select('_id role identityVerified identityVerifiedAt');

    if (!farmer) {
        return {
            status: 404,
            message: 'This request belongs to an account that no longer exists.'
        };
    }
    if (farmer.role !== 'farmer') {
        return {
            status: 409,
            message: `Only farmer accounts can be reviewed. This one is a ${farmer.role}.`
        };
    }

    // Captured before the write so an aborted approval can be undone exactly.
    const previous = {
        verified: farmer.identityVerified === true,
        at: farmer.identityVerifiedAt || null
    };

    const flag = await applyIdentityFlag(rec.user, approved);
    if (!flag.ok) {
        await logAudit(
            'VERIFICATION_DECISION_FAILED',
            `${approved ? 'Approval' : 'Rejection'} by ${req.user.email} was NOT applied for user ${rec.user}: ${flag.error}`
        );
        return {
            status: 503,
            message: `The decision was not applied: the farmer account could not be ${approved ? 'unlocked' : 'relocked'} (${flag.error}). Nothing has changed — please try again.`
        };
    }

    try {
        rec.status = approved ? 'approved' : 'rejected';
        rec.approvedAt = approved ? new Date() : null;
        rec.reviewedBy = req.user._id;
        rec.reviewedAt = new Date();
        // The farmer reads rejectionReason on their verification page, so it
        // must always reflect the current decision rather than a stale one.
        rec.rejectionReason = approved ? '' : reason;
        // An approval supersedes any earlier revocation.
        rec.revokedAt = null;
        rec.revokedListingAction = '';
        rec.listingsAffected = 0;
        rec.record(approved ? 'approved' : 'rejected', { by: req.user._id, note });
        await rec.save();
    } catch (saveErr) {
        console.error('[Verification] Record save failed after the flag was written for', String(rec.user), '-', saveErr.message);
        try {
            await User.findByIdAndUpdate(rec.user, {
                $set: { identityVerified: previous.verified, identityVerifiedAt: previous.at }
            });
        } catch (revertErr) {
            console.error('[Verification] REVERT FAILED for', String(rec.user), '-', revertErr.message,
                '— this farmer is unlocked but has no matching record; re-run the decision to repair');
            await logAudit(
                'VERIFICATION_INCONSISTENT',
                `Flag and record disagree for user ${rec.user} after ${req.user.email} reviewed: ${revertErr.message}`
            );
        }
        return {
            status: 500,
            message: 'The decision was rolled back because the verification record could not be saved. Nothing has changed — please try again.'
        };
    }

    return { ok: true };
}

async function adminApprove(req, res) {
    try {
        const rec = await FarmerVerification.findById(req.params.id);
        if (!rec) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }

        const result = await applyDecision(req, rec, {
            approved: true,
            note: 'Approved by admin.'
        });
        if (result.status) {
            return res.status(result.status).json({ success: false, message: result.message });
        }

        await logAudit('VERIFICATION_APPROVED', `Verification approved by ${req.user.email} for user ${rec.user}`);
        return res.status(200).json({
            success: true,
            message: 'Verification approved. The farmer can now list produce.',
            data: { verification: rec }
        });
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

        // Clearing the flag as well as the record stops a rejected farmer from
        // keeping the access an earlier approval granted.
        const result = await applyDecision(req, rec, {
            approved: false,
            note: reason.slice(0, 200),
            reason
        });
        if (result.status) {
            return res.status(result.status).json({ success: false, message: result.message });
        }

        await logAudit('VERIFICATION_REJECTED', `Verification rejected by ${req.user.email} for user ${rec.user}: ${reason.slice(0, 120)}`);
        return res.status(200).json({ success: true, message: 'Verification rejected. The farmer can resubmit.', data: { verification: rec } });
    } catch (err) {
        console.error('[Verification] Reject failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to reject.' });
    }
}

/**
 * POST /api/verification/:id/revoke — admin withdraws an approval that was
 * already granted.
 *
 * Deliberately separate from reject: reject answers "this submission is not
 * good enough", revoke answers "we were wrong, or something changed". It is
 * one-way until someone approves again.
 *
 * Escrow is intentionally untouched. Orders in flight were paid for by the
 * trader and are already earned by the farmer, so a revocation must never
 * strand that money — the escrow code does not read identityVerified at all.
 */
async function adminRevoke(req, res) {
    try {
        const rec = await FarmerVerification.findById(req.params.id);
        if (!rec) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        if (rec.status !== 'approved') {
            return res.status(409).json({
                success: false,
                message: `Only an approved farmer can be revoked. This one is ${rec.status}.`
            });
        }

        const reason = String(req.body.reason || '').slice(0, 500);
        if (reason.length < 10) {
            return res.status(400).json({ success: false, message: 'Give a clear reason for revoking this farmer.' });
        }

        // Required, not optional: silently leaving a revoked farmer's produce
        // on sale is the one outcome nobody should choose by accident.
        const listingAction = String(req.body.listingAction || '');
        if (!['delist', 'keep'].includes(listingAction)) {
            return res.status(400).json({
                success: false,
                message: 'Choose what should happen to this farmer\'s live listings.'
            });
        }

        const farmer = await User.findById(rec.user).select('_id role');
        if (!farmer) {
            return res.status(404).json({ success: false, message: 'This record belongs to an account that no longer exists.' });
        }
        if (farmer.role !== 'farmer') {
            return res.status(409).json({ success: false, message: 'Only farmer accounts can be revoked.' });
        }

        const result = await applyDecision(req, rec, {
            approved: false,
            note: `Revoked: ${reason.slice(0, 180)}`,
            reason
        });
        if (result.status) {
            return res.status(result.status).json({ success: false, message: result.message });
        }

        // The identity is already withdrawn at this point, so a failure to
        // delist is not a half-applied revocation — it is a separate cleanup
        // problem, and the admin is told exactly what happened.
        let listingsAffected = 0;
        let delistFailed = false;
        if (listingAction === 'delist') {
            const updated = await Product.updateMany(
                { seller: rec.user, active: true },
                { $set: { active: false } }
            ).catch((err) => {
                console.error('[Verification] Delist failed for', String(rec.user), '-', err.message);
                return null;
            });
            if (updated) {
                listingsAffected = updated.modifiedCount || 0;
            } else {
                delistFailed = true;
            }
        }

        rec.status = 'revoked';
        rec.revokedAt = new Date();
        rec.revokedListingAction = listingAction;
        rec.listingsAffected = listingsAffected;
        rec.record('revoked', {
            by: req.user._id,
            note: `${listingAction === 'delist'
                ? `Took down ${listingsAffected} listing(s).`
                : 'Listings left visible.'} ${reason.slice(0, 150)}`
        });
        await rec.save().catch((err) => {
            console.error('[Verification] Could not record revocation details for', String(rec.user), '-', err.message);
        });

        await logAudit(
            'VERIFICATION_REVOKED',
            `Verification revoked by ${req.user.email} for user ${rec.user}: ${reason.slice(0, 120)} (listings: ${listingAction}, ${listingsAffected} affected)`
        );

        const listingNote = listingAction === 'delist'
            ? (delistFailed
                ? ' Their live listings could NOT be taken down — deal with those manually.'
                : ` ${listingsAffected} live listing(s) were taken down.`)
            : ' Their existing listings stay visible; they cannot create or edit any.';

        return res.status(200).json({
            success: true,
            message: `Verification revoked. The farmer can no longer list produce and must submit again.${listingNote}`,
            data: { verification: rec, listingsAffected, listingAction, delistFailed }
        });
    } catch (err) {
        console.error('[Verification] Revoke failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to revoke.' });
    }
}

module.exports = {
    getMyVerification,
    saveVerification,
    requestReview,
    adminListVerifications,
    adminGetVerification,
    adminApprove,
    adminReject,
    adminRevoke
};