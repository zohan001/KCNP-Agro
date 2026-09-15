const Quiz = require('../models/Quiz');

async function createQuiz(req, res) {
    const { title, titleSw, description, descriptionSw, category, questions, published } = req.body;

    try {
        const quiz = await Quiz.create({
            title, titleSw, description, descriptionSw, category, questions, published
        });

        return res.status(201).json({
            success: true,
            message: 'Quiz created.',
            data: { quiz }
        });
    } catch (err) {
        console.error('[Quiz] Create failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create quiz.',
            errors: err.message
        });
    }
}

async function getQuizzes(req, res) {
    try {
        const { category, page = 1, limit = 20, all } = req.query;
        const isAdmin = req.user && req.user.role === 'admin';
        const filter = {};
        if (all === '1' && isAdmin) {
            // admin content view: include drafts
        } else {
            filter.published = true;
        }

        if (category) filter.category = category;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const quizProjection = isAdmin && all === '1' ? {} : '-questions.correctIndex';
        const [quizzes, total] = await Promise.all([
            Quiz.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select(quizProjection),
            Quiz.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            count: quizzes.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: quizzes
        });
    } catch (err) {
        console.error('[Quiz] Fetch failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch quizzes.'
        });
    }
}

async function getQuiz(req, res) {
    const isAdmin = req.user && req.user.role === 'admin';
    const select = req.query.admin === '1' && isAdmin ? '' : '-questions.correctIndex';
    try {
        const quiz = await Quiz.findById(req.params.id).select(select);
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found.'
            });
        }
        return res.status(200).json({
            success: true,
            data: { quiz }
        });
    } catch (err) {
        console.error('[Quiz] Fetch by ID failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch quiz.'
        });
    }
}

async function submitQuiz(req, res) {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found.'
            });
        }

        const { answers } = req.body;
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an answers array.'
            });
        }

        const scoreResult = quiz.score(answers);
        return res.status(200).json({
            success: true,
            data: scoreResult
        });
    } catch (err) {
        console.error('[Quiz] Submit failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit quiz.'
        });
    }
}

async function updateQuiz(req, res) {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found.'
            });
        }

        const allowed = ['title', 'titleSw', 'description', 'descriptionSw', 'category', 'questions', 'published'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) quiz[field] = req.body[field];
        });

        await quiz.save();
        return res.status(200).json({
            success: true,
            message: 'Quiz updated.',
            data: { quiz }
        });
    } catch (err) {
        console.error('[Quiz] Update failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update quiz.'
        });
    }
}

async function deleteQuiz(req, res) {
    try {
        const quiz = await Quiz.findByIdAndDelete(req.params.id);
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found.'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Quiz deleted.'
        });
    } catch (err) {
        console.error('[Quiz] Delete failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete quiz.'
        });
    }
}

module.exports = { createQuiz, getQuizzes, getQuiz, submitQuiz, updateQuiz, deleteQuiz };
