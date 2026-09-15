const Article = require('../models/Article');
const mongoose = require('mongoose');

async function createArticle(req, res) {
    const { title, titleSw, summary, summarySw, content, contentSw, category, tags, author, published } = req.body;

    try {
        const article = await Article.create({
            title, titleSw, summary, summarySw, content, contentSw, category, tags, author, published
        });

        return res.status(201).json({
            success: true,
            message: 'Article created.',
            data: { article }
        });
    } catch (err) {
        console.error('[Article] Create failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create article.'
        });
    }
}

async function getArticles(req, res) {
    try {
        const { category, search, page = 1, limit = 20, all } = req.query;
        const isAdmin = req.user && req.user.role === 'admin';
        const filter = {};
        if (all === '1' && isAdmin) {
            // admin content view: include drafts
        } else {
            filter.published = true;
        }

        if (category) filter.category = category;
        if (search) filter.$text = { $search: search };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [articles, total] = await Promise.all([
            Article.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-content'),
            Article.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            count: articles.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: articles
        });
    } catch (err) {
        console.error('[Article] Fetch failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch articles.'
        });
    }
}

async function getArticle(req, res) {
    try {
        const { id } = req.params;
        const isObjectId = mongoose.Types.ObjectId.isValid(id);
        const article = isObjectId
            ? await Article.findOne({ $or: [{ slug: id }, { _id: id }] })
            : await Article.findOne({ slug: id });

        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found.'
            });
        }

        article.views += 1;
        await article.save();

        return res.status(200).json({
            success: true,
            data: { article }
        });
    } catch (err) {
        console.error('[Article] Fetch by ID failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch article.'
        });
    }
}

async function updateArticle(req, res) {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found.'
            });
        }

        const allowed = ['title', 'titleSw', 'summary', 'summarySw', 'content', 'contentSw', 'category', 'tags', 'author', 'published'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) article[field] = req.body[field];
        });

        await article.save();
        return res.status(200).json({
            success: true,
            message: 'Article updated.',
            data: { article }
        });
    } catch (err) {
        console.error('[Article] Update failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update article.'
        });
    }
}

async function deleteArticle(req, res) {
    try {
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found.'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Article deleted.'
        });
    } catch (err) {
        console.error('[Article] Delete failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete article.'
        });
    }
}

module.exports = { createArticle, getArticles, getArticle, updateArticle, deleteArticle };
