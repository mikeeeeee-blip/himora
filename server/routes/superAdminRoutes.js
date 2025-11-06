const express = require('express');
const router = express.Router();
const auth = require('../middleware/superAdminAuth')
const { getDashboardStats, getAllMerchantsData } = require('../controllers/superAdminController');
const { deleteUser, changeUserPassword } = require('../controllers/authController');

// routes/superadminRoutes.js

router.get('/dashboard/stats', auth, getDashboardStats);
router.get('/merchants/comprehensive', auth, getAllMerchantsData);

// User management routes (SuperAdmin only)
router.delete('/users/:userId', auth, deleteUser);
router.put('/users/:userId/password', auth, changeUserPassword);

module.exports = router;
