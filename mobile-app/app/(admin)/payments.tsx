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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '@/services/paymentService';
import { Colors } from '@/constants/theme';

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
      const result = await paymentService.createPaymentLink({
        amount: parseFloat(formData.amount),
        customerName: formData.customer_name,
        customerEmail: formData.customer_email,
        customerPhone: formData.customer_phone,
        description: formData.description || 'Payment',
      });

      if (result.paymentLink || result.success) {
        const paymentUrl = result.paymentLink || result.paytmPaymentUrl || '';
        Alert.alert(
          'Success',
          'Payment link created successfully',
          [
            {
              text: 'View Link',
              onPress: () => {
                Alert.alert('Payment Link', paymentUrl || 'Link created successfully');
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
      Alert.alert('Error', error.message || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
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
    color: Colors.textLight,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.bgTertiary,
    color: Colors.textLight,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.success,
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

