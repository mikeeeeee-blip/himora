const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');
const {
    createEasebuzzPaymentLink,
    getEasebuzzPaymentPage,
    getEasebuzzCheckoutPage,
    handleEasebuzzCallback,
    handleEasebuzzWebhook,
    handleUPIRedirect
} = require('../controllers/easebuzzController');

// Create payment link (requires API key authentication)
router.post('/create-payment-link', apiKeyAuth, createEasebuzzPaymentLink);

// Shareable payment page (public - customers visit this link, it auto-submits to Easebuzz)
router.get('/payment-page/:transactionId', getEasebuzzPaymentPage);

// Custom checkout page with EaseCheckout SDK (public - customers visit this link for UPI payment)
router.get('/checkout/:transactionId', getEasebuzzCheckoutPage);

// Callback handler (public - called by Easebuzz after payment)
router.post('/callback', handleEasebuzzCallback);
router.get('/callback', handleEasebuzzCallback); // Support GET for callbacks

// Webhook handler (public - called by Easebuzz for payment status updates)
// Support both GET and POST methods as Easebuzz may use either
// Add logging middleware to track all webhook requests
const webhookLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    console.log('\n' + '🚨'.repeat(40));
    console.log('🚨 EASEBUZZ WEBHOOK ENDPOINT HIT 🚨');
    console.log('🚨'.repeat(40));
    console.log('   ⏰ Timestamp:', timestamp);
    console.log('   🌐 IP Address:', ip);
    console.log('   📱 User-Agent:', userAgent);
    console.log('   🔗 Method:', req.method);
    console.log('   🔗 URL:', req.originalUrl || req.url);
    console.log('   📋 Content-Type:', req.headers['content-type'] || 'Not set');
    console.log('   📦 Body Size:', req.headers['content-length'] || 'Unknown', 'bytes');
    console.log('🚨'.repeat(40) + '\n');
    
    next();
};

router.post('/webhook', webhookLogger, express.json(), handleEasebuzzWebhook);
router.get('/webhook', webhookLogger, handleEasebuzzWebhook);

// UPI redirect endpoint (public - smart UPI app detection and redirect)
router.get('/upi-redirect', handleUPIRedirect);

module.exports = router;

