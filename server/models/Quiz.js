const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'Question text is required.'],
        trim: true
    },
    questionSw: {
        type: String,
        trim: true
    },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v.length >= 2;
            },
            message: 'A question must have at least 2 options.'
        }
    },
    optionsSw: {
        type: [String],
        validate: {
            validator: function (v) {
                return !v || v.length === 0 || this.options.length === v.length;
            },
            message: 'Kiswahili options must match the number of options.'
        }
    },
    correctIndex: {
        type: Number,
        required: true,
        min: 0
    },
    explanation: {
        type: String,
        trim: true
    },
    explanationSw: {
        type: String,
        trim: true
    }
});

const quizSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Quiz title is required.'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters.'],
            maxlength: [300, 'Title cannot exceed 300 characters.']
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters.']
        },
        titleSw: {
            type: String,
            trim: true
        },
        descriptionSw: {
            type: String,
            trim: true,
            maxlength: [1000, 'Kiswahili description cannot exceed 1000 characters.']
        },
        category: {
            type: String,
            required: [true, 'Category is required.'],
            enum: ['climate-basics', 'soil-management', 'water-conservation', 'crop-planning', 'carbon-footprint', 'sustainability', 'general'],
            default: 'general'
        },
        questions: {
            type: [questionSchema],
            required: true,
            validate: {
                validator: function (v) {
                    return v.length >= 1;
                },
                message: 'A quiz must have at least 1 question.'
            }
        },
        published: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

quizSchema.methods.score = function (answers) {
    let correct = 0;
    const results = [];
    this.questions.forEach((q, i) => {
        const userAnswer = answers[i];
        const isCorrect = userAnswer === q.correctIndex;
        if (isCorrect) correct++;
        results.push({
            questionIndex: i,
            question: q.question,
            userAnswer,
            correctAnswer: q.correctIndex,
            isCorrect,
            explanation: q.explanation
        });
    });
    return {
        score: correct,
        total: this.questions.length,
        percentage: Math.round((correct / this.questions.length) * 100),
        results
    };
};

module.exports = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
