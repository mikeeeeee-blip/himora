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
  async updatePaymentGatewaySettings(paymentGateways, timeBasedRotation = null) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const payload = { payment_gateways: paymentGateways };
      
      // Include time-based rotation settings if provided
      if (timeBasedRotation !== null) {
        payload.time_based_rotation = {
          enabled: timeBasedRotation.enabled || false,
          gateway_intervals: timeBasedRotation.gatewayIntervals || {
            paytm: 10,
            easebuzz: 5,
            razorpay: 10,
            phonepe: 10,
            sabpaisa: 10,
            cashfree: 10
          }
        };
      }

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
}

export default new SuperadminSettingsService();

