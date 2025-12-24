// services/subSuperAdminService.js

import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';
import authService from './authService';

class SubSuperAdminService {
  
  // ============ CREATE SUB-SUPERADMIN ============
  async createSubSuperAdmin(data) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { name, email, password, accessControls } = data;

      if (!name || !email || !password) {
        throw new Error('Name, email, and password are required');
      }

      const response = await axios.post(
        API_ENDPOINTS.CREATE_SUB_SUPERADMIN,
        { name, email, password, accessControls },
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to create sub-superadmin');
    }
  }

  // ============ GET ALL SUB-SUPERADMINS ============
  async getAllSubSuperAdmins() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(API_ENDPOINTS.GET_ALL_SUB_SUPERADMINS, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to fetch sub-superadmins');
    }
  }

  // ============ GET SUB-SUPERADMIN BY ID ============
  async getSubSuperAdminById(subSuperAdminId) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(
        API_ENDPOINTS.GET_SUB_SUPERADMIN(subSuperAdminId),
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to fetch sub-superadmin');
    }
  }

  // ============ UPDATE SUB-SUPERADMIN ============
  async updateSubSuperAdmin(subSuperAdminId, data) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.put(
        API_ENDPOINTS.UPDATE_SUB_SUPERADMIN(subSuperAdminId),
        data,
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to update sub-superadmin');
    }
  }

  // ============ DELETE SUB-SUPERADMIN ============
  async deleteSubSuperAdmin(subSuperAdminId) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.delete(
        API_ENDPOINTS.DELETE_SUB_SUPERADMIN(subSuperAdminId),
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to delete sub-superadmin');
    }
  }

  // ============ CHANGE SUB-SUPERADMIN PASSWORD ============
  async changeSubSuperAdminPassword(subSuperAdminId, newPassword) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const response = await axios.put(
        API_ENDPOINTS.CHANGE_SUB_SUPERADMIN_PASSWORD(subSuperAdminId),
        { newPassword },
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to change password');
    }
  }

  // ============ ERROR HANDLER ============
  handleError(error, defaultMessage) {
    console.error('Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      authService.logout();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    } else if (error.response?.status === 403) {
      throw new Error('Forbidden. You do not have permission to perform this action.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Invalid request.');
    } else if (error.response?.status === 404) {
      throw new Error('Resource not found.');
    } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      throw new Error('Network error. Please check your connection and try again.');
    } else {
      throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || defaultMessage);
    }
  }
}

export default new SubSuperAdminService();

