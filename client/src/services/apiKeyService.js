import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';
import authService from './authService';

class ApiKeyService {
  async createApiKey() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Creating API key at:', API_ENDPOINTS.CREATE_API_KEY);
      console.log('Using token:', token.substring(0, 20) + '...');

      const response = await axios.post(
        API_ENDPOINTS.CREATE_API_KEY,
        {},
        {
          headers: {
            'x-auth-token': `${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('API key creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API key creation error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      } else if (error.response?.status === 403) {
        throw new Error('Forbidden. You do not have permission to create API keys.');
      } else if (error.response?.status === 409) {
        throw new Error('API key already exists. You can only create one API key.');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        throw new Error(error.response?.data?.message || error.message || 'Failed to create API key');
      }
    }
  }

  async getApiKey() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching API key from:', API_ENDPOINTS.GET_API_KEY);
      console.log('Using token:', token.substring(0, 20) + '...');

      const response = await axios.get(API_ENDPOINTS.GET_API_KEY, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('API key response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API key fetch error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please log in again.');
      } else if (error.response?.status === 403) {
        throw new Error('Forbidden. You do not have permission to access API keys.');
      } else if (error.response?.status === 404) {
        throw new Error('API key not found. You may need to create one first.');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch API key');
      }
    }
  }

  async getApiKeys() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // This would be implemented when the backend provides a list endpoint
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      console.error('API keys fetch error:', error);
      throw new Error('Failed to fetch API keys');
    }
  }
}

export default new ApiKeyService();
