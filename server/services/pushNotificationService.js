const axios = require('axios');
const { getDeviceTokensByRole } = require('../controllers/deviceController');

// Expo Push Notification API endpoint
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification using Expo Push Notification service
 * @param {Array} pushTokens - Array of Expo push tokens
 * @param {Object} notification - Notification payload
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body/message
 * @param {Object} notification.data - Additional data payload (optional)
 * @param {string} notification.sound - Sound to play (default: 'default')
 * @param {number} notification.badge - Badge count (optional)
 */
async function sendPushNotification(pushTokens, notification) {
  try {
    if (!pushTokens || pushTokens.length === 0) {
      console.warn('⚠️ No push tokens provided');
      return { success: false, error: 'No push tokens provided' };
    }

    // Validate notification payload
    if (!notification.title || !notification.body) {
      console.error('❌ Invalid notification: title and body are required');
      return { success: false, error: 'Title and body are required' };
    }

    // Prepare messages for Expo API
    const messages = pushTokens.map(token => ({
      to: token,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      badge: notification.badge,
      priority: 'high',
      channelId: 'default', // Android notification channel
    }));

    console.log(`📤 Sending push notification to ${pushTokens.length} device(s)`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   Body: ${notification.body}`);

    // Send to Expo Push Notification service
    const response = await axios.post(EXPO_PUSH_API_URL, messages, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 10000, // 10 second timeout
    });

    // Check response
    if (response.data && response.data.data) {
      const results = response.data.data;
      const successCount = results.filter(r => r.status === 'ok').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      console.log(`✅ Push notification sent: ${successCount} success, ${errorCount} errors`);

      // Log errors if any
      results.forEach((result, index) => {
        if (result.status === 'error') {
          console.error(`❌ Error sending to token ${index}:`, result.message);
        }
      });

      return {
        success: true,
        sent: successCount,
        errors: errorCount,
        results: results
      };
    }

    return { success: false, error: 'Unexpected response from Expo API' };
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
    if (error.response) {
      console.error('   Response data:', error.response.data);
      console.error('   Response status:', error.response.status);
    }
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

/**
 * Send push notification to all superadmins
 * @param {Object} notification - Notification payload
 */
async function notifySuperAdmins(notification) {
  try {
    const devices = await getDeviceTokensByRole('superAdmin');
    
    if (devices.length === 0) {
      console.warn('⚠️ No superadmin devices found for push notification');
      return { success: false, error: 'No superadmin devices found' };
    }

    const pushTokens = devices.map(device => device.pushToken);
    return await sendPushNotification(pushTokens, notification);
  } catch (error) {
    console.error('❌ Error notifying superadmins:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to specific user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification payload
 */
async function notifyUser(userId, notification) {
  try {
    const { getDeviceTokensByUserId } = require('../controllers/deviceController');
    const devices = await getDeviceTokensByUserId(userId);
    
    if (devices.length === 0) {
      console.warn(`⚠️ No devices found for user ${userId}`);
      return { success: false, error: 'No devices found for user' };
    }

    const pushTokens = devices.map(device => device.pushToken);
    return await sendPushNotification(pushTokens, notification);
  } catch (error) {
    console.error('❌ Error notifying user:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  notifySuperAdmins,
  notifyUser
};

