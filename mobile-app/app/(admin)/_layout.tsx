import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthWrapper from '@/components/AuthWrapper';
import { USER_ROLES } from '@/constants/api';

export default function AdminLayout() {
  return (
    <AuthWrapper requiredRole={USER_ROLES.ADMIN}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#001D22' }} edges={['top']}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: '#001D22',
            },
          }}
        >
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="payouts" />
          <Stack.Screen name="payments" />
          <Stack.Screen name="webhooks" />
        </Stack>
      </SafeAreaView>
    </AuthWrapper>
  );
}

