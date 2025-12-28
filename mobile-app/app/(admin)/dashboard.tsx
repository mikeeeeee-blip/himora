import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import authService from '@/services/authService';
import paymentService from '@/services/paymentService';
import Navbar from '@/components/Navbar';
import MetricCard from '@/components/MetricCard';
import { Colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DashboardStats {
  balance: any;
  transactions: any;
  payouts: any;
  todayTransactions: {
    payin: any[];
    payout: any[];
    settlement: any[];
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [todayPayinFilter, setTodayPayinFilter] = useState<'all' | 'payin' | 'payout' | 'settlement'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const initializeDashboard = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await authService.ensureAuthLoaded();
      const authenticated = await authService.isAuthenticated();
      const token = await authService.getToken();
      
      if (!authenticated || !token) {
        await authService.logout();
        router.replace('/login');
        return;
      }
      
      setAuthChecked(true);
      loadDashboardData();
    };
    
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (authChecked) {
      loadDashboardData();
    }
  }, [dateRange]);

  // Refresh today's transactions periodically
  useEffect(() => {
    if (!authChecked) return;
    
    const interval = setInterval(() => {
      fetchTodayTransactions();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [authChecked]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      await authService.ensureAuthLoaded();
      const authenticated = await authService.isAuthenticated();
      
      if (!authenticated) {
        await authService.logout();
        router.replace('/login');
        return;
      }
      
      // Fetch all dashboard data in parallel
      const [balanceData, transactionsData, payoutsData] = await Promise.allSettled([
        paymentService.getBalance(),
        paymentService.getTransactions().catch(() => ({ transactions: [], summary: { total_transactions: 0 } })),
        paymentService.getPayouts().catch(() => ({ payouts: [], summary: { total_payout_requests: 0 } })),
      ]);

      const balance = balanceData.status === 'fulfilled' ? balanceData.value : null;
      const transactions = transactionsData.status === 'fulfilled' ? transactionsData.value : { transactions: [], summary: { total_transactions: 0 } };
      const payouts = payoutsData.status === 'fulfilled' ? payoutsData.value : { payouts: [], summary: { total_payout_requests: 0 } };

      // Extract merchant name
      if (balance?.merchant?.merchantName) {
        setMerchantName(balance.merchant.merchantName);
        await AsyncStorage.setItem('businessName', balance.merchant.merchantName);
      }

      // Fetch today's transactions
      const todayTransactions = await fetchTodayTransactions();

      setStats({
        balance,
        transactions,
        payouts,
        todayTransactions,
      });
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again', [
          {
            text: 'OK',
            onPress: async () => {
              await authService.logout();
              router.replace('/login');
            },
          },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTodayTransactions = async () => {
    try {
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

      const [payinResult, payoutResult] = await Promise.allSettled([
        paymentService.searchTransactions({
          limit: 1000,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
        paymentService.searchPayouts({
          limit: 1000,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
      ]);

      const allPayins = payinResult.status === 'fulfilled' ? (payinResult.value.transactions || []) : [];
      const allPayouts = payoutResult.status === 'fulfilled' ? (payoutResult.value.payouts || []) : [];

      // Filter last 25 hours
      const payin = allPayins.filter((txn: any) => {
        const txnDate = new Date(txn.createdAt || txn.created_at);
        return txnDate >= twentyFiveHoursAgo && txn.settlementStatus !== 'settled';
      });

      const payout = allPayouts.filter((p: any) => {
        const pDate = new Date(p.createdAt || p.created_at);
        return pDate >= twentyFiveHoursAgo;
      });

      const settlement = allPayins.filter((txn: any) => {
        const txnDate = new Date(txn.createdAt || txn.created_at);
        return txnDate >= twentyFiveHoursAgo && txn.settlementStatus === 'settled';
      });

      return { payin, payout, settlement };
    } catch (error) {
      console.error('Error fetching today transactions:', error);
      return { payin: [], payout: [], settlement: [] };
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatCurrency = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return '0.00';
    return `₹${parseFloat(String(amount)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCurrentDateRange = () => {
    const now = new Date();
    
    if (dateRange === 'daily') {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      return `Displaying data from ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (Last 7 days)`;
    } else if (dateRange === 'weekly') {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      return `Displaying data from ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (Last 7 days)`;
    } else {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29);
      return `Displaying data from ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (Last 30 days)`;
    }
  };

  const getPeriodData = () => {
    const balanceData = stats?.balance;
    if (dateRange === 'weekly' && balanceData?.balanceOfPastWeek) {
      return balanceData.balanceOfPastWeek;
    } else if (dateRange === 'monthly' && balanceData?.balanceOfPastMonth) {
      return balanceData.balanceOfPastMonth;
    }
    return null;
  };

  const calculateMetrics = () => {
    const balanceData = stats?.balance;
    const balance = balanceData?.balance;
    const periodData = getPeriodData();

    const totalRevenue = periodData
      ? periodData.total_revenue
      : balance?.total_revenue || balance?.settled_revenue || 0;
    
    const totalPaidOut = periodData
      ? periodData.total_paid_out
      : balance?.total_paid_out || 0;

    const todayPayinAmount = balance?.totalTodayRevenue || 0;
    const availableBalance = balance?.available_balance || 0;
    const unsettledBalance = balance?.unsettled_net_revenue || balance?.unsettled_revenue || 0;
    
    const payoutCount = balanceData?.transaction_summary?.pending_payout_requests ||
      stats?.payouts?.payouts?.length || 0;

    const totalPayinCommission = periodData
      ? periodData.total_commission
      : balance?.totalPayinCommission || 0;

    const totalPayoutCommission = periodData
      ? periodData.total_payout_commission
      : balance?.totalTodaysPayoutCommission || 0;

    // Calculate today's payin/payout
    const todayPayin = {
      count: stats?.todayTransactions?.payin?.length || 0,
      amount: (stats?.todayTransactions?.payin || []).reduce((sum: number, txn: any) => sum + parseFloat(txn.amount || 0), 0),
    };

    const todayPayout = {
      count: stats?.todayTransactions?.payout?.length || 0,
      amount: (stats?.todayTransactions?.payout || []).reduce((sum: number, p: any) => sum + parseFloat(p.netAmount || p.amount || 0), 0),
    };

    return {
      totalRevenue,
      totalPaidOut,
      todayPayinAmount: dateRange === 'weekly' || dateRange === 'monthly' ? parseFloat(String(totalRevenue)) : todayPayinAmount,
      availableBalance,
      unsettledBalance,
      payoutCount,
      totalPayinCommission,
      totalPayoutCommission,
      todayPayin,
      todayPayout,
    };
  };

  const metrics = calculateMetrics();

  // Calculate GST from commission
  const calculateGST = (commission: number) => {
    const gstRate = 18;
    return commission * (gstRate / (100 + gstRate));
  };

  const metricCards = [
    {
      icon: 'cash-outline',
      title: 'Total revenue',
      value: formatCurrency(metrics.totalRevenue),
      trend: '+11.2% VS PREV. 28 DAYS',
      trendColor: Colors.success,
    },
    {
      icon: 'arrow-down-outline',
      title: 'Total Paid payout',
      value: formatCurrency(metrics.totalPaidOut),
      trendColor: Colors.textSubtleLight,
    },
    {
      icon: 'arrow-up-outline',
      title: dateRange === 'weekly' ? 'Week Payin' : dateRange === 'monthly' ? 'Month Payin' : 'Today payin',
      value: formatCurrency(metrics.todayPayinAmount),
    },
    {
      icon: 'arrow-down-outline',
      title: 'Payout',
      value: String(metrics.payoutCount),
      subtitle: 'Realtime update',
      actionButton: (
        <TouchableOpacity
          style={styles.requestPayoutButton}
          onPress={() => router.push('/(admin)/payout-request')}
        >
          <Ionicons name="flash-outline" size={16} color={Colors.textLight} />
          <Text style={styles.requestPayoutText}>Request payout</Text>
        </TouchableOpacity>
      ),
    },
    {
      icon: 'wallet-outline',
      title: 'Available Wallet Balance',
      value: formatCurrency(metrics.availableBalance),
      trend: '+11.2% VS PREV. 28 DAYS',
      trendColor: Colors.success,
      subtitle: stats?.balance?.balance?.blocked_balance && parseFloat(String(stats.balance.balance.blocked_balance)) > 0
        ? `Freezed: ${formatCurrency(stats.balance.balance.blocked_balance)}`
        : undefined,
    },
    {
      icon: 'arrow-down-outline',
      title: 'Unsettled Balance',
      value: formatCurrency(metrics.unsettledBalance),
      trendColor: Colors.textSubtleLight,
    },
    {
      icon: 'book-outline',
      title: dateRange === 'weekly' ? 'Week Payin Commission' : dateRange === 'monthly' ? 'Month Payin Commission' : 'Today payin Commission',
      value: formatCurrency(metrics.totalPayinCommission),
      subtitle: `GST Rate: 18% | Total GST: ${formatCurrency(calculateGST(parseFloat(String(metrics.totalPayinCommission))))}`,
    },
    {
      icon: 'book-outline',
      title: dateRange === 'weekly' ? 'Week Payout commission' : dateRange === 'monthly' ? 'Month Payout commission' : 'Today Payout commission',
      value: formatCurrency(metrics.totalPayoutCommission),
    },
  ];

  const getFilteredTransactions = () => {
    if (!stats?.todayTransactions) return [];
    
    let allTransactions: any[] = [];
    
    if (todayPayinFilter === 'all') {
      allTransactions = [
        ...(stats.todayTransactions.payin || []).map((t: any) => ({ ...t, type: 'payin' })),
        ...(stats.todayTransactions.payout || []).map((p: any) => ({ ...p, type: 'payout' })),
        ...(stats.todayTransactions.settlement || []).map((s: any) => ({ ...s, type: 'settlement' })),
      ];
    } else if (todayPayinFilter === 'payin') {
      allTransactions = (stats.todayTransactions.payin || []).map((t: any) => ({ ...t, type: 'payin' }));
    } else if (todayPayinFilter === 'payout') {
      allTransactions = (stats.todayTransactions.payout || []).map((p: any) => ({ ...p, type: 'payout' }));
    } else if (todayPayinFilter === 'settlement') {
      allTransactions = (stats.todayTransactions.settlement || []).map((s: any) => ({ ...s, type: 'settlement' }));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allTransactions = allTransactions.filter((txn: any) => {
        const name = txn.customerName || txn.customer_name || txn.description || '';
        const id = txn.transactionId || txn.transaction_id || txn.payoutId || '';
        return name.toLowerCase().includes(query) || id.toLowerCase().includes(query);
      });
    }

    return allTransactions;
  };

  const filteredTransactions = getFilteredTransactions();

  const renderTransaction = ({ item }: { item: any }) => {
    const name = item.type === 'payout'
      ? item.description || item.beneficiaryDetails?.accountHolderName || `Payout ${item.payoutId || ''}`
      : item.customerName || item.customer_name || item.description || `Transaction ${item.transactionId || ''}`;
    
    const amount = item.amount || item.netAmount || 0;
    const status = item.status || 'created';
    const type = item.type || 'payin';
    const date = new Date(item.createdAt || item.created_at);

    return (
      <TouchableOpacity
        style={styles.transactionRow}
        onPress={() => {
          if (type === 'payin' || type === 'settlement') {
            router.push(`/(admin)/transaction-detail?transactionId=${item.transactionId || item.transaction_id || item.id}`);
          }
        }}
      >
        <View style={styles.transactionCell}>
          <Text style={styles.transactionName}>
            {name} ({type})
          </Text>
        </View>
        <View style={styles.transactionCell}>
          <Text style={styles.transactionAmount}>{formatCurrency(amount)}</Text>
        </View>
        <View style={styles.transactionCell}>
          <Text style={styles.transactionType}>{type}</Text>
        </View>
        <View style={styles.transactionCell}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {status}
            </Text>
          </View>
        </View>
        <View style={styles.transactionCell}>
          <Text style={styles.transactionLabel}>
            {type === 'payout' ? 'Out' : type === 'settlement' ? 'Settlement' : 'In'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'paid' || statusLower === 'completed' || statusLower === 'success') {
      return Colors.success;
    } else if (statusLower === 'failed' || statusLower === 'rejected') {
      return Colors.danger;
    } else if (statusLower === 'pending') {
      return Colors.warning;
    }
    return Colors.textSubtleLight;
  };

  return (
    <View style={styles.container}>
      <Navbar />
      
      {/* Background X Graphic */}
      <View style={styles.backgroundGraphic}>
        <Image
          source={require('../../assets/images/X.png')}
          style={styles.xGraphic}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: 0 }}
      >
        {/* Main Content Card */}
        <View style={styles.mainCard}>
          {/* Greeting and Controls */}
          <View style={styles.greetingSection}>
            <View style={styles.greetingLeft}>
              <Text style={styles.greeting}>
                Hello {merchantName || 'User'}!
              </Text>
              <Text style={styles.dateRangeText}>{getCurrentDateRange()}</Text>
            </View>

            <View style={styles.controlsSection}>
              {/* Date Range Selector */}
              <View style={styles.dateRangeSelector}>
                {(['Daily', 'Weekly', 'Monthly'] as const).map((range) => (
                  <TouchableOpacity
                    key={range}
                    onPress={() => setDateRange(range.toLowerCase() as any)}
                    style={[
                      styles.dateRangeButton,
                      dateRange === range.toLowerCase() && styles.dateRangeButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateRangeButtonText,
                        dateRange === range.toLowerCase() && styles.dateRangeButtonTextActive,
                      ]}
                    >
                      {range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Create Payment Link Button */}
              <TouchableOpacity
                style={styles.createLinkButton}
                onPress={() => router.push('/(admin)/payments')}
              >
                <Ionicons name="add" size={20} color={Colors.textLight} />
                <Text style={styles.createLinkText}>Create payment link</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Cards Grid */}
          {!authChecked || loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
          ) : (
            <View style={styles.metricCardsGrid}>
              {metricCards.map((card, index) => (
                <MetricCard key={index} {...card} />
              ))}
            </View>
          )}
        </View>

        {/* Bottom Section - Transactions */}
        <View style={styles.bottomSection}>
          {/* Today Transactions Table */}
          <View style={styles.transactionsCard}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>
                Last 25 Hours {filteredTransactions.length || 0}
              </Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={16} color={Colors.textSubtleLight} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor={Colors.textSubtleLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterButtons}>
              {[
                { value: 'all', label: 'All' },
                { value: 'payin', label: 'In' },
                { value: 'payout', label: 'Out' },
                { value: 'settlement', label: 'Settlement' },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterButton,
                    todayPayinFilter === filter.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setTodayPayinFilter(filter.value as any)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      todayPayinFilter === filter.value && styles.filterButtonTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transactions List */}
            <FlatList
              data={filteredTransactions}
              renderItem={renderTransaction}
              keyExtractor={(item, index) => 
                item.transactionId || item.transaction_id || item.payoutId || item.id || `txn-${index}`
              }
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyTransactions}>
                  <Text style={styles.emptyText}>No transactions found</Text>
                </View>
              }
            />
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
  backgroundGraphic: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    opacity: 0.2,
    zIndex: 0,
  },
  xGraphic: {
    width: '100%',
    height: '60%',
    tintColor: Colors.accent,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  spacer: {
    height: 0,
    minHeight: 0,
  },
  mainCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  greetingSection: {
    marginBottom: 16,
  },
  greetingLeft: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 8,
  },
  dateRangeText: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  controlsSection: {
    gap: 12,
  },
  dateRangeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: Colors.accent,
  },
  dateRangeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSubtleLight,
  },
  dateRangeButtonTextActive: {
    color: Colors.textLight,
  },
  createLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  createLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
  metricCardsGrid: {
    gap: 16,
  },
  requestPayoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  requestPayoutText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
  },
  bottomSection: {
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  transactionsCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionsHeader: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSubtleLight,
  },
  filterButtonTextActive: {
    color: Colors.textLight,
  },
  transactionRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transactionCell: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionName: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
  },
  transactionAmount: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  transactionType: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  transactionLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  emptyTransactions: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
});
