const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createRazorpayPaymentLink,
    handleRazorpayWebhook,
    verifyRazorpayPayment,
    createPhonePeDeepLink,
    handlePhonePeWebhook
} = require('../controllers/razorpayController.js');

// ============ MERCHANT APIs (API Key Auth) ============
router.post('/create-payment-link', apiKeyAuth, createPhonePeDeepLink);
// router.post('/verify-payment', verifyRazorpayPayment);


// ============ WEBHOOK (No Auth - Signature Verified) ============
router.post('/webhook', handlePhonePeWebhook);

module.exports = router;
