const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createPaytmPaymentLink,
    handlePaytmWebhook,
    handlePaytmCallback
} = require('../controllers/paytmController.js');

// ============ MERCHANT APIs (API Key Auth) ============
router.post('/create-payment-link', apiKeyAuth, createPaytmPaymentLink);

// ============ CALLBACK (No Auth - POST/GET from Paytm) ============
router.post('/callback', handlePaytmCallback);
router.get('/callback', handlePaytmCallback);

// ============ WEBHOOK (No Auth - Signature Verified) ============
// Use express.raw() for webhook to get raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), handlePaytmWebhook);

module.exports = router;

