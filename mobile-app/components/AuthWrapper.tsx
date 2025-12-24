import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import authService from '../services/authService';
import { USER_ROLES } from '../constants/api';

interface AuthWrapperProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function AuthWrapper({ children, requiredRole }: AuthWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Ensure auth is loaded first
      await authService.ensureAuthLoaded();
      
      const authenticated = await authService.isAuthenticated();
      const token = await authService.getToken();
      
      if (!authenticated || !token) {
        console.log('AuthWrapper: Not authenticated or no token, redirecting to login');
        await authService.logout();
        router.replace('/login');
        return;
      }

      if (requiredRole) {
        const userRole = await authService.getRole();
        if (userRole !== requiredRole) {
          console.log('AuthWrapper: Role mismatch, redirecting');
          // Redirect based on actual role
          if (userRole === USER_ROLES.SUPERADMIN) {
            router.replace('/(superadmin)/dashboard');
          } else if (userRole === USER_ROLES.ADMIN) {
            router.replace('/(admin)/dashboard');
          } else {
            router.replace('/login');
          }
          return;
        }
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error('Auth check error:', error);
      await authService.logout();
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

