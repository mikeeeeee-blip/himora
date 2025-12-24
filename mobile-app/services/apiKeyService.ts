import apiClient from './apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from './authService';

class ApiKeyService {
  async createApiKey() {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.post(
        API_ENDPOINTS.CREATE_API_KEY,
        {},
        {
          headers: {
            'x-auth-token': `${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      } else if (error.response?.status === 403) {
        throw new Error('Forbidden. You do not have permission to create API keys.');
      } else if (error.response?.status === 409) {
        throw new Error('API key already exists. You can only create one API key.');
      } else {
        throw new Error(error.response?.data?.message || error.message || 'Failed to create API key');
      }
    }
  }

  async getApiKey() {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.GET_API_KEY, {
        headers: {
          'x-auth-token': `${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      } else if (error.response?.status === 403) {
        throw new Error('Forbidden. You do not have permission to access API keys.');
      } else if (error.response?.status === 404) {
        throw new Error('API key not found. You may need to create one first.');
      } else {
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch API key');
      }
    }
  }
}

export default new ApiKeyService();

