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
    const available = await ensureNotificationsAvailable();
    if (!available || !Notifications) {
      console.warn('⚠️ Push notifications not available in this environment');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const pushToken = tokenData.data;
    console.log('✅ Push token obtained:', pushToken.substring(0, 20) + '...');

    return pushToken;
  } catch (error) {
    console.warn('⚠️ Error registering for push notifications:', error);
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

    const response = await apiClient.post(
      API_ENDPOINTS.DEVICE_REGISTER,
      {
        userId,
        pushToken,
        role,
        platform,
        deviceId: Platform.OS === 'android' ? 'android' : 'ios',
        appVersion: '1.0.0', // You can get this from expo-constants if needed
      },
      {
        headers: {
          'x-auth-token': token,
        },
      }
    );

    if (response.data?.success) {
      console.log('✅ Device registered successfully');
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('❌ Error registering device:', error);
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

    // Register for push notifications
    const pushToken = await registerForPushNotifications();

    if (!pushToken) {
      console.warn('⚠️ Could not obtain push token');
      return;
    }

    // Register device with backend
    const registered = await registerDeviceToken(userId, 'superAdmin', pushToken);

    if (registered) {
      console.log('✅ Push notifications setup complete');
    } else {
      console.warn('⚠️ Failed to register device with backend');
    }
  } catch (error) {
    console.error('❌ Error setting up push notifications:', error);
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

