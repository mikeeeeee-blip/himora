const express = require('express');
const router = express.Router();
const auth = require('../middleware/superAdminAuth');
const subSuperAdminAuth = require('../middleware/subSuperAdminAuth');
const { 
    getDashboardStats, 
    getAllMerchantsData,
    getPaymentGatewaySettings,
    updatePaymentGatewaySettings,
    blockMerchantFunds
} = require('../controllers/superAdminController');
const { deleteUser, changeUserPassword } = require('../controllers/authController');
const {
    createSubSuperAdmin,
    getAllSubSuperAdmins,
    getSubSuperAdminById,
    updateSubSuperAdmin,
    deleteSubSuperAdmin,
    changeSubSuperAdminPassword
} = require('../controllers/subSuperAdminController');

// routes/superadminRoutes.js

// Dashboard stats - accessible by superAdmin and subSuperAdmin (with permission)
router.get('/dashboard/stats', subSuperAdminAuth, subSuperAdminAuth.checkAccess('canViewDashboard'), getDashboardStats);
router.get('/merchants/comprehensive', subSuperAdminAuth, subSuperAdminAuth.checkAccess('canViewMerchants'), getAllMerchantsData);

// Payment Gateway Settings routes (SuperAdmin only)
router.get('/settings/payment-gateways', auth, getPaymentGatewaySettings);
router.put('/settings/payment-gateways', auth, updatePaymentGatewaySettings);

// User management routes (SuperAdmin only)
router.delete('/users/:userId', auth, deleteUser);
router.put('/users/:userId/password', auth, changeUserPassword);

// Block/Unblock merchant funds - accessible by superAdmin and subSuperAdmin (with permission)
router.put('/merchants/:merchantId/block-funds', subSuperAdminAuth, subSuperAdminAuth.checkAccess('canBlockMerchantFunds'), blockMerchantFunds);

// Sub-SuperAdmin management routes (SuperAdmin only)
router.post('/sub-superadmins', auth, createSubSuperAdmin);
router.get('/sub-superadmins', auth, getAllSubSuperAdmins);
router.get('/sub-superadmins/:subSuperAdminId', auth, getSubSuperAdminById);
router.put('/sub-superadmins/:subSuperAdminId', auth, updateSubSuperAdmin);
router.delete('/sub-superadmins/:subSuperAdminId', auth, deleteSubSuperAdmin);
router.put('/sub-superadmins/:subSuperAdminId/password', auth, changeSubSuperAdminPassword);

module.exports = router;
