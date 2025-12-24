import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import authService from '../services/authService';
import { USER_ROLES } from '../constants/api';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const authenticated = await authService.isAuthenticated();
        if (authenticated) {
          const role = await authService.getRole();
          if (role === USER_ROLES.SUPERADMIN) {
            router.replace('/(superadmin)/dashboard');
          } else if (role === USER_ROLES.ADMIN) {
            router.replace('/(admin)/dashboard');
          } else {
            router.replace('/login');
          }
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/login');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return null;
}

