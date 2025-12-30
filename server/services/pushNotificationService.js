const axios = require('axios');
const { getDeviceTokensByRole } = require('../controllers/deviceController');
const Device = require('../models/Device');

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
/**
 * Send a batch of messages to Expo API
 * @param {Array} messages - Array of notification messages
 * @param {Array} pushTokens - Original array of push tokens (for logging)
 * @returns {Promise<Object>} Result object
 */
async function sendBatchToExpo(messages, pushTokens) {
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

    // Log errors if any
    results.forEach((result, index) => {
      if (result.status === 'error') {
        console.error(`❌ Error sending to token ${index + 1}:`);
        console.error(`   Token: ${pushTokens[index] ? pushTokens[index].substring(0, 50) + '...' : 'unknown'}`);
        console.error(`   Error message: ${result.message || 'Unknown error'}`);
        if (result.details) {
          console.error(`   Error details:`, JSON.stringify(result.details, null, 2));
        }
      } else if (result.status === 'ok') {
        console.log(`✅ Successfully sent to token ${index + 1}: ${pushTokens[index] ? pushTokens[index].substring(0, 50) + '...' : 'unknown'}`);
      }
    });

    return {
      success: true,
      sent: successCount,
      errors: errorCount,
      results: results
    };
  }

  return {
    success: false,
    error: 'Unexpected response from Expo API',
    response: response.data
  };
}

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

    // Validate and prepare messages for Expo API
    const messages = [];
    const invalidTokens = [];
    const tokenToIndexMap = new Map(); // Map token to original index
    
    pushTokens.forEach((token, index) => {
      // Validate token format
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        console.warn(`⚠️ Invalid token at index ${index}: empty or null`);
        invalidTokens.push({ index, token, reason: 'empty or null' });
        return;
      }
      
      const trimmedToken = token.trim();
      
      // Check if token starts with ExponentPushToken[ (Expo format)
      if (!trimmedToken.startsWith('ExponentPushToken[') && !trimmedToken.startsWith('ExpoPushToken[')) {
        console.warn(`⚠️ Invalid token format at index ${index}: ${trimmedToken.substring(0, 50)}...`);
        console.warn(`   Expected format: ExponentPushToken[...] or ExpoPushToken[...]`);
        invalidTokens.push({ index, token: trimmedToken, reason: 'invalid format' });
        return;
      }
      
      const message = {
        to: trimmedToken,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      badge: notification.badge,
      priority: 'high',
      channelId: 'default', // Android notification channel
      };
      
      messages.push(message);
      tokenToIndexMap.set(trimmedToken, index);
    });
    
    if (invalidTokens.length > 0) {
      console.error(`❌ Found ${invalidTokens.length} invalid token(s):`);
      invalidTokens.forEach(({ index, token, reason }) => {
        console.error(`   Token ${index}: ${reason} - ${token ? token.substring(0, 50) + '...' : 'null'}`);
      });
    }
    
    if (messages.length === 0) {
      console.error('❌ No valid messages to send after validation');
      return {
        success: false,
        error: 'No valid push tokens found after validation',
        invalidTokens: invalidTokens.length
      };
    }
    
    console.log(`📤 Prepared ${messages.length} valid message(s) for Expo API`);
    console.log(`📤 Sending push notification to ${pushTokens.length} device(s)`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   Body: ${notification.body}`);

    // Try to send all messages in one batch
    try {
    const response = await axios.post(EXPO_PUSH_API_URL, messages, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      timeout: 10000, // 10 second timeout
    });

    // Check response
      console.log('📥 Expo API response status:', response.status);
      
    if (response.data && response.data.data) {
      const results = response.data.data;
      const successCount = results.filter(r => r.status === 'ok').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      console.log(`✅ Push notification sent: ${successCount} success, ${errorCount} errors`);

      // Log errors if any
      results.forEach((result, index) => {
        if (result.status === 'error') {
            console.error(`❌ Error sending to token ${index + 1}:`);
            console.error(`   Token: ${pushTokens[index] ? pushTokens[index].substring(0, 50) + '...' : 'unknown'}`);
            console.error(`   Error message: ${result.message || 'Unknown error'}`);
            if (result.details) {
              console.error(`   Error details:`, JSON.stringify(result.details, null, 2));
            }
          } else if (result.status === 'ok') {
            console.log(`✅ Successfully sent to token ${index + 1}: ${pushTokens[index] ? pushTokens[index].substring(0, 50) + '...' : 'unknown'}`);
        }
      });

      return {
        success: true,
        sent: successCount,
        errors: errorCount,
        results: results
      };
    }

      console.error('❌ Unexpected response format from Expo API');
      console.error('   Response:', JSON.stringify(response.data, null, 2));
    return { success: false, error: 'Unexpected response from Expo API' };
    } catch (error) {
      // Check if this is the PUSH_TOO_MANY_EXPERIENCE_IDS error
      if (error.response && 
          error.response.status === 400 && 
          error.response.data && 
          error.response.data.errors) {
        
        const errors = error.response.data.errors;
        const experienceIdError = errors.find(e => e.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS');
        
        if (experienceIdError && experienceIdError.details) {
          console.warn('⚠️ Detected tokens from multiple Expo projects');
          console.warn('   Grouping tokens by project and sending separate requests...');
          
          // Parse the error details to get tokens grouped by project
          const projectGroups = experienceIdError.details;
          const projectNames = Object.keys(projectGroups);
          
          console.log(`   Found ${projectNames.length} project(s): ${projectNames.join(', ')}`);
          
          // Filter out old project (@mayank_1734/payments) - only keep @pranjalbirla101/payments-ninex
          const OLD_PROJECT = '@mayank_1734/payments';
          const CURRENT_PROJECT = '@pranjalbirla101/payments-ninex';
          
          const oldProjectTokens = projectGroups[OLD_PROJECT] || [];
          const currentProjectTokens = projectGroups[CURRENT_PROJECT] || [];
          
          if (oldProjectTokens.length > 0) {
            console.warn(`⚠️ Filtering out ${oldProjectTokens.length} device(s) from old project: ${OLD_PROJECT}`);
            console.warn(`   Old tokens will be skipped and marked as inactive.`);
            
            // Mark old project devices as inactive
            try {
              const updateResult = await Device.updateMany(
                { pushToken: { $in: oldProjectTokens } },
                { 
                  $set: { 
                    isActive: false,
                    updatedAt: new Date()
                  } 
                }
              );
              console.log(`   ✅ Marked ${updateResult.modifiedCount} old device(s) as inactive`);
              
              oldProjectTokens.forEach(token => {
                console.warn(`   - Deactivated old token: ${token.substring(0, 50)}...`);
              });
            } catch (cleanupError) {
              console.error(`   ❌ Error cleaning up old devices:`, cleanupError.message);
              oldProjectTokens.forEach(token => {
                console.warn(`   - Skipping old token: ${token.substring(0, 50)}...`);
              });
            }
          }
          
          if (currentProjectTokens.length === 0) {
            console.error(`❌ No devices found for current project: ${CURRENT_PROJECT}`);
            console.error(`   All devices belong to old project and will be skipped.`);
            return {
              success: false,
              error: `No devices found for current project. All devices belong to old project: ${OLD_PROJECT}`,
              sent: 0,
              errors: messages.length,
              filteredOut: oldProjectTokens.length
            };
          }
          
          // Create a set of current project tokens for quick lookup
          const currentProjectTokenSet = new Set(currentProjectTokens);
          
          // Filter messages to only include current project tokens
          const filteredMessages = messages.filter(message => {
            return currentProjectTokenSet.has(message.to);
          });
          
          console.log(`📤 Sending ${filteredMessages.length} notification(s) for current project: ${CURRENT_PROJECT}`);
          console.log(`   Filtered out ${oldProjectTokens.length} device(s) from old project`);
          
          // Send notifications only to current project
          try {
            const filteredTokens = filteredMessages.map(m => m.to);
            const batchResult = await sendBatchToExpo(filteredMessages, filteredTokens);
            
            if (batchResult.success) {
              console.log(`   ✅ Project ${CURRENT_PROJECT}: ${batchResult.sent || 0} sent, ${batchResult.errors || 0} errors`);
              
              // Log detailed errors if any
              if (batchResult.errors > 0 && batchResult.results) {
                batchResult.results.forEach((result, index) => {
                  if (result.status === 'error') {
                    console.error(`   ❌ Error details for token ${index + 1}:`);
                    console.error(`      Token: ${filteredTokens[index] ? filteredTokens[index].substring(0, 50) + '...' : 'unknown'}`);
                    console.error(`      Error: ${result.message || 'Unknown error'}`);
                    if (result.details) {
                      console.error(`      Details:`, JSON.stringify(result.details, null, 2));
                    }
                  }
                });
              }
              
              return {
                success: batchResult.sent > 0,
                sent: batchResult.sent || 0,
                errors: batchResult.errors || 0,
                results: batchResult.results || [],
                filteredOut: oldProjectTokens.length
              };
            } else {
              console.error(`   ❌ Project ${CURRENT_PROJECT}: Failed to send notifications`);
              console.error(`   Error: ${batchResult.error || 'Unknown error'}`);
              if (batchResult.response) {
                console.error(`   Response:`, JSON.stringify(batchResult.response, null, 2));
              }
              return {
                success: false,
                error: batchResult.error || 'Failed to send notifications',
                sent: 0,
                errors: filteredMessages.length,
                filteredOut: oldProjectTokens.length
              };
            }
          } catch (projectError) {
            console.error(`   ❌ Error sending to project ${CURRENT_PROJECT}:`, projectError.message);
            if (projectError.response) {
              console.error(`   Response status:`, projectError.response.status);
              console.error(`   Response data:`, JSON.stringify(projectError.response.data, null, 2));
            }
            return {
              success: false,
              error: projectError.message,
              sent: 0,
              errors: filteredMessages.length,
              filteredOut: oldProjectTokens.length
            };
          }
        }
      }
      
      // If it's not the experience ID error, re-throw or handle normally
      throw error;
    }
  } catch (error) {
    console.error('❌ Push notification error:', error.message);
    console.error('   Error type:', error.constructor.name);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received from Expo API');
      console.error('   Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout
      });
    } else {
      console.error('   Error setting up request:', error.message);
    }
    console.error('   Full error:', error);
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
    console.log('🔔 notifySuperAdmins called');
    console.log('   Notification:', { title: notification.title, body: notification.body });
    
    const devices = await getDeviceTokensByRole('superAdmin');
    
    console.log(`📱 Found ${devices.length} superadmin device(s)`);
    
    if (devices.length === 0) {
      console.warn('⚠️ No superadmin devices found for push notification');
      console.warn('   Tip: Make sure devices are registered via POST /api/device/register');
      console.warn('   Check registered devices with: GET /api/device/list?role=superAdmin');
      return { 
        success: false, 
        error: 'No superadmin devices found. Please ensure the device is registered via the mobile app.' 
      };
    }

    // Log device details
    devices.forEach((device, index) => {
      console.log(`   Device ${index + 1}:`);
      console.log(`      userId: ${device.userId}`);
      console.log(`      platform: ${device.platform}`);
      console.log(`      pushToken: ${device.pushToken ? device.pushToken.substring(0, 50) + '...' : 'MISSING'}`);
    });

    // Filter out devices without push tokens
    const validDevices = devices.filter(device => device.pushToken && device.pushToken.trim().length > 0);
    
    if (validDevices.length === 0) {
      console.error('❌ No valid push tokens found');
      console.error('   All devices are missing push tokens');
      return {
        success: false,
        error: 'No valid push tokens found. Devices may not be properly registered.'
      };
    }

    if (validDevices.length < devices.length) {
      console.warn(`⚠️ Filtered out ${devices.length - validDevices.length} device(s) with missing push tokens`);
    }

    console.log(`📤 Sending notification to ${validDevices.length} superadmin device(s) with valid tokens`);
    const pushTokens = validDevices.map(device => device.pushToken);
    
    // Log tokens being sent
    pushTokens.forEach((token, index) => {
      console.log(`   Token ${index + 1}: ${token.substring(0, 50)}...`);
    });
    
    return await sendPushNotification(pushTokens, notification);
  } catch (error) {
    console.error('❌ Error notifying superadmins:', error);
    console.error('   Error stack:', error.stack);
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

