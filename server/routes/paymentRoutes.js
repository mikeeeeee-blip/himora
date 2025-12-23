const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth.js');
const auth = require('../middleware/auth.js');
const superAdminAuth = require('../middleware/superAdminAuth.js');

const {
    getPaymentStatus,
    getTransactions,
} = require('../controllers/paymentController.js');

const {
    createPaymentLink,
    getAvailableGateways
} = require('../controllers/paymentGatewayController.js');

const {
    getAllTransactions,
    getAllPayouts,
    approvePayout,
    rejectPayout,
    processPayout,
    settleTransaction,
    updateTransactionStatus,
    deleteTransaction
} = require('../controllers/superAdminController.js');

// ✅ MAKE SURE ALL THESE FUNCTIONS EXIST IN THE CONTROLLER
const {
    configureMerchantWebhook,
    getMerchantWebhookConfig,
    testMerchantWebhook,
    deleteMerchantWebhook,
    configurePayoutWebhook,
    updatePayoutWebhook,
    getPayoutWebhookConfig,
    testPayoutWebhook,
    deletePayoutWebhook,
    getAllWebhookConfigs
} = require('../controllers/merchantWebhookController.js');
const {
    getMyPayouts,
    requestPayout,
    getMyBalance,
    cancelPayoutRequest,
    getTransactionById,
    getPayoutStatusById,
    searchTransactions,
    searchPayouts,
    getTransactionReport,
    getPayoutReport,
    getCombinedReport
} = require('../controllers/adminController.js');

const {
    handleCashfreeWebhook
} = require('../controllers/cashfreeController.js');

// ============ UNIFIED WEBHOOK ENDPOINT (No Auth - from Payment Gateways) ============
// Unified webhook endpoint that routes to appropriate gateway handler based on payload
router.post('/webhook', async (req, res) => {
    try {
        const payload = req.body || {};
        
        console.log('\n🔔 UNIFIED PAYMENT WEBHOOK RECEIVED');
        console.log('   Payload:', JSON.stringify(payload, null, 2));
        
        // Log for debugging - match the log format the user is seeing
        if (payload.orderId && payload.paymentStatus) {
            console.log('Payment webhook received:', {
                orderId: payload.orderId,
                paymentId: payload.paymentId,
                paymentStatus: payload.paymentStatus,
                orderAmount: payload.orderAmount
            });
        }
        
        // Detect gateway from payload structure
        // Cashfree webhook typically has: orderId, paymentId, paymentStatus, orderAmount
        if (payload.orderId || payload.order_id || (payload.paymentStatus || payload.payment_status)) {
            console.log('   Detected gateway: Cashfree');
            return await handleCashfreeWebhook(req, res);
        }
        
        // If we can't detect the gateway, return error
        console.warn('⚠️ Could not detect payment gateway from webhook payload');
        return res.status(400).json({
            success: false,
            error: 'Unable to detect payment gateway from webhook payload'
        });
    } catch (error) {
        console.error('❌ Unified webhook error:', error);
        return res.status(500).json({
            success: false,
            error: 'Webhook processing failed'
        });
    }
});

// ============ MERCHANT APIs (API Key Auth) ============

// Unified payment link creation (uses enabled gateway from settings)
router.post('/create-payment-link', apiKeyAuth, createPaymentLink);
router.get('/available-gateways', apiKeyAuth, getAvailableGateways);

router.get('/status/:orderId', apiKeyAuth, getPaymentStatus);
router.get('/transactions', apiKeyAuth, getTransactions);

// ============ MERCHANT WEBHOOK CONFIGURATION APIS ============
// Unified endpoint to get all webhook configs (recommended)
router.get('/merchant/webhook/all/config', auth, getAllWebhookConfigs);
// Individual endpoints (for backward compatibility)
router.post('/merchant/webhook/configure', auth, configureMerchantWebhook);
router.get('/merchant/webhook/config', auth, getMerchantWebhookConfig);
router.post('/merchant/webhook/test', auth, testMerchantWebhook);
router.delete('/merchant/webhook', auth, deleteMerchantWebhook);

// ============ MERCHANT PAYOUT WEBHOOK CONFIGURATION APIS ============
router.post('/merchant/webhook/payout/configure', auth, configurePayoutWebhook);
router.put('/merchant/webhook/payout', auth, updatePayoutWebhook);
router.get('/merchant/webhook/payout/config', auth, getPayoutWebhookConfig);
router.post('/merchant/webhook/payout/test', auth, testPayoutWebhook);
router.delete('/merchant/webhook/payout', auth, deletePayoutWebhook);



// ============ SUPERADMIN ROUTES (JWT Auth - SuperAdmin Dashboard) ============
router.get('/admin/payouts/all', superAdminAuth, getAllPayouts);
router.post('/admin/payout/:payoutId/approve', superAdminAuth, approvePayout);
router.post('/admin/payout/:payoutId/reject', superAdminAuth, rejectPayout);
router.post('/admin/payout/:payoutId/process', superAdminAuth, processPayout);
router.get('/admin/transactions', superAdminAuth, getAllTransactions);
router.put('/admin/transactions/:transactionId/settle', superAdminAuth, settleTransaction);
router.put('/admin/transactions/:transactionId/status', superAdminAuth, updateTransactionStatus);
router.delete('/admin/transactions/:transactionId', superAdminAuth, deleteTransaction);
router.get('/merchant/transactions/search', auth, searchTransactions); // For transactions


// ============ ADMIN APIs (JWT Auth - Merchant Dashboard) ============
router.get('/merchant/payouts', auth, getMyPayouts);
router.post('/merchant/payout/request', auth, requestPayout);
router.get('/merchant/balance', auth, getMyBalance);
router.post('/merchant/payout/:payoutId/cancel', auth, cancelPayoutRequest);
router.get('/merchant/transactions/:transactionId', auth, getTransactionById);
router.get('/merchant/transaction/report', auth, getTransactionReport);
router.get('/merchant/payout/report', auth, getPayoutReport);
// Combined Excel: Sheet1 = Transactions, Sheet2 = Payouts
router.get('/merchant/report/combined', auth, getCombinedReport);


router.get('/merchant/payout/:payoutId/status', auth, getPayoutStatusById);
// ============ SEARCH APIs ============
router.get('/merchant/payouts/search', auth, searchPayouts);          // For payouts



module.exports = router;
