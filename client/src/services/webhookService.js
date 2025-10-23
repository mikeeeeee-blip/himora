import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';
import authService from './authService';

class WebhookService {
  // Safely extract a clear error message from axios error responses
  getApiErrorMessage(error, fallback) {
    const data = error?.response?.data;
    if (typeof data === 'string' && data.trim().length > 0) {
      return data;
    }
    return (
      data?.error ||
      data?.message ||
      error?.message ||
      fallback
    );
  }

  // Get JWT token for authentication
  async getAuthToken() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Authentication required. Please login first.');
      }
      return token;
    } catch (error) {
      throw new Error('Authentication required. Please login first.');
    }
  }

  // Configure webhook
  async configureWebhook(webhookData) {
    try {
      const token = await this.getAuthToken();
      
      const payload = {
        webhook_url: webhookData.url,
        events: webhookData.events
      };

      const response = await axios.post(API_ENDPOINTS.WEBHOOK_CONFIGURE, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Webhook configuration error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to configure webhook'));
    }
  }

  // Get webhook configuration
  async getWebhookConfig() {
    try {
      const token = await this.getAuthToken();

      const response = await axios.get(API_ENDPOINTS.WEBHOOK_CONFIG, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Webhook config fetch error:', error);
      // If no webhook is configured, return null instead of throwing error
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch webhook configuration'));
    }
  }

  // Test webhook
  async testWebhook() {
    try {
      const token = await this.getAuthToken();

      const response = await axios.post(API_ENDPOINTS.WEBHOOK_TEST, {}, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Webhook test error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to test webhook'));
    }
  }

  // Delete webhook configuration
  async deleteWebhook() {
    try {
      const token = await this.getAuthToken();

      const response = await axios.delete(API_ENDPOINTS.WEBHOOK_DELETE, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Webhook deletion error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to delete webhook configuration'));
    }
  }

  // Get available webhook events
  getAvailableEvents() {
    return [
      { id: 'payment.success', label: 'Payment Success', description: 'Payment completed successfully' },
      { id: 'payment.failed', label: 'Payment Failed', description: 'Payment failed' },
      { id: 'payment.pending', label: 'Payment Pending', description: 'Payment is pending' },
      { id: 'payment.cancelled', label: 'Payment Cancelled', description: 'Payment cancelled by user' },
      { id: 'payment.expired', label: 'Payment Expired', description: 'Payment link expired' }
    ];
  }
}

export default new WebhookService();