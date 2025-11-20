const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');
const {
    createEasebuzzPaymentLink,
    getEasebuzzPaymentPage,
    handleEasebuzzCallback,
    handleEasebuzzWebhook,
    handleUPIRedirect
} = require('../controllers/easebuzzController');

// Create payment link (requires API key authentication)
router.post('/create-payment-link', apiKeyAuth, createEasebuzzPaymentLink);

// Shareable payment page (public - customers visit this link, it auto-submits to Easebuzz)
router.get('/payment-page/:transactionId', getEasebuzzPaymentPage);

// Callback handler (public - called by Easebuzz after payment)
router.post('/callback', handleEasebuzzCallback);
router.get('/callback', handleEasebuzzCallback); // Support GET for callbacks

// Webhook handler (public - called by Easebuzz for payment status updates)
// Support both GET and POST methods as Easebuzz may use either
router.post('/webhook', express.json(), handleEasebuzzWebhook);
router.get('/webhook', handleEasebuzzWebhook);

// UPI redirect endpoint (public - smart UPI app detection and redirect)
router.get('/upi-redirect', handleUPIRedirect);

module.exports = router;

