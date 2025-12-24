import apiClient from './apiService';
import { API_ENDPOINTS } from '@/constants/api';
import authService from './authService';

class SuperadminPaymentService {
  handleError(error: any, defaultMessage: string) {
    if (error.response?.status === 401) {
      authService.logout();
      throw new Error('Session expired. Please log in again.');
    } else if (error.response?.status === 403) {
      throw new Error('Forbidden. You do not have permission to perform this action.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response?.data?.error || error.response?.data?.message || 'Invalid request.');
    } else if (error.response?.status === 404) {
      throw new Error('Resource not found.');
    } else {
      throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || defaultMessage);
    }
  }

  async getDashboardStats() {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD_STATS, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data.stats;
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch dashboard statistics');
    }
  }

  async getAllMerchantsData(params: any = {}) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.SUPERADMIN_MERCHANTS_COMPREHENSIVE, {
        headers: {
          'x-auth-token': token,
        },
        params: {
          merchantId: params.merchantId || undefined,
          status: params.status || undefined,
          includeInactive: params.includeInactive === true ? 'true' : undefined,
        },
      });

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch merchants data');
    }
  }

  async deleteUser(userId: string) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.delete(API_ENDPOINTS.SUPERADMIN_DELETE_USER(userId), {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to delete user');
    }
  }

  async changeUserPassword(userId: string, newPassword: string) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const response = await apiClient.put(
        API_ENDPOINTS.SUPERADMIN_CHANGE_PASSWORD(userId),
        { newPassword },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to change user password');
    }
  }

  async blockMerchantFunds(merchantId: string, amount: number, action: 'block' | 'unblock') {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (!action || !['block', 'unblock'].includes(action)) {
        throw new Error('Action must be either "block" or "unblock"');
      }

      const response = await apiClient.put(
        API_ENDPOINTS.SUPERADMIN_BLOCK_FUNDS(merchantId),
        { amount, action },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleError(error, `Failed to ${action} merchant funds`);
    }
  }

  async triggerManualSettlement() {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.MANUAL_SETTLEMENT, {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to trigger manual settlement');
    }
  }

  async getAdminTransactions(filters: any = {}) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.ADMIN_TRANSACTIONS, {
        headers: {
          'x-auth-token': token,
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

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch admin transactions');
    }
  }

  async settleTransaction(transactionId: string) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.put(
        API_ENDPOINTS.ADMIN_SETTLE_TRANSACTION(transactionId),
        {},
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to settle transaction');
    }
  }

  async updateTransactionStatus(transactionId: string, status: string) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.put(
        API_ENDPOINTS.ADMIN_UPDATE_TRANSACTION_STATUS(transactionId),
        { status },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to update transaction status');
    }
  }

  async deleteTransaction(transactionId: string) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.delete(
        API_ENDPOINTS.ADMIN_DELETE_TRANSACTION(transactionId),
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to delete transaction');
    }
  }

  async getAllPayouts(filters: any = {}) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.ADMIN_PAYOUTS, {
        headers: {
          'x-auth-token': token,
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

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch payouts');
    }
  }

  async getPayoutDetails(payoutId: string) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get(API_ENDPOINTS.ADMIN_PAYOUT_DETAILS(payoutId), {
        headers: {
          'x-auth-token': token,
        },
      });

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch payout details');
    }
  }

  async approvePayout(payoutId: string, notes: string = '') {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.post(
        API_ENDPOINTS.ADMIN_PAYOUT_APPROVE(payoutId),
        { notes },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to approve payout');
    }
  }

  async rejectPayout(payoutId: string, reason: string) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!reason || !reason.trim()) {
        throw new Error('Rejection reason is required');
      }

      const response = await apiClient.post(
        API_ENDPOINTS.ADMIN_PAYOUT_REJECT(payoutId),
        { reason },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to reject payout');
    }
  }

  async processPayout(payoutId: string, utr: string, notes: string = '', transactionHash: string | null = null) {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!utr || !utr.trim()) {
        throw new Error('UTR/Transaction reference is required');
      }

      const payload: any = { utr, notes };
      if (transactionHash) {
        payload.transactionHash = transactionHash;
      }

      const response = await apiClient.post(
        API_ENDPOINTS.ADMIN_PAYOUT_PROCESS(payoutId),
        payload,
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to process payout');
    }
  }
}

export default new SuperadminPaymentService();

