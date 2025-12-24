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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from '@/services/authService';
import Navbar from '@/components/Navbar';
import MetricCard from '@/components/MetricCard';
import { Colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  pendingPayouts: number;
  availableBalance: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const router = useRouter();

  useEffect(() => {
    const initializeDashboard = async () => {
      // Small delay to ensure token is available after login redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // First verify authentication
      await authService.ensureAuthLoaded();
      const authenticated = await authService.isAuthenticated();
      const token = await authService.getToken();
      
      console.log('Dashboard init - authenticated:', authenticated, 'hasToken:', !!token);
      
      if (!authenticated || !token) {
        console.log('Dashboard: Not authenticated, redirecting to login');
        await authService.logout();
        router.replace('/login');
        return;
      }
      
      setAuthChecked(true);
      // Only load data after auth is confirmed
      loadDashboardData();
    };
    
    initializeDashboard();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Ensure auth is loaded and verify authentication before making API calls
      await authService.ensureAuthLoaded();
      const authenticated = await authService.isAuthenticated();
      
      if (!authenticated) {
        console.log('Not authenticated, redirecting to login');
        await authService.logout();
        router.replace('/login');
        return;
      }
      
      const token = await authService.getToken();
      if (!token) {
        console.log('No token found, redirecting to login');
        await authService.logout();
        router.replace('/login');
        return;
      }
      
      console.log('Loading dashboard data with token:', token.substring(0, 20) + '...');
      
      // Fetch balance
      const balanceResponse = await apiClient.get(API_ENDPOINTS.BALANCE);
      
      // Fetch transactions count (you might need to adjust this based on your API)
      const transactionsResponse = await apiClient.get(API_ENDPOINTS.TRANSACTIONS, {
        params: { limit: 1 },
      });

      const balanceData = balanceResponse.data?.balance || {};
      const balance = balanceData?.available_balance || balanceData?.balance || 0;
      const transactions = transactionsResponse.data?.transactions || [];
      
      // Extract merchant name
      if (balanceResponse.data?.merchant?.merchantName) {
        setMerchantName(balanceResponse.data.merchant.merchantName);
        await AsyncStorage.setItem('businessName', balanceResponse.data.merchant.merchantName);
      }
      
      setStats({
        totalTransactions: transactionsResponse.data?.total || transactions.length || 0,
        totalRevenue: balanceData?.total_revenue || balanceData?.settled_revenue || 0,
        pendingPayouts: 0, // You'll need to fetch this separately
        availableBalance: balance,
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
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load dashboard data');
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

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            router.replace('/login');
          },
        },
      ]
    );
  };


  const formatCurrency = (amount: number) => {
    return `₹${parseFloat(String(amount || 0)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCurrentDateRange = () => {
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    
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

  const metricCards = [
    {
      icon: 'cash-outline',
      title: 'Total revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      trend: '+11.2% VS PREV. 28 DAYS',
      trendColor: Colors.success,
    },
    {
      icon: 'arrow-down-outline',
      title: 'Total Paid payout',
      value: formatCurrency(0),
      trendColor: Colors.textSubtleLight,
    },
    {
      icon: 'arrow-up-outline',
      title: dateRange === 'weekly' ? 'Week Payin' : dateRange === 'monthly' ? 'Month Payin' : 'Today payin',
      value: formatCurrency(stats?.totalRevenue || 0),
    },
    {
      icon: 'arrow-down-outline',
      title: 'Payout',
      value: String(stats?.pendingPayouts || 0),
      subtitle: 'Realtime update',
      isSpecialCard: true,
      actionButton: (
        <TouchableOpacity
          style={styles.requestPayoutButton}
          onPress={() => router.push('/(admin)/payouts')}
        >
          <Ionicons name="flash-outline" size={16} color={Colors.textLight} />
          <Text style={styles.requestPayoutText}>Request payout</Text>
        </TouchableOpacity>
      ),
    },
    {
      icon: 'wallet-outline',
      title: 'Available Wallet Balance',
      value: formatCurrency(stats?.availableBalance || 0),
      trend: '+11.2% VS PREV. 28 DAYS',
      trendColor: Colors.success,
    },
    {
      icon: 'arrow-down-outline',
      title: 'Unsettled Balance',
      value: formatCurrency(0),
      trendColor: Colors.textSubtleLight,
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

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/transactions')}
          >
            <Ionicons name="receipt-outline" size={24} color={Colors.success} />
            <Text style={styles.actionButtonText}>View Transactions</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSubtleLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/payouts')}
          >
            <Ionicons name="cash-outline" size={24} color={Colors.info} />
            <Text style={styles.actionButtonText}>Manage Payouts</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSubtleLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/payments')}
          >
            <Ionicons name="card-outline" size={24} color={Colors.warning} />
            <Text style={styles.actionButtonText}>Create Payment</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSubtleLight} />
          </TouchableOpacity>
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  quickActions: {
    padding: 16,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textLight,
    marginLeft: 12,
  },
});

