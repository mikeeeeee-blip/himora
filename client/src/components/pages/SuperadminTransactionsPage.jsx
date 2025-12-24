import React, { useState, useEffect } from 'react';
import { 
  FiRefreshCw,
  FiFilter,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertCircle,
  FiDownload,
  FiEye,
  FiDollarSign,
  FiTrendingUp,
  FiCopy,
  FiSearch,
  FiCalendar,
  FiShield,
  FiCheck,
  FiEdit3,
  FiSave
} from 'react-icons/fi';
import { HiOutlineChartBar } from 'react-icons/hi2';
import { RiShieldCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import superadminPaymentService from '../../services/superadminPaymentService';
import ExportCSV from '../ExportCSV';
import Toast from '../ui/Toast';
import './PageLayout.css';
import './SuperadminTransactionsPage.css';

const SuperadminTransactionsPage = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showFilters, setShowFilters] = useState(false);
  const [settlingTransactionId, setSettlingTransactionId] = useState(null);
  const [transactionIdSearch, setTransactionIdSearch] = useState('');
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1
  });
  const [editingId, setEditingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    merchantId: '',
    status: '',
    settlementStatus: '',
    payoutStatus: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    // Update filters.search when transactionIdSearch changes
    setFilters(prev => ({ ...prev, search: transactionIdSearch, page: 1 }));
  }, [transactionIdSearch]);

  useEffect(() => {
    fetchTransactions();
  }, [filters.page, filters.limit, filters.sortBy, filters.sortOrder, filters.search]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await superadminPaymentService.getAdminTransactions(filters);
      console.log('Transactions data:', data);
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
      if (data.pagination) {
        setPagination({
          totalCount: data.pagination.totalCount || 0,
          totalPages: data.pagination.totalPages || 1,
          currentPage: data.pagination.currentPage || 1
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
    // Sync transactionIdSearch when search field changes in filters panel
    if (field === 'search') {
      setTransactionIdSearch(value);
    }
  };

  const handleApplyFilters = () => {
    fetchTransactions();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTransactionIdSearch('');
    setFilters({
      page: 1,
      limit: 50,
      merchantId: '',
      status: '',
      settlementStatus: '',
      payoutStatus: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    fetchTransactions();
  };

  const handleSettleTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to manually settle this transaction?')) {
      return;
    }

    setSettlingTransactionId(transactionId);
    try {
      const result = await superadminPaymentService.settleTransaction(transactionId);
      setToast({ message: 'Transaction settled successfully!', type: 'success' });
      
      // Update the transaction in the list
      setTransactions(prev => 
        prev.map(txn => 
          txn.transactionId === transactionId || txn._id === transactionId
            ? { ...txn, settlementStatus: 'settled', settlementDate: new Date().toISOString() }
            : txn
        )
      );

      // Refresh the list to get updated summary
      fetchTransactions();
    } catch (error) {
      setToast({ message: error.message || 'Failed to settle transaction', type: 'error' });
      setError(error.message || 'Failed to settle transaction');
    } finally {
      setSettlingTransactionId(null);
    }
  };

  const handleEdit = (transaction, e) => {
    e.stopPropagation(); // Prevent row click when clicking edit button
    setEditingId(transaction.transactionId);
    setNewStatus(transaction.status);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewStatus('');
  };

  const handleRowClick = (transaction) => {
    navigate(`/admin/transactions/${transaction.transactionId}`);
  };

  const handleUpdate = async (transactionId) => {
    if (!newStatus) {
      setToast({ message: 'Please select a status', type: 'error' });
      return;
    }

    setUpdatingId(transactionId);
    setError('');
    setToast({ message: '', type: 'success' });

    try {
      // Note: Currently only status can be updated via API
      // GST and commission are calculated automatically by the backend
      await superadminPaymentService.updateTransactionStatus(transactionId, newStatus);
      setToast({ message: `Transaction ${transactionId} updated successfully!`, type: 'success' });
      setEditingId(null);
      setNewStatus('');
      setEditGst('');
      setEditCommission('');
      await fetchTransactions();
    } catch (e) {
      setToast({ message: e.message || 'Failed to update transaction status', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };


  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
      case 'success':
        return <FiCheckCircle size={16} />;
      case 'failed':
        return <FiXCircle size={16} />;
      case 'pending':
      case 'created':
        return <FiClock size={16} />;
      default:
        return <FiAlertCircle size={16} />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
      case 'success':
        return 'status-paid';
      case 'failed':
        return 'status-failed';
      case 'pending':
      case 'created':
        return 'status-created';
      default:
        return 'status-default';
    }
  };

  const getSettlementBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'settled':
        return 'settlement-settled';
      case 'unsettled':
        return 'settlement-unsettled';
      default:
        return 'settlement-default';
    }
  };

  const formatForExport = () => {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions.map(txn => ({
      'Transaction ID': txn.transactionId || 'N/A',
      'Order ID': txn.orderId || 'N/A',
      'Merchant Name': txn.merchantName || 'N/A',
      'Customer Name': txn.customerName || 'N/A',
      'Customer Email': txn.customerEmail || 'N/A',
      'Amount': txn.amount ? `₹${txn.amount}` : 'N/A',
      'Status': txn.status || 'N/A',
      'Settlement Status': txn.settlementStatus || 'N/A',
      'Payment Method': txn.paymentMethod || 'N/A',
      'Created At': formatDate(txn.createdAt),
      'Paid At': formatDate(txn.paidAt),
      'Settlement Date': formatDate(txn.settlementDate)
    }));
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
                      Transaction Monitor
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                      Complete overview of all platform transactions
                    </p>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    <button 
                      onClick={() => setShowFilters(!showFilters)} 
                      className={`flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 ${showFilters ? 'bg-accent/20 border-accent' : ''}`}
                    >
                      <FiFilter />
                      <span>Filters</span>
                    </button>
                    <button 
                      onClick={fetchTransactions} 
                      disabled={loading} 
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                      <span>{loading ? 'Loading...' : 'Refresh'}</span>
                    </button>
                    {transactions.length > 0 && (
                      <ExportCSV 
                        data={formatForExport()} 
                        filename={`transactions_${new Date().toISOString().split('T')[0]}.csv`}
                        className="flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
        {summary && (
                <div className="mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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
                              {summary.total_transactions || 0}
                            </div>
                            <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                              {formatCurrency(summary.total_revenue)}
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
                              Successful
                            </h3>
                            <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                              {summary.successful_transactions || 0}
                            </div>
                            <div className="text-xs text-green-400 mt-1 font-['Albert_Sans']">
                              {summary.success_rate}% success rate
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
                              {summary.pending_transactions || 0}
                            </div>
                            <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                              Awaiting payment
                  </div>
                </div>
                  </div>
                </div>
              </div>

                    <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                            <FiTrendingUp />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                              Commission
                            </h3>
                            <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                              {formatCurrency(summary.commission_earned)}
                            </div>
                            <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                              Platform revenue
                  </div>
                </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

              {/* Filters Panel */}
        {showFilters && (
                <div className="mb-6 bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="flex items-center gap-2 text-white font-medium text-base sm:text-lg font-['Albert_Sans']">
                      <FiFilter />
                      Advanced Filters
                    </h3>
                    <button 
                      onClick={() => setShowFilters(false)} 
                      className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                <FiX size={20} />
              </button>
            </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                    <FiSearch size={14} />
                    Search Transactions
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Transaction ID, Order ID..."
                        className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  />
                </div>

                    <div>
                      <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                    <RiShieldCheckLine size={14} />
                    Payment Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  >
                    <option value="">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    <option value="created">Created</option>
                  </select>
                </div>

                    <div>
                      <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                    <FiDollarSign size={14} />
                    Settlement Status
                  </label>
                  <select
                    value={filters.settlementStatus}
                    onChange={(e) => handleFilterChange('settlementStatus', e.target.value)}
                        className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  >
                    <option value="">All</option>
                        <option value="settled">Settled</option>
                        <option value="unsettled">Unsettled</option>
                  </select>
                </div>

                    <div>
                      <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                    <FiCalendar size={14} />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  />
                </div>

                    <div>
                      <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                    <FiCalendar size={14} />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  />
                </div>

                    <div>
                      <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                    <FiDollarSign size={14} />
                    Min Amount
                  </label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    placeholder="₹ 0"
                        className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  />
                </div>

                    <div>
                      <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                    <FiDollarSign size={14} />
                    Max Amount
                  </label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    placeholder="₹ 10,000"
                        className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  />
                </div>

                    <div>
                      <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                    <FiShield size={14} />
                    Merchant ID
                  </label>
                  <input
                    type="text"
                    value={filters.merchantId}
                    onChange={(e) => handleFilterChange('merchantId', e.target.value)}
                    placeholder="Enter merchant ID"
                        className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  />
                </div>
              </div>

                  <div className="flex gap-3 mt-4">
                    <button 
                      onClick={handleClearFilters} 
                      className="flex items-center justify-center gap-2 bg-[#001D22] border border-white/10 hover:border-white/20 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200"
                    >
                  <FiX />
                  Clear All
                </button>
                    <button 
                      onClick={handleApplyFilters} 
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5"
                    >
                  <FiFilter />
                  Apply Filters
                </button>
            </div>
          </div>
        )}

              {/* Transaction ID Search Bar */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
                  <FiSearch size={14} />
                  Search by Transaction ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={transactionIdSearch}
                    onChange={(e) => setTransactionIdSearch(e.target.value)}
                    placeholder="Enter Transaction ID (e.g., TXN_1766051565108_5cd77)"
                    className="flex-1 bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  />
                  {transactionIdSearch && (
                    <button
                      onClick={() => setTransactionIdSearch('')}
                      className="px-4 py-2 bg-[#001D22] border border-white/10 hover:border-white/20 text-white rounded-lg text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
        
              {/* Error Message */}
          {error && (
                <div className="mb-4 text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

              {/* Transactions Table */}
          {loading ? (
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                  <p className="text-white/80 font-['Albert_Sans']">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
                <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                      <thead className="bg-[#001D22] border-b border-white/10">
  <tr>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider w-[12%]">Transaction ID</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden md:table-cell w-[10%]">Order ID</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell w-[12%]">Merchant</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell w-[12%]">Customer</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider w-[6%] -ml-2">Amount</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell w-[8%]">Commission</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell w-[7%]">&nbsp;GST&nbsp;</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider w-[10%]">Status</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden xl:table-cell w-[10%]">Settlement</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden md:table-cell w-[10%]">Created</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider w-[11%]">Actions</th>
  </tr>
</thead>

                <tbody>
                  {transactions.map((txn) => (
                          <tr 
                            key={txn._id || txn.transactionId} 
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => handleRowClick(txn)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-white text-xs sm:text-sm font-['Albert_Sans'] font-mono truncate" title={txn.transactionId}>
                            {txn.transactionId?.slice(-12) || 'N/A'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(txn.transactionId);
                                    setToast({ message: '✓ Copied!', type: 'success' });
                            }}
                                  className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0"
                            title="Copy full ID"
                          >
                                  <FiCopy size={12} />
                          </button>
                        </div>
                      </td>

                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden md:table-cell truncate" title={txn.orderId}>
                          {txn.orderId || 'N/A'}
                      </td>

                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden lg:table-cell truncate" title={txn.merchantName}>
                            {txn.merchantName || 'Unknown'}
                      </td>

                            <td className="px-4 py-3 hidden lg:table-cell">
                              <div className="text-white/70 text-xs sm:text-sm font-['Albert_Sans'] truncate" title={txn.customerName}>
                            {txn.customerName || 'Anonymous'}
                          </div>
                              <div className="text-white/50 text-xs font-['Albert_Sans'] truncate" title={txn.customerEmail}>
                            {txn.customerEmail || 'No email'}
                        </div>
                      </td>

                            <td className="px-4 py-3 text-white font-medium text-xs sm:text-sm font-['Albert_Sans']">
                          ₹{txn.amount?.toLocaleString('en-IN') || '0'}
                      </td>

                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden lg:table-cell">
                              <span>
                                ₹{txn.commission !== undefined && txn.commission !== null 
                                  ? Number(txn.commission).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  : '0.00'}
                              </span>
                      </td>

                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden lg:table-cell">
                              <span>
                                {(() => {
                                  const baseRate = 3.8;
                                  const gstRate = 18;
                                  let gstAmount = 0;
                                  if (txn.amount && txn.amount > 0) {
                                    const baseCommission = (txn.amount * baseRate) / 100;
                                    gstAmount = (baseCommission * gstRate) / 100;
                                  }
                                  return `₹${Number(gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                })()}
                              </span>
                      </td>

                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {editingId === txn.transactionId ? (
                                <select
                                  value={newStatus}
                                  onChange={(e) => setNewStatus(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-1 bg-[#001D22] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                                >
                                  <option value="created">Created</option>
                                  <option value="pending">Pending</option>
                                  <option value="paid">Paid</option>
                                  <option value="failed">Failed</option>
                                  <option value="cancelled">Cancelled</option>
                                  <option value="expired">Expired</option>
                                  <option value="refunded">Refunded</option>
                                  <option value="partial_refund">Partial Refund</option>
                                </select>
                              ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] ${
                                getStatusBadgeClass(txn.status) === 'status-paid' ? 'bg-green-500/20 text-green-400' :
                                getStatusBadgeClass(txn.status) === 'status-failed' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                          {getStatusIcon(txn.status)}
                          <span>{txn.status?.toUpperCase() || 'N/A'}</span>
                        </span>
                              )}
                      </td>

                            <td className="px-4 py-3 hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
                        {txn.settlementStatus?.toLowerCase() !== 'settled' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSettleTransaction(txn.transactionId);
                            }}
                            disabled={settlingTransactionId === txn.transactionId || settlingTransactionId !== null}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] transition-colors ${
                                    getSettlementBadgeClass(txn.settlementStatus) === 'settlement-unsettled' 
                                      ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                                      : 'bg-white/10 text-white/70'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title="Click to settle this transaction"
                          >
                            {settlingTransactionId === txn.transactionId ? (
                              <>
                                      <FiRefreshCw className="animate-spin" size={12} />
                                <span>Settling...</span>
                              </>
                            ) : (
                              <>
                                <FiCheck size={12} />
                                <span>Settle</span>
                              </>
                            )}
                          </button>
                        ) : (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] bg-green-500/20 text-green-400`}>
                            {txn.settlementStatus?.toUpperCase() || 'SETTLED'}
                          </span>
                        )}
                      </td>

                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden md:table-cell">
                              <div>{new Date(txn.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className="text-white/50 text-xs">{new Date(txn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                      </td>

                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {editingId === txn.transactionId ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdate(txn.transactionId)}
                                    disabled={updatingId === txn.transactionId}
                                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Save"
                                  >
                                    <FiSave className={updatingId === txn.transactionId ? 'animate-spin' : ''} size={14} />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    disabled={updatingId === txn.transactionId}
                                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Cancel"
                                  >
                                    <FiX size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <button
                                    onClick={(e) => handleEdit(txn, e)}
                                    className="p-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors"
                                    title="Edit Status"
                                  >
                                    <FiEdit3 size={14} />
                                  </button>
                                </div>
                              )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                  </div>
                  
                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between">
                      <div className="text-sm text-white/70 font-['Albert_Sans']">
                        Showing page {pagination.currentPage} of {pagination.totalPages} 
                        ({pagination.totalCount} total transactions)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={filters.page === 1 || loading}
                          className="px-4 py-2 bg-[#001D22] border border-white/10 rounded-lg hover:bg-white/10 text-white font-['Albert_Sans'] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={filters.page >= pagination.totalPages || loading}
                          className="px-4 py-2 bg-[#001D22] border border-white/10 rounded-lg hover:bg-white/10 text-white font-['Albert_Sans'] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
            </div>
          ) : (
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <HiOutlineChartBar className="text-6xl text-white/50 mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2 font-['Albert_Sans']">No Transactions Found</h3>
                  <p className="text-white/70 text-sm font-['Albert_Sans'] mb-4">No transactions match your current filters.</p>
                  <button 
                    onClick={handleClearFilters} 
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5"
                  >
                Clear Filters
              </button>
            </div>
          )}
        </div>
          </div>
        </div>
      </section>

      <Toast 
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
};

export default SuperadminTransactionsPage;
