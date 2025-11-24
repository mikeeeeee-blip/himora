const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createPaytmPaymentLink,
    handlePaytmWebhook,
    handlePaytmCallback,
    getPaytmCheckoutPage,
    handlePaytmUPIRedirect
} = require('../controllers/paytmController.js');

// ============ MERCHANT APIs (API Key Auth) ============
router.post('/create-payment-link', apiKeyAuth, createPaytmPaymentLink);

// ============ CHECKOUT PAGE (Public - customers visit this link) ============
router.get('/checkout/:transactionId', getPaytmCheckoutPage);
router.post('/checkout/:transactionId', getPaytmCheckoutPage); // Support POST as fallback

// ============ UPI REDIRECT (No Auth - Smart UPI app detection) ============
router.get('/upi-redirect', handlePaytmUPIRedirect);

// ============ CALLBACK (No Auth - POST/GET from Paytm) ============
router.post('/callback', handlePaytmCallback);
router.get('/callback', handlePaytmCallback);

// ============ WEBHOOK (No Auth - Signature Verified) ============
// Use express.raw() for webhook to get raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), handlePaytmWebhook);

module.exports = router;

