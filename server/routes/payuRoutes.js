const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createPayuPaymentLink,
    handlePayuWebhook,
    handlePayuCallback,
    getPayuCheckoutPage,
    getPayuCheckoutData,
    createMerchantHostedPayment,
    processUPISeamless,
    verifyPaymentStatus
} = require('../controllers/payuController.js');

// ============ MERCHANT APIs (API Key Auth) ============
// ⚠️ DEPRECATED: Use /api/payments/create-payment-link instead
// This endpoint is kept for backward compatibility but will be removed in future versions
router.post('/create-payment-link', apiKeyAuth, (req, res, next) => {
    // Add deprecation notice
    console.log('⚠️ DEPRECATED: Gateway-specific endpoint used. Recommend using /api/payments/create-payment-link');
    // Add warning header
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Please use /api/payments/create-payment-link which automatically selects the configured payment gateway.');
    next();
}, createPayuPaymentLink);

// ============ CHECKOUT PAGE (No Auth - Auto-submits form to PayU) ============
router.get('/checkout/:transactionId', getPayuCheckoutPage);

// ============ CHECKOUT DATA API (For Krishi Shaktisewa Frontend) ============
router.get('/checkout-data/:transactionId', getPayuCheckoutData);

// ============ CALLBACK (No Auth - GET/POST from PayU) ============
router.get('/callback', handlePayuCallback);
router.post('/callback', handlePayuCallback);

// ============ WEBHOOK (No Auth - Hash Verified) ============
router.post('/webhook', handlePayuWebhook);

// ============ MERCHANT HOSTED CHECKOUT (API Key Auth) ============
// Create payment using Merchant Hosted Checkout
// Reference: https://docs.payu.in/docs/custom-checkout-merchant-hosted
router.post('/merchant-hosted/create', apiKeyAuth, createMerchantHostedPayment);

// ============ UPI SEAMLESS (API Key Auth) ============
// Process UPI payment using Server-to-Server seamless flow
// Reference: https://docs.payu.in/docs/collect-payments-with-upi-seamless
router.post('/upi/seamless', apiKeyAuth, processUPISeamless);

// ============ VERIFY PAYMENT (API Key Auth) ============
// Verify payment status using PayU Verify Payment API
router.get('/verify', apiKeyAuth, verifyPaymentStatus);

module.exports = router;

