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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiService';
import { API_ENDPOINTS } from '@/constants/api';

interface GatewaySettings {
  paytm?: { enabled: boolean };
  easebuzz?: { enabled: boolean };
  razorpay?: { enabled: boolean };
  cashfree?: { enabled: boolean };
  sabpaisa?: { enabled: boolean };
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<GatewaySettings>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.GET_PAYMENT_GATEWAY_SETTINGS);
      setSettings(response.data || {});
    } catch (error: any) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load payment gateway settings');
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
      const updatedSettings = {
        ...settings,
        [gateway]: { enabled },
      };
      
      await apiClient.put(API_ENDPOINTS.UPDATE_PAYMENT_GATEWAY_SETTINGS, updatedSettings);
      setSettings(updatedSettings);
      Alert.alert('Success', `${gateway} ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Gateway Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading settings...</Text>
          </View>
        ) : (
          <View style={styles.settingsContainer}>
            {gateways.map((gateway) => (
              <View key={gateway.key} style={styles.gatewayCard}>
                <View style={styles.gatewayHeader}>
                  <Ionicons name={gateway.icon as any} size={24} color="#10b981" />
                  <Text style={styles.gatewayName}>{gateway.name}</Text>
                </View>
                <Switch
                  value={settings[gateway.key as keyof GatewaySettings]?.enabled || false}
                  onValueChange={(enabled) => toggleGateway(gateway.key, enabled)}
                  trackColor={{ false: '#ccc', true: '#10b981' }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  settingsContainer: {
    padding: 16,
    gap: 12,
  },
  gatewayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gatewayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});

