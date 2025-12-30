import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@/services/apiService';
import authService from '@/services/authService';
import { API_ENDPOINTS } from '@/constants/api';
import { Colors } from '@/constants/theme';

interface GatewaySettings {
  paytm?: { enabled: boolean };
  easebuzz?: { enabled: boolean };
  razorpay?: { enabled: boolean };
  cashfree?: { enabled: boolean };
  sabpaisa?: { enabled: boolean };
  phonepe?: { enabled: boolean };
}

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<GatewaySettings>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSettings();
    loadNotificationPreference();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.GET_PAYMENT_GATEWAY_SETTINGS, {
        headers: {
          'x-auth-token': token,
        },
      });

      // Handle response structure: response.data.payment_gateways
      const paymentGateways = response.data?.payment_gateways || response.data || {};
      setSettings(paymentGateways);
    } catch (error: any) {
      console.error('Error loading settings:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load payment gateway settings';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSettings();
    loadNotificationPreference();
  };

  const loadNotificationPreference = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      const enabled = stored !== null ? stored === 'true' : true; // Default to enabled
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Error loading notification preference:', error);
      setNotificationsEnabled(true); // Default to enabled on error
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    try {
      setNotificationLoading(true);
      
      // Save preference
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled.toString());
      setNotificationsEnabled(enabled);

      if (enabled) {
        // Enable notifications - register device
        const userId = await authService.getUserId();
        if (!userId) {
          Alert.alert('Error', 'User ID not found. Please login again.');
          setNotificationLoading(false);
          // Revert toggle
          await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
          setNotificationsEnabled(false);
          return;
        }

        try {
          console.log('📱 Enabling push notifications from settings...');
          const { setupPushNotificationsForSuperAdmin } = await import('@/services/pushNotificationService');
          
          // Setup notifications
          await setupPushNotificationsForSuperAdmin(userId);
          
          // Wait a moment for registration to complete
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Verify device was actually registered
          console.log('🔍 Verifying device registration...');
          const token = await authService.getToken();
          if (!token) {
            console.error('❌ No auth token for verification');
            Alert.alert(
              'Warning',
              'Device registration completed but verification failed. Please check if device is registered.'
            );
            setNotificationLoading(false);
            return;
          }

          try {
            const { API_ENDPOINTS } = await import('@/constants/api');
            const verifyResponse = await apiClient.get(
              `${API_ENDPOINTS.DEVICE_LIST}?role=superAdmin&userId=${userId}`,
              {
                headers: {
                  'x-auth-token': token,
                  'Content-Type': 'application/json',
                },
                timeout: 10000,
              }
            );

            console.log('   Verification response:', JSON.stringify(verifyResponse.data, null, 2));

            if (verifyResponse.data?.success) {
              const devices = verifyResponse.data.devices || [];
              const activeDevices = devices.filter((d: any) => d.isActive);
              const deviceCount = activeDevices.length;
              
              if (deviceCount > 0) {
                console.log(`✅ Device verification successful - ${deviceCount} active device(s) found`);
                Alert.alert(
                  'Success',
                  `Push notifications enabled.\n\nDevice registered successfully.\n\nFound ${deviceCount} active device(s).`
                );
              } else {
                console.warn('⚠️ Verification found devices but none are active');
                console.warn('   All devices:', devices);
                Alert.alert(
                  'Warning',
                  'Device registration may have failed. Found devices but none are active.\n\nPlease try again or check backend logs.'
                );
                // Don't revert - let user try again
              }
            } else {
              console.error('❌ Verification query failed:', verifyResponse.data);
              Alert.alert(
                'Warning',
                'Device registration completed but verification failed.\n\nPlease check backend logs or try again.'
              );
            }
          } catch (verifyError: any) {
            console.error('❌ Verification error:', verifyError);
            if (verifyError.response) {
              console.error('   Response status:', verifyError.response.status);
              console.error('   Response data:', JSON.stringify(verifyError.response.data, null, 2));
            }
            Alert.alert(
              'Verification Failed',
              'Device registration completed but verification failed.\n\nPlease check:\n1. Backend is accessible\n2. Your authentication token is valid\n3. Try checking devices manually with curl command'
            );
          }
        } catch (error: any) {
          console.error('❌ Error enabling notifications:', error);
          const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
          
          // Revert toggle on error
          await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
          setNotificationsEnabled(false);
          
          Alert.alert(
            'Registration Failed',
            `Failed to register device:\n\n${errorMessage}\n\nPlease check:\n1. Internet connection\n2. Backend is accessible (https://himora.art/api/device/register)\n3. Authentication token is valid\n4. Try again`
          );
        } finally {
          setNotificationLoading(false);
        }
      } else {
        // Disable notifications - unregister device
        try {
          const { unregisterDeviceToken } = await import('@/services/pushNotificationService');
          const unregistered = await unregisterDeviceToken();
          if (unregistered) {
            Alert.alert('Success', 'Push notifications disabled. Device unregistered.');
          } else {
            Alert.alert('Success', 'Push notifications disabled.');
          }
        } catch (error: any) {
          console.error('Error disabling notifications:', error);
          Alert.alert('Warning', 'Notifications disabled but device unregistration failed.');
        }
      }
    } catch (error: any) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
      // Revert on error
      loadNotificationPreference();
    } finally {
      setNotificationLoading(false);
    }
  };

  const toggleGateway = async (gateway: string, enabled: boolean) => {
    try {
      setSaving(gateway);
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Update local state optimistically
      const updatedSettings = {
        ...settings,
        [gateway]: { enabled },
      };
      setSettings(updatedSettings);

      // Send update to server with correct format
      const response = await apiClient.put(
        API_ENDPOINTS.UPDATE_PAYMENT_GATEWAY_SETTINGS,
        {
          payment_gateways: updatedSettings,
        },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      if (response.data?.success) {
        // Update with server response
        const serverGateways = response.data?.payment_gateways || updatedSettings;
        setSettings(serverGateways);
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      // Revert on error
      loadSettings();
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update settings';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(null);
    }
  };

  const gateways = [
    { key: 'paytm', name: 'Paytm', icon: 'card-outline' },
    { key: 'easebuzz', name: 'Easebuzz', icon: 'card-outline' },
    { key: 'razorpay', name: 'Razorpay', icon: 'card-outline' },
    { key: 'cashfree', name: 'Cashfree', icon: 'card-outline' },
    { key: 'sabpaisa', name: 'SubPaisa', icon: 'card-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Gateway Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        ) : (
          <View style={styles.settingsContainer}>
            {/* Notifications Section */}
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications-outline" size={20} color={Colors.textLight} />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>
            <View style={styles.gatewayCard}>
              <View style={styles.gatewayHeader}>
                <View style={[styles.gatewayIcon, notificationsEnabled && styles.gatewayIconEnabled]}>
                  <Ionicons
                    name="notifications"
                    size={24}
                    color={notificationsEnabled ? Colors.success : Colors.textSubtleLight}
                  />
                </View>
                <View style={styles.gatewayInfo}>
                  <Text style={styles.gatewayName}>Push Notifications</Text>
                  <Text style={styles.gatewayDescription}>
                    {notificationsEnabled
                      ? 'Receive push notifications for payout requests and updates'
                      : 'Notifications are disabled'}
                  </Text>
                </View>
              </View>
              {notificationLoading ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: Colors.bgTertiary, true: Colors.success }}
                  thumbColor={Colors.textLight}
                  disabled={notificationLoading}
                />
              )}
            </View>

            {/* Payment Gateways Section */}
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color={Colors.textLight} />
              <Text style={styles.sectionTitle}>Payment Gateways</Text>
            </View>
            {gateways.map((gateway) => {
              const isEnabled = settings[gateway.key as keyof GatewaySettings]?.enabled || false;
              const isSaving = saving === gateway.key;
              
              return (
                <View key={gateway.key} style={styles.gatewayCard}>
                  <View style={styles.gatewayHeader}>
                    <View style={[styles.gatewayIcon, isEnabled && styles.gatewayIconEnabled]}>
                      <Ionicons
                        name={gateway.icon as any}
                        size={24}
                        color={isEnabled ? Colors.success : Colors.textSubtleLight}
                      />
                    </View>
                    <Text style={styles.gatewayName}>{gateway.name}</Text>
                  </View>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Switch
                      value={isEnabled}
                      onValueChange={(enabled) => toggleGateway(gateway.key, enabled)}
                      trackColor={{ false: Colors.bgTertiary, true: Colors.success }}
                      thumbColor={Colors.textLight}
                      disabled={isSaving}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 80, // Account for Navbar
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
  settingsContainer: {
    padding: 16,
    gap: 12,
  },
  gatewayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gatewayIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gatewayIconEnabled: {
    backgroundColor: Colors.success + '20',
    borderColor: Colors.success,
  },
  gatewayName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  gatewayInfo: {
    flex: 1,
    gap: 4,
  },
  gatewayDescription: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginTop: 2,
  },
});

