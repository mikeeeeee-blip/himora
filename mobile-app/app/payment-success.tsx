import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#10b981" />
        </View>
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.message}>
          Your payment has been processed successfully.
        </Text>
        {params.transaction_id && (
          <Text style={styles.transactionId}>
            Transaction ID: {params.transaction_id}
          </Text>
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.buttonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  transactionId: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
    textAlign: 'center',
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

