// services/superadminPaymentService.js

import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';
import authService from './authService';

class SuperadminPaymentService {
  
  // ============ DASHBOARD STATS ============
  async getDashboardStats() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching dashboard stats from:', API_ENDPOINTS.DASHBOARD_STATS);

      const response = await axios.get(API_ENDPOINTS.DASHBOARD_STATS, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
        },
      });

      console.log('Dashboard stats response:', response.data);
      return response.data.stats;
    } catch (error) {
      console.error('Dashboard stats error:', error);
      this.handleError(error, 'Failed to fetch dashboard statistics');
    }
  }
// ============ MANUAL SETTLEMENT ============
async triggerManualSettlement() {
  try {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('Triggering manual settlement:', API_ENDPOINTS.MANUAL_SETTLEMENT);

    const response = await axios.get(
      API_ENDPOINTS.MANUAL_SETTLEMENT,
      {},
      {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Manual settlement response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Manual settlement error:', error);
    this.handleError(error, 'Failed to trigger manual settlement');
  }
}

  // ============ TRANSACTIONS ============
  async getAdminTransactions(filters = {}) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching admin transactions from:', API_ENDPOINTS.ADMIN_TRANSACTIONS);

      const response = await axios.get(API_ENDPOINTS.ADMIN_TRANSACTIONS, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
        },
        params: {
          page: filters.page || 1,
          limit: filters.limit || 50,
          merchantId: filters.merchantId || undefined,
          status: filters.status || undefined,
          settlementStatus: filters.settlementStatus || undefined,
          payoutStatus: filters.payoutStatus || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          minAmount: filters.minAmount || undefined,
          maxAmount: filters.maxAmount || undefined,
          search: filters.search || undefined,
          sortBy: filters.sortBy || 'createdAt',
          sortOrder: filters.sortOrder || 'desc'
        }
      });

      console.log('Admin transactions response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Admin transactions error:', error);
      this.handleError(error, 'Failed to fetch admin transactions');
    }
  }

  // ============ PAYOUTS ============
  async getAllPayouts(filters = {}) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching all payouts from:', API_ENDPOINTS.ADMIN_PAYOUTS);

      const response = await axios.get(API_ENDPOINTS.ADMIN_PAYOUTS, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
        },
        params: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          status: filters.status || undefined,
          merchantId: filters.merchantId || undefined,
          isAutoPayout: filters.isAutoPayout || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          sortBy: filters.sortBy || 'createdAt',
          sortOrder: filters.sortOrder || 'desc'
        }
      });

      console.log('All payouts response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get all payouts error:', error);
      this.handleError(error, 'Failed to fetch payouts');
    }
  }

  async getPayoutDetails(payoutId) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching payout details for:', payoutId);

      // ✅ FIXED: Use the correct endpoint
      const response = await axios.get(API_ENDPOINTS.ADMIN_PAYOUT_DETAILS(payoutId), {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
        },
      });

      console.log('Payout details response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get payout details error:', error);
      this.handleError(error, 'Failed to fetch payout details');
    }
  }

  async approvePayout(payoutId, notes = '') {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Approving payout:', payoutId);

      const response = await axios.post(
        API_ENDPOINTS.ADMIN_PAYOUT_APPROVE(payoutId),
        { notes },
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Approve payout response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Approve payout error:', error);
      this.handleError(error, 'Failed to approve payout');
    }
  }

  async rejectPayout(payoutId, reason) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!reason || !reason.trim()) {
        throw new Error('Rejection reason is required');
      }

      console.log('Rejecting payout:', payoutId);

      const response = await axios.post(
        API_ENDPOINTS.ADMIN_PAYOUT_REJECT(payoutId),
        { reason },
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Reject payout response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Reject payout error:', error);
      this.handleError(error, 'Failed to reject payout');
    }
  }

  async processPayout(payoutId, utr, notes = '') {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!utr || !utr.trim()) {
        throw new Error('UTR/Transaction reference is required');
      }

      console.log('Processing payout:', payoutId);

      const response = await axios.post(
        API_ENDPOINTS.ADMIN_PAYOUT_PROCESS(payoutId),
        { utr, notes },
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Process payout response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Process payout error:', error);
      this.handleError(error, 'Failed to process payout');
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
      // Auto logout on unauthorized
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

export default new SuperadminPaymentService();
