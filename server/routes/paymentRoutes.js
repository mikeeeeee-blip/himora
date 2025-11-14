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
    getAllTransactions,
    getAllPayouts,
    approvePayout,
    rejectPayout,
    processPayout,
    settleTransaction,
    updateTransactionStatus
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

// ============ MERCHANT APIs (API Key Auth) ============

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
