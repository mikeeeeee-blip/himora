import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import superadminPaymentService from '@/services/superadminPaymentService';
import authService from '@/services/authService';
import Navbar from '@/components/Navbar';
import MetricCard from '@/components/MetricCard';
import { Colors } from '@/constants/theme';

interface DashboardStats {
  merchants?: {
    total: number;
    active: number;
    inactive: number;
    new_this_week: number;
  };
  transactions?: {
    total: number;
    paid: number;
    pending: number;
    failed: number;
    settled: number;
    unsettled: number;
    today: number;
    this_week: number;
    success_rate: number;
  };
  revenue?: {
    total: number;
    commission_earned: number;
    net_revenue: number;
    refunded: number;
    today: number;
    this_week: number;
    average_transaction: number;
  };
  payouts?: {
    total_requests: number;
    requested: number;
    pending: number;
    completed: number;
    rejected: number;
    failed: number;
    total_amount_requested: number;
    total_completed: number;
    total_pending: number;
    commission_earned: number;
    today: number;
  };
  settlement?: {
    settled_transactions: number;
    unsettled_transactions: number;
    available_for_payout: number;
    in_payouts: number;
    available_balance: number;
  };
  platform?: {
    total_commission_earned: number;
    payin_commission: number;
    payout_commission: number;
    net_platform_revenue: number;
    today_payin_commission: number;
    today_payout_commission: number;
    today_total_commission: number;
  };
  commission?: {
    today_payin: number;
    today_payout: number;
    today_total: number;
    total_payin: number;
    total_payout: number;
    total_all: number;
  };
}

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeDashboard = async () => {
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
      
      const data = await superadminPaymentService.getDashboardStats();
      
      if (data) {
        setStats(data);
      } else {
        setStats({
          merchants: { total: 0, active: 0, inactive: 0, new_this_week: 0 },
          transactions: { total: 0, paid: 0, pending: 0, failed: 0, settled: 0, unsettled: 0, today: 0, this_week: 0, success_rate: 0 },
          revenue: { total: 0, commission_earned: 0, net_revenue: 0, refunded: 0, today: 0, this_week: 0, average_transaction: 0 },
          payouts: { total_requests: 0, requested: 0, pending: 0, completed: 0, rejected: 0, failed: 0, total_amount_requested: 0, total_completed: 0, total_pending: 0, commission_earned: 0, today: 0 },
          settlement: { settled_transactions: 0, unsettled_transactions: 0, available_for_payout: 0, in_payouts: 0, available_balance: 0 },
          platform: { total_commission_earned: 0, payin_commission: 0, payout_commission: 0, net_platform_revenue: 0, today_payin_commission: 0, today_payout_commission: 0, today_total_commission: 0 },
          commission: { today_payin: 0, today_payout: 0, today_total: 0, total_payin: 0, total_payout: 0, total_all: 0 },
        });
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      const errorMessage = error.message || 'Failed to load dashboard data';
      
      if (error.response?.status === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        Alert.alert('Session Expired', 'Please login again', [
          {
            text: 'OK',
            onPress: async () => {
              await authService.logout();
              router.replace('/login');
            },
          },
        ]);
      } else {
        Alert.alert('Error', errorMessage);
        // Set default stats on error
        setStats({
          merchants: { total: 0, active: 0, inactive: 0, new_this_week: 0 },
          transactions: { total: 0, paid: 0, pending: 0, failed: 0, settled: 0, unsettled: 0, today: 0, this_week: 0, success_rate: 0 },
          revenue: { total: 0, commission_earned: 0, net_revenue: 0, refunded: 0, today: 0, this_week: 0, average_transaction: 0 },
          payouts: { total_requests: 0, requested: 0, pending: 0, completed: 0, rejected: 0, failed: 0, total_amount_requested: 0, total_completed: 0, total_pending: 0, commission_earned: 0, today: 0 },
          settlement: { settled_transactions: 0, unsettled_transactions: 0, available_for_payout: 0, in_payouts: 0, available_balance: 0 },
          platform: { total_commission_earned: 0, payin_commission: 0, payout_commission: 0, net_platform_revenue: 0, today_payin_commission: 0, today_payout_commission: 0, today_total_commission: 0 },
          commission: { today_payin: 0, today_payout: 0, today_total: 0, total_payin: 0, total_payout: 0, total_all: 0 },
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return `₹${parseFloat(String(amount || 0)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatNumber = (num: number) => {
    return parseFloat(String(num || 0)).toLocaleString('en-IN');
  };

  const metricCards = [
    {
      id: 'transactions',
      icon: 'receipt-outline',
      title: 'Total Transactions',
      value: formatNumber(stats?.transactions?.total || 0),
      trend: stats?.transactions?.success_rate ? `${stats.transactions.success_rate}% success rate` : undefined,
      trendColor: Colors.success,
    },
    {
      id: 'revenue',
      icon: 'cash-outline',
      title: 'Total Revenue',
      value: formatCurrency(stats?.revenue?.total || 0),
      trend: stats?.revenue?.today ? `Today: ${formatCurrency(stats.revenue.today)}` : undefined,
      trendColor: Colors.success,
    },
    {
      id: 'merchants',
      icon: 'people-outline',
      title: 'Total Merchants',
      value: formatNumber(stats?.merchants?.total || 0),
      subtitle: stats?.merchants?.active ? `${stats.merchants.active} active` : undefined,
    },
    {
      id: 'payouts',
      icon: 'time-outline',
      title: 'Pending Payouts',
      value: formatNumber(stats?.payouts?.pending || stats?.payouts?.requested || 0),
      subtitle: stats?.payouts?.total_pending ? formatCurrency(stats.payouts.total_pending) : undefined,
    },
  ];

  const quickActions = [
    {
      id: 'transactions',
      icon: 'receipt-outline',
      label: 'View All Transactions',
      color: Colors.success,
      route: '/(superadmin)/transactions',
    },
    {
      id: 'payouts',
      icon: 'cash-outline',
      label: 'Manage Payouts',
      color: Colors.info,
      route: '/(superadmin)/payouts',
    },
    {
      id: 'merchants',
      icon: 'people-outline',
      label: 'Manage Merchants',
      color: Colors.warning,
      route: '/(superadmin)/merchants',
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Payment Gateway Settings',
      color: '#8b5cf6',
      route: '/(superadmin)/settings',
    },
  ];

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
      >
        {/* Spacer for graphic */}
        <View style={styles.spacer} />

        {/* Main Content Card */}
        <View style={styles.mainCard}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Superadmin Dashboard</Text>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={loading}
              style={styles.refreshButton}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={Colors.textLight}
                style={loading && { transform: [{ rotate: '180deg' }] }}
              />
            </TouchableOpacity>
          </View>

          {/* Metric Cards Grid */}
          {!authChecked || loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
          ) : (
            <View style={styles.metricCardsGrid}>
              {metricCards.map((card) => (
                <MetricCard
                  key={card.id}
                  icon={card.icon}
                  title={card.title}
                  value={card.value}
                  trend={card.trend}
                  trendColor={card.trendColor}
                  subtitle={card.subtitle}
                />
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.actionButtonText}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSubtleLight} />
            </TouchableOpacity>
          ))}
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
    top: 64, // Navbar height
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
    zIndex: 0,
  },
  xGraphic: {
    width: '120%',
    height: '85%',
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
    height: '50%',
    minHeight: 300,
  },
  mainCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
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
  quickActionsCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '500',
  },
});
