const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required.'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters.'],
            maxlength: [300, 'Title cannot exceed 300 characters.']
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true
        },
        content: {
            type: String,
            required: [true, 'Content is required.'],
            minlength: [50, 'Content must be at least 50 characters.']
        },
        summary: {
            type: String,
            trim: true,
            maxlength: [500, 'Summary cannot exceed 500 characters.']
        },
        titleSw: {
            type: String,
            trim: true
        },
        summarySw: {
            type: String,
            trim: true,
            maxlength: [500, 'Kiswahili summary cannot exceed 500 characters.']
        },
        contentSw: {
            type: String
        },
        category: {
            type: String,
            required: [true, 'Category is required.'],
            enum: ['climate-smart-farming', 'water-management', 'soil-health', 'crop-diversification', 'carbon-credits', 'market-access', 'policy', 'general'],
            default: 'general'
        },
        tags: [{
            type: String,
            trim: true
        }],
        author: {
            type: String,
            trim: true,
            default: 'KCNP Agro Team'
        },
        published: {
            type: Boolean,
            default: false
        },
        views: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

articleSchema.pre('save', function () {
    if (!this.slug || this.isModified('title')) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    if (this.isModified('content') && !this.summary) {
        this.summary = this.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
    }
});

articleSchema.index({ title: 'text', content: 'text' });
articleSchema.index({ category: 1 });
articleSchema.index({ published: 1 });

module.exports = mongoose.models.Article || mongoose.model('Article', articleSchema);
