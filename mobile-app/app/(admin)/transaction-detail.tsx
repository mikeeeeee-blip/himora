import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '@/services/paymentService';
import { Colors } from '@/constants/theme';

export default function TransactionDetailScreen() {
  const params = useLocalSearchParams();
  const transactionId = params.id as string;
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (transactionId) {
      loadTransactionDetail();
    }
  }, [transactionId]);

  const loadTransactionDetail = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getTransactionDetail(transactionId);
      setTransaction(data.transaction || data);
    } catch (error: any) {
      console.error('Error loading transaction detail:', error);
      Alert.alert('Error', error.message || 'Failed to load transaction details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${parseFloat(String(amount || 0)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'success':
      case 'completed':
      case 'settled':
        return Colors.success;
      case 'failed':
      case 'rejected':
        return Colors.danger;
      case 'pending':
        return Colors.warning;
      default:
        return Colors.textSubtleLight;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Transaction not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                {transaction.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
          <Text style={styles.amount}>{formatCurrency(transaction.amount || 0)}</Text>
        </View>

        {/* Transaction Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Transaction ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {transaction.transactionId || transaction.transaction_id || transaction.id || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {transaction.orderId || transaction.order_id || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={styles.infoValue}>{formatCurrency(transaction.amount || 0)}</Text>
          </View>

          {transaction.netAmount && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Net Amount</Text>
              <Text style={styles.infoValue}>{formatCurrency(transaction.netAmount || transaction.net_amount || 0)}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created At</Text>
            <Text style={styles.infoValue}>
              {formatDate(transaction.createdAt || transaction.created_at)}
            </Text>
          </View>

          {transaction.updatedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Updated At</Text>
              <Text style={styles.infoValue}>
                {formatDate(transaction.updatedAt || transaction.updated_at)}
              </Text>
            </View>
          )}
        </View>

        {/* Customer Info */}
        {(transaction.customerName || transaction.customer_name || transaction.customerEmail || transaction.customer_email) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            
            {transaction.customerName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{transaction.customerName || transaction.customer_name}</Text>
              </View>
            )}

            {transaction.customerEmail && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{transaction.customerEmail || transaction.customer_email}</Text>
              </View>
            )}

            {transaction.customerPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{transaction.customerPhone || transaction.customer_phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          {transaction.paymentGateway && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gateway</Text>
              <Text style={styles.infoValue}>
                {transaction.paymentGateway || transaction.payment_gateway || 'N/A'}
              </Text>
            </View>
          )}

          {transaction.paymentMethod && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Method</Text>
              <Text style={styles.infoValue}>
                {transaction.paymentMethod || transaction.payment_method || 'N/A'}
              </Text>
            </View>
          )}

          {transaction.settlementStatus && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Settlement Status</Text>
              <Text style={styles.infoValue}>
                {transaction.settlementStatus || transaction.settlement_status || 'N/A'}
              </Text>
            </View>
          )}

          {transaction.settlementDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Settlement Date</Text>
              <Text style={styles.infoValue}>
                {formatDate(transaction.settlementDate || transaction.settlement_date)}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {transaction.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{transaction.description}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSubtleLight,
    fontSize: 14,
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSubtleLight,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  section: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSubtleLight,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
});

