import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from './authService';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';
const PUSH_TOKEN_KEY = 'push_token';

// Lazy import notifications to avoid errors in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

// Check if notifications are available
async function ensureNotificationsAvailable(): Promise<boolean> {
  try {
    const executionEnvironment = Constants.executionEnvironment;
    const appOwnership = Constants.appOwnership;
    const isDevice = Constants.isDevice;
    
    console.log('   Execution environment:', executionEnvironment);
    console.log('   App ownership:', appOwnership);
    console.log('   Is device:', isDevice);
    
    // Check multiple indicators to determine if we're in a real build
    // appOwnership: 'expo' = Expo Go, 'standalone' = standalone build, null = development
    // isDevice: true = real device, false = simulator/emulator
    const isStandalone = (appOwnership as string) === 'standalone' || 
                        (appOwnership === null && isDevice) ||
                        (executionEnvironment !== 'storeClient' && isDevice);
    
    if (executionEnvironment === 'storeClient' && !isStandalone) {
      console.warn('⚠️ Detected Expo Go environment - push notifications may not work');
      console.warn('   Attempting anyway in case this is a misdetection...');
      // Don't return false - try to proceed and let permissions check determine if it works
    } else {
      console.log('   ✅ Detected standalone/development build - notifications should work');
    }

    // Try to import and use notifications
    if (!Notifications) {
      console.log('   Importing expo-notifications...');
      try {
        // Suppress Expo Go warnings - we'll handle them gracefully
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
          const message = args.join(' ');
          // Suppress Expo Go push notification warnings since we're checking permissions anyway
          if (message.includes('expo-notifications') && 
              (message.includes('Expo Go') || message.includes('SDK 53'))) {
            // Suppress this specific warning
            return;
          }
          originalWarn.apply(console, args);
        };
        
        Notifications = await import('expo-notifications');
        
        // Restore original console.warn
        console.warn = originalWarn;
        console.log('   ✅ expo-notifications imported successfully');
      } catch (importError) {
        console.error('   ❌ Failed to import expo-notifications:', importError);
        throw importError;
      }
    }

    // Try to check permissions to verify notifications are available
    console.log('   Checking notification permissions...');
    const permissions = await Notifications.getPermissionsAsync();
    console.log('   ✅ Permissions check successful:', permissions.status);
    
    // If we can check permissions, notifications module is working
    // Even if permissions are denied, the module is available
    return true;
  } catch (error: any) {
    // If we can't even import or check permissions, notifications aren't available
    console.error('❌ Push notifications not available:', error);
    console.error('   Error message:', error.message);
    console.error('   This usually means:');
    console.error('     1. Running in Expo Go (not supported)');
    console.error('     2. expo-notifications not properly installed');
    console.error('     3. Native modules not linked correctly');
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
    
    try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const pushToken = tokenData.data;
      console.log('✅ Push token obtained:', pushToken.substring(0, 30) + '...');
      console.log('   Full token length:', pushToken.length);

      // Store token for later use (e.g., unregistering)
      try {
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
      } catch (error) {
        console.warn('⚠️ Failed to store push token:', error);
      }

    return pushToken;
    } catch (error: any) {
      // Handle Firebase initialization error
      if (error.message && (error.message.includes('FirebaseApp') || error.message.includes('Firebase'))) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ FIREBASE NOT CONFIGURED - Push Notifications Disabled');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('');
        console.error('📋 To enable push notifications, choose one option:');
        console.error('');
        console.error('OPTION 1: Use EAS Build (Recommended - Easiest)');
        console.error('   EAS automatically configures Firebase for you.');
        console.error('   Run: cd /home/pranjal/himora/mobile-app');
        console.error('   Run: eas build --platform android --profile preview --local');
        console.error('');
        console.error('OPTION 2: Configure Firebase Manually');
        console.error('   1. Go to: https://console.firebase.google.com');
        console.error('   2. Create/select a project');
        console.error('   3. Add Android app with package: com.payments.app');
        console.error('   4. Download google-services.json');
        console.error('   5. Place it at: mobile-app/android/app/google-services.json');
        console.error('   6. Rebuild: cd android && ./gradlew clean && ./gradlew assembleRelease');
        console.error('');
        console.error('📖 Full guide: See mobile-app/FIREBASE_SETUP.md');
        console.error('🔗 Expo docs: https://docs.expo.dev/push-notifications/fcm-credentials/');
        console.error('');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('');
        return null;
      }
      // Re-throw other errors
      throw error;
    }
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
): Promise<{ success: boolean; deviceId?: string; userId?: string; role?: string; error?: string }> {
  try {
    // Ensure auth is loaded
    await authService.ensureAuthLoaded();
    const token = await authService.getToken();
    
    if (!token) {
      console.error('❌ No auth token available');
      console.error('   Cannot register device without authentication');
      return {
        success: false,
        error: 'No authentication token'
      };
    }

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const trimmedToken = token.trim();

    console.log(`📤 Registering device with backend...`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Role: ${role}`);
    console.log(`   Platform: ${platform}`);
    console.log(`   Push token: ${pushToken.substring(0, 30)}...`);
    console.log(`   Token length: ${pushToken.length}`);
    console.log(`   API Endpoint: ${API_ENDPOINTS.DEVICE_REGISTER}`);
    console.log(`   Auth token: ${trimmedToken.substring(0, 20)}...`);
    
    const requestPayload = {
        userId,
        pushToken,
        role,
        platform,
        deviceId: Platform.OS === 'android' ? 'android' : 'ios',
      appVersion: Constants.expoConfig?.version || '1.0.0',
    };
    
    console.log(`   Request payload:`, {
      ...requestPayload,
      pushToken: `${pushToken.substring(0, 30)}...`,
    });
    
    // Make the request with explicit headers
    const response = await apiClient.post(
      API_ENDPOINTS.DEVICE_REGISTER,
      requestPayload,
      {
        headers: {
          'x-auth-token': trimmedToken,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );
    
    console.log('   ✅ Response received');
    console.log('   Response status:', response.status);
    console.log('   Response data:', JSON.stringify(response.data, null, 2));

    if (response.data?.success) {
      console.log('✅ Device registered successfully with backend');
      console.log('   Device ID:', response.data?.device?.id);
      console.log('   User ID:', response.data?.device?.userId);
      console.log('   Role:', response.data?.device?.role);
      return {
        success: true,
        deviceId: response.data?.device?.id,
        userId: response.data?.device?.userId,
        role: response.data?.device?.role
      };
    } else {
      console.error('❌ Device registration failed');
      console.error('   Response success:', response.data?.success);
      console.error('   Error:', response.data?.error || 'Unknown error');
      return {
        success: false,
        error: response.data?.error || 'Unknown error'
      };
    }
  } catch (error: any) {
    console.error('❌ Error registering device:', error);
    
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response statusText:', error.response.statusText);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error('   ❌ Authentication failed - token may be invalid or expired');
      } else if (error.response.status === 400) {
        console.error('   ❌ Bad request - check request payload');
      } else if (error.response.status === 500) {
        console.error('   ❌ Server error - check backend logs');
      }
    } else if (error.request) {
      console.error('   ❌ No response received from server');
      console.error('   Request URL:', error.config?.url);
      console.error('   Request method:', error.config?.method);
      console.error('   Request payload:', JSON.stringify(error.config?.data, null, 2));
      console.error('   This usually means:');
      console.error('     1. Server is not reachable');
      console.error('     2. Network connection issue');
      console.error('     3. CORS blocking the request');
      console.error('     4. Request timeout');
    } else {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Unregister device push token
 */
export async function unregisterDeviceToken(pushToken?: string): Promise<boolean> {
  try {
    // Get push token from parameter or storage
    let tokenToUnregister: string | undefined = pushToken;
    if (!tokenToUnregister) {
      try {
        const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        tokenToUnregister = storedToken || undefined;
      } catch (error) {
        console.warn('⚠️ Could not retrieve stored push token:', error);
      }
    }

    if (!tokenToUnregister) {
      console.warn('⚠️ No push token available to unregister');
      return false;
    }

    await authService.ensureAuthLoaded();
    const token = await authService.getToken();
    if (!token) {
      console.error('❌ No auth token available for unregistering');
      return false;
    }

    console.log('📤 Unregistering device...');
    console.log('   Push token:', tokenToUnregister.substring(0, 30) + '...');

    const response = await apiClient.post(
      API_ENDPOINTS.DEVICE_UNREGISTER,
      { pushToken: tokenToUnregister },
      {
        headers: {
          'x-auth-token': token.trim(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data?.success) {
      console.log('✅ Device unregistered successfully');
      // Clear stored token
      try {
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (error) {
        console.warn('⚠️ Failed to clear stored push token:', error);
      }
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('❌ Error unregistering device:', error);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data));
    }
    return false;
  }
}

/**
 * Check if notifications are enabled in user preferences
 */
async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return stored !== null ? stored === 'true' : true; // Default to enabled
  } catch (error) {
    console.error('Error checking notification preference:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Setup push notifications for superadmin on login
 */
export async function setupPushNotificationsForSuperAdmin(userId: string): Promise<void> {
  try {
    // Check if notifications are enabled
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      console.log('📱 Push notifications are disabled in settings. Skipping registration.');
      return;
    }

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
    console.log('   Token preview:', pushToken.substring(0, 30) + '...');

    // Register device with backend
    const registrationResult = await registerDeviceToken(userId, 'superAdmin', pushToken);

    if (!registrationResult.success) {
      console.error('❌ Device registration failed:', registrationResult.error);
      throw new Error(registrationResult.error || 'Device registration failed');
    }

      console.log('✅ Push notifications setup complete');
    console.log('   Device successfully registered with backend');
    console.log('   Device ID:', registrationResult.deviceId);
    
    // Wait a moment for database to sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify device was actually saved by trying to fetch it
    try {
        const token = await authService.getToken();
        if (token) {
          console.log('🔍 Verifying device registration in backend...');
          const verifyResponse = await apiClient.get(
            `${API_ENDPOINTS.DEVICE_LIST}?role=superAdmin&userId=${userId}`,
            {
              headers: {
                'x-auth-token': token.trim(),
                'Content-Type': 'application/json',
              },
              timeout: 10000, // 10 second timeout
            }
          );
          
          console.log('   Verification response status:', verifyResponse.status);
          console.log('   Verification response data:', JSON.stringify(verifyResponse.data, null, 2));
          
          if (verifyResponse.data?.success) {
            const devices = verifyResponse.data.devices || [];
            console.log(`   Found ${devices.length} device(s) in backend`);
            
            if (devices.length > 0) {
              // Try to find our device by device ID or token preview
              const tokenStart = pushToken.substring(0, 20);
              const foundDevice = devices.find(
                (d: any) => d.id === registrationResult.deviceId ||
                           d.pushTokenPreview?.includes(tokenStart)
              );
              
              if (foundDevice) {
                console.log('✅ Device verification successful - device found in backend');
                console.log('   Device ID:', foundDevice.id);
                console.log('   Is Active:', foundDevice.isActive);
                console.log('   Platform:', foundDevice.platform);
                console.log('   Registered At:', foundDevice.createdAt);
              } else {
                console.warn('⚠️ Device registered but not found in verification query');
                console.warn('   Looking for device ID:', registrationResult.deviceId);
                console.warn('   Looking for token starting with:', tokenStart);
                console.warn('   Available devices:', devices.map((d: any) => ({
                  id: d.id,
                  tokenPreview: d.pushTokenPreview,
                  isActive: d.isActive
                })));
              }
            } else {
              console.error('❌ Device verification failed - no devices found');
              console.error('   This means the device was not saved to the database');
              console.error('   Check backend logs for errors');
            }
          } else {
            console.error('❌ Device verification query failed');
            console.error('   Response:', verifyResponse.data);
          }
    } else {
          console.warn('⚠️ No auth token available for verification');
        }
      } catch (verifyError: any) {
        console.error('❌ Could not verify device registration:', verifyError);
        if (verifyError.response) {
          console.error('   Verification response status:', verifyError.response.status);
          console.error('   Verification response data:', JSON.stringify(verifyError.response.data, null, 2));
        } else if (verifyError.request) {
          console.error('   No response from verification request');
          console.error('   This might indicate a network or CORS issue');
        }
        // Don't fail the whole process if verification fails, but log it
    }
  } catch (error) {
    console.error('❌ Error setting up push notifications:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
      // Re-throw so caller can handle it
      throw error;
    }
    throw new Error('Unknown error during push notification setup');
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

