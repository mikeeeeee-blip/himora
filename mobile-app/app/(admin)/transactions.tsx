import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '@/services/paymentService';
import { Colors } from '@/constants/theme';

interface Transaction {
  _id?: string;
  transactionId?: string;
  transaction_id?: string;
  id?: string;
  amount: number;
  netAmount?: number;
  status: string;
  createdAt?: string;
  created_at?: string;
  customerName?: string;
  customer_name?: string;
  paymentGateway?: string;
  payment_gateway?: string;
  paymentMethod?: string;
  payment_method?: string;
  settlementStatus?: string;
  settlement_status?: string;
}

export default function TransactionsScreen() {
  const params = useLocalSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'payin' | 'payout' | 'settlement'>(
    (params.tab as any) || 'payin'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    paymentGateway: '',
    paymentMethod: '',
    settlementStatus: '',
    minAmount: '',
    maxAmount: '',
  });
  const router = useRouter();

  useEffect(() => {
    loadTransactions();
  }, [activeTab, filters, searchQuery]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'payin' || activeTab === 'settlement') {
        const searchFilters: any = {
          page: 1,
          limit: 1000,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };
        
        if (filters.status) searchFilters.status = filters.status;
        if (filters.startDate) searchFilters.startDate = filters.startDate;
        if (filters.endDate) searchFilters.endDate = filters.endDate;
        if (filters.paymentGateway) searchFilters.paymentGateway = filters.paymentGateway;
        if (filters.paymentMethod) searchFilters.paymentMethod = filters.paymentMethod;
        if (filters.minAmount) searchFilters.minAmount = filters.minAmount;
        if (filters.maxAmount) searchFilters.maxAmount = filters.maxAmount;
        if (searchQuery) searchFilters.search = searchQuery;
        if (activeTab === 'settlement') {
          searchFilters.settlementStatus = 'settled';
        }
        
        const result = await paymentService.searchTransactions(searchFilters);
        setTransactions(result.transactions || []);
      } else if (activeTab === 'payout') {
        const searchFilters: any = {
          page: 1,
          limit: 1000,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };
        
        if (filters.status) searchFilters.status = filters.status;
        if (filters.startDate) searchFilters.startDate = filters.startDate;
        if (filters.endDate) searchFilters.endDate = filters.endDate;
        if (searchQuery) searchFilters.search = searchQuery;
        
        const result = await paymentService.searchPayouts(searchFilters);
        setTransactions(result.payouts || []);
      }
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
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
      case 'requested':
        return Colors.warning;
      default:
        return Colors.textSubtleLight;
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
    });
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      startDate: '',
      endDate: '',
      paymentGateway: '',
      paymentMethod: '',
      settlementStatus: '',
      minAmount: '',
      maxAmount: '',
    });
    setSearchQuery('');
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const transactionId = item.transactionId || item.transaction_id || item.id || 'N/A';
    const amount = activeTab === 'payout' 
      ? (item.netAmount || item.amount || 0)
      : (item.amount || 0);
    const customerName = item.customerName || item.customer_name || 'Unknown';
    const date = item.createdAt || item.created_at || '';
    
    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => {
          if (activeTab !== 'payout') {
            router.push({
              pathname: '/(admin)/transaction-detail',
              params: { id: transactionId },
            });
          }
        }}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIdContainer}>
            <Text style={styles.transactionId} numberOfLines={1}>
              {transactionId}
            </Text>
            {customerName && customerName !== 'Unknown' && (
              <Text style={styles.customerName}>{customerName}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.transactionBody}>
          <Text style={styles.amount}>{formatCurrency(amount)}</Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.date}>{formatDate(date)}</Text>
            {(item.paymentGateway || item.payment_gateway) && (
              <Text style={styles.gateway}>
                {item.paymentGateway || item.payment_gateway}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={24} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['payin', 'payout', 'settlement'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSubtleLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={Colors.textSubtleLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSubtleLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item, index) => 
            item.transactionId || item.transaction_id || item.id || `txn-${index}`
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={Colors.textSubtleLight} />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.filterOptions}>
                  {['', 'paid', 'pending', 'failed', 'completed', 'rejected', 'cancelled', 'expired'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        filters.status === status && styles.filterOptionActive,
                      ]}
                      onPress={() => setFilters({ ...filters, status })}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filters.status === status && styles.filterOptionTextActive,
                        ]}
                      >
                        {status || 'All'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {activeTab === 'payin' || activeTab === 'settlement' ? (
                <>
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Payment Gateway</Text>
                    <View style={styles.filterOptions}>
                      {['', 'razorpay', 'paytm', 'phonepe', 'easebuzz', 'sabpaisa', 'cashfree'].map((gateway) => (
                        <TouchableOpacity
                          key={gateway}
                          style={[
                            styles.filterOption,
                            filters.paymentGateway === gateway && styles.filterOptionActive,
                          ]}
                          onPress={() => setFilters({ ...filters, paymentGateway: gateway })}
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              filters.paymentGateway === gateway && styles.filterOptionTextActive,
                            ]}
                          >
                            {gateway || 'All'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Payment Method</Text>
                    <View style={styles.filterOptions}>
                      {['', 'upi', 'card', 'netbanking', 'wallet', 'emi'].map((method) => (
                        <TouchableOpacity
                          key={method}
                          style={[
                            styles.filterOption,
                            filters.paymentMethod === method && styles.filterOptionActive,
                          ]}
                          onPress={() => setFilters({ ...filters, paymentMethod: method })}
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              filters.paymentMethod === method && styles.filterOptionTextActive,
                            ]}
                          >
                            {method || 'All'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              ) : null}

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Date Range</Text>
                <View style={styles.dateRangeRow}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateInputLabel}>Start Date</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textSubtleLight}
                      value={filters.startDate}
                      onChangeText={(text) => setFilters({ ...filters, startDate: text })}
                    />
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateInputLabel}>End Date</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textSubtleLight}
                      value={filters.endDate}
                      onChangeText={(text) => setFilters({ ...filters, endDate: text })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Amount Range</Text>
                <View style={styles.dateRangeRow}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateInputLabel}>Min Amount (₹)</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textSubtleLight}
                      value={filters.minAmount}
                      onChangeText={(text) => setFilters({ ...filters, minAmount: text.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateInputLabel}>Max Amount (₹)</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder="100000"
                      placeholderTextColor={Colors.textSubtleLight}
                      value={filters.maxAmount}
                      onChangeText={(text) => setFilters({ ...filters, maxAmount: text.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setShowFilters(false);
                  loadTransactions();
                }}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSubtleLight,
  },
  tabTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: Colors.textLight,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSubtleLight,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionIdContainer: {
    flex: 1,
    marginRight: 8,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionBody: {
    gap: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  transactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  gateway: {
    fontSize: 12,
    color: Colors.textSubtleLight,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  modalBody: {
    padding: 16,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterOptionActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterOptionText: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  filterOptionTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  filterInput: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.textLight,
    fontSize: 14,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
  },
  clearButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  applyButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
});
