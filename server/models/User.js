const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required.'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters.'],
            maxlength: [100, 'Name cannot exceed 100 characters.']
        },
        email: {
            type: String,
            required: [true, 'Email address is required.'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address.']
        },
        password: {
            type: String,
            required: [true, 'Password is required.'],
            minlength: [8, 'Password must be at least 8 characters.']
        },
        role: {
            type: String,
            enum: ['farmer', 'trader', 'admin'],
            default: 'farmer'
        },
        passwordResetToken: {
            type: String,
            select: false
        },
        passwordResetExpires: {
            type: Date,
            select: false
        },
        isActive: {
            type: Boolean,
            default: true
        },
        activationToken: {
            type: String,
            select: false
        },
        activationExpires: {
            type: Date,
            select: false
        },
        membership: {
            plan: { type: String, enum: ['starter', 'grower', 'pro'], default: null },
            status: { type: String, enum: ['none', 'pending', 'active', 'expired'], default: 'none' },
            expiresAt: { type: Date, default: null }
        }
    },
    { timestamps: true }
);

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.activationToken;
    delete obj.activationExpires;
    return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
