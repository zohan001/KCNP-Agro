const mongoose = require('mongoose');

/**
 * ============================================
 * FarmerVerification — private identity check
 * ============================================
 * We do not make identity documents public. We store downscaled,
 * base64-encoded images (client-side compression) so they fit well with
 * our cookie-authenticated API that only accepts JSON. The documents are
 * only visible to the farmer who owns the record and to admins.
 */

const STATUS_ENUM = ['draft', 'submitted', 'under_review', 'approved', 'rejected'];

const verificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true
        },
        status: {
            type: String,
            enum: STATUS_ENUM,
            default: 'draft',
            index: true
        },
        // Front/back of National ID, stored as data URLs (private).
        idFront: { type: String, default: '' },
        idBack: { type: String, default: '' },
        // Face capture against the ID.
        facePhoto: { type: String, default: '' },
        // Meta collected at submission (never PII beyond what the image shows).
        faceCaptureAt: { type: Date, default: null },
        deviceInfo: { type: String, default: '', maxlength: 200 },
        // Admin feedback loop.
        reviewNotes: { type: String, default: '', maxlength: 1000 },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '', maxlength: 500 },
        approvedAt: { type: Date, default: null },
        // Audit trail.
        timeline: [
            {
                _id: false,
                at: { type: Date, default: Date.now },
                action: { type: String, required: true },
                by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                note: { type: String, default: '', maxlength: 400 }
            }
        ]
    },
    { timestamps: true }
);

verificationSchema.methods.record = function record(action, { by = null, note = '' } = {}) {
    this.timeline.push({ action, by, note });
    return this;
};

module.exports = mongoose.models.FarmerVerification || mongoose.model('FarmerVerification', verificationSchema);