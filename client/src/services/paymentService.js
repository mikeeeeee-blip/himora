import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';
import authService from './authService';
import apiKeyService from './apiKeyService';

class PaymentService {
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

  // ============ SEARCH APIs ============
  
  // Search Transactions
  async searchTransactions(filters = {}) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams();
      if (filters.merchantId) params.append('merchantId', filters.merchantId);
      if (filters.minAmount) params.append('minAmount', filters.minAmount);
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.description) params.append('description', filters.description);
      if (filters.transactionId) params.append('transactionId', filters.transactionId);
      if (filters.orderId) params.append('orderId', filters.orderId);
      if (filters.customerName) params.append('customerName', filters.customerName);
      if (filters.customerEmail) params.append('customerEmail', filters.customerEmail);
      if (filters.customerPhone) params.append('customerPhone', filters.customerPhone);
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentGateway) params.append('paymentGateway', filters.paymentGateway);
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
      if (filters.search) params.append('search', filters.search); // Global search
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${API_ENDPOINTS.SEARCH_TRANSACTIONS}${params.toString() ? `?${params.toString()}` : ''}`;
console.log(url);

      const response = await axios.get(url, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Search Transactions Error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to search transactions'));
    }
  }

  // Search Payouts
  async searchPayouts(filters = {}) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams();
      if (filters.merchantId) params.append('merchantId', filters.merchantId);
      if (filters.payoutId) params.append('payoutId', filters.payoutId);
      if (filters.minAmount) params.append('minAmount', filters.minAmount);
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.description) params.append('description', filters.description);
      if (filters.beneficiaryName) params.append('beneficiaryName', filters.beneficiaryName);
      if (filters.notes) params.append('notes', filters.notes);
      if (filters.search) params.append('search', filters.search); // Global search
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${API_ENDPOINTS.SEARCH_PAYOUTS}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await axios.get(url, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Search Payouts Error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to search payouts'));
    }
  }

  // ============ SUPERADMIN APIs ============

  // SuperAdmin: Get all payouts
  async getAllPayouts(filters = {}) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.merchantId) params.append('merchantId', filters.merchantId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const url = `${API_ENDPOINTS.ADMIN_PAYOUTS_ALL}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await axios.get(url, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Get all payouts error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch all payouts'));
    }
  }

  // SuperAdmin: Get transaction detail
  async getTransactionDetail(transactionId) {
    try {
      const token = authService.getToken();
      if (!token) throw new Error("No authentication token found");
      
      const url = API_ENDPOINTS.TRANSACTION_DETAIL(transactionId);
      const response = await axios.get(url, {
        headers: {
          "x-auth-token": `${token}`,
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message || "Failed to fetch transaction detail");
    }
  }

  // SuperAdmin: Approve payout
  async approvePayout(payoutId, notes = '') {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        API_ENDPOINTS.ADMIN_PAYOUT_APPROVE(payoutId),
        { notes },
        {
          headers: {
            'x-auth-token': `${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Approve payout error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to approve payout'));
    }
  }

  // SuperAdmin: Reject payout
  async rejectPayout(payoutId, reason) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        API_ENDPOINTS.ADMIN_PAYOUT_REJECT(payoutId),
        { reason },
        {
          headers: {
            'x-auth-token': `${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Reject payout error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to reject payout'));
    }
  }

  // SuperAdmin: Process payout (mark as completed)
  async processPayout(payoutId, utr, notes = '') {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        API_ENDPOINTS.ADMIN_PAYOUT_PROCESS(payoutId),
        { utr, notes },
        {
          headers: {
            'x-auth-token': `${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Process payout error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to process payout'));
    }
  }

  // ============ MERCHANT APIs ============

  // Get API key for authorization
  async getApiKey() {
    try {
      return await apiKeyService.getApiKey();
    } catch (error) {
      throw new Error('API key required for this operation. Please create an API key first.');
    }
  }

  // Get Transactions - requires API key authorization
  async getTransactions(filters = {}) {
    try {
      const apiKeyData = await this.getApiKey();
      const apiKey = apiKeyData.apiKey || apiKeyData.key;
      
      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.payment_gateway) params.append('payment_gateway', filters.payment_gateway);
      if (filters.payment_method) params.append('payment_method', filters.payment_method);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);

      const url = `${API_ENDPOINTS.TRANSACTIONS}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await axios.get(url, {
        headers: {
          'x-api-key': `${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Transactions fetch error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch transactions'));
    }
  }

  // Get Payouts - requires admin authorization (JWT)
  async getPayouts(filters = {}) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const url = `${API_ENDPOINTS.PAYOUTS}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await axios.get(url, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Payouts fetch error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch payouts'));
    }
  }

  // Get Balance - requires JWT authorization
  async getBalance() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(API_ENDPOINTS.BALANCE, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Balance fetch error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch balance'));
    }
  }

  // Create Payment Link - requires API key + body data
  async createPaymentLink(paymentData) {
    try {
      const apiKeyData = await this.getApiKey();
      const apiKey = apiKeyData.apiKey || apiKeyData.key;
      
      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Transform frontend data to match API specification
      const requestBody = {
        amount: paymentData.amount.toString(),
        customer_name: paymentData.customerName,
        customer_email: paymentData.customerEmail,
        customer_phone: paymentData.customerPhone,
        description: paymentData.description || 'Product purchase'
      };

      const response = await axios.post(API_ENDPOINTS.CREATE_LINK, requestBody, {
        headers: {
          'x-api-key': `${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Normalize API response for UI consumption
      const api = response.data || {};
      const normalized = {
        paymentLink: api.payment_url || null,
        linkId: api.payment_link_id || null,
        orderId: api.transaction_id || null,
        transactionId: api.transaction_id || null,
        amount: api.order_amount || paymentData?.amount || null,
        currency: api.order_currency || 'INR',
        status: 'created',
        customerName: paymentData?.customerName || null,
        merchantName: api.merchant_name || null,
        merchantId: api.merchant_id || null,
        referenceId: api.reference_id || null,
        createdAt: new Date().toISOString(),
        qrCode: null, // Not provided in this API
        expiresAt: api.expires_at ? new Date(api.expires_at * 1000).toISOString() : null,
        message: api.message || 'Payment link created successfully',
        success: api.success || false,
        // Preserve raw for any advanced views
        raw: api,
      };

      return normalized;
    } catch (error) {
      console.error('Payment link creation error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to create payment link'));
    }
  }

  // Get Payment Status - requires API key + order ID
  async getPaymentStatus(orderId) {
    try {
      const apiKeyData = await this.getApiKey();
      const apiKey = apiKeyData.apiKey || apiKeyData.key;
      
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const response = await axios.get(API_ENDPOINTS.PAYMENT_STATUS(orderId), {
        headers: {
          'x-api-key': `${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Payment status fetch error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch payment status'));
    }
  }

  // Refund Payment - requires API key + order ID + refund data
  async refundPayment(orderId, refundData) {
    try {
      const apiKeyData = await this.getApiKey();
      const apiKey = apiKeyData.apiKey || apiKeyData.key;
      
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const response = await axios.post(API_ENDPOINTS.REFUND(orderId), refundData, {
        headers: {
          'x-api-key': `${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Refund error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to process refund'));
    }
  }

  // Request Payout - requires admin token + payout data
  async requestPayout(payoutData) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(API_ENDPOINTS.PAYOUT_REQUEST, payoutData, {
        headers: {
          'x-auth-token': `${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Payout request error:', error);
      throw new Error(this.getApiErrorMessage(error, 'Failed to request payout'));
    }
  }
}

export default new PaymentService();
