import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import apiClient from './apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from './authService';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
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
    console.error('❌ Error registering for push notifications:', error);
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
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
  // Listener for notifications received while app is foregrounded
  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received:', notification.request.content.title);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Notification tapped:', response.notification.request.content.title);
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
}

