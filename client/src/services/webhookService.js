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

  // Get all webhook configurations (unified - recommended)
  async getAllWebhookConfigs() {
    try {
      const token = await this.getAuthToken();

      const response = await axios.get(API_ENDPOINTS.WEBHOOK_ALL_CONFIG, {
        headers: {
          'x-auth-token': token,
        },
      });

      console.log('🔍 Service - Raw API response:', response.data);
      console.log('🔍 Service - payment_webhook:', response.data?.payment_webhook);
      console.log('🔍 Service - payout_webhook:', response.data?.payout_webhook);

      // Return the unified response with both payment and payout webhooks
      if (response.data?.success !== false) {
        const result = {
          paymentWebhook: response.data.payment_webhook || null,
          payoutWebhook: response.data.payout_webhook || null
        };
        console.log('🔍 Service - Returning mapped result:', result);
        return result;
      }
      console.log('⚠️ Service - API returned success: false');
      return { paymentWebhook: null, payoutWebhook: null };
    } catch (error) {
      console.error('All webhook configs fetch error:', error);
      // If merchant not found or other errors, return null configs
      if (error.response?.status === 404 || error.response?.status === 500) {
        return { paymentWebhook: null, payoutWebhook: null };
      }
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch webhook configurations'));
    }
  }

  // Get webhook configuration (individual - for backward compatibility)
  async getWebhookConfig() {
    try {
      const token = await this.getAuthToken();

      const response = await axios.get(API_ENDPOINTS.WEBHOOK_CONFIG, {
        headers: {
          'x-auth-token': token,
        },
      });

      // Return the data directly (backend returns webhook_url, webhook_secret, etc.)
      return response.data?.success !== false ? response.data : null;
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

  // Configure payout webhook
  async configurePayoutWebhook(data) {
    try {
      const token = await this.getAuthToken();
      const payload = { webhook_url: data.url, events: data.events };
      const response = await axios.post(API_ENDPOINTS.PAYOUT_WEBHOOK_CONFIGURE, payload, {
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      });
      return response.data;
    } catch (error) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to configure payout webhook'));
    }
  }

  // Update payout webhook
  async updatePayoutWebhook(data) {
    try {
      const token = await this.getAuthToken();
      const response = await axios.put(API_ENDPOINTS.PAYOUT_WEBHOOK_UPDATE, data, {
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      });
      return response.data;
    } catch (error) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to update payout webhook'));
    }
  }

  // Get payout webhook configuration
  async getPayoutWebhookConfig() {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(API_ENDPOINTS.PAYOUT_WEBHOOK_CONFIG, {
        headers: { 'x-auth-token': token },
      });
      // Return the data directly (backend returns webhook_url, webhook_secret, etc.)
      return response.data?.success !== false ? response.data : null;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch payout webhook configuration'));
    }
  }

  // Test payout webhook
  async testPayoutWebhook() {
    try {
      const token = await this.getAuthToken();
      const response = await axios.post(API_ENDPOINTS.PAYOUT_WEBHOOK_TEST, {}, {
        headers: { 'x-auth-token': token },
      });
      return response.data;
    } catch (error) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to test payout webhook'));
    }
  }

  // Delete payout webhook
  async deletePayoutWebhook() {
    try {
      const token = await this.getAuthToken();
      const response = await axios.delete(API_ENDPOINTS.PAYOUT_WEBHOOK_DELETE, {
        headers: { 'x-auth-token': token },
      });
      return response.data;
    } catch (error) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to delete payout webhook configuration'));
    }
  }

  getAvailablePayoutEvents() {
    return [
      { id: 'payout.requested', label: 'Payout Requested', description: 'Merchant requested a payout' },
      { id: 'payout.pending', label: 'Payout Pending', description: 'Payout approved and pending processing' },
      { id: 'payout.completed', label: 'Payout Completed', description: 'Payout processed successfully' },
      { id: 'payout.rejected', label: 'Payout Rejected', description: 'Payout request rejected by admin' },
      { id: 'payout.failed', label: 'Payout Failed', description: 'Payout processing failed' }
    ];
  }

  // ============ CRYPTO WEBHOOK SECRET CONFIGURATION ============
  
  /**
   * Get crypto webhook secret configuration
   */
  async getCryptoWebhookSecret() {
    try {
      const token = await this.getAuthToken();
      const response = await axios.get(API_ENDPOINTS.CRYPTO_WEBHOOK_SECRET, {
        headers: {
          'x-auth-token': token,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to get crypto webhook secret'));
    }
  }

  /**
   * Generate new crypto webhook secret
   */
  async generateCryptoWebhookSecret() {
    try {
      const token = await this.getAuthToken();
      const response = await axios.post(API_ENDPOINTS.CRYPTO_WEBHOOK_SECRET_GENERATE, {}, {
        headers: {
          'x-auth-token': token,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to generate crypto webhook secret'));
    }
  }
}

export default new WebhookService();