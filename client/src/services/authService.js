import axios from 'axios';
import { API_ENDPOINTS, USER_ROLES } from '../constants/api';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.role = localStorage.getItem('role');
  }

  async login(email, password) {
    try {
      const response = await axios.post(API_ENDPOINTS.LOGIN, {
        email,
        password,
      });

      const { token, user } = response.data;
      const role = user?.role;
      
      // Normalize role to match our constants
      let normalizedRole = role;
      if (role === 'superAdmin' || role === 'superadmin' || role === 'SUPERADMIN') {
        normalizedRole = USER_ROLES.SUPERADMIN;
      } else if (role === 'admin' || role === 'ADMIN') {
        normalizedRole = USER_ROLES.ADMIN;
      } else {
        // If role doesn't match expected values, log it and try to handle gracefully
        console.warn('Unexpected role received from API:', role);
        // For now, treat any unrecognized role as admin
        normalizedRole = USER_ROLES.ADMIN;
      }
      
      // Store token and role in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('role', normalizedRole);
      
      this.token = token;
      this.role = normalizedRole;

      return { token, role: normalizedRole };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.token = null;
    this.role = null;
  }

  isAuthenticated() {
    return !!this.token;
  }

  getRole() {
    return this.role;
  }

  getToken() {
    return this.token;
  }

  isAdmin() {
    return this.role === USER_ROLES.ADMIN;
  }

  isSuperAdmin() {
    return this.role === USER_ROLES.SUPERADMIN;
  }
}

export default new AuthService();
