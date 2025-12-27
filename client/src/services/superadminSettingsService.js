import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';
import authService from './authService';

class SuperadminSettingsService {
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

  // Get payment gateway settings
  async getPaymentGatewaySettings() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(API_ENDPOINTS.GET_PAYMENT_GATEWAY_SETTINGS, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Get Payment Gateway Settings Error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch payment gateway settings'));
    }
  }

  // Update payment gateway settings
  async updatePaymentGatewaySettings(paymentGateways, roundRobinEnabled, customCounts) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const payload = { 
        payment_gateways: paymentGateways,
        round_robin_enabled: roundRobinEnabled,
        custom_counts: customCounts
      };

      const response = await axios.put(
        API_ENDPOINTS.UPDATE_PAYMENT_GATEWAY_SETTINGS,
        payload,
        {
          headers: {
            'x-auth-token': `${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Update Payment Gateway Settings Error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to update payment gateway settings'));
    }
  }

  // Get settlement settings (now included in payment gateway settings response)
  async getSettlementSettings() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(API_ENDPOINTS.GET_SETTLEMENT_SETTINGS, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Get Settlement Settings Error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch settlement settings'));
    }
  }

  // Update settlement settings
  async updateSettlementSettings(settlement) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const payload = { settlement };

      const response = await axios.put(
        API_ENDPOINTS.UPDATE_SETTLEMENT_SETTINGS,
        payload,
        {
          headers: {
            'x-auth-token': `${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Update Settlement Settings Error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to update settlement settings'));
    }
  }
}

export default new SuperadminSettingsService();

