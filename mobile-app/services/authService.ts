import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_ENDPOINTS, USER_ROLES } from '../constants/api';

// Create a separate axios instance for login (no auth token needed)
const loginClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

class AuthService {
  private token: string | null = null;
  private role: string | null = null;
  private authLoaded: boolean = false;

  constructor() {
    // Load auth synchronously on initialization
    this.loadStoredAuth();
  }

  private async loadStoredAuth() {
    try {
      const [token, role] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('role'),
      ]);
      this.token = token;
      this.role = role;
      this.authLoaded = true;
      if (token) {
        console.log('Auth loaded:', { hasToken: true, role, tokenLength: token.length });
      } else {
        console.log('Auth loaded: No token found');
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      this.authLoaded = true;
    }
  }

  // Method to ensure auth is loaded before use
  async ensureAuthLoaded(): Promise<void> {
    if (!this.authLoaded) {
      await this.loadStoredAuth();
    }
  }

  async login(email: string, password: string) {
    try {
      // Validate input
      if (!email || !email.trim()) {
        throw new Error('Email is required');
      }
      if (!password || !password.trim()) {
        throw new Error('Password is required');
      }

      console.log('Attempting login to:', API_ENDPOINTS.LOGIN);
      console.log('Request body:', { email: email.trim(), password: '***' });

      // Use direct axios for login (no auth token needed)
      const response = await loginClient.post(
        API_ENDPOINTS.LOGIN,
        {
          email: email.trim(),
          password: password.trim(),
        }
      );

      console.log('Login response status:', response.status);
      console.log('Login response data keys:', Object.keys(response.data || {}));

      // Check if response has success field
      if (response.data?.success === false) {
        throw new Error(response.data?.error || response.data?.message || 'Login failed');
      }

      const { token, user } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Trim token to remove any whitespace
      const trimmedToken = token.trim();

      if (!user) {
        throw new Error('No user data received from server');
      }

      const role = user?.role;
      const userId = user?.id || user?._id;
      
      // Normalize role to match our constants
      let normalizedRole = role;
      if (role === 'superAdmin' || role === 'superadmin' || role === 'SUPERADMIN') {
        normalizedRole = USER_ROLES.SUPERADMIN;
      } else if (role === 'admin' || role === 'ADMIN') {
        normalizedRole = USER_ROLES.ADMIN;
      } else {
        console.warn('Unexpected role received from API:', role);
        normalizedRole = USER_ROLES.ADMIN;
      }
      
      // Store token, role, and userId in AsyncStorage (use trimmed token)
      await AsyncStorage.setItem('token', trimmedToken);
      await AsyncStorage.setItem('role', normalizedRole);
      if (userId) {
        await AsyncStorage.setItem('userId', userId);
      }
      if (user.businessName) {
        await AsyncStorage.setItem('businessName', user.businessName);
      }
      
      // Update in-memory state immediately (before AsyncStorage completes)
      this.token = trimmedToken;
      this.role = normalizedRole;
      this.authLoaded = true; // Mark as loaded so ensureAuthLoaded doesn't reload

      console.log('Login successful, role:', normalizedRole, 'userId:', userId);
      console.log('Token stored, length:', trimmedToken.length);
      console.log('Token preview:', trimmedToken.substring(0, 20) + '...');
      return { token: trimmedToken, role: normalizedRole, userId };
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });

      // Extract error message from response
      let errorMessage = 'Login failed';
      if (error.response?.data) {
        errorMessage = error.response.data.error || 
                      error.response.data.message || 
                      error.response.data.errorMsg ||
                      errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  }

  async logout() {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('role');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('businessName');
      this.token = null;
      this.role = null;
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async getUserId(): Promise<string | null> {
    await this.ensureAuthLoaded();
    try {
      return await AsyncStorage.getItem('userId');
    } catch (error) {
      console.error('Error getting userId:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    await this.ensureAuthLoaded();
    return !!this.token;
  }

  async getRole(): Promise<string | null> {
    await this.ensureAuthLoaded();
    return this.role;
  }

  async getToken(): Promise<string | null> {
    await this.ensureAuthLoaded();
    return this.token;
  }

  isAdmin(): boolean {
    return this.role === USER_ROLES.ADMIN;
  }

  isSuperAdmin(): boolean {
    return this.role === USER_ROLES.SUPERADMIN;
  }
}

export default new AuthService();

