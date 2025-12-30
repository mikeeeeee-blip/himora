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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import superadminPaymentService from '@/services/superadminPaymentService';
import { Colors } from '@/constants/theme';
import Navbar from '@/components/Navbar';
import SwipeGestureHandler from '@/components/SwipeGestureHandler';

interface MerchantInfo {
  business_name?: string;
  name?: string;
  email?: string;
  status?: string;
}

interface TransactionSummary {
  total_transactions?: number;
  by_status?: {
    paid?: number;
    failed?: number;
  };
  success_rate?: number;
  average_transaction_value?: number;
}

interface RevenueSummary {
  total_revenue?: number;
  total_refunded?: number;
  settled_net_revenue?: number;
}

interface PayoutSummary {
  total_completed?: number;
  total_pending?: number;
  total_payouts?: number;
}

interface BalanceInformation {
  available_balance?: number;
  total_paid_out?: number;
  pending_payouts?: number;
  blocked_balance?: number;
}

interface TimeBasedStats {
  today?: {
    transactions?: number;
    revenue?: number;
  };
  this_week?: {
    transactions?: number;
    revenue?: number;
  };
  this_month?: {
    transactions?: number;
    revenue?: number;
  };
}

interface Merchant {
  merchant_id?: string;
  _id?: string;
  merchant_info?: MerchantInfo;
  transaction_summary?: TransactionSummary;
  revenue_summary?: RevenueSummary;
  payout_summary?: PayoutSummary;
  balance_information?: BalanceInformation;
  time_based_stats?: TimeBasedStats;
}

