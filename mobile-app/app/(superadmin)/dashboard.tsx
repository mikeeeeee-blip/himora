// This is a comprehensive superadmin dashboard matching the web version
// Will be integrated into the main dashboard.tsx file

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
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import superadminPaymentService from '@/services/superadminPaymentService';
import authService from '@/services/authService';
import Navbar from '@/components/Navbar';
import MetricCard from '@/components/MetricCard';
import NotificationPopup from '@/components/NotificationPopup';
import SwipeGestureHandler from '@/components/SwipeGestureHandler';
import { Colors } from '@/constants/theme';
import { setupNotificationListeners } from '@/services/pushNotificationService';

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
  commission?: {
    today_payin: number;
    today_payout: number;
    today_total: number;
    total_payin: number;
    total_payout: number;
    total_all: number;
  };
}

interface MerchantData {
  merchant_id: string;
  merchant_info?: {
    business_name?: string;
    name?: string;
    email?: string;
  };
  revenue_summary?: {
    total_revenue?: number;
  };
  payout_summary?: {
    total_completed?: number;
    total_payouts?: number;
    completed_count?: number;
  };
  transaction_summary?: {
    total_transactions?: number;
    by_status?: {
      paid?: number;
    };
  };
}

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 380;

export default function SuperadminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [merchantsData, setMerchantsData] = useState<MerchantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Date filter states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [useDateRange, setUseDateRange] = useState(false);
  const [showAllTime, setShowAllTime] = useState(false);

  // Notification state
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    body: string;
    type?: 'payout_request' | 'custom_notification';
    data?: any;
    timestamp: Date;
    read?: boolean;
  }>>([]);

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
      
      // ✅ Ensure device is registered for push notifications
      try {
        const userId = await authService.getUserId();
        if (userId) {
          const { setupPushNotificationsForSuperAdmin } = await import('@/services/pushNotificationService');
          console.log('📱 Attempting to register device for push notifications...');
          await setupPushNotificationsForSuperAdmin(userId);
        } else {
          console.warn('⚠️ No userId found, cannot register device');
        }
      } catch (error) {
        console.error('❌ Error setting up push notifications on dashboard load:', error);
      }
      
      setAuthChecked(true);
      loadDashboardData();
      loadMerchantsData();
      
      // Setup push notification listeners
      const removeListeners = setupNotificationListeners(
        (notification) => {
          // Handle notification received
          const notificationType = notification.request.content.data?.type;
          const notificationData = notification.request.content.data;
          
          // Add notification to list
          const newNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: notification.request.content.title || 'Notification',
            body: notification.request.content.body || '',
            type: notificationType as 'payout_request' | 'custom_notification' | undefined,
            data: notificationData,
            timestamp: new Date(),
            read: false,
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          
          if (notificationType === 'payout_request') {
            const amount = notificationData?.amount || notificationData?.grossAmount || 0;
            const merchantName = notificationData?.merchantName || 'Merchant';
            const formattedAmount = `₹${parseFloat(String(amount)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            
            Alert.alert(
              notification.request.content.title || '💰 New Payout Request',
              `${merchantName} has created a payout request of ${formattedAmount}.\n\nPlease review and approve.`,
              [
                { text: 'View Later', style: 'cancel' },
                {
                  text: 'View Now',
                  onPress: () => {
                    router.push('/(superadmin)/payouts');
                  },
                },
              ]
            );
            // Refresh dashboard to show updated counts
            loadDashboardData();
          } else if (notificationType === 'custom_notification') {
            // Handle custom notifications from superadmin dashboard
            Alert.alert(
              notification.request.content.title || '📱 Notification',
              notification.request.content.body || '',
              [
                { text: 'OK', style: 'default' }
              ]
            );
          }
        },
        (response) => {
          // Handle notification tapped
          const notificationType = response.notification.request.content.data?.type;
          
          if (notificationType === 'payout_request') {
            router.push('/(superadmin)/payouts');
          } else if (notificationType === 'custom_notification') {
            // Custom notifications just show the alert, no navigation needed
            // The alert is already shown in the received handler
          }
        }
      );

      return () => {
        removeListeners();
      };
    };
    
    initializeDashboard();
  }, []);

  useEffect(() => {
    if (authChecked) {
      loadDashboardData();
      loadMerchantsData();
    }
  }, [selectedDate, useDateRange, dateRange, showAllTime]);

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
      
      // Prepare date filters
      let startDate = undefined;
      let endDate = undefined;
      
      if (showAllTime) {
        startDate = undefined;
        endDate = undefined;
      } else if (useDateRange && dateRange.start && dateRange.end) {
        startDate = dateRange.start;
        endDate = dateRange.end;
      } else if (!useDateRange && selectedDate) {
        startDate = selectedDate;
        endDate = selectedDate;
      }

      const data = await superadminPaymentService.getDashboardStats({
        startDate,
        endDate
      });
      
      if (data) {
        setStats(data);
        // Update notification count: combine pending payouts with unread notifications
        const pendingPayoutCount = data.payouts?.requested || 0;
        const unreadNotificationCount = notifications.filter(n => !n.read).length;
        // Show the higher of the two, or combine them
        setNotificationCount(Math.max(pendingPayoutCount, unreadNotificationCount));
      } else {
        setStats({
          merchants: { total: 0, active: 0, inactive: 0, new_this_week: 0 },
          transactions: { total: 0, paid: 0, pending: 0, failed: 0, settled: 0, unsettled: 0, today: 0, this_week: 0, success_rate: 0 },
          revenue: { total: 0, commission_earned: 0, net_revenue: 0, refunded: 0, today: 0, this_week: 0, average_transaction: 0 },
          payouts: { total_requests: 0, requested: 0, pending: 0, completed: 0, rejected: 0, failed: 0, total_amount_requested: 0, total_completed: 0, total_pending: 0, commission_earned: 0, today: 0 },
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
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMerchantsData = async () => {
    try {
      setLoadingMerchants(true);
      
      // Prepare date filters
      let startDate = undefined;
      let endDate = undefined;
      
      if (showAllTime) {
        startDate = undefined;
        endDate = undefined;
      } else if (useDateRange && dateRange.start && dateRange.end) {
        startDate = dateRange.start;
        endDate = dateRange.end;
      } else if (!useDateRange && selectedDate) {
        startDate = selectedDate;
        endDate = selectedDate;
      }

      const data = await superadminPaymentService.getAllMerchantsData({
        startDate,
        endDate
      });
      
      if (data && data.merchants) {
        setMerchantsData(data.merchants);
      }
    } catch (err) {
      console.error('Error fetching merchants data:', err);
    } finally {
      setLoadingMerchants(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    loadMerchantsData();
  };

  const formatCurrency = (amount: number) => {
    const num = parseFloat(String(amount || 0));
    // For very large numbers, use compact notation
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)}Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)}L`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(2)}K`;
    }
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatCurrencyFull = (amount: number) => {
    return `₹${parseFloat(String(amount || 0)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatNumber = (num: number) => {
    const number = parseFloat(String(num || 0));
    // For very large numbers, use compact notation
    if (number >= 1000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    } else if (number >= 1000) {
      return `${(number / 1000).toFixed(1)}K`;
    }
    return number.toLocaleString('en-IN');
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const navigateDate = (direction: 'left' | 'right') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'left') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
    setUseDateRange(false);
    setShowAllTime(false);
    setDateRange({ start: '', end: '' });
  };

  const handleDateRangeApply = () => {
    if (dateRange.start && dateRange.end) {
      if (new Date(dateRange.start) > new Date(dateRange.end)) {
        Alert.alert('Error', 'Start date cannot be after end date');
        return;
      }
      setUseDateRange(true);
      setShowAllTime(false);
      setShowDateRangePicker(false);
    } else {
      Alert.alert('Error', 'Please select both start and end dates');
    }
  };

  const handleClearDateRange = () => {
    setUseDateRange(false);
    setShowAllTime(false);
    setDateRange({ start: '', end: '' });
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleAllTime = () => {
    if (showAllTime) {
      setShowAllTime(false);
      setUseDateRange(false);
      setDateRange({ start: '', end: '' });
      setSelectedDate(new Date().toISOString().split('T')[0]);
    } else {
      setShowAllTime(true);
      setUseDateRange(false);
      setDateRange({ start: '', end: '' });
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Top Payin Merchants (sorted by revenue)
  const topPayinMerchants = merchantsData
    .sort((a, b) => {
      const revA = parseFloat(String(a.revenue_summary?.total_revenue || 0));
      const revB = parseFloat(String(b.revenue_summary?.total_revenue || 0));
      return revB - revA;
    })
    .slice(0, 5);

  // Top Payout Merchants (sorted by total completed payouts)
  const topPayoutMerchants = merchantsData
    .sort((a, b) => {
      const payoutA = parseFloat(String(a.payout_summary?.total_completed || 0));
      const payoutB = parseFloat(String(b.payout_summary?.total_completed || 0));
      return payoutB - payoutA;
    })
    .slice(0, 5);

  // Update notification count whenever notifications or stats change
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const pendingPayoutCount = stats?.payouts?.requested || 0;
    // Show unread notifications count, or pending payouts if higher
    setNotificationCount(Math.max(unreadCount, pendingPayoutCount));
  }, [notifications, stats?.payouts?.requested]);

  const handleNotificationPress = (notification: typeof notifications[0]) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    
    // Handle navigation based on type
    if (notification.type === 'payout_request') {
      setShowNotificationPopup(false);
      router.push('/(superadmin)/payouts');
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <View style={styles.container}>
      <Navbar 
        notificationCount={notificationCount} 
        onNotificationPress={() => setShowNotificationPopup(true)}
      />
      
      <NotificationPopup
        visible={showNotificationPopup}
        onClose={() => setShowNotificationPopup(false)}
        notifications={notifications}
        onNotificationPress={handleNotificationPress}
        onMarkAllRead={handleMarkAllRead}
      />
      
      <SwipeGestureHandler
        onSwipeLeft={() => setShowNotificationPopup(true)}
        onSwipeRight={() => router.push('/(superadmin)/payouts')}
      >
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
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 120 + insets.bottom }
        ]}
        contentOffset={{ x: 0, y: 0 }}
        showsVerticalScrollIndicator={true}
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
          {/* Header with Date Filter */}
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.headerTitle}>Superadmin Dashboard</Text>
              <Text style={styles.headerSubtitle}>Complete overview of platform operations</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const userId = await authService.getUserId();
                    if (!userId) {
                      Alert.alert('Error', 'User ID not found');
                      return;
                    }
                    Alert.alert('Registering Device', 'Please wait...');
                    const { setupPushNotificationsForSuperAdmin } = await import('@/services/pushNotificationService');
                    await setupPushNotificationsForSuperAdmin(userId);
                    Alert.alert('Success', 'Device registration completed. Check console logs for details.');
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to register device');
                  }
                }}
                style={[styles.refreshButton, { backgroundColor: Colors.accent }]}
              >
                <Ionicons
                  name="notifications"
                  size={18}
                  color={Colors.textLight}
                />
              </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={loading}
              style={styles.refreshButton}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={Colors.textLight}
                style={loading && styles.refreshSpinning}
              />
            </TouchableOpacity>
            </View>
          </View>

          {/* Date Filter Controls */}
          <View style={styles.dateFilterSection}>
            <View style={styles.dateNavigation}>
              <TouchableOpacity
                onPress={() => navigateDate('left')}
                disabled={useDateRange || showAllTime}
                style={[styles.dateNavButton, (useDateRange || showAllTime) && styles.dateNavButtonDisabled]}
              >
                <Ionicons name="chevron-back" size={16} color={Colors.textLight} />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setShowDateRangePicker(true)}
                style={styles.dateDisplayButton}
              >
                <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
                <Text style={styles.dateDisplayText}>
                  {showAllTime ? 'All Time' : useDateRange && dateRange.start && dateRange.end
                    ? `${new Date(dateRange.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(dateRange.end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                    : formatDateDisplay(selectedDate)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => navigateDate('right')}
                disabled={useDateRange || showAllTime}
                style={[styles.dateNavButton, (useDateRange || showAllTime) && styles.dateNavButtonDisabled]}
              >
                <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleAllTime}
              style={[styles.allTimeButton, showAllTime && styles.allTimeButtonActive]}
            >
              <Text style={[styles.allTimeButtonText, showAllTime && styles.allTimeButtonTextActive]}>
                {showAllTime ? 'Today' : 'All Time'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {(!authChecked || loading) && !stats ? (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
          ) : stats ? (
            <>
              {/* Platform Overview - Total Payin and Total Payout */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Platform Overview</Text>
                </View>
                <View style={styles.platformOverviewGrid}>
                  <View style={[styles.platformCard, styles.payinCard]}>
                    {loading && (
                      <View style={styles.platformCardLoading}>
                        <ActivityIndicator size="small" color={Colors.accent} />
                      </View>
                    )}
                    <View style={styles.platformCardContent}>
                      <View style={[styles.platformIcon, styles.payinIcon]}>
                        <Ionicons name="arrow-up" size={isSmallScreen ? 24 : 28} color={Colors.success} />
                      </View>
                      <View style={styles.platformCardText}>
                        <Text style={styles.platformCardTitle}>Total Payin</Text>
                        <Text 
                          style={[styles.platformCardValue, loading && styles.platformCardValueLoading]}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrency(stats.revenue?.total || 0)}
                        </Text>
                        <Text style={styles.platformCardSubtext} numberOfLines={1}>
                          {formatNumber(stats.transactions?.paid || 0)} paid transactions
                        </Text>
                      </View>
                    </View>
              </View>

                  <View style={[styles.platformCard, styles.platformPayoutCard]}>
                    {loading && (
                      <View style={styles.platformCardLoading}>
                        <ActivityIndicator size="small" color={Colors.accent} />
                      </View>
                    )}
                    <View style={styles.platformCardContent}>
                      <View style={[styles.platformIcon, styles.payoutIcon]}>
                        <Ionicons name="arrow-down" size={isSmallScreen ? 24 : 28} color={Colors.info} />
                      </View>
                      <View style={styles.platformCardText}>
                        <Text style={styles.platformCardTitle}>Total Payout</Text>
                        <Text 
                          style={[styles.platformCardValue, loading && styles.platformCardValueLoading]}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrency(stats.payouts?.total_completed || 0)}
                        </Text>
                        <Text style={styles.platformCardSubtext} numberOfLines={1}>
                          {formatNumber(stats.payouts?.completed || 0)} completed payouts
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Merchants Leaderboard */}
              {merchantsData.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Merchants Leaderboard</Text>
                  <View style={styles.leaderboardGrid}>
                    {/* Top Payin Merchants */}
                    <View style={styles.leaderboardCard}>
                      <View style={styles.leaderboardHeader}>
                        <Ionicons name="arrow-up" size={isSmallScreen ? 14 : 16} color={Colors.success} />
                        <Text style={styles.leaderboardTitle}>Top Payin Merchants</Text>
              </View>
                      <Text style={styles.leaderboardSubtitle}>Ranked by total revenue</Text>
                      {loadingMerchants ? (
                        <ActivityIndicator size="small" color={Colors.accent} style={styles.leaderboardLoading} />
                      ) : (
                        <View style={styles.leaderboardList}>
                          {topPayinMerchants.map((m, index) => {
                            const info = m.merchant_info || {};
                            const rev = m.revenue_summary || {};
                            const txn = m.transaction_summary || {};
                            
                            return (
                              <TouchableOpacity
                                key={m.merchant_id}
                                style={styles.leaderboardItem}
                                onPress={() => router.push(`/(superadmin)/merchants`)}
                              >
                                <View style={styles.leaderboardItemLeft}>
                                  <View style={[styles.leaderboardRank, styles.payinRank]}>
                                    <Text style={styles.leaderboardRankText}>{index + 1}</Text>
              </View>
                                  <View style={styles.leaderboardItemInfo}>
                                    <Text 
                                      style={styles.leaderboardItemName} 
                                      numberOfLines={1}
                                      ellipsizeMode="tail"
                                    >
                                      {info.business_name || info.name || 'Unknown'}
                                    </Text>
                                    <Text style={styles.leaderboardItemSubtext} numberOfLines={1}>
                                      {txn.total_transactions || 0} transactions
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.leaderboardItemRight}>
                                  <Text 
                                    style={styles.leaderboardItemValue}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit={true}
                                    minimumFontScale={0.7}
                                  >
                                    {formatCurrencyFull(rev.total_revenue || 0)}
                                  </Text>
                                  <Text style={styles.leaderboardItemSubtext}>
                                    {txn.by_status?.paid || 0} paid
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
            </View>

                    {/* Top Payout Merchants */}
                    <View style={styles.leaderboardCard}>
                      <View style={styles.leaderboardHeader}>
                        <Ionicons name="arrow-down" size={isSmallScreen ? 14 : 16} color={Colors.info} />
                        <Text style={styles.leaderboardTitle}>Top Payout Merchants</Text>
                      </View>
                      <Text style={styles.leaderboardSubtitle}>Ranked by total payouts</Text>
                      {loadingMerchants ? (
                        <ActivityIndicator size="small" color={Colors.accent} style={styles.leaderboardLoading} />
                      ) : (
                        <View style={styles.leaderboardList}>
                          {topPayoutMerchants.map((m, index) => {
                            const info = m.merchant_info || {};
                            const payout = m.payout_summary || {};
                            
                            return (
              <TouchableOpacity
                                key={m.merchant_id}
                                style={styles.leaderboardItem}
                                onPress={() => router.push(`/(superadmin)/merchants`)}
                              >
                                <View style={styles.leaderboardItemLeft}>
                                  <View style={[styles.leaderboardRank, styles.payoutRank]}>
                                    <Text style={styles.leaderboardRankText}>{index + 1}</Text>
                                  </View>
                                  <View style={styles.leaderboardItemInfo}>
                                    <Text 
                                      style={styles.leaderboardItemName} 
                                      numberOfLines={1}
                                      ellipsizeMode="tail"
                                    >
                                      {info.business_name || info.name || 'Unknown'}
                                    </Text>
                                    <Text style={styles.leaderboardItemSubtext} numberOfLines={1}>
                                      {payout.total_payouts || 0} payout requests
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.leaderboardItemRight}>
                                  <Text 
                                    style={styles.leaderboardItemValue}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit={true}
                                    minimumFontScale={0.7}
                                  >
                                    {formatCurrencyFull(payout.total_completed || 0)}
                                  </Text>
                                  <Text style={styles.leaderboardItemSubtext}>
                                    {payout.completed_count || 0} completed
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Revenue Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Revenue</Text>
                  <Text 
                    style={styles.sectionValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.7}
                  >
                    {formatCurrencyFull(stats.revenue?.total || 0)}
                  </Text>
                </View>
                <View style={styles.revenueGrid}>
                  <View style={[styles.revenueCard, styles.revenueCardLarge]}>
                    <View style={styles.revenueCardContent}>
                      <Ionicons name="cash-outline" size={20} color={Colors.textLight} />
                      <View style={styles.revenueCardText}>
                        <Text style={styles.revenueCardTitle}>Total Revenue</Text>
                        <Text 
                          style={styles.revenueCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.revenue?.total || 0)}
                        </Text>
                        <Text style={styles.revenueCardSubtext}>
                          Avg: {formatCurrency(stats.revenue?.average_transaction || 0)} per txn
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.revenueCard}>
                    <View style={styles.revenueCardContent}>
                      <Ionicons name="trending-up" size={20} color={Colors.success} />
                      <View style={styles.revenueCardText}>
                        <Text style={styles.revenueCardTitle}>Commission (3.8%)</Text>
                        <Text 
                          style={styles.revenueCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.revenue?.commission_earned || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.revenueCard}>
                    <View style={styles.revenueCardContent}>
                      <Ionicons name="card-outline" size={20} color={Colors.textLight} />
                      <View style={styles.revenueCardText}>
                        <Text style={styles.revenueCardTitle}>Net Revenue</Text>
                        <Text 
                          style={styles.revenueCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.revenue?.net_revenue || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Commission Breakdown */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Commission Breakdown</Text>
                  <Text 
                    style={styles.sectionValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.7}
                  >
                    Today: {formatCurrencyFull(stats.commission?.today_total || 0)}
                  </Text>
                </View>
                
                <Text style={styles.subsectionTitle}>Today's Commission (IST)</Text>
                <View style={styles.commissionGrid}>
                  <View style={[styles.commissionCard, styles.commissionCardPayin]}>
                    <View style={styles.commissionCardHeader}>
                      <View style={[styles.commissionIcon, styles.commissionIconPayin]}>
                        <Ionicons name="arrow-up" size={20} color={Colors.success} />
                      </View>
                      <View style={styles.commissionCardContent}>
                        <Text style={styles.commissionCardTitle}>Today's Payin Commission</Text>
                        <Text 
                          style={styles.commissionCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.commission?.today_payin || 0)}
                        </Text>
                        <Text style={styles.commissionCardSubtext}>From paid transactions</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.commissionCard, styles.commissionCardPayout]}>
                    <View style={styles.commissionCardHeader}>
                      <View style={[styles.commissionIcon, styles.commissionIconPayout]}>
                        <Ionicons name="arrow-down" size={20} color={Colors.info} />
                      </View>
                      <View style={styles.commissionCardContent}>
                        <Text style={styles.commissionCardTitle}>Today's Payout Commission</Text>
                        <Text 
                          style={styles.commissionCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.commission?.today_payout || 0)}
                        </Text>
                        <Text style={styles.commissionCardSubtext}>From payout requests</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.commissionCard, styles.commissionCardTotal]}>
                    <View style={styles.commissionCardHeader}>
                      <View style={[styles.commissionIcon, styles.commissionIconTotal]}>
                        <Ionicons name="cash-outline" size={20} color="#a855f7" />
                      </View>
                      <View style={styles.commissionCardContent}>
                        <Text style={styles.commissionCardTitle}>Today's Total Commission</Text>
                        <Text 
                          style={styles.commissionCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.commission?.today_total || 0)}
                        </Text>
                        <Text style={styles.commissionCardSubtext}>Payin + Payout</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* All-Time Commission Summary */}
                <View style={styles.commissionAllTimeGrid}>
                  <View style={[styles.commissionAllTimeCard, styles.commissionAllTimeCardLarge]}>
                    <View style={styles.commissionCardHeader}>
                      <View style={[styles.commissionIcon, styles.commissionIconTotal]}>
                        <Ionicons name="cash-outline" size={20} color="#a855f7" />
                      </View>
                      <View style={styles.commissionCardContent}>
                        <Text style={styles.commissionCardTitle}>Total Commission (All Time)</Text>
                        <Text 
                          style={styles.commissionCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.commission?.total_all || 0)}
                        </Text>
                        <Text style={styles.commissionCardSubtext}>Payin + Payout fees (unfiltered)</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.commissionAllTimeCard}>
                    <View style={styles.commissionCardHeader}>
                      <View style={[styles.commissionIcon, styles.commissionIconPayin]}>
                        <Ionicons name="arrow-up" size={20} color={Colors.success} />
                      </View>
                      <View style={styles.commissionCardContent}>
                        <Text style={styles.commissionCardTitle}>Total Payin Commission</Text>
                        <Text 
                          style={styles.commissionCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.commission?.total_payin || 0)}
                        </Text>
                        <Text style={styles.commissionCardSubtext}>3.8% of all paid transactions</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.commissionAllTimeCard}>
                    <View style={styles.commissionCardHeader}>
                      <View style={[styles.commissionIcon, styles.commissionIconPayout]}>
                        <Ionicons name="arrow-down" size={20} color={Colors.info} />
                      </View>
                      <View style={styles.commissionCardContent}>
                        <Text style={styles.commissionCardTitle}>Total Payout Commission</Text>
                        <Text 
                          style={styles.commissionCardValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          {formatCurrencyFull(stats.commission?.total_payout || 0)}
                        </Text>
                        <Text style={styles.commissionCardSubtext}>From all payout requests</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Transactions Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Transactions</Text>
                  <Text style={styles.sectionBadge}>
                    {formatNumber(stats.transactions?.total || 0)} Total
                  </Text>
                </View>
                <View style={styles.transactionsGrid}>
                  <TouchableOpacity
                    style={styles.transactionCard}
                onPress={() => router.push('/(superadmin)/transactions')}
              >
                    <Ionicons name="receipt-outline" size={isSmallScreen ? 18 : 20} color={Colors.textLight} />
                    <View style={styles.transactionCardContent}>
                      <Text style={styles.transactionCardTitle}>Total Transactions</Text>
                      <Text 
                        style={styles.transactionCardValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.7}
                      >
                        {formatNumber(stats.transactions?.total || 0)}
                      </Text>
                      <Text style={styles.transactionCardSubtext}>
                        Success Rate: {stats.transactions?.success_rate || 0}%
                      </Text>
                    </View>
              </TouchableOpacity>

                  <View style={styles.transactionCard}>
                    <Ionicons name="checkmark-circle" size={isSmallScreen ? 18 : 20} color={Colors.success} />
                    <View style={styles.transactionCardContent}>
                      <Text style={styles.transactionCardTitle}>Paid</Text>
                      <Text style={styles.transactionCardValue}>
                        {formatNumber(stats.transactions?.paid || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* <View style={styles.transactionCard}>
                    <Ionicons name="time-outline" size={isSmallScreen ? 18 : 20} color={Colors.warning} />
                    <View style={styles.transactionCardContent}>
                      <Text style={styles.transactionCardTitle}>Pending</Text>
                      <Text style={styles.transactionCardValue}>
                        {formatNumber(stats.transactions?.pending || 0)}
                      </Text>
                    </View>
                  </View> */}

                  {/* <View style={styles.transactionCard}>
                    <Ionicons name="close-circle" size={isSmallScreen ? 18 : 20} color={Colors.danger} />
                    <View style={styles.transactionCardContent}>
                      <Text style={styles.transactionCardTitle}>Failed</Text>
                      <Text style={styles.transactionCardValue}>
                        {formatNumber(stats.transactions?.failed || 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.transactionCard}>
                    <Ionicons name="checkmark-circle" size={isSmallScreen ? 18 : 20} color={Colors.textLight} />
                    <View style={styles.transactionCardContent}>
                      <Text style={styles.transactionCardTitle}>Settled</Text>
                      <Text style={styles.transactionCardValue}>
                        {formatNumber(stats.transactions?.settled || 0)}
                      </Text>
                    </View>
                  </View> */}

                  {/* <View style={styles.transactionCard}>
                    <Ionicons name="time-outline" size={isSmallScreen ? 18 : 20} color={Colors.textLight} />
                    <View style={styles.transactionCardContent}>
                      <Text style={styles.transactionCardTitle}>Unsettled</Text>
                      <Text style={styles.transactionCardValue}>
                        {formatNumber(stats.transactions?.unsettled || 0)}
                      </Text>
                    </View>
                  </View> */}
                  </View>
                </View>

              {/* Today's Requests Section - Separate Section */}
              {/* <View style={styles.section}>
                <View style={styles.todayRequestsCard}>
                  <Ionicons name="time-outline" size={isSmallScreen ? 20 : 24} color={Colors.warning} />
                  <View style={styles.todayRequestsContent}>
                    <Text style={styles.todayRequestsTitle}>Today's Requests</Text>
                    <Text style={styles.todayRequestsValue}>
                      {formatNumber(stats.payouts?.today || 0)}
                    </Text>
              </View>
                </View>
              </View> */}

              {/* Payouts Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Payouts</Text>
                  <Text style={styles.sectionBadge}>
                    {formatNumber(stats.payouts?.total_requests || 0)} Requests
                  </Text>
                </View>
                <View style={styles.payoutsGrid}>
              <TouchableOpacity
                    style={styles.payoutCard}
                onPress={() => router.push('/(superadmin)/payouts')}
              >
                    <Ionicons name="cash-outline" size={isSmallScreen ? 18 : 20} color={Colors.textLight} />
                    <View style={styles.payoutCardContent}>
                      <Text style={styles.payoutCardTitle}>Total Requests</Text>
                      <Text style={styles.payoutCardValue}>
                        {formatNumber(stats.payouts?.total_requests || 0)}
                      </Text>
                      <Text style={styles.payoutCardSubtext}>
                        {formatCurrency(stats.payouts?.total_amount_requested || 0)}
                      </Text>
                    </View>
              </TouchableOpacity>

                  <View style={[styles.payoutCard, notificationCount > 0 && styles.payoutCardHighlight]}>
                    <Ionicons name="alert-circle" size={isSmallScreen ? 18 : 20} color={Colors.warning} />
                    <View style={styles.payoutCardContent}>
                      <Text style={styles.payoutCardTitle} numberOfLines={1}>Pending Approval</Text>
                      <Text 
                        style={[styles.payoutCardValue, notificationCount > 0 && styles.payoutCardValueHighlight]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        {formatNumber(stats.payouts?.requested || 0)}
                      </Text>
                      {notificationCount > 0 && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationBadgeText} numberOfLines={1}>
                            {notificationCount} new
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                    </View>
                  </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      </SwipeGestureHandler>

      {/* Date Range Picker Modal */}
      <Modal
        visible={showDateRangePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateRangePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity
                onPress={() => setShowDateRangePicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Start Date</Text>
                <TextInput
                  style={styles.dateInput}
                  value={dateRange.start}
                  onChangeText={(text) => setDateRange(prev => ({ ...prev, start: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textSubtleLight}
                />
              </View>

              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>End Date</Text>
                <TextInput
                  style={styles.dateInput}
                  value={dateRange.end}
                  onChangeText={(text) => setDateRange(prev => ({ ...prev, end: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textSubtleLight}
                />
              </View>

              <View style={styles.modalActions}>
              <TouchableOpacity
                  onPress={handleDateRangeApply}
                  disabled={!dateRange.start || !dateRange.end}
                  style={[styles.modalButton, styles.modalButtonPrimary, (!dateRange.start || !dateRange.end) && styles.modalButtonDisabled]}
                >
                  <Text style={styles.modalButtonText}>Apply Range</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    handleClearDateRange();
                    setShowDateRangePicker(false);
                  }}
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                >
                  <Text style={styles.modalButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>

              <TouchableOpacity
                onPress={() => {
                  handleAllTime();
                  setShowDateRangePicker(false);
                }}
                style={[styles.modalButton, styles.modalButtonAllTime, showAllTime && styles.modalButtonAllTimeActive]}
              >
                <Text style={[styles.modalButtonText, showAllTime && styles.modalButtonTextActive]}>
                  {showAllTime ? 'Today' : 'All Time'}
                </Text>
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
  },
  backgroundGraphic: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    opacity: 0.15,
    zIndex: 0,
    height: '60%',
  },
  xGraphic: {
    width: '100%',
    maxWidth: '100%',
    height: '85%',
    tintColor: Colors.accent,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  contentContainer: {
    paddingBottom: isSmallScreen ? 100 : 120,
  },
  spacer: {
    height: 80,
    minHeight: 80,
  },
  mainCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 18,
    marginHorizontal: isSmallScreen ? 12 : 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: 4,
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: isSmallScreen ? 11 : 12,
    color: Colors.textSubtleLight,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
  },
  refreshSpinning: {
    transform: [{ rotate: '180deg' }],
  },
  dateFilterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isSmallScreen ? 12 : 16,
    gap: isSmallScreen ? 6 : 8,
    minHeight: isSmallScreen ? 40 : 44,
    maxHeight: isSmallScreen ? 44 : 48,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
    flex: 1,
    minHeight: isSmallScreen ? 36 : 40,
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 6,
  },
  dateNavButtonDisabled: {
    opacity: 0.3,
  },
  dateDisplayButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: isSmallScreen ? 6 : 8,
    paddingHorizontal: 12,
    minHeight: isSmallScreen ? 36 : 40,
  },
  dateDisplayText: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '500',
    color: Colors.textLight,
  },
  allTimeButton: {
    paddingVertical: isSmallScreen ? 6 : 8,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: isSmallScreen ? 36 : 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allTimeButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  allTimeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
  },
  allTimeButtonTextActive: {
    color: Colors.bgPrimary,
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
  section: {
    marginBottom: isSmallScreen ? 16 : 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 8 : 10,
    paddingBottom: isSmallScreen ? 8 : 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: Colors.textLight,
    flexShrink: 1,
  },
  sectionValue: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: Colors.success,
    flexShrink: 0,
    maxWidth: isSmallScreen ? 120 : 150,
  },
  sectionBadge: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '500',
    color: Colors.textLight,
    backgroundColor: Colors.bgTertiary,
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSubtleLight,
    marginBottom: 8,
  },
  // Platform Overview Styles
  platformOverviewGrid: {
    flexDirection: 'column',
    gap: isSmallScreen ? 10 : 12,
    marginTop: 6,
    width: '100%',
  },
  platformCard: {
    width: '100%',
    borderRadius: 12,
    padding: isSmallScreen ? 12 : 16,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: isSmallScreen ? 120 : 140,
    position: 'relative',
  },
  payinCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderLeftWidth: 5,
    borderLeftColor: Colors.success,
  },
  platformPayoutCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderLeftWidth: 5,
    borderLeftColor: Colors.info,
  },
  platformCardContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: isSmallScreen ? 10 : 12,
    width: '100%',
  },
  platformCardText: {
    flex: 1,
    minWidth: isSmallScreen ? '100%' : 0,
    flexBasis: isSmallScreen ? '100%' : 'auto',
    justifyContent: 'flex-start',
  },
  platformIcon: {
    width: isSmallScreen ? 44 : 52,
    height: isSmallScreen ? 44 : 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  payinIcon: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  payoutIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  platformCardTitle: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '600',
    color: Colors.textSubtleLight,
    marginBottom: isSmallScreen ? 2 : 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformCardValue: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginTop: isSmallScreen ? 2 : 4,
    marginBottom: 4,
    lineHeight: isSmallScreen ? 24 : 28,
    flexShrink: 1,
  },
  platformCardLoading: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  platformCardValueLoading: {
    opacity: 0.5,
  },
  platformCardSubtext: {
    fontSize: 10,
    color: Colors.textSubtleLight,
    lineHeight: 14,
  },
  // Leaderboard Styles
  leaderboardGrid: {
    flexDirection: 'column',
    gap: isSmallScreen ? 10 : 12,
    width: '100%',
  },
  leaderboardCard: {
    width: '100%',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    maxHeight: isSmallScreen ? 300 : 320,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isSmallScreen ? 6 : 8,
    backgroundColor: Colors.bgSecondary,
    padding: isSmallScreen ? 8 : 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leaderboardTitle: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: Colors.textLight,
    flexShrink: 1,
    flex: 1,
  },
  leaderboardSubtitle: {
    fontSize: isSmallScreen ? 9 : 10,
    color: Colors.textSubtleLight,
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingTop: 4,
  },
  leaderboardLoading: {
    padding: 16,
  },
  leaderboardList: {
    paddingVertical: 2,
    maxHeight: isSmallScreen ? 260 : 280,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isSmallScreen ? 8 : 10,
    paddingVertical: isSmallScreen ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: isSmallScreen ? 50 : 55,
  },
  leaderboardItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: isSmallScreen ? 8 : 12,
    minWidth: 0, // Important for text truncation
  },
  leaderboardRank: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    borderRadius: isSmallScreen ? 14 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  payinRank: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  payoutRank: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  leaderboardRankText: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  leaderboardItemInfo: {
    flex: 1,
    minWidth: 0, // Important for text truncation
  },
  leaderboardItemName: {
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: isSmallScreen ? 1 : 2,
    flexShrink: 1,
    lineHeight: isSmallScreen ? 16 : 18,
  },
  leaderboardItemSubtext: {
    fontSize: isSmallScreen ? 9 : 10,
    color: Colors.textSubtleLight,
    lineHeight: isSmallScreen ? 12 : 14,
  },
  leaderboardItemRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: isSmallScreen ? 8 : 8,
  },
  leaderboardItemValue: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: isSmallScreen ? 1 : 2,
    textAlign: 'right',
    maxWidth: isSmallScreen ? 90 : 110,
    flexShrink: 0,
    lineHeight: isSmallScreen ? 14 : 16,
  },
  // Revenue Styles
  revenueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  revenueCard: {
    flex: 1,
    minWidth: isSmallScreen ? '100%' : '48%',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    padding: isSmallScreen ? 10 : 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: isSmallScreen ? 70 : 75,
    marginBottom: isSmallScreen ? 8 : 0,
  },
  revenueCardLarge: {
    minWidth: '100%',
  },
  revenueCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  revenueCardText: {
    flex: 1,
    minWidth: 0, // Important for text wrapping
  },
  revenueCardTitle: {
    fontSize: 10,
    color: Colors.textSubtleLight,
    marginBottom: 4,
  },
  revenueCardValue: {
    fontSize: isSmallScreen ? 15 : 17,
    fontWeight: '600',
    color: Colors.textLight,
    flexShrink: 1,
  },
  revenueCardSubtext: {
    fontSize: 10,
    color: Colors.textSubtleLight,
    marginTop: 4,
  },
  // Commission Styles
  commissionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  commissionCard: {
    flex: 1,
    minWidth: isSmallScreen ? '100%' : '48%',
    borderRadius: 10,
    padding: isSmallScreen ? 10 : 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: isSmallScreen ? 80 : 85,
    marginBottom: isSmallScreen ? 8 : 0,
  },
  commissionCardPayin: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  commissionCardPayout: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  commissionCardTotal: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#a855f7',
    minWidth: '100%',
  },
  commissionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionIconPayin: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  commissionIconPayout: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  commissionIconTotal: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  commissionCardContent: {
    flex: 1,
    minWidth: 0, // Important for text wrapping
  },
  commissionCardTitle: {
    fontSize: 10,
    color: Colors.textSubtleLight,
    marginBottom: 4,
  },
  commissionCardValue: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textLight,
  },
  commissionCardSubtext: {
    fontSize: 10,
    color: Colors.textSubtleLight,
    marginTop: 4,
  },
  commissionAllTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commissionAllTimeCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#a855f7',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commissionAllTimeCardLarge: {
    minWidth: '100%',
  },
  // Transactions Styles
  transactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallScreen ? 8 : 10,
    marginBottom: isSmallScreen ? 12 : 16,
    width: '100%',
  },
  transactionCard: {
    flex: 1,
    minWidth: isSmallScreen ? '100%' : '48%',
    maxWidth: isSmallScreen ? '100%' : '48%',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    padding: isSmallScreen ? 10 : 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: isSmallScreen ? 80 : 90,
    marginBottom: isSmallScreen ? 8 : 0,
  },
  transactionCardContent: {
    marginTop: isSmallScreen ? 4 : 6,
    flex: 1,
    minWidth: 0, // Important for text wrapping
  },
  transactionCardTitle: {
    fontSize: isSmallScreen ? 9 : 10,
    color: Colors.textSubtleLight,
    marginBottom: isSmallScreen ? 3 : 4,
    lineHeight: isSmallScreen ? 12 : 14,
  },
  transactionCardValue: {
    fontSize: isSmallScreen ? 15 : 17,
    fontWeight: '600',
    color: Colors.textLight,
    lineHeight: isSmallScreen ? 20 : 22,
    flexShrink: 1,
  },
  transactionCardSubtext: {
    fontSize: isSmallScreen ? 9 : 10,
    color: Colors.textSubtleLight,
    marginTop: isSmallScreen ? 3 : 4,
    lineHeight: isSmallScreen ? 12 : 14,
  },
  // Payouts Styles
  payoutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallScreen ? 8 : 10,
    marginBottom: isSmallScreen ? 8 : 12,
    width: '100%',
    alignItems: 'stretch',
  },
  payoutCard: {
    flex: 1,
    minWidth: isSmallScreen ? '100%' : '48%',
    maxWidth: isSmallScreen ? '100%' : '48%',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    padding: isSmallScreen ? 10 : 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: isSmallScreen ? 85 : 95,
    marginBottom: isSmallScreen ? 8 : 0,
    overflow: 'hidden',
  },
  payoutCardHighlight: {
    borderColor: Colors.warning,
    borderWidth: 2,
  },
  payoutCardContent: {
    marginTop: isSmallScreen ? 4 : 6,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  payoutCardTitle: {
    fontSize: isSmallScreen ? 9 : 10,
    color: Colors.textSubtleLight,
    marginBottom: isSmallScreen ? 2 : 3,
    lineHeight: isSmallScreen ? 12 : 14,
    flexShrink: 1,
  },
  payoutCardValue: {
    fontSize: isSmallScreen ? 15 : 17,
    fontWeight: '600',
    color: Colors.textLight,
    lineHeight: isSmallScreen ? 20 : 22,
    flexShrink: 1,
    minWidth: 0,
  },
  payoutCardValueHighlight: {
    color: Colors.warning,
  },
  payoutCardSubtext: {
    fontSize: isSmallScreen ? 9 : 10,
    color: Colors.textSubtleLight,
    marginTop: isSmallScreen ? 3 : 4,
    lineHeight: isSmallScreen ? 12 : 14,
    flexShrink: 1,
  },
  notificationBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.bgPrimary,
  },
  todayRequestsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    padding: isSmallScreen ? 12 : 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: isSmallScreen ? 12 : 16,
    width: '100%',
  },
  todayRequestsContent: {
    flex: 1,
    minWidth: 0,
  },
  todayRequestsTitle: {
    fontSize: isSmallScreen ? 11 : 12,
    color: Colors.textSubtleLight,
    marginBottom: isSmallScreen ? 4 : 6,
    fontWeight: '500',
  },
  todayRequestsValue: {
    fontSize: isSmallScreen ? 22 : 28,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  dateInputGroup: {
    gap: 8,
  },
  dateInputLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  dateInput: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: Colors.accent,
  },
  modalButtonSecondary: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonAllTime: {
    marginTop: 8,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtonAllTimeActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  modalButtonTextActive: {
    color: Colors.bgPrimary,
  },
});

