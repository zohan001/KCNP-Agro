const mongoose = require('mongoose');

/**
 * ============================================
 * Review — reputation earned after a real trade
 * ============================================
 * A middleman's word is his reputation; a platform has to earn
 * the same trust differently. A Review can only be written by a
 * party to a *completed* trade (a released escrow order, or a
 * listing the farmer marked sold to a registered buyer), so the
 * score on a profile reflects transactions that actually happened
 * rather than clicks.
 *
 * Each side reviews the other once, and the summary is mirrored
 * onto the subject's User.rating for cheap display next to a name.
 */

const reviewSchema = new mongoose.Schema(
    {
        // Which trade this review is about. At least one is set.
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
            index: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            default: null,
            index: true
        },
        context: {
            type: String,
            enum: ['escrow', 'listing'],
            required: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // The author's side of the trade.
        authorRole: {
            type: String,
            enum: ['buyer', 'seller'],
            required: true
        },
        rating: {
            type: Number,
            required: [true, 'Choose a rating from 1 to 5.'],
            min: [1, 'Rating must be at least 1.'],
            max: [5, 'Rating cannot exceed 5.']
        },
        comment: {
            type: String,
            trim: true,
            maxlength: [1000, 'Comment cannot exceed 1000 characters.']
        }
    },
    { timestamps: true }
);

// Uniqueness (one review per author per trade) is enforced in the controller,
// where the trade is resolved, rather than by a compound index over the
// nullable order/product fields.
reviewSchema.index({ subject: 1, createdAt: -1 });
reviewSchema.index({ author: 1, createdAt: -1 });

reviewSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return obj;
};

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);
