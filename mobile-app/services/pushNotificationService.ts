import { Platform } from 'react-native';
import Constants from 'expo-constants';
import apiClient from './apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from './authService';

// Lazy import notifications to avoid errors in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

// Check if notifications are available
async function ensureNotificationsAvailable(): Promise<boolean> {
  try {
    // Check if we're in Expo Go (where push notifications aren't supported)
    const executionEnvironment = Constants.executionEnvironment;
    if (executionEnvironment === 'storeClient') {
      // Expo Go - notifications not fully supported
      console.warn('⚠️ Push notifications are not fully supported in Expo Go. Use a development build for full functionality.');
      return false;
    }

    // Try to import and use notifications
    if (!Notifications) {
      Notifications = await import('expo-notifications');
    }

    // Try to check permissions to verify notifications are available
    await Notifications.getPermissionsAsync();
    return true;
  } catch (error) {
    console.warn('⚠️ Push notifications not available:', error);
    return false;
  }
}

// Configure notification handler (only if available)
async function configureNotificationHandler() {
  try {
    const available = await ensureNotificationsAvailable();
    if (available && Notifications) {
      try {
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
        });
      } catch (error) {
        console.warn('⚠️ Could not configure notification handler:', error);
      }
    }
  } catch (error) {
    // Silently fail - notifications not available
    console.warn('⚠️ Notifications not available, skipping handler configuration');
  }
}

// Initialize on module load (fire and forget - won't block)
configureNotificationHandler().catch(() => {
  // Silently handle any errors during initialization
});

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    console.log('📱 Checking notification availability...');
    const available = await ensureNotificationsAvailable();
    if (!available || !Notifications) {
      console.warn('⚠️ Push notifications not available in this environment');
      console.warn('   This might be because you are using Expo Go or notifications are not supported');
      return null;
    }

    console.log('📱 Requesting notification permissions...');
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('   Current permission status:', existingStatus);

    if (existingStatus !== 'granted') {
      console.log('   Requesting permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('   Permission request result:', status);
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Push notification permission not granted. Status:', finalStatus);
      console.warn('   Please grant notification permissions in device settings');
      return null;
    }

    console.log('📱 Getting Expo push token...');
    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    console.log('   Project ID:', projectId || 'not found');
    
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const pushToken = tokenData.data;
    console.log('✅ Push token obtained:', pushToken.substring(0, 30) + '...');
    console.log('   Full token length:', pushToken.length);

    return pushToken;
  } catch (error: any) {
    console.error('❌ Error registering for push notifications:', error);
    if (error.message) {
      console.error('   Error message:', error.message);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    return null;
  }
}

/**
 * Register device push token with backend
 */
export async function registerDeviceToken(
  userId: string,
  role: string,
  pushToken: string
): Promise<boolean> {
  try {
    const token = await authService.getToken();
    if (!token) {
      console.error('❌ No auth token available');
      return false;
    }

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    console.log(`📤 Registering device: userId=${userId}, role=${role}, platform=${platform}`);
    console.log(`   Push token: ${pushToken.substring(0, 30)}...`);

    console.log(`   API Endpoint: ${API_ENDPOINTS.DEVICE_REGISTER}`);
    console.log(`   Auth token: ${token.substring(0, 20)}...`);
    console.log(`   Request payload:`, {
      userId,
      role,
      platform,
      pushTokenLength: pushToken.length,
      deviceId: Platform.OS === 'android' ? 'android' : 'ios'
    });
    
    // Note: apiClient interceptor already adds x-auth-token, but we can also add it explicitly
    const response = await apiClient.post(
      API_ENDPOINTS.DEVICE_REGISTER,
      {
        userId,
        pushToken,
        role,
        platform,
        deviceId: Platform.OS === 'android' ? 'android' : 'ios',
        appVersion: '1.0.0', // You can get this from expo-constants if needed
      }
      // Headers are added by apiClient interceptor
    );
    
    console.log('   Response status:', response.status);
    console.log('   Response data:', JSON.stringify(response.data));

    if (response.data?.success) {
      console.log('✅ Device registered successfully with backend');
      console.log('   Device ID:', response.data?.device?.id);
      return true;
    } else {
      console.error('❌ Device registration failed:', response.data?.error || 'Unknown error');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error registering device:', error);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response statusText:', error.response.statusText);
      console.error('   Response data:', JSON.stringify(error.response.data));
      console.error('   Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('   ❌ No response received from server');
      console.error('   Request URL:', error.config?.url);
      console.error('   Request method:', error.config?.method);
      console.error('   This usually means:');
      console.error('     1. Server is not reachable');
      console.error('     2. Network connection issue');
      console.error('     3. CORS blocking the request');
      console.error('     4. Request timeout');
    } else {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
    return false;
  }
}

/**
 * Unregister device push token
 */
export async function unregisterDeviceToken(pushToken: string): Promise<boolean> {
  try {
    const token = await authService.getToken();
    if (!token) {
      return false;
    }

    const response = await apiClient.post(
      API_ENDPOINTS.DEVICE_UNREGISTER,
      { pushToken },
      {
        headers: {
          'x-auth-token': token,
        },
      }
    );

    return response.data?.success || false;
  } catch (error) {
    console.error('❌ Error unregistering device:', error);
    return false;
  }
}

/**
 * Setup push notifications for superadmin on login
 */
export async function setupPushNotificationsForSuperAdmin(userId: string): Promise<void> {
  try {
    console.log('📱 Setting up push notifications for superadmin...');
    console.log('   User ID:', userId);

    // Register for push notifications
    const pushToken = await registerForPushNotifications();

    if (!pushToken) {
      console.warn('⚠️ Could not obtain push token. This might be because:');
      console.warn('   1. Notification permissions not granted');
      console.warn('   2. Running in Expo Go (not supported)');
      console.warn('   3. Push notification service not available');
      return;
    }

    console.log('✅ Push token obtained, registering with backend...');

    // Register device with backend
    const registered = await registerDeviceToken(userId, 'superAdmin', pushToken);

    if (registered) {
      console.log('✅ Push notifications setup complete');
    } else {
      console.warn('⚠️ Failed to register device with backend');
      console.warn('   Please check:');
      console.warn('   1. Backend API is accessible');
      console.warn('   2. Authentication token is valid');
      console.warn('   3. Backend logs for errors');
    }
  } catch (error) {
    console.error('❌ Error setting up push notifications:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: any) => void,
  onNotificationTapped?: (response: any) => void
): () => void {
  let receivedListener: any = null;
  let responseListener: any = null;

  // Check if notifications are available
  ensureNotificationsAvailable().then((available) => {
    if (!available || !Notifications) {
      console.warn('⚠️ Notification listeners not set up - notifications not available');
      return;
    }

    try {
  // Listener for notifications received while app is foregrounded
      receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received:', notification.request.content.title);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on notification
      responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Notification tapped:', response.notification.request.content.title);
    if (onNotificationTapped) {
      onNotificationTapped(response);
        }
      });
    } catch (error) {
      console.warn('⚠️ Error setting up notification listeners:', error);
    }
  });

  // Return cleanup function
  return () => {
    try {
      if (receivedListener) {
    receivedListener.remove();
      }
      if (responseListener) {
    responseListener.remove();
      }
    } catch (error) {
      console.warn('⚠️ Error removing notification listeners:', error);
    }
  };
}

