const express = require('express');
const router = express.Router();

const contactController = require('../controllers/contactController');
const newsletterController = require('../controllers/newsletterController');
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const articleController = require('../controllers/articleController');
const quizController = require('../controllers/quizController');
const statsController = require('../controllers/statsController');
const marketInsightsController = require('../controllers/marketInsightsController');
const paymentController = require('../controllers/paymentController');
const adminController = require('../controllers/adminController');

const {
    validateContactMessage,
    validateNewsletter,
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
    validateProduct,
    validateArticle,
    validateQuiz
} = require('../middleware/validation');

const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');

// ==============================
// Contact Message Routes
// ==============================
router.post('/contact', validateContactMessage, contactController.submitContact);
router.get('/contact', contactController.getContacts);

// ==============================
// Newsletter Routes
// ==============================
router.post('/newsletter', validateNewsletter, newsletterController.subscribe);
router.get('/newsletter', newsletterController.getSubscribers);

// ==============================
// Auth Routes
// ==============================
router.post('/auth/register', validateRegister, authController.register);
router.post('/auth/login', validateLogin, authController.login);
router.get('/auth/profile', authenticate, authController.getProfile);
router.post('/auth/activate', authController.activate);
router.post('/auth/resend-activation', authController.resendActivation);
router.post('/auth/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/auth/reset-password', validateResetPassword, authController.resetPassword);

// ==============================
// Product / Marketplace Routes
// ==============================
router.post('/products', authenticate, authorize('farmer'), validateProduct, productController.createProduct);
router.get('/products', productController.getProducts);
router.get('/products/my', authenticate, productController.getMyProducts);
router.get('/products/:id', productController.getProduct);
router.put('/products/:id', authenticate, authorize('farmer'), productController.updateProduct);
router.delete('/products/:id', authenticate, productController.deleteProduct);

// Buyer demand signals (public, lightweight)
router.post('/products/:id/view', marketInsightsController.recordView);
router.post('/products/:id/interest', marketInsightsController.recordInterest);

// Supply/demand analysis
router.get('/market-insights', marketInsightsController.getMarketInsights);

// ==============================
// Article / Knowledge Base Routes
// ==============================
router.post('/articles', authenticate, authorize('admin'), validateArticle, articleController.createArticle);
router.get('/articles', optionalAuthenticate, articleController.getArticles);
router.get('/articles/:id', articleController.getArticle);
router.put('/articles/:id', authenticate, authorize('admin'), articleController.updateArticle);
router.delete('/articles/:id', authenticate, authorize('admin'), articleController.deleteArticle);

// ==============================
// Quiz / Self-Assessment Routes
// ==============================
router.post('/quizzes', authenticate, authorize('admin'), validateQuiz, quizController.createQuiz);
router.get('/quizzes', optionalAuthenticate, quizController.getQuizzes);
router.get('/quizzes/:id', optionalAuthenticate, quizController.getQuiz);
router.post('/quizzes/:id/submit', quizController.submitQuiz);
router.put('/quizzes/:id', authenticate, authorize('admin'), quizController.updateQuiz);
router.delete('/quizzes/:id', authenticate, authorize('admin'), quizController.deleteQuiz);

// ==============================
// Stats
// ==============================
router.get('/stats', statsController.getStats);

// ==============================
// Subscriptions / Payments
// ==============================
router.get('/plans', paymentController.getPlansHandler);
router.get('/my/membership', authenticate, paymentController.getMyMembership);
router.post('/payment/request', authenticate, authorize('farmer', 'admin'), paymentController.requestPayment);

// ==============================
// Super Admin
// ==============================
router.get('/admin/overview', authenticate, authorize('admin'), adminController.overview);
router.get('/admin/users', authenticate, authorize('admin'), adminController.listUsers);
router.put('/admin/users/:id', authenticate, authorize('admin'), adminController.updateUser);
router.delete('/admin/users/:id', authenticate, authorize('admin'), adminController.deleteUser);
router.get('/admin/subscriptions', authenticate, authorize('admin'), adminController.listSubscriptions);
router.post('/admin/subscriptions/:id/approve', authenticate, authorize('admin'),
    (req, res) => adminController.setSubscriptionStatus(req, res, 'active'));
router.post('/admin/subscriptions/:id/deny', authenticate, authorize('admin'),
    (req, res) => adminController.setSubscriptionStatus(req, res, 'denied'));
router.get('/admin/listings', authenticate, authorize('admin'), adminController.listProducts);
router.put('/admin/listings/:id', authenticate, authorize('admin'), adminController.updateListing);
router.delete('/admin/listings/:id', authenticate, authorize('admin'), adminController.deleteListing);
router.get('/admin/audit-log', authenticate, authorize('admin'), adminController.auditLog);

// ==============================
// Health Check
// ==============================
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
