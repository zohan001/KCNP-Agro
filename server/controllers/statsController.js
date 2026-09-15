const User = require('../models/User');
const Product = require('../models/Product');
const Article = require('../models/Article');
const Quiz = require('../models/Quiz');

async function getStats(req, res) {
    try {
        const [farmers, traders, listings, articles, quizzes] = await Promise.all([
            User.countDocuments({ role: 'farmer', isActive: true }),
            User.countDocuments({ role: 'trader', isActive: true }),
            Product.countDocuments({ active: true }),
            Article.countDocuments({ published: true }),
            Quiz.countDocuments({ published: true })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                farmers,
                traders,
                listings,
                articles,
                quizzes,
                totalUsers: farmers + traders
            }
        });
    } catch (err) {
        console.error('[Stats] Failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics.'
        });
    }
}

module.exports = { getStats };