const Device = require('../models/Device');
const User = require('../models/User');

/**
 * Register or update device push token
 * POST /api/device/register
 */
exports.registerDevice = async (req, res) => {
  try {
    const { userId, pushToken, role, platform, deviceId, appVersion } = req.body;

    console.log('📱 Device registration request received:');
    console.log('   userId:', userId);
    console.log('   role:', role);
    console.log('   platform:', platform);
    console.log('   pushToken:', pushToken ? `${pushToken.substring(0, 30)}...` : 'missing');

    // Validation
    if (!userId || !pushToken || !role) {
      console.error('❌ Missing required fields:', { userId: !!userId, pushToken: !!pushToken, role: !!role });
      return res.status(400).json({
        success: false,
        error: 'userId, pushToken, and role are required'
      });
    }

    if (!['admin', 'superAdmin'].includes(role)) {
      console.error('❌ Invalid role:', role);
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be admin or superAdmin'
      });
    }

    // Verify user exists and role matches
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('   User found:', user.email, 'User role:', user.role);

    if (user.role !== role) {
      console.error('❌ Role mismatch:', { userRole: user.role, providedRole: role });
      return res.status(403).json({
        success: false,
        error: 'User role does not match provided role'
      });
    }

    // Check if device with this token already exists
    let device = await Device.findOne({ pushToken });
    console.log('   Existing device found:', !!device);

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

      console.log(`✅ Device updated: ${pushToken.substring(0, 20)}... for user ${userId}, role: ${role}`);
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

      console.log(`✅ Device registered: ${pushToken.substring(0, 20)}... for user ${userId}, role: ${role}`);
    }

    // Verify device was saved correctly
    const savedDevice = await Device.findById(device._id);
    console.log('   Saved device details:', {
      id: savedDevice._id,
      userId: savedDevice.userId.toString(),
      role: savedDevice.role,
      platform: savedDevice.platform,
      isActive: savedDevice.isActive
    });

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
    console.error('   Error stack:', error.stack);
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
    }).select('pushToken userId platform role isActive createdAt');

    console.log(`📱 Found ${devices.length} active device(s) with role: ${role}`);
    if (devices.length > 0) {
      devices.forEach((device, index) => {
        console.log(`   Device ${index + 1}: userId=${device.userId}, platform=${device.platform}, registered=${device.createdAt}`);
      });
    }

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
 * Get all devices (for debugging/admin purposes)
 * GET /api/device/list
 */
exports.getAllDevices = async (req, res) => {
  try {
    const { role, userId, isActive } = req.query;
    
    console.log('📱 Fetching devices with query:', { role, userId, isActive });
    
    const query = {};
    if (role) query.role = role;
    if (userId) query.userId = userId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    console.log('   MongoDB query:', JSON.stringify(query));

    // First, get all devices to see what's in the database
    const allDevices = await Device.find({}).select('userId role isActive').limit(10);
    console.log(`   Total devices in DB: ${allDevices.length}`);
    allDevices.forEach((d, i) => {
      console.log(`   Device ${i + 1}: userId=${d.userId}, role=${d.role}, isActive=${d.isActive}`);
    });

    const devices = await Device.find(query)
      .select('userId role pushToken platform deviceId appVersion isActive createdAt lastUsedAt')
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    console.log(`   Devices matching query: ${devices.length}`);

    return res.json({
      success: true,
      count: devices.length,
      query: query,
      devices: devices.map(device => ({
        id: device._id,
        userId: device.userId?._id || device.userId,
        userEmail: device.userId?.email || null,
        userRole: device.userId?.role || null,
        role: device.role,
        platform: device.platform,
        deviceId: device.deviceId,
        appVersion: device.appVersion,
        isActive: device.isActive,
        createdAt: device.createdAt,
        lastUsedAt: device.lastUsedAt,
        pushTokenPreview: device.pushToken ? `${device.pushToken.substring(0, 30)}...` : null
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching devices:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch devices',
      details: error.message
    });
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

/**
 * Delete/flush devices (SuperAdmin only)
 * DELETE /api/device/flush?role=superAdmin&userId=xxx
 * If no query params, deletes ALL devices
 */
exports.flushDevices = async (req, res) => {
  try {
    const { role, userId } = req.query;
    
    console.log('🗑️  Flush devices request:', { role, userId });
    
    const query = {};
    if (role) query.role = role;
    if (userId) query.userId = userId;

    // Count devices before deletion
    const countBefore = await Device.countDocuments(query);
    console.log(`   Devices to delete: ${countBefore}`);

    if (countBefore === 0) {
      return res.json({
        success: true,
        message: 'No devices found to delete',
        deletedCount: 0,
        query: query
      });
    }

    // Delete devices
    const result = await Device.deleteMany(query);
    console.log(`✅ Deleted ${result.deletedCount} device(s)`);

    return res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} device(s)`,
      deletedCount: result.deletedCount,
      query: query
    });
  } catch (error) {
    console.error('❌ Error flushing devices:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to flush devices',
      details: error.message
    });
  }
};

