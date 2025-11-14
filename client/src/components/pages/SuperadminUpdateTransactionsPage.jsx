import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import superadminPaymentService from '../../services/superadminPaymentService';
import { 
  FiRefreshCw, 
  FiCheckCircle, 
  FiXCircle,
  FiClock,
  FiEdit3,
  FiSave,
  FiX,
  FiAlertCircle,
  FiUser,
  FiDollarSign
} from 'react-icons/fi';

const SuperadminUpdateTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');
  // Set default to November 13 of current year
  const getNov13Date = () => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-11-13`;
  };
  const [startDate, setStartDate] = useState(getNov13Date());
  const [endDate, setEndDate] = useState(getNov13Date());
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalCount: 0 });

  const statusOptions = [
    { value: 'created', label: 'Created', color: '#3b82f6' },
    { value: 'pending', label: 'Pending', color: '#f59e0b' },
    { value: 'paid', label: 'Paid', color: '#10b981' },
    { value: 'failed', label: 'Failed', color: '#ef4444' },
    { value: 'cancelled', label: 'Cancelled', color: '#64748b' },
    { value: 'expired', label: 'Expired', color: '#94a3b8' },
    { value: 'refunded', label: 'Refunded', color: '#8b5cf6' },
    { value: 'partial_refund', label: 'Partial Refund', color: '#a78bfa' },
  ];

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, statusFilter, merchantFilter, startDate, endDate]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const filters = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      if (statusFilter) {
        filters.status = statusFilter;
      }
      if (merchantFilter) {
        filters.merchantId = merchantFilter;
      }
      if (startDate) {
        filters.startDate = startDate;
      }
      if (endDate) {
        filters.endDate = endDate;
      }
      const response = await superadminPaymentService.getAdminTransactions(filters);
      setTransactions(response.transactions || []);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          totalCount: response.pagination.totalCount || 0,
          totalPages: response.pagination.totalPages || 1,
          currentPage: response.pagination.currentPage || 1
        }));
      }
    } catch (e) {
      setError(e.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.transactionId);
    setNewStatus(transaction.status);
  };

  const handleCancel = () => {
    setEditingId(null);
    setNewStatus('');
  };

  const handleUpdate = async (transactionId) => {
    if (!newStatus) {
      setError('Please select a status');
      return;
    }

    setUpdatingId(transactionId);
    setError('');
    setSuccess('');

    try {
      await superadminPaymentService.updateTransactionStatus(transactionId, newStatus);
      setSuccess(`Transaction ${transactionId} updated successfully!`);
      setEditingId(null);
      setNewStatus('');
      // Refresh the list
      await fetchTransactions();
    } catch (e) {
      setError(e.message || 'Failed to update transaction status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      paid: { icon: FiCheckCircle, color: '#10b981', bg: '#d1fae5', label: 'PAID' },
      failed: { icon: FiXCircle, color: '#ef4444', bg: '#fee2e2', label: 'FAILED' },
      pending: { icon: FiClock, color: '#f59e0b', bg: '#fef3c7', label: 'PENDING' },
      created: { icon: FiClock, color: '#3b82f6', bg: '#dbeafe', label: 'CREATED' },
      cancelled: { icon: FiXCircle, color: '#64748b', bg: '#f1f5f9', label: 'CANCELLED' },
      expired: { icon: FiXCircle, color: '#94a3b8', bg: '#f8fafc', label: 'EXPIRED' },
      refunded: { icon: FiXCircle, color: '#8b5cf6', bg: '#ede9fe', label: 'REFUNDED' },
      partial_refund: { icon: FiXCircle, color: '#a78bfa', bg: '#f3e8ff', label: 'PARTIAL REFUND' },
    };
    return configs[status?.toLowerCase()] || configs.pending;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Update All Transactions
                </h1>
                <p className="text-gray-600">
                  Super Admin: View and update the status of all transactions across all merchants
                </p>
              </div>
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Merchant ID
                </label>
                <input
                  type="text"
                  value={merchantFilter}
                  onChange={(e) => {
                    setMerchantFilter(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Enter Merchant ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(statusFilter || merchantFilter || startDate || endDate) && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setMerchantFilter('');
                    setStartDate('');
                    setEndDate('');
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Stats */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Transactions</div>
                <div className="text-2xl font-bold text-blue-600">{pagination.totalCount}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Paid</div>
                <div className="text-2xl font-bold text-green-600">
                  {transactions.filter(t => t.status === 'paid').length}
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Pending</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {transactions.filter(t => t.status === 'pending').length}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {transactions.filter(t => t.status === 'failed').length}
                </div>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <FiAlertCircle />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <FiCheckCircle />
              {success}
            </motion.div>
          )}

          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <FiRefreshCw className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <FiAlertCircle className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No transactions found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Merchant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Updated At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => {
                        const statusConfig = getStatusConfig(transaction.status);
                        const StatusIcon = statusConfig.icon;
                        const isEditing = editingId === transaction.transactionId;
                        const isUpdating = updatingId === transaction.transactionId;

                        return (
                          <tr key={transaction.transactionId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {transaction.transactionId}
                              </div>
                              <div className="text-xs text-gray-500">
                                {transaction.orderId}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {transaction.merchantName || (transaction.merchantId?.name) || 'N/A'}
                              </div>
                              {transaction.merchantId && (
                                <div className="text-xs text-gray-500">
                                  ID: {transaction.merchantId._id || transaction.merchantId}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {transaction.customerName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {transaction.customerEmail}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatAmount(transaction.amount, transaction.currency)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <select
                                  value={newStatus}
                                  onChange={(e) => setNewStatus(e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                >
                                  {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: statusConfig.bg,
                                    color: statusConfig.color,
                                  }}
                                >
                                  <StatusIcon />
                                  {statusConfig.label}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {formatDate(transaction.createdAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {formatDate(transaction.updatedAt)}
                              </div>
                              {transaction.updatedAt && transaction.createdAt && 
                               new Date(transaction.updatedAt).getTime() !== new Date(transaction.createdAt).getTime() && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Updated
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdate(transaction.transactionId)}
                                    disabled={isUpdating}
                                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Save"
                                  >
                                    <FiSave className={isUpdating ? 'animate-spin' : ''} />
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    disabled={isUpdating}
                                    className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Cancel"
                                  >
                                    <FiX />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEdit(transaction)}
                                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  title="Edit Status"
                                >
                                  <FiEdit3 />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing page {pagination.page} of {pagination.totalPages} 
                      ({pagination.totalCount} total transactions)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SuperadminUpdateTransactionsPage;

