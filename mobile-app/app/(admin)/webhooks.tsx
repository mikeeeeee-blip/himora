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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import webhookService from '@/services/webhookService';
import { Colors } from '@/constants/theme';

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
      const configs = await webhookService.getAllWebhookConfigs();
      setWebhookConfig(configs);
    } catch (error: any) {
      console.error('Error loading webhook config:', error);
      Alert.alert('Error', error.message || 'Failed to load webhook configuration');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Webhooks</Text>
        <TouchableOpacity onPress={() => router.push('/(admin)/webhook-configure')}>
          <Ionicons name="settings-outline" size={24} color={Colors.success} />
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
            {webhookConfig.paymentWebhook && (
              <View style={styles.configCard}>
                <Text style={styles.configSectionTitle}>Payment Webhook</Text>
                <Text style={styles.configLabel}>Webhook URL</Text>
                <Text style={styles.configValue}>{webhookConfig.paymentWebhook.webhook_url || 'Not configured'}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.configLabel}>Enabled</Text>
                  <Switch
                    value={!!webhookConfig.paymentWebhook.webhook_url}
                    disabled
                    trackColor={{ false: Colors.bgTertiary, true: Colors.success }}
                  />
                </View>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    try {
                      await webhookService.testWebhook();
                      Alert.alert('Success', 'Test webhook sent successfully');
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'Failed to send test webhook');
                    }
                  }}
                >
                  <Ionicons name="send-outline" size={24} color={Colors.info} />
                  <Text style={styles.actionButtonText}>Test Payment Webhook</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSubtleLight} />
                </TouchableOpacity>
              </View>
            )}

            {webhookConfig.payoutWebhook && (
              <View style={styles.configCard}>
                <Text style={styles.configSectionTitle}>Payout Webhook</Text>
                <Text style={styles.configLabel}>Webhook URL</Text>
                <Text style={styles.configValue}>{webhookConfig.payoutWebhook.webhook_url || 'Not configured'}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.configLabel}>Enabled</Text>
                  <Switch
                    value={!!webhookConfig.payoutWebhook.webhook_url}
                    disabled
                    trackColor={{ false: Colors.bgTertiary, true: Colors.success }}
                  />
                </View>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    try {
                      await webhookService.testPayoutWebhook();
                      Alert.alert('Success', 'Test payout webhook sent successfully');
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'Failed to send test webhook');
                    }
                  }}
                >
                  <Ionicons name="send-outline" size={24} color={Colors.info} />
                  <Text style={styles.actionButtonText}>Test Payout Webhook</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSubtleLight} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(admin)/webhook-configure')}
            >
              <Ionicons name="settings-outline" size={24} color={Colors.success} />
              <Text style={styles.actionButtonText}>Configure Webhooks</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSubtleLight} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingTop: 64, // Account for Navbar height
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.bgSecondary,
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
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  configSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSubtleLight,
    marginBottom: 8,
  },
  configValue: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textLight,
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
    color: Colors.textSubtleLight,
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    padding: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

