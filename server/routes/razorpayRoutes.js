const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createRazorpayPaymentLink,
    handleRazorpayWebhook,
    handleRazorpayCallback,
    verifyRazorpayPayment,
    createPhonePeDeepLink,
    handlePhonePeWebhook
} = require('../controllers/razorpayController.js');

// ============ MERCHANT APIs (API Key Auth) ============
// ⚠️ DEPRECATED: Use /api/payments/create-payment-link instead
// This endpoint is kept for backward compatibility but will be removed in future versions
router.post('/create-payment-link', apiKeyAuth, (req, res, next) => {
    // Add deprecation notice
    console.log('⚠️ DEPRECATED: Gateway-specific endpoint used. Recommend using /api/payments/create-payment-link');
    // Add warning header
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Please use /api/payments/create-payment-link which automatically selects the configured payment gateway.');
    next();
}, createRazorpayPaymentLink);
// router.post('/verify-payment', verifyRazorpayPayment);

// ============ CALLBACK (No Auth - GET from Razorpay) ============
router.get('/callback', handleRazorpayCallback);

// ============ WEBHOOK (No Auth - Signature Verified) ============
// Use express.raw() for webhook to get raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
// Keep PhonePe webhook for backward compatibility
router.post('/webhook/phonepe', handlePhonePeWebhook);

module.exports = router;
