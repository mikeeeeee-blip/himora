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
  FiDollarSign,
  FiFilter
} from 'react-icons/fi';
import { HiOutlineChartBar } from 'react-icons/hi2';

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
      paid: { icon: FiCheckCircle, color: '#10b981', bg: 'bg-green-500/20', textColor: 'text-green-400', label: 'PAID' },
      failed: { icon: FiXCircle, color: '#ef4444', bg: 'bg-red-500/20', textColor: 'text-red-400', label: 'FAILED' },
      pending: { icon: FiClock, color: '#f59e0b', bg: 'bg-yellow-500/20', textColor: 'text-yellow-400', label: 'PENDING' },
      created: { icon: FiClock, color: '#3b82f6', bg: 'bg-blue-500/20', textColor: 'text-blue-400', label: 'CREATED' },
      cancelled: { icon: FiXCircle, color: '#64748b', bg: 'bg-gray-500/20', textColor: 'text-gray-400', label: 'CANCELLED' },
      expired: { icon: FiXCircle, color: '#94a3b8', bg: 'bg-gray-500/20', textColor: 'text-gray-400', label: 'EXPIRED' },
      refunded: { icon: FiXCircle, color: '#8b5cf6', bg: 'bg-purple-500/20', textColor: 'text-purple-400', label: 'REFUNDED' },
      partial_refund: { icon: FiXCircle, color: '#a78bfa', bg: 'bg-purple-500/20', textColor: 'text-purple-400', label: 'PARTIAL REFUND' },
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
    <div className="min-h-screen bg-[#001D22]">
      {/* Fixed X Graphic - Background Layer */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{ top: "4rem" }}
      >
        <img
          src="/X.png"
          alt="X graphic"
          className="object-contain hidden sm:block"
          style={{
            filter: "drop-shadow(0 0 40px rgba(94, 234, 212, 0.5))",
            width: "120%",
            height: "85%",
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
        <img
          src="/X.png"
          alt="X graphic"
          className="object-contain sm:hidden"
          style={{
            filter: "drop-shadow(0 0 20px rgba(94, 234, 212, 0.5))",
            width: "100%",
            height: "70%",
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
      </div>

      {/* Scrollable Content Section - Overlays on top */}
      <section className="relative z-10 min-h-screen bg-transparent">
        {/* Spacer to show 70% of image initially */}
        <div className="h-[calc(50vh-4rem)] sm:h-[calc(55vh-4rem)]"></div>

        {/* Cards Section - Scrolls over image */}
        <div className="bg-transparent pt-2 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            {/* Rounded Container with #122D32 background */}
            <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
              {/* Header */}
              <div className="mb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                  {/* Left Section - Title */}
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans'] flex items-center gap-3">
                      <HiOutlineChartBar className="text-accent" />
                      Update All Transactions
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                      Super Admin: View and update the status of all transactions across all merchants
                    </p>
                  </div>

                  {/* Right Section - Refresh Button */}
                  <button
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 sm:px-5 py-2 rounded-full text-sm sm:text-base font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full sm:w-auto whitespace-nowrap"
                  >
                    <FiRefreshCw className={loading ? "animate-spin" : ""} />
                    <span>{loading ? "Loading..." : "Refresh"}</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                      <FiFilter size={14} />
                      Filter by Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
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
                    <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                      <FiUser size={14} />
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
                      className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                      <FiClock size={14} />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                      <FiClock size={14} />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
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
                      className="flex items-center justify-center gap-2 bg-[#001D22] border border-white/10 hover:border-white/20 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200"
                    >
                      <FiX />
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                        <HiOutlineChartBar />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                          Total Transactions
                        </h3>
                        <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                          {pagination.totalCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                        <FiCheckCircle />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                          Paid
                        </h3>
                        <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                          {transactions.filter(t => t.status === 'paid').length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 flex-shrink-0">
                        <FiClock />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                          Pending
                        </h3>
                        <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                          {transactions.filter(t => t.status === 'pending').length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                        <FiXCircle />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                          Failed
                        </h3>
                        <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                          {transactions.filter(t => t.status === 'failed').length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="mb-4 text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  <FiAlertCircle />
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 text-green-400 bg-green-500/20 border border-green-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  <FiCheckCircle />
                  {success}
                </div>
              )}

              {/* Transactions Table */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                  <p className="text-white/80 font-['Albert_Sans']">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <HiOutlineChartBar className="text-6xl text-white/50 mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2 font-['Albert_Sans']">No Transactions Found</h3>
                  <p className="text-white/70 text-sm font-['Albert_Sans']">No transactions match your current filters.</p>
                </div>
              ) : (
                <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#001D22] border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">
                            Transaction ID
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell">
                            Merchant
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden md:table-cell">
                            Created At
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden md:table-cell">
                            Updated At
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-transparent divide-y divide-white/5">
                        {transactions.map((transaction) => {
                          const statusConfig = getStatusConfig(transaction.status);
                          const StatusIcon = statusConfig.icon;
                          const isEditing = editingId === transaction.transactionId;
                          const isUpdating = updatingId === transaction.transactionId;

                          return (
                            <tr key={transaction.transactionId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-white font-['Albert_Sans'] font-mono">
                                  {transaction.transactionId?.slice(-12) || 'N/A'}
                                </div>
                                <div className="text-xs text-white/50 font-['Albert_Sans'] hidden md:block">
                                  {transaction.orderId}
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <div className="text-sm text-white font-['Albert_Sans']">
                                  {transaction.merchantName || (transaction.merchantId?.name) || 'N/A'}
                                </div>
                                {transaction.merchantId && (
                                  <div className="text-xs text-white/50 font-['Albert_Sans']">
                                    ID: {String(transaction.merchantId._id || transaction.merchantId).slice(0, 12)}...
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <div className="text-sm text-white font-['Albert_Sans']">
                                  {transaction.customerName || 'Anonymous'}
                                </div>
                                <div className="text-xs text-white/50 font-['Albert_Sans']">
                                  {transaction.customerEmail || 'No email'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-white font-['Albert_Sans']">
                                  {formatAmount(transaction.amount, transaction.currency)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="px-3 py-2 bg-[#001D22] border border-white/10 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                                  >
                                    {statusOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] ${statusConfig.bg} ${statusConfig.textColor}`}>
                                    <StatusIcon size={14} />
                                    {statusConfig.label}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <div className="text-sm text-white/70 font-['Albert_Sans']">
                                  {formatDate(transaction.createdAt)}
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <div className="text-sm text-white/70 font-['Albert_Sans']">
                                  {formatDate(transaction.updatedAt)}
                                </div>
                                {transaction.updatedAt && transaction.createdAt && 
                                 new Date(transaction.updatedAt).getTime() !== new Date(transaction.createdAt).getTime() && (
                                  <div className="text-xs text-accent mt-1 font-['Albert_Sans']">
                                    Updated
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleUpdate(transaction.transactionId)}
                                      disabled={isUpdating}
                                      className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Save"
                                    >
                                      <FiSave className={isUpdating ? 'animate-spin' : ''} size={16} />
                                    </button>
                                    <button
                                      onClick={handleCancel}
                                      disabled={isUpdating}
                                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Cancel"
                                    >
                                      <FiX size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleEdit(transaction)}
                                    className="p-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors"
                                    title="Edit Status"
                                  >
                                    <FiEdit3 size={16} />
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
                    <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between">
                      <div className="text-sm text-white/70 font-['Albert_Sans']">
                        Showing page {pagination.page} of {pagination.totalPages} 
                        ({pagination.totalCount} total transactions)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="px-4 py-2 bg-[#001D22] border border-white/10 rounded-lg hover:bg-white/10 text-white font-['Albert_Sans'] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page >= pagination.totalPages}
                          className="px-4 py-2 bg-[#001D22] border border-white/10 rounded-lg hover:bg-white/10 text-white font-['Albert_Sans'] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SuperadminUpdateTransactionsPage;

