const express = require('express');
const router = express.Router();
const auth = require('../middleware/superAdminAuth')
const { getDashboardStats, getAllMerchantsData } = require('../controllers/superAdminController');

// routes/superadminRoutes.js

router.get('/dashboard/stats', auth, getDashboardStats);
router.get('/merchants/comprehensive', auth, getAllMerchantsData);

module.exports = router;
