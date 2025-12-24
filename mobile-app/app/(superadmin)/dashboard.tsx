import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from '@/services/authService';

interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  totalMerchants: number;
  pendingPayouts: number;
}

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeDashboard = async () => {
      // First verify authentication
      await authService.ensureAuthLoaded();
      const authenticated = await authService.isAuthenticated();
      const token = await authService.getToken();
      
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
      
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD_STATS);
      setStats(response.data || {
        totalTransactions: 0,
        totalRevenue: 0,
        totalMerchants: 0,
        pendingPayouts: 0,
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


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Superadmin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {!authChecked || loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="receipt-outline" size={32} color="#10b981" />
                <Text style={styles.statValue}>{stats?.totalTransactions || 0}</Text>
                <Text style={styles.statLabel}>Total Transactions</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={32} color="#3b82f6" />
                <Text style={styles.statValue}>₹{stats?.totalRevenue?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.statLabel}>Total Revenue</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="people-outline" size={32} color="#f59e0b" />
                <Text style={styles.statValue}>{stats?.totalMerchants || 0}</Text>
                <Text style={styles.statLabel}>Total Merchants</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={32} color="#ef4444" />
                <Text style={styles.statValue}>{stats?.pendingPayouts || 0}</Text>
                <Text style={styles.statLabel}>Pending Payouts</Text>
              </View>
            </View>

            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(superadmin)/transactions')}
              >
                <Ionicons name="receipt-outline" size={24} color="#10b981" />
                <Text style={styles.actionButtonText}>View All Transactions</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(superadmin)/payouts')}
              >
                <Ionicons name="cash-outline" size={24} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Manage Payouts</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(superadmin)/merchants')}
              >
                <Ionicons name="people-outline" size={24} color="#f59e0b" />
                <Text style={styles.actionButtonText}>Manage Merchants</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(superadmin)/settings')}
              >
                <Ionicons name="settings-outline" size={24} color="#8b5cf6" />
                <Text style={styles.actionButtonText}>Payment Gateway Settings</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
});

