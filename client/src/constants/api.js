// constants/api.js

// In Vite, use import.meta.env instead of process.env
// Environment variables must be prefixed with VITE_ to be exposed to the client
export const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || 'https://himora.art/api';

export const API_ENDPOINTS = {
  // ============ AUTH ============
  LOGIN: `${BASE_URL}/auth/login`,
  SIGNUP: `${BASE_URL}/auth/signup`,
  PROFILE: `${BASE_URL}/auth/profile`,
  UPDATE_PROFILE: `${BASE_URL}/auth/profile`,

   
  // ============ API KEYS ============
  CREATE_API_KEY: `${BASE_URL}/create`,
  GET_API_KEY: `${BASE_URL}/get`,
   SEARCH_TRANSACTIONS: `${BASE_URL}/payments/merchant/transactions/search`,
  SEARCH_PAYOUTS: `${BASE_URL}/payments/merchant/payouts/search`,
  // ============ MERCHANT PAYMENT ENDPOINTS (JWT Auth) ============
  TRANSACTIONS: `${BASE_URL}/payments/transactions`,
  TRANSACTION_DETAIL: (transactionId) => `${BASE_URL}/payments/merchant/transactions/${transactionId}`,
  TRANSACTION_REPORT: `${BASE_URL}/payments/merchant/transaction/report`,
  PAYOUT_REPORT: `${BASE_URL}/payments/merchant/payout/report`,
  COMBINED_REPORT: `${BASE_URL}/payments/merchant/report/combined`,
  PAYOUTS: `${BASE_URL}/payments/merchant/payouts`,
  PAYOUT_REQUEST: `${BASE_URL}/payments/merchant/payout/request`,
  PAYOUT_CANCEL: (payoutId) => `${BASE_URL}/payments/merchant/payout/${payoutId}/cancel`,
  PAYOUT_STATUS: (payoutId) => `${BASE_URL}/payments/merchant/payout/${payoutId}/status`,
  BALANCE: `${BASE_URL}/payments/merchant/balance`,
  
  // ============ PAYMENT LINK CREATION (API Key Auth) ============
  CREATE_LINK: `${BASE_URL}/payments/create-payment-link`, // Unified endpoint (uses enabled gateway)
  CREATE_LINK_PAYTM: `${BASE_URL}/paytm/create-payment-link`,
  CREATE_LINK_EASEBUZZ: `${BASE_URL}/easebuzz/create-payment-link`,
  CREATE_LINK_RAZORPAY: `${BASE_URL}/razorpay/create-payment-link`,
  CREATE_LINK_SUBPAISA: `${BASE_URL}/sabpaisa/create-payment-link`, // SubPaisa specific endpoint
  AVAILABLE_GATEWAYS: `${BASE_URL}/payments/available-gateways`,
  VERIFY_PAYMENT: `${BASE_URL}/paytm/verify-payment`,
  
  // ============ PAYMENT STATUS (API Key Auth) ============
  PAYMENT_STATUS: (orderId) => `${BASE_URL}/payments/status/${orderId}`,
  PAYMENT_TRANSACTIONS: `${BASE_URL}/payments/transactions`, // API Key auth
  
  // ============ REFUND (Not implemented yet) ============
  REFUND: (orderId) => `${BASE_URL}/payments/refund/${orderId}`,
    MANUAL_SETTLEMENT: `${BASE_URL}/superadmin/manual-settlement`,

  // ============ WEBHOOK CONFIGURATION ============
  // Unified endpoint to get all webhook configs (recommended)
  WEBHOOK_ALL_CONFIG: `${BASE_URL}/payments/merchant/webhook/all/config`,
  // Individual endpoints
  WEBHOOK_CONFIGURE: `${BASE_URL}/payments/merchant/webhook/configure`,
  WEBHOOK_CONFIG: `${BASE_URL}/payments/merchant/webhook/config`,
  WEBHOOK_TEST: `${BASE_URL}/payments/merchant/webhook/test`,
  WEBHOOK_DELETE: `${BASE_URL}/payments/merchant/webhook`,
  
  // ============ PAYOUT WEBHOOK CONFIGURATION ============
  PAYOUT_WEBHOOK_CONFIGURE: `${BASE_URL}/payments/merchant/webhook/payout/configure`,
  PAYOUT_WEBHOOK_UPDATE: `${BASE_URL}/payments/merchant/webhook/payout`,
  PAYOUT_WEBHOOK_CONFIG: `${BASE_URL}/payments/merchant/webhook/payout/config`,
  PAYOUT_WEBHOOK_TEST: `${BASE_URL}/payments/merchant/webhook/payout/test`,
  PAYOUT_WEBHOOK_DELETE: `${BASE_URL}/payments/merchant/webhook/payout`,
  
  // ============ SUPERADMIN - DASHBOARD ============
  DASHBOARD_STATS: `${BASE_URL}/superadmin/dashboard/stats`,
  // ============ SUPERADMIN - SETTINGS ============
  GET_PAYMENT_GATEWAY_SETTINGS: `${BASE_URL}/superadmin/settings/payment-gateways`,
  UPDATE_PAYMENT_GATEWAY_SETTINGS: `${BASE_URL}/superadmin/settings/payment-gateways`,
  GET_SETTLEMENT_SETTINGS: `${BASE_URL}/superadmin/settings/settlement`,
  UPDATE_SETTLEMENT_SETTINGS: `${BASE_URL}/superadmin/settings/settlement`,
  // ============ SUPERADMIN - MERCHANTS ============
  SUPERADMIN_MERCHANTS_COMPREHENSIVE: `${BASE_URL}/superadmin/merchants/comprehensive`,
  
  // ============ SUPERADMIN - USER MANAGEMENT ============
  SUPERADMIN_DELETE_USER: (userId) => `${BASE_URL}/superadmin/users/${userId}`,
  SUPERADMIN_CHANGE_PASSWORD: (userId) => `${BASE_URL}/superadmin/users/${userId}/password`,
  SUPERADMIN_BLOCK_FUNDS: (merchantId) => `${BASE_URL}/superadmin/merchants/${merchantId}/block-funds`,
  
  // ============ SUPERADMIN - SUB-SUPERADMIN MANAGEMENT ============
  CREATE_SUB_SUPERADMIN: `${BASE_URL}/superadmin/sub-superadmins`,
  GET_ALL_SUB_SUPERADMINS: `${BASE_URL}/superadmin/sub-superadmins`,
  GET_SUB_SUPERADMIN: (subSuperAdminId) => `${BASE_URL}/superadmin/sub-superadmins/${subSuperAdminId}`,
  UPDATE_SUB_SUPERADMIN: (subSuperAdminId) => `${BASE_URL}/superadmin/sub-superadmins/${subSuperAdminId}`,
  DELETE_SUB_SUPERADMIN: (subSuperAdminId) => `${BASE_URL}/superadmin/sub-superadmins/${subSuperAdminId}`,
  CHANGE_SUB_SUPERADMIN_PASSWORD: (subSuperAdminId) => `${BASE_URL}/superadmin/sub-superadmins/${subSuperAdminId}/password`,
  
  // ============ SUPERADMIN - PAYOUTS ============
  ADMIN_PAYOUTS: `${BASE_URL}/payments/admin/payouts/all`,
  ADMIN_PAYOUT_APPROVE: (payoutId) => `${BASE_URL}/payments/admin/payout/${payoutId}/approve`,
  ADMIN_PAYOUT_REJECT: (payoutId) => `${BASE_URL}/payments/admin/payout/${payoutId}/reject`,
  ADMIN_PAYOUT_PROCESS: (payoutId) => `${BASE_URL}/payments/admin/payout/${payoutId}/process`,
  ADMIN_PAYOUT_DETAILS: (payoutId) => `${BASE_URL}/payments/admin/payout/${payoutId}/details`,
  
  // ============ SUPERADMIN - TRANSACTIONS ============
  ADMIN_TRANSACTIONS: `${BASE_URL}/payments/admin/transactions`,
  ADMIN_SETTLE_TRANSACTION: (transactionId) => `${BASE_URL}/payments/admin/transactions/${transactionId}/settle`,
  ADMIN_UPDATE_TRANSACTION_STATUS: (transactionId) => `${BASE_URL}/payments/admin/transactions/${transactionId}/status`,
  ADMIN_DELETE_TRANSACTION: (transactionId) => `${BASE_URL}/payments/admin/transactions/${transactionId}`,
  
  // ============ PAYTM WEBHOOK (No Auth) ============
  PAYTM_WEBHOOK: `${BASE_URL}/paytm/webhook`,
  // ============ EASEBUZZ WEBHOOK (No Auth) ============
  EASEBUZZ_WEBHOOK: `${BASE_URL}/easebuzz/webhook`,
  // ============ RAZORPAY WEBHOOK (No Auth) - Kept for backward compatibility ============
  RAZORPAY_WEBHOOK: `${BASE_URL}/razorpay/webhook`,
};

export const USER_ROLES = {
  ADMIN: 'admin',
  SUPERADMIN: 'superAdmin',
  SUB_SUPERADMIN: 'subSuperAdmin',
};
