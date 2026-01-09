const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createPayuPaymentLink,
    handlePayuWebhook,
    handlePayuCallback,
    getPayuCheckoutPage,
    getPayuFormParams,
    createMerchantHostedPayment,
    processUPISeamless,
    verifyPaymentStatus,
    getPayuTransaction,
    getPayuTransactionByOrderId
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

// ============ GET FORM PARAMETERS (No Auth - JSON API for Next.js) ============
// Returns PayU form parameters as JSON so Next.js can submit form directly to PayU
// This completely bypasses Server Actions by never serving HTML through Next.js
router.get('/form-params/:transactionId', getPayuFormParams);

// ============ CHECKOUT PAGE (No Auth - Auto-submits form to PayU) ============
// Legacy route - kept for backward compatibility
// Prefer using /form-params/:transactionId from Next.js
router.get('/checkout/:transactionId', getPayuCheckoutPage);

// ============ TRANSACTION (No Auth - Public endpoint for Next.js) ============
// Public endpoint for Next.js to fetch transaction details
router.get('/transaction/:transactionId', getPayuTransaction);
// Get transaction by PayU order ID (txnid)
router.get('/transaction/by-order/:orderId', getPayuTransactionByOrderId);

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

