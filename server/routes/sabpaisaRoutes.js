const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createSabpaisaPaymentLink,
    handleSabpaisaCallback,
    getSabpaisaPaymentPage
} = require('../controllers/sabpaisaController.js');

// ============ MERCHANT APIs (API Key Auth) ============
// ⚠️ DEPRECATED: Use /api/payments/create-payment-link instead
// This endpoint is kept for backward compatibility but will be removed in future versions
router.post('/create-payment-link', apiKeyAuth, (req, res, next) => {
    // Add deprecation notice
    console.log('⚠️ DEPRECATED: Gateway-specific endpoint used. Recommend using /api/payments/create-payment-link');
    // Add warning header
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Please use /api/payments/create-payment-link which automatically selects the configured payment gateway.');
    next();
}, createSabpaisaPaymentLink);

// ============ PAYMENT PAGE (Public - Auto-submit form) ============
router.get('/payment-page/:transactionId', getSabpaisaPaymentPage);

// ============ CALLBACK (No Auth - POST from SabPaisa) ============
// Middleware to capture raw body for form-encoded data
const captureRawBody = (req, res, next) => {
    if (req.method === 'POST' && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        let data = '';
        req.on('data', chunk => {
            data += chunk.toString();
        });
        req.on('end', () => {
            req.rawBody = data;
            next();
        });
    } else {
        next();
    }
};

router.post('/callback', captureRawBody, handleSabpaisaCallback);
router.get('/callback', handleSabpaisaCallback); // Support GET for callbacks

module.exports = router;

