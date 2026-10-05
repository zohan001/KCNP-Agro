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
const testimonialController = require('../controllers/testimonialController');
const orderController = require('../controllers/orderController');
const verificationController = require('../controllers/verificationController');

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
const { requireRecaptcha } = require('../services/recaptcha');
const config = require('../config');

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
// reCAPTCHA guards account creation only. Sign-in, password recovery and
// payments stay captcha-free on purpose: they are already rate limited and
// sit behind a password or a signed-in account, and a captcha there only
// serves to lock genuine members out when Google's script is unreachable.
router.post('/auth/register', validateRegister, requireRecaptcha, authController.register);
router.post('/auth/login', validateLogin, authController.login);
router.get('/auth/profile', authenticate, authController.getProfile);
router.post('/auth/activate', authController.activate);
router.post('/auth/resend-activation', authController.resendActivation);
router.post('/auth/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/auth/reset-password', validateResetPassword, authController.resetPassword);
router.post('/auth/logout', authController.logout);

// Public config helpers
router.get('/recaptcha-config', (req, res) => {
    res.status(200).json({ success: true, data: { siteKey: config.recaptcha.siteKey } });
});

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

// ==============================
// Escrow Orders
// ==============================
// The money is held by the platform until the trader confirms the goods
// arrived, then released to the farmer. Both sides get the same timeline,
// and a dispute freezes the funds until an admin settles it.
router.post('/products/:id/order', authenticate, authorize('trader', 'admin'), orderController.createOrder);
router.post('/orders/:id/pay', authenticate, orderController.payOrder);
router.post('/orders/:id/otp', authenticate, orderController.submitOrderOtp);
router.post('/orders/:id/dispatch', authenticate, authorize('farmer', 'admin'), orderController.dispatchOrder);
router.post('/orders/:id/confirm', authenticate, orderController.confirmOrder);
router.post('/orders/:id/dispute', authenticate, orderController.disputeOrder);
router.get('/orders', authenticate, orderController.listMyOrders);
router.get('/orders/admin/list', authenticate, authorize('admin'), orderController.adminListOrders);
router.get('/orders/:id', authenticate, orderController.getOrder);
router.post('/orders/:id/hold', authenticate, authorize('admin'), orderController.adminHoldOrder);
router.post('/orders/:id/release', authenticate, authorize('admin'), orderController.adminReleaseOrder);
router.post('/orders/:id/resolve', authenticate, authorize('admin'), orderController.adminResolveOrder);

// ==============================
// Farmer Identity Verification
// ==============================
// Documents are uploaded as downscaled base64 JSON to fit our private,
// cookie-authenticated API. They are never returned to the public list.
router.get('/verification/me', authenticate, verificationController.getMyVerification);
router.post('/verification/save', authenticate, verificationController.saveVerification);
router.post('/verification/request-review', authenticate, verificationController.requestReview);
router.get('/verification/admin/list', authenticate, authorize('admin'), verificationController.adminListVerifications);
router.get('/verification/admin/:id', authenticate, authorize('admin'), verificationController.adminGetVerification);
router.post('/verification/:id/approve', authenticate, authorize('admin'), verificationController.adminApprove);
router.post('/verification/:id/reject', authenticate, authorize('admin'), verificationController.adminReject);
router.post('/verification/:id/revoke', authenticate, authorize('admin'), verificationController.adminRevoke);

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
router.post('/payment/otp', authenticate, authorize('farmer', 'admin'), paymentController.submitPaymentOtp);
router.get('/payment/status/:reference', authenticate, paymentController.getPaymentStatus);

// ==============================
// Testimonials / Feedback
// ==============================
router.post('/testimonials', authenticate, testimonialController.createTestimonial);
router.get('/testimonials', testimonialController.getPublicTestimonials);

// ==============================
// Super Admin
// ==============================
router.get('/admin/overview', authenticate, authorize('admin'), adminController.overview);
router.get('/admin/users', authenticate, authorize('admin'), adminController.listUsers);
router.put('/admin/users/:id', authenticate, authorize('admin'), adminController.updateUser);
router.delete('/admin/users/:id', authenticate, authorize('admin'), adminController.deleteUser);
router.get('/admin/testimonials', authenticate, authorize('admin'), adminController.listTestimonials);
router.put('/admin/testimonials/:id', authenticate, authorize('admin'), adminController.updateTestimonial);
router.delete('/admin/testimonials/:id', authenticate, authorize('admin'), adminController.deleteTestimonial);
router.get('/admin/subscriptions', authenticate, authorize('admin'), adminController.listSubscriptions);
router.post('/admin/subscriptions/:id/approve', authenticate, authorize('admin'),
    (req, res) => adminController.setSubscriptionStatus(req, res, 'active'));
router.post('/admin/subscriptions/:id/deny', authenticate, authorize('admin'),
    (req, res) => adminController.setSubscriptionStatus(req, res, 'denied'));
router.get('/admin/listings', authenticate, authorize('admin'), adminController.listProducts);
router.put('/admin/listings/:id', authenticate, authorize('admin'), adminController.updateListing);
router.delete('/admin/listings/:id', authenticate, authorize('admin'), adminController.deleteListing);
router.get('/admin/audit-log', authenticate, authorize('admin'), adminController.auditLog);
router.get('/admin/logs', authenticate, authorize('admin'), adminController.listErrorLogs);
router.get('/admin/notifications', authenticate, authorize('admin'), adminController.listNotifications);
router.post('/admin/notifications/:id/read', authenticate, authorize('admin'), adminController.markNotificationRead);
router.post('/admin/notifications/read-all', authenticate, authorize('admin'), adminController.markAllNotificationsRead);

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
