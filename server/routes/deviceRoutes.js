const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.js');
const superAdminAuth = require('../middleware/superAdminAuth.js');
const {
  registerDevice,
  unregisterDevice,
  getAllDevices,
  flushDevices
} = require('../controllers/deviceController.js');

// Logging middleware for device routes
const logDeviceRequest = (req, res, next) => {
  console.log('📱 Device route request:', {
    method: req.method,
    path: req.path,
    url: req.url,
    body: req.body ? {
      userId: req.body.userId,
      role: req.body.role,
      platform: req.body.platform,
      pushToken: req.body.pushToken ? `${req.body.pushToken.substring(0, 30)}...` : 'missing'
    } : 'no body',
    headers: {
      'x-auth-token': req.headers['x-auth-token'] ? `${req.headers['x-auth-token'].substring(0, 20)}...` : 'missing',
      'content-type': req.headers['content-type']
    }
  });
  next();
};

// Register device (both admin and superadmin can register)
// POST /api/device/register
router.post('/register', logDeviceRequest, auth, registerDevice);

// Unregister device
// POST /api/device/unregister
router.post('/unregister', auth, unregisterDevice);

// Get all devices (SuperAdmin only, for debugging)
// GET /api/device/list?role=superAdmin&isActive=true
router.get('/list', superAdminAuth, getAllDevices);

// Flush/delete devices (SuperAdmin only)
// DELETE /api/device/flush?role=superAdmin&userId=xxx
// If no query params, deletes ALL devices
router.delete('/flush', superAdminAuth, flushDevices);

module.exports = router;

