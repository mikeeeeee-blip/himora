import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiService';
import { API_ENDPOINTS } from '@/constants/api';

export default function PaymentsScreen() {
  const [formData, setFormData] = useState({
    amount: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.customer_name || !formData.customer_email || !formData.customer_phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post(API_ENDPOINTS.CREATE_LINK, {
        amount: parseFloat(formData.amount),
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        description: formData.description || 'Payment',
      });

      if (response.data?.success && response.data?.payment_url) {
        Alert.alert(
          'Success',
          'Payment link created successfully',
          [
            {
              text: 'Open Link',
              onPress: () => {
                // You can use Linking.openURL here or navigate to a webview
                Alert.alert('Payment URL', response.data.payment_url);
              },
            },
            { text: 'OK' },
          ]
        );
        
        // Reset form
        setFormData({
          amount: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          description: '',
        });
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#999"
                value={formData.amount}
                onChangeText={(value) => handleChange('amount', value)}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter customer name"
                placeholderTextColor="#999"
                value={formData.customer_name}
                onChangeText={(value) => handleChange('customer_name', value)}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Customer Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter customer email"
                placeholderTextColor="#999"
                value={formData.customer_email}
                onChangeText={(value) => handleChange('customer_email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Customer Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter customer phone"
                placeholderTextColor="#999"
                value={formData.customer_phone}
                onChangeText={(value) => handleChange('customer_phone', value)}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description (optional)"
                placeholderTextColor="#999"
                value={formData.description}
                onChangeText={(value) => handleChange('description', value)}
                multiline
                numberOfLines={4}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating...' : 'Create Payment Link'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