export default function MerchantsScreen() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    filterMerchants();
  }, [merchants, searchQuery, statusFilter, includeInactive]);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const data = await superadminPaymentService.getAllMerchantsData({
        includeInactive: includeInactive,
      });
      
      const merchantsList = data?.merchants || data || [];
      setMerchants(Array.isArray(merchantsList) ? merchantsList : []);
    } catch (error: any) {
      console.error('Error loading merchants:', error);
      Alert.alert('Error', error.message || 'Failed to load merchants');
      setMerchants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterMerchants = () => {
    let filtered = [...merchants];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        const name = m.merchant_info?.business_name || m.merchant_info?.name || '';
        const email = m.merchant_info?.email || '';
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((m) => {
        const status = m.merchant_info?.status || 'active';
        return status.toLowerCase() === statusFilter;
      });
    }

    setFilteredMerchants(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMerchants();
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '0.00';
    return parseFloat(String(amount)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    return parseFloat(String(num)).toLocaleString('en-IN');
  };

  const getStatusColor = (status: string | undefined) => {
    const statusLower = (status || 'active').toLowerCase();
    return statusLower === 'active' ? Colors.success : Colors.warning;
  };

  const renderMerchant = ({ item }: { item: Merchant }) => {
    const info = item.merchant_info || {};
    const txn = item.transaction_summary || {};
    const rev = item.revenue_summary || {};
    const payout = item.payout_summary || {};
    const bal = item.balance_information || {};
    const timeStats = item.time_based_stats || {};

    return (
      <View style={styles.merchantCard}>
        {/* Header */}
        <View style={styles.merchantHeader}>
          <View style={styles.merchantInfoSection}>
            <View style={styles.merchantNameRow}>
              <Text style={styles.merchantName}>
                {info.business_name || info.name || 'Unknown Merchant'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(info.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(info.status) }]}>
                  {info.status || 'active'}
                </Text>
              </View>
            </View>
            <Text style={styles.merchantEmail}>{info.email || 'No email'}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Transactions */}
          <View style={styles.statSection}>
            <Text style={styles.sectionTitle}>📈 Transactions</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total:</Text>
              <Text style={styles.statValue}>{formatNumber(txn.total_transactions)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Paid:</Text>
              <Text style={styles.statValue}>{formatNumber(txn.by_status?.paid)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Failed:</Text>
              <Text style={styles.statValue}>{formatNumber(txn.by_status?.failed)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Success:</Text>
              <Text style={styles.statValue}>{String(txn.success_rate || 0)}%</Text>
            </View>
          </View>

          {/* Revenue */}
          <View style={styles.statSection}>
            <Text style={styles.sectionTitle}>💰 Revenue</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total:</Text>
              <Text style={styles.statValue}>₹{formatCurrency(rev.total_revenue)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Refunded:</Text>
              <Text style={styles.statValue}>₹{formatCurrency(rev.total_refunded)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Net:</Text>
              <Text style={styles.statValue}>₹{formatCurrency(rev.settled_net_revenue)}</Text>
            </View>
          </View>

          {/* Payouts */}
          <View style={styles.statSection}>
            <Text style={styles.sectionTitle}>💸 Payouts</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Completed:</Text>
              <Text style={styles.statValue}>₹{formatCurrency(payout.total_completed)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Pending:</Text>
              <Text style={styles.statValue}>₹{formatCurrency(payout.total_pending)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}># Requests:</Text>
              <Text style={styles.statValue}>{formatNumber(payout.total_payouts)}</Text>
            </View>
          </View>

          {/* Balance */}
          <View style={styles.statSection}>
            <Text style={styles.sectionTitle}>🧾 Balance</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Available:</Text>
              <Text style={styles.statValue}>₹{formatCurrency(bal.available_balance)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Paid Out:</Text>
              <Text style={styles.statValue}>₹{formatCurrency(bal.total_paid_out)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Pending:</Text>
              <Text style={styles.statValue}>₹{formatCurrency(bal.pending_payouts)}</Text>
            </View>
            {bal.blocked_balance && parseFloat(String(bal.blocked_balance)) > 0 && (
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: Colors.warning }]}>Freezed:</Text>
                <Text style={[styles.statValue, { color: Colors.warning }]}>
                  ₹{formatCurrency(bal.blocked_balance)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Time-based Stats */}
        {(timeStats.today || timeStats.this_week || timeStats.this_month) && (
          <View style={styles.timeStatsSection}>
            <Text style={styles.timeStatsTitle}>🗓️ Today / This Week / This Month</Text>
            <View style={styles.timeStatsGrid}>
              <View style={styles.timeStatItem}>
                <Text style={styles.timeStatLabel}>Today</Text>
                <Text style={styles.timeStatValue}>
                  Txn: {formatNumber(timeStats.today?.transactions)}
                </Text>
                <Text style={styles.timeStatValue}>
                  Rev: ₹{formatCurrency(timeStats.today?.revenue)}
                </Text>
              </View>
              <View style={styles.timeStatItem}>
                <Text style={styles.timeStatLabel}>Week</Text>
                <Text style={styles.timeStatValue}>
                  Txn: {formatNumber(timeStats.this_week?.transactions)}
                </Text>
                <Text style={styles.timeStatValue}>
                  Rev: ₹{formatCurrency(timeStats.this_week?.revenue)}
                </Text>
              </View>
              <View style={styles.timeStatItem}>
                <Text style={styles.timeStatLabel}>Month</Text>
                <Text style={styles.timeStatValue}>
                  Txn: {formatNumber(timeStats.this_month?.transactions)}
                </Text>
                <Text style={styles.timeStatValue}>
                  Rev: ₹{formatCurrency(timeStats.this_month?.revenue)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.lockButton]}
            onPress={() => {
              const merchantId = item.merchant_id || item._id;
              if (merchantId) {
                Alert.alert('Lock/Unlock', `Lock merchant ${info.business_name || info.name}?`);
              }
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color={Colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => {
              const merchantId = item.merchant_id || item._id;
              if (merchantId) {
                router.push(`/(superadmin)/merchant-detail?id=${merchantId}`);
              }
            }}
          >
            <Ionicons name="pencil-outline" size={18} color={Colors.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => {
              const merchantId = item.merchant_id || item._id;
              if (merchantId) {
                router.push(`/(superadmin)/merchant-detail?id=${merchantId}`);
              }
            }}
          >
            <Ionicons name="eye-outline" size={18} color={Colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              const merchantId = item.merchant_id || item._id;
              const merchantName = info.business_name || info.name || 'this merchant';
              Alert.alert(
                'Delete Merchant',
                `Are you sure you want to delete ${merchantName}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      if (merchantId) {
                        try {
                          await superadminPaymentService.deleteUser(merchantId);
                          Alert.alert('Success', 'Merchant deleted successfully');
                          loadMerchants();
                        } catch (error: any) {
                          Alert.alert('Error', error.message || 'Failed to delete merchant');
                        }
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Merchants</Text>
        <TouchableOpacity onPress={() => router.push('/(superadmin)/signup')}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.success} />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryText}>
          Total: {merchants.length} Active: {merchants.filter(m => (m.merchant_info?.status || 'active').toLowerCase() === 'active').length} Inactive: {merchants.filter(m => (m.merchant_info?.status || 'active').toLowerCase() === 'inactive').length}
        </Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSubtleLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email"
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

        <View style={styles.filterRow}>
          <View style={styles.filterButtonGroup}>
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  statusFilter === status && styles.filterButtonActive,
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    statusFilter === status && styles.filterButtonTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              setIncludeInactive(!includeInactive);
              setTimeout(() => loadMerchants(), 100);
            }}
          >
            <Ionicons
              name={includeInactive ? 'checkbox' : 'square-outline'}
              size={20}
              color={includeInactive ? Colors.success : Colors.textSubtleLight}
            />
            <Text style={styles.checkboxLabel}>Include inactive</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <Navbar />
      <SwipeGestureHandler
        onSwipeLeft={() => {
          // Open notifications - would need notification state management here
          // For now, just navigate to dashboard which has notifications
          router.push('/(superadmin)/dashboard');
        }}
        onSwipeRight={() => router.push('/(superadmin)/payouts')}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Loading merchants...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMerchants}
            renderItem={renderMerchant}
            keyExtractor={(item, index) => item.merchant_id || item._id || `merchant-${index}`}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={Colors.textSubtleLight} />
                <Text style={styles.emptyText}>No merchants found</Text>
              </View>
            }
          />
        )}
      </SwipeGestureHandler>
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
    paddingTop: 16, // Reduced since Navbar is now separate
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  summarySection: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  filterSection: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.textLight,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
  listContent: {
    paddingBottom: 16,
  },
  merchantCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  merchantHeader: {
    marginBottom: 16,
  },
  merchantInfoSection: {
    flex: 1,
  },
  merchantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  merchantEmail: {
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  statSection: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
  },
  timeStatsSection: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  timeStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeStatLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginBottom: 4,
  },
  timeStatValue: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  lockButton: {
    backgroundColor: Colors.warning + '20',
    borderColor: Colors.warning,
  },
  editButton: {
    backgroundColor: Colors.info + '20',
    borderColor: Colors.info,
  },
  viewButton: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  deleteButton: {
    backgroundColor: Colors.danger + '20',
    borderColor: Colors.danger,
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
});
