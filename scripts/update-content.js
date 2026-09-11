/**
 * ============================================
 * Update Content Script
 * ============================================
 * Safely updates an EXISTING database with the
 * latest seed content WITHOUT wiping user data.
 *
 * - Articles are matched by title and updated/inserted.
 * - Quizzes are matched by title and updated/inserted.
 * - Users and products are left untouched.
 *
 * Usage (defaults to the MONGO_URI in .env):
 *   node scripts/update-content.js
 *   MONGO_URI="mongodb+srv://..." node scripts/update-content.js
 * ============================================
 */

require('dotenv').config();
const { connectDB, initializeDatabase, closeDatabase } = require('../server/db/database');
const Article = require('../server/models/Article');
const Quiz = require('../server/models/Quiz');
const { SEED_ARTICLES, SEED_QUIZZES } = require('./seed-data');

(async () => {
    try {
        await connectDB();
        await initializeDatabase();
        console.log('\n=== Updating content (no user data touched) ===');

        let updated = 0;
        for (const a of SEED_ARTICLES) {
            const res = await Article.findOneAndUpdate(
                { title: a.title },
                { $set: a },
                { returnDocument: 'after', upsert: true, runValidators: true }
            );
            if (res) updated++;
        }
        console.log(`[Article] ${updated}/${SEED_ARTICLES.length} upserted`);

        updated = 0;
        for (const q of SEED_QUIZZES) {
            const res = await Quiz.findOneAndUpdate(
                { title: q.title },
                { $set: q },
                { returnDocument: 'after', upsert: true, runValidators: true }
            );
            if (res) updated++;
        }
        console.log(`[Quiz] ${updated}/${SEED_QUIZZES.length} upserted`);

        console.log('\n=== Update complete ===\n');
        await closeDatabase();
        process.exit(0);
    } catch (err) {
        console.error('[Update] FAILED:', err.message);
        try { await closeDatabase(); } catch (e) {}
        process.exit(1);
    }
})();