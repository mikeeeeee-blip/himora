import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiKeyService from '@/services/apiKeyService';
import { Colors } from '@/constants/theme';
import { Platform } from 'react-native';

export default function ApiKeyManagementScreen() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      setLoading(true);
      const data = await apiKeyService.getApiKey();
      const key = data.apiKey || data.key || data.api_key || null;
      setApiKey(key);
    } catch (error: any) {
      console.error('Error loading API key:', error);
      // Don't show error if key doesn't exist - user can create one
      if (!error.message.includes('not found')) {
        Alert.alert('Error', error.message || 'Failed to load API key');
      }
      setApiKey(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    Alert.alert(
      'Create API Key',
      'This will create a new API key. If you already have one, it will be replaced. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            try {
              setCreating(true);
              const data = await apiKeyService.createApiKey();
              const key = data.apiKey || data.key || data.api_key || null;
              setApiKey(key);
              Alert.alert('Success', 'API key created successfully!');
            } catch (error: any) {
              console.error('Error creating API key:', error);
              Alert.alert('Error', error.message || 'Failed to create API key');
            } finally {
              setCreating(false);
            }
          },
        },
      ]
    );
  };

  const handleCopyApiKey = async () => {
    if (!apiKey) return;

    try {
      // Use Clipboard API - works on both web and mobile
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(apiKey);
      } else {
        // For React Native, we'll use a workaround
        // The TextInput is already selectable, so we'll just show success
        // In a real app, you'd install @react-native-clipboard/clipboard
        // For now, we'll show the key in an alert that users can copy from
        Alert.alert(
          'API Key',
          `Your API Key:\n\n${apiKey}\n\nTap and hold to select, then copy.`,
          [{ text: 'OK' }]
        );
        return;
      }
      setCopied(true);
      Alert.alert('Copied', 'API key copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error: any) {
      console.error('Error copying API key:', error);
      // Fallback: show alert with the key
      Alert.alert(
        'API Key',
        `Your API Key:\n\n${apiKey}\n\nTap and hold to select, then copy.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Key Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            Create and manage your API keys for accessing the backend services. Your API key is required to authenticate requests to the API endpoints.
          </Text>
        </View>

        {/* API Key Section */}
        <View style={styles.apiKeyCard}>
          <View style={styles.apiKeyHeader}>
            <Ionicons name="key-outline" size={24} color={Colors.accent} />
            <Text style={styles.apiKeyTitle}>Your API Key</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={styles.loadingText}>Loading API key...</Text>
            </View>
          ) : apiKey ? (
            <>
              <Text style={styles.apiKeySubtitle}>
                Copy this key to use in your API requests.
              </Text>

              <View style={styles.apiKeyDisplay}>
                <TextInput
                  style={styles.apiKeyText}
                  value={apiKey}
                  editable={false}
                  selectTextOnFocus
                  multiline
                />
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyApiKey}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={20}
                    color={Colors.textLight}
                  />
                  <Text style={styles.copyButtonText}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Security Warning */}
              <View style={styles.warningCard}>
                <Ionicons name="warning" size={20} color={Colors.warning} />
                <Text style={styles.warningText}>
                  Keep this API key secure and don't share it publicly. Anyone with access to this key can make requests on your behalf.
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.noKeyContainer}>
              <Ionicons name="key-outline" size={64} color={Colors.textSubtleLight} />
              <Text style={styles.noKeyText}>No API key found</Text>
              <Text style={styles.noKeySubtext}>
                Create an API key to start making authenticated requests to the API.
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateApiKey}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.textLight} />
                    <Text style={styles.createButtonText}>Creating...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.textLight} />
                    <Text style={styles.createButtonText}>Create API Key</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Create/Regenerate Button */}
          {apiKey && (
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={handleCreateApiKey}
              disabled={creating}
            >
              {creating ? (
                <>
                  <ActivityIndicator size="small" color={Colors.textLight} />
                  <Text style={styles.regenerateButtonText}>Regenerating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={20} color={Colors.textLight} />
                  <Text style={styles.regenerateButtonText}>Regenerate API Key</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Usage Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to Use</Text>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.instructionText}>
              Include your API key in the request header as: <Text style={styles.codeText}>x-api-key</Text>
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.instructionText}>
              Use this key for all API requests that require authentication
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.instructionText}>
              Keep your API key secure and never commit it to version control
            </Text>
          </View>
        </View>
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
    paddingTop: 80, // Account for Navbar + status bar
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  introSection: {
    marginBottom: 24,
  },
  introText: {
    fontSize: 14,
    color: Colors.textSubtleLight,
    lineHeight: 20,
  },
  apiKeyCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  apiKeyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  apiKeySubtitle: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginBottom: 12,
  },
  apiKeyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  apiKeyText: {
    flex: 1,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.success,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 50,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
  noKeyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noKeyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: 16,
    marginBottom: 8,
  },
  noKeySubtext: {
    fontSize: 14,
    color: Colors.textSubtleLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  instructionsCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSubtleLight,
    lineHeight: 20,
  },
  codeText: {
    fontFamily: 'monospace',
    backgroundColor: Colors.bgTertiary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    color: Colors.accent,
  },
});

