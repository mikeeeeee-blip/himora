const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.js');
const superAdminAuth = require('../middleware/superAdminAuth.js');
const {
  registerDevice,
  unregisterDevice
} = require('../controllers/deviceController.js');

// Register device (both admin and superadmin can register)
// POST /api/device/register
router.post('/register', auth, registerDevice);

// Unregister device
// POST /api/device/unregister
router.post('/unregister', auth, unregisterDevice);

module.exports = router;

