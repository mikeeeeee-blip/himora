import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiService';
import { API_ENDPOINTS } from '@/constants/api';

interface Merchant {
  _id: string;
  name: string;
  email: string;
  businessName?: string;
  createdAt: string;
}

export default function MerchantsScreen() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.SUPERADMIN_MERCHANTS_COMPREHENSIVE);
      setMerchants(response.data?.merchants || []);
    } catch (error: any) {
      console.error('Error loading merchants:', error);
      Alert.alert('Error', 'Failed to load merchants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMerchants();
  };

  const renderMerchant = ({ item }: { item: Merchant }) => (
    <TouchableOpacity
      style={styles.merchantCard}
      onPress={() => router.push(`/(superadmin)/merchant-detail?id=${item._id}`)}
    >
      <View style={styles.merchantHeader}>
        <View style={styles.merchantIcon}>
          <Ionicons name="person" size={24} color="#10b981" />
        </View>
        <View style={styles.merchantInfo}>
          <Text style={styles.merchantName}>{item.businessName || item.name}</Text>
          <Text style={styles.merchantEmail}>{item.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
      <Text style={styles.merchantDate}>
        Joined: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Merchants</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Text>Loading merchants...</Text>
        </View>
      ) : (
        <FlatList
          data={merchants}
          renderItem={renderMerchant}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No merchants found</Text>
            </View>
          }
        />
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  merchantCard: {
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
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  merchantIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  merchantEmail: {
    fontSize: 14,
    color: '#666',
  },
  merchantDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

