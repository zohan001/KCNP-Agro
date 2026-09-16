const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        name: {
            type: String,
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters.']
        },
        role: {
            type: String,
            enum: ['farmer', 'trader'],
            required: true
        },
        message: {
            type: String,
            required: [true, 'Testimonial message is required.'],
            trim: true,
            minlength: [5, 'Testimonial must be at least 5 characters.'],
            maxlength: [1000, 'Testimonial cannot exceed 1000 characters.']
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 5
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true
        },
        featured: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

testimonialSchema.index({ status: 1, featured: -1, createdAt: -1 });

module.exports = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);