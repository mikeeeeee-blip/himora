import apiClient from './apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from './authService';

class WebhookService {
  getApiErrorMessage(error: any, fallback: string): string {
    const data = error?.response?.data;
    if (typeof data === 'string' && data.trim().length > 0) {
      return data;
    }
    return data?.error || data?.message || error?.message || fallback;
  }

  async getAuthToken() {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('Authentication required. Please login first.');
      }
      return token;
    } catch (error) {
      throw new Error('Authentication required. Please login first.');
    }
  }

  async configureWebhook(webhookData: any) {
    try {
      const token = await this.getAuthToken();
      
      const payload = {
        webhook_url: webhookData.url,
        events: webhookData.events
      };

      const response = await apiClient.post(API_ENDPOINTS.WEBHOOK_CONFIGURE, payload, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to configure webhook'));
    }
  }

  async getAllWebhookConfigs() {
    try {
      const token = await this.getAuthToken();

      const response = await apiClient.get(API_ENDPOINTS.WEBHOOK_ALL_CONFIG, {
        headers: {
          'x-auth-token': token,
        },
      });

      if (response.data?.success !== false) {
        return {
          paymentWebhook: response.data.payment_webhook || null,
          payoutWebhook: response.data.payout_webhook || null
        };
      }
      return { paymentWebhook: null, payoutWebhook: null };
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 500) {
        return { paymentWebhook: null, payoutWebhook: null };
      }
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch webhook configurations'));
    }
  }

  async getWebhookConfig() {
    try {
      const token = await this.getAuthToken();

      const response = await apiClient.get(API_ENDPOINTS.WEBHOOK_CONFIG, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data?.success !== false ? response.data : null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch webhook configuration'));
    }
  }

  async testWebhook() {
    try {
      const token = await this.getAuthToken();

      const response = await apiClient.post(API_ENDPOINTS.WEBHOOK_TEST, {}, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to test webhook'));
    }
  }

  async deleteWebhook() {
    try {
      const token = await this.getAuthToken();

      const response = await apiClient.delete(API_ENDPOINTS.WEBHOOK_DELETE, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to delete webhook configuration'));
    }
  }

  getAvailableEvents() {
    return [
      { id: 'payment.success', label: 'Payment Success', description: 'Payment completed successfully' },
      { id: 'payment.failed', label: 'Payment Failed', description: 'Payment failed' },
      { id: 'payment.pending', label: 'Payment Pending', description: 'Payment is pending' },
      { id: 'payment.cancelled', label: 'Payment Cancelled', description: 'Payment cancelled by user' },
      { id: 'payment.expired', label: 'Payment Expired', description: 'Payment link expired' }
    ];
  }

  async configurePayoutWebhook(data: any) {
    try {
      const token = await this.getAuthToken();
      const payload = { webhook_url: data.url, events: data.events };
      const response = await apiClient.post(API_ENDPOINTS.PAYOUT_WEBHOOK_CONFIGURE, payload, {
        headers: { 'x-auth-token': token },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to configure payout webhook'));
    }
  }

  async updatePayoutWebhook(data: any) {
    try {
      const token = await this.getAuthToken();
      const response = await apiClient.put(API_ENDPOINTS.PAYOUT_WEBHOOK_UPDATE, data, {
        headers: { 'x-auth-token': token },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to update payout webhook'));
    }
  }

  async getPayoutWebhookConfig() {
    try {
      const token = await this.getAuthToken();
      const response = await apiClient.get(API_ENDPOINTS.PAYOUT_WEBHOOK_CONFIG, {
        headers: { 'x-auth-token': token },
      });
      return response.data?.success !== false ? response.data : null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch payout webhook configuration'));
    }
  }

  async testPayoutWebhook() {
    try {
      const token = await this.getAuthToken();
      const response = await apiClient.post(API_ENDPOINTS.PAYOUT_WEBHOOK_TEST, {}, {
        headers: { 'x-auth-token': token },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to test payout webhook'));
    }
  }

  async deletePayoutWebhook() {
    try {
      const token = await this.getAuthToken();
      const response = await apiClient.delete(API_ENDPOINTS.PAYOUT_WEBHOOK_DELETE, {
        headers: { 'x-auth-token': token },
      });
      return response.data;
    } catch (error: any) {
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
}

export default new WebhookService();

