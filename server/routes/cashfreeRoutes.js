const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createCashfreePaymentLink,
    handleCashfreeCallback,
    handleCashfreeWebhook
} = require('../controllers/cashfreeController.js');

// ============ MERCHANT APIs (API Key Auth) ============
// ⚠️ DEPRECATED: Use /api/payments/create-payment-link instead
// This endpoint is kept for backward compatibility but will be removed in future versions
router.post('/create-payment-link', apiKeyAuth, (req, res, next) => {
    // Add deprecation notice
    console.log('⚠️ DEPRECATED: Gateway-specific endpoint used. Recommend using /api/payments/create-payment-link');
    // Add warning header
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Please use /api/payments/create-payment-link which automatically selects the configured payment gateway.');
    next();
}, createCashfreePaymentLink);

// ============ CALLBACK (No Auth - POST/GET from Cashfree) ============
router.post('/callback', handleCashfreeCallback);
router.get('/callback', handleCashfreeCallback);

// ============ WEBHOOK (No Auth - POST from Cashfree) ============
router.post('/webhook', handleCashfreeWebhook);

module.exports = router;

