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
router.post('/create-payment-link', apiKeyAuth, createRazorpayPaymentLink);
// router.post('/verify-payment', verifyRazorpayPayment);

// ============ CALLBACK (No Auth - GET from Razorpay) ============
router.get('/callback', handleRazorpayCallback);

// ============ WEBHOOK (No Auth - Signature Verified) ============
// Use express.raw() for webhook to get raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
// Keep PhonePe webhook for backward compatibility
router.post('/webhook/phonepe', handlePhonePeWebhook);

module.exports = router;
