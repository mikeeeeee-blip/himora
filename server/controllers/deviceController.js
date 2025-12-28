const Device = require('../models/Device');
const User = require('../models/User');

/**
 * Register or update device push token
 * POST /api/device/register
 */
exports.registerDevice = async (req, res) => {
  try {
    const { userId, pushToken, role, platform, deviceId, appVersion } = req.body;

    // Validation
    if (!userId || !pushToken || !role) {
      return res.status(400).json({
        success: false,
        error: 'userId, pushToken, and role are required'
      });
    }

    if (!['admin', 'superAdmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be admin or superAdmin'
      });
    }

    // Verify user exists and role matches
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        error: 'User role does not match provided role'
      });
    }

    // Check if device with this token already exists
    let device = await Device.findOne({ pushToken });

    if (device) {
      // Update existing device
      device.userId = userId;
      device.role = role;
      device.platform = platform || device.platform || 'android';
      device.deviceId = deviceId || device.deviceId;
      device.appVersion = appVersion || device.appVersion;
      device.isActive = true;
      device.lastUsedAt = new Date();
      await device.save();

      console.log(`✅ Device updated: ${pushToken.substring(0, 20)}... for user ${userId}`);
    } else {
      // Create new device
      device = new Device({
        userId,
        role,
        pushToken,
        platform: platform || 'android',
        deviceId: deviceId || null,
        appVersion: appVersion || null,
        isActive: true,
        lastUsedAt: new Date()
      });
      await device.save();

      console.log(`✅ Device registered: ${pushToken.substring(0, 20)}... for user ${userId}`);
    }

    return res.json({
      success: true,
      message: 'Device registered successfully',
      device: {
        id: device._id,
        userId: device.userId,
        role: device.role,
        platform: device.platform,
        registeredAt: device.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Device registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register device',
      details: error.message
    });
  }
};

/**
 * Get device tokens for a specific role
 * Used internally by push notification service
 */
exports.getDeviceTokensByRole = async (role) => {
  try {
    const devices = await Device.find({
      role: role,
      isActive: true
    }).select('pushToken userId platform');

    return devices.map(device => ({
      pushToken: device.pushToken,
      userId: device.userId,
      platform: device.platform
    }));
  } catch (error) {
    console.error('Error fetching device tokens:', error);
    return [];
  }
};

/**
 * Get device tokens for a specific user
 */
exports.getDeviceTokensByUserId = async (userId) => {
  try {
    const devices = await Device.find({
      userId: userId,
      isActive: true
    }).select('pushToken platform');

    return devices.map(device => ({
      pushToken: device.pushToken,
      platform: device.platform
    }));
  } catch (error) {
    console.error('Error fetching user device tokens:', error);
    return [];
  }
};

/**
 * Unregister device (mark as inactive)
 * POST /api/device/unregister
 */
exports.unregisterDevice = async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        error: 'pushToken is required'
      });
    }

    const device = await Device.findOne({ pushToken });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    device.isActive = false;
    device.updatedAt = new Date();
    await device.save();

    console.log(`✅ Device unregistered: ${pushToken.substring(0, 20)}...`);

    return res.json({
      success: true,
      message: 'Device unregistered successfully'
    });
  } catch (error) {
    console.error('❌ Device unregistration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unregister device',
      details: error.message
    });
  }
};

