const mongoose = require('mongoose');

/**
 * Small key/value store for runtime-generated application secrets (currently
 * the auto-generated JWT signing secret). Persisting these in the database
 * keeps sessions valid across restarts and redeploys on hosts where the
 * filesystem is ephemeral (e.g. Render).
 */
const appSecretSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        value: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.models.AppSecret || mongoose.model('AppSecret', appSecretSchema);
