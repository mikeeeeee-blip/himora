const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');

const {
    createZaakpayPaymentLink,
    getZaakpayCheckoutPage,
    handleZaakpayCallback,
    getZaakpayTransaction,
    callZaakpayAPIForIntent
} = require('../controllers/zaakpayController.js');

router.post('/create-payment-link', apiKeyAuth, createZaakpayPaymentLink);

// Public endpoint for Next.js to fetch transaction details
router.get('/transaction/:transactionId', getZaakpayTransaction);

// Public endpoint for Next.js to call Zaakpay API and get intent URLs
router.get('/get-intent-urls', callZaakpayAPIForIntent);

router.get('/checkout/:transactionId', getZaakpayCheckoutPage);
router.post('/checkout/:transactionId', getZaakpayCheckoutPage);

router.post('/callback', handleZaakpayCallback);
router.get('/callback', handleZaakpayCallback);

// Webhook endpoint (called by Next.js webhook route)
router.post('/webhook', handleZaakpayCallback);

module.exports = router;

