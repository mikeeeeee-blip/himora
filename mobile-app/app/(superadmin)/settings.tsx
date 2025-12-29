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

export default function SettingsScreen() {
  const [settings, setSettings] = useState<GatewaySettings>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSettings();
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
});

