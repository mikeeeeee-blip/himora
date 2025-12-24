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

export default function WebhooksScreen() {
  const [webhookConfig, setWebhookConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadWebhookConfig();
  }, []);

  const loadWebhookConfig = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.WEBHOOK_CONFIG);
      setWebhookConfig(response.data);
    } catch (error: any) {
      console.error('Error loading webhook config:', error);
      if (error.response?.status !== 404) {
        Alert.alert('Error', 'Failed to load webhook configuration');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWebhookConfig();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Webhooks</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/webhook-configure')}>
          <Ionicons name="settings-outline" size={24} color="#10b981" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading webhook configuration...</Text>
          </View>
        ) : webhookConfig ? (
          <View style={styles.configContainer}>
            <View style={styles.configCard}>
              <Text style={styles.configLabel}>Webhook URL</Text>
              <Text style={styles.configValue}>{webhookConfig.webhookUrl || 'Not configured'}</Text>
            </View>

            <View style={styles.configCard}>
              <View style={styles.switchRow}>
                <Text style={styles.configLabel}>Webhook Enabled</Text>
                <Switch
                  value={webhookConfig.enabled || false}
                  disabled
                  trackColor={{ false: '#ccc', true: '#10b981' }}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(admin)/webhook-configure')}
            >
              <Ionicons name="settings-outline" size={24} color="#10b981" />
              <Text style={styles.actionButtonText}>Configure Webhook</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                try {
                  await apiClient.post(API_ENDPOINTS.WEBHOOK_TEST);
                  Alert.alert('Success', 'Test webhook sent successfully');
                } catch (error: any) {
                  Alert.alert('Error', 'Failed to send test webhook');
                }
              }}
            >
              <Ionicons name="send-outline" size={24} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Send Test Webhook</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="link-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No webhook configured</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/(admin)/webhook-configure')}
            >
              <Text style={styles.buttonText}>Configure Webhook</Text>
            </TouchableOpacity>
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
  configContainer: {
    padding: 16,
    gap: 16,
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  configValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
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
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

