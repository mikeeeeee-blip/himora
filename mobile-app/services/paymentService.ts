import apiClient from './apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from './authService';
import apiKeyService from './apiKeyService';

class PaymentService {
  getApiErrorMessage(error: any, fallback: string): string {
    const data = error?.response?.data;
    if (typeof data === 'string' && data.trim().length > 0) {
      return data;
    }
    return data?.error || data?.message || error?.message || fallback;
  }

  // ============ SEARCH APIs ============
  
  async searchTransactions(filters: any = {}) {
    try {
      const token = await authService.getToken();
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
      if (filters.settlementStatus) params.append('settlementStatus', filters.settlementStatus);
      if (filters.payoutStatus) params.append('payoutStatus', filters.payoutStatus);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${API_ENDPOINTS.SEARCH_TRANSACTIONS}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to search transactions'));
    }
  }

  async searchPayouts(filters: any = {}) {
    try {
      const token = await authService.getToken();
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
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${API_ENDPOINTS.SEARCH_PAYOUTS}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to search payouts'));
    }
  }

  // ============ MERCHANT APIs ============

  async getApiKey() {
    try {
      return await apiKeyService.getApiKey();
    } catch (error) {
      throw new Error('API key required for this operation. Please create an API key first.');
    }
  }

  async getTransactions(filters: any = {}) {
    try {
      const apiKeyData = await this.getApiKey();
      const apiKey = apiKeyData.apiKey || apiKeyData.key;
      
      if (!apiKey) {
        throw new Error('API key not found');
      }

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
      const response = await apiClient.get(url, {
        headers: {
          'x-api-key': `${apiKey}`,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch transactions'));
    }
  }

  async getPayouts(filters: any = {}) {
    try {
      const token = await authService.getToken();
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
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch payouts'));
    }
  }

  async getBalance() {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.BALANCE);
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch balance'));
    }
  }

  async getTransactionDetail(transactionId: string) {
    try {
      const token = await authService.getToken();
      if (!token) throw new Error("No authentication token found");
      
      const url = API_ENDPOINTS.TRANSACTION_DETAIL(transactionId);
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, "Failed to fetch transaction detail"));
    }
  }

  async createPaymentLink(paymentData: any) {
    try {
      const apiKeyData = await this.getApiKey();
      const apiKey = apiKeyData.apiKey || apiKeyData.key;
      
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const requestBody = {
        amount: paymentData.amount.toString(),
        customer_name: paymentData.customerName,
        customer_email: paymentData.customerEmail,
        customer_phone: paymentData.customerPhone,
        description: paymentData.description || 'Product purchase'
      };

      const response = await apiClient.post(API_ENDPOINTS.CREATE_LINK, requestBody, {
        headers: {
          'x-api-key': `${apiKey}`,
        },
      });

      const api = response.data || {};
      return {
        paymentLink: api.payment_url || null,
        linkId: api.payment_link_id || api.order_id || null,
        orderId: api.order_id || api.transaction_id || null,
        transactionId: api.transaction_id || null,
        amount: api.order_amount || paymentData?.amount || null,
        currency: api.order_currency || 'INR',
        status: 'created',
        customerName: paymentData?.customerName || null,
        merchantName: api.merchant_name || null,
        merchantId: api.merchant_id || null,
        referenceId: api.reference_id || null,
        createdAt: new Date().toISOString(),
        qrCode: null,
        expiresAt: api.expires_at ? new Date(api.expires_at * 1000).toISOString() : null,
        message: api.message || 'Payment link created successfully',
        success: api.success || false,
        paytmParams: api.paytm_params || null,
        paytmPaymentUrl: api.payment_url || null,
        easebuzzParams: api.easebuzz_params || null,
        phonepe_deep_link: api.phonepe_deep_link,
        gpay_deep_link: api.gpay_deep_link,
        gpay_intent: api.gpay_intent,
        upi_deep_link: api.upi_deep_link,
        raw: api,
      };
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to create payment link'));
    }
  }

  async requestPayout(payoutData: any) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.post(API_ENDPOINTS.PAYOUT_REQUEST, payoutData);
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to request payout'));
    }
  }

  async cancelPayout(payoutId: string) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.post(API_ENDPOINTS.PAYOUT_CANCEL(payoutId), {});
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to cancel payout'));
    }
  }

  async getPaymentStatus(orderId: string) {
    try {
      const apiKeyData = await this.getApiKey();
      const apiKey = apiKeyData.apiKey || apiKeyData.key;
      
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const response = await apiClient.get(API_ENDPOINTS.PAYMENT_STATUS(orderId), {
        headers: {
          'x-api-key': `${apiKey}`,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(this.getApiErrorMessage(error, 'Failed to fetch payment status'));
    }
  }
}

export default new PaymentService();

