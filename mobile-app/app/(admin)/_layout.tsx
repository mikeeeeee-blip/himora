import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthWrapper from '@/components/AuthWrapper';
import { USER_ROLES } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#10b981',
            tabBarInactiveTintColor: '#666',
            tabBarStyle: {
              borderTopWidth: 1,
              borderTopColor: '#e5e5e5',
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
            },
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: 'Transactions',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="receipt-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="payouts"
            options={{
              title: 'Payouts',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="cash-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="payments"
            options={{
              title: 'Payments',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="card-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="webhooks"
            options={{
              title: 'Webhooks',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="link-outline" size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </SafeAreaView>
    </AuthWrapper>
  );
}

