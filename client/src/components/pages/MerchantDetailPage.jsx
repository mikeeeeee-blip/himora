import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiFilter,
  FiX,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiUsers,
  FiCreditCard,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiBarChart2,
  FiDownload,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { HiOutlineChartBar } from 'react-icons/hi2';
import superadminPaymentService from '../../services/superadminPaymentService';
import ExportCSV from '../ExportCSV';
import Toast from '../ui/Toast';
import './PageLayout.css';

const MerchantDetailPage = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [useDateRange, setUseDateRange] = useState(false);
  const [showAllTime, setShowAllTime] = useState(false); // Track if "All Time" is selected
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    transactionStatus: '',
    payoutStatus: '',
    minAmount: '',
    maxAmount: '',
    page: 1,
    limit: 50
  });

  const [analytics, setAnalytics] = useState({
    transactions: null,
    payouts: null
  });

  // Fetch merchant data only once when merchantId changes
  useEffect(() => {
    if (merchantId) {
      fetchMerchantDetails();
      // Initial fetch without debounce
      fetchFilteredData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  // Debounce filter changes to reduce API calls (skip initial render)
  useEffect(() => {
    if (!merchantId) return;
    
    const timeoutId = setTimeout(() => {
      fetchFilteredData();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.status, filters.page, filters.limit, selectedDate, useDateRange, dateRange, filters.transactionStatus, filters.payoutStatus, filters.minAmount, filters.maxAmount, showAllTime]);

  // Close date range picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDateRangePicker && !event.target.closest('[data-date-range-picker]')) {
        setShowDateRangePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDateRangePicker]);

  const navigateDate = (direction) => {
    const currentDate = new Date(selectedDate);
    if (direction === 'left') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
    setUseDateRange(false);
    setDateRange({ start: '', end: '' });
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDateRangeApply = () => {
    if (dateRange.start && dateRange.end) {
      if (new Date(dateRange.start) > new Date(dateRange.end)) {
        setToast({ message: 'Start date cannot be after end date', type: 'error' });
        return;
      }
      setUseDateRange(true);
      setShowDateRangePicker(false);
      setFilters(prev => ({
        ...prev,
        startDate: dateRange.start,
        endDate: dateRange.end,
        page: 1
      }));
    } else {
      setToast({ message: 'Please select both start and end dates', type: 'error' });
    }
  };

  const handleClearDateRange = () => {
    setUseDateRange(false);
    setShowAllTime(false);
    setDateRange({ start: '', end: '' });
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setFilters(prev => ({
      ...prev,
      startDate: '',
      endDate: '',
      page: 1
    }));
  };

  const handleAllTime = () => {
    if (showAllTime) {
      // If already showing all time, switch to today
      setShowAllTime(false);
      setUseDateRange(false);
      setDateRange({ start: '', end: '' });
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setFilters(prev => ({
        ...prev,
        startDate: '',
        endDate: '',
        page: 1
      }));
    } else {
      // Switch to all time
      setShowAllTime(true);
      setUseDateRange(false);
      setDateRange({ start: '', end: '' });
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setFilters(prev => ({
        ...prev,
        startDate: '',
        endDate: '',
        page: 1
      }));
    }
  };

  // Fetch merchant details only (doesn't change with filters)
  const fetchMerchantDetails = useCallback(async () => {
    if (!merchantId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const merchantData = await superadminPaymentService.getAllMerchantsData({
        merchantId: merchantId
      });
      
      if (merchantData.merchants && merchantData.merchants.length > 0) {
        setMerchant(merchantData.merchants[0]);
      } else {
        setError('Merchant not found');
      }
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  // Fetch filtered transactions and payouts in parallel
  const fetchFilteredData = useCallback(async () => {
    if (!merchantId) return;
    
    setLoading(true);
    
    try {
      // Get date range from selected date, date range picker, or manual filters
      // If "All Time" is selected, don't apply date filter
      let startDate = filters.startDate;
      let endDate = filters.endDate;
      
      if (showAllTime) {
        // Don't apply date filter for "All Time"
        startDate = undefined;
        endDate = undefined;
      } else if (useDateRange && dateRange.start && dateRange.end) {
        // For date range: send date strings, backend handles time boundaries
        startDate = dateRange.start;
        endDate = dateRange.end;
      } else if (!useDateRange && selectedDate) {
        // For single date: send same date for both start and end
        startDate = selectedDate;
        endDate = selectedDate;
      }

      // Prepare filters
      const transactionFilters = {
        merchantId: merchantId,
        page: filters.page,
        limit: filters.limit,
        status: filters.transactionStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minAmount: filters.minAmount || undefined,
        maxAmount: filters.maxAmount || undefined
      };

      const payoutFilters = {
        merchantId: merchantId,
        page: filters.page,
        limit: filters.limit,
        status: filters.payoutStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      // Fetch transactions and payouts in parallel for better performance
      const [transactionsData, payoutsData] = await Promise.all([
        superadminPaymentService.getAdminTransactions(transactionFilters),
        superadminPaymentService.getAllPayouts(payoutFilters)
      ]);

      setTransactions(transactionsData.transactions || []);
      setAnalytics(prev => ({ ...prev, transactions: transactionsData }));
      setPayouts(payoutsData.payouts || []);
      setAnalytics(prev => ({ ...prev, payouts: payoutsData }));
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [merchantId, filters, selectedDate, useDateRange, dateRange]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      transactionStatus: '',
      payoutStatus: '',
      minAmount: '',
      maxAmount: '',
      page: 1,
      limit: 50
    });
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setUseDateRange(false);
    setShowAllTime(false);
    setDateRange({ start: '', end: '' });
  };

  // Calculate filtered stats from transactions and payouts
  const calculateFilteredStats = useCallback(() => {
    const filteredTransactions = transactions || [];
    const filteredPayouts = payouts || [];

    // Calculate transaction stats
    const totalTransactions = filteredTransactions.length;
    const paidTransactions = filteredTransactions.filter(t => t.status === 'paid').length;
    const totalRevenue = filteredTransactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalCommission = filteredTransactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);
    const successRate = totalTransactions > 0 
      ? ((paidTransactions / totalTransactions) * 100).toFixed(1) 
      : 0;

    // Calculate payout stats
    const totalPayouts = filteredPayouts.length;
    const completedPayouts = filteredPayouts.filter(p => p.status === 'completed').length;
    const totalPayoutAmount = filteredPayouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.netAmount || p.amount || 0), 0);
    const pendingPayoutAmount = filteredPayouts
      .filter(p => ['requested', 'pending', 'processing'].includes(p.status))
      .reduce((sum, p) => sum + parseFloat(p.netAmount || p.amount || 0), 0);

    return {
      transactions: {
        total: totalTransactions,
        paid: paidTransactions,
        revenue: totalRevenue,
        commission: totalCommission,
        successRate: parseFloat(successRate)
      },
      payouts: {
        total: totalPayouts,
        completed: completedPayouts,
        amount: totalPayoutAmount,
        pending: pendingPayoutAmount
      }
    };
  }, [transactions, payouts]);

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

  const formatForExport = () => {
    const exportData = [];
    
    // Add transactions
    transactions.forEach(txn => {
      exportData.push({
        'Type': 'Transaction',
        'ID': txn.transactionId || 'N/A',
        'Order ID': txn.orderId || 'N/A',
        'Amount': formatCurrency(txn.amount),
        'Status': txn.status || 'N/A',
        'Date': formatDate(txn.createdAt),
        'Payment Method': txn.paymentMethod || 'N/A'
      });
    });

    // Add payouts
    payouts.forEach(payout => {
      exportData.push({
        'Type': 'Payout',
        'ID': payout.payoutId || 'N/A',
        'Order ID': 'N/A',
        'Amount': formatCurrency(payout.amount),
        'Status': payout.status || 'N/A',
        'Date': formatDate(payout.requestedAt),
        'Payment Method': payout.transferMode || 'N/A'
      });
    });

    return exportData;
  };

  if (!merchant) {
    return (
      <div className="min-h-screen bg-[#001D22] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5 mx-auto"></div>
          <p className="text-white/80 font-['Albert_Sans']">Loading merchant details...</p>
        </div>
      </div>
    );
  }

  const info = merchant.merchant_info || {};
  const txn = merchant.transaction_summary || {};
  const rev = merchant.revenue_summary || {};
  const payout = merchant.payout_summary || {};
  const bal = merchant.balance_information || {};

  // Calculate filtered stats
  const filteredStats = calculateFilteredStats();
  
  // Use filtered stats if date filter is applied, otherwise use merchant summary
  const displayStats = showAllTime || useDateRange || selectedDate ? filteredStats : {
    transactions: {
      total: txn.total_transactions || 0,
      paid: txn.by_status?.paid || 0,
      revenue: rev.total_revenue || 0,
      commission: rev.total_commission_paid || 0,
      successRate: txn.success_rate || 0
    },
    payouts: {
      total: payout.total_payouts || 0,
      completed: payout.by_status?.completed || 0,
      amount: payout.total_completed || 0,
      pending: payout.total_pending || 0
    }
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
      </div>

      {/* Scrollable Content Section */}
      <section className="relative z-10 min-h-screen bg-transparent">
        <div className="h-[calc(50vh-4rem)] sm:h-[calc(55vh-4rem)]"></div>

        <div className="bg-transparent pt-2 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
              {/* Header */}
              <div className="mb-6 relative">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate('/superadmin/merchants')}
                      className="p-2 bg-[#263F43] border border-white/10 hover:border-accent text-white rounded-lg transition-all duration-200"
                      title="Back to Merchants"
                    >
                      <FiArrowLeft size={20} />
                    </button>
                    <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans']">
                        {info.business_name || info.name || 'Merchant Details'}
                      </h1>
                      <p className="text-white/70 text-sm font-['Albert_Sans']">
                        {info.email}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] ${
                      info.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40' 
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                    }`}>
                      {info.status || 'active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap relative" data-date-range-picker>
                    {/* Date Navigation */}
                    <div className="flex items-center gap-1 bg-[#263F43] border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => navigateDate('left')}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Previous day"
                        disabled={useDateRange || showAllTime}
                      >
                        <FiChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                        className="px-3 py-1.5 text-white text-sm font-medium font-['Albert_Sans'] min-w-[160px] text-center hover:bg-white/10 rounded transition-colors flex items-center justify-center gap-2"
                        title="Click to select date or range"
                      >
                        <FiCalendar size={14} />
                        {showAllTime ? (
                          <span className="text-xs">All Time</span>
                        ) : useDateRange && dateRange.start && dateRange.end ? (
                          <span className="text-xs">
                            {new Date(dateRange.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(dateRange.end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : (
                          formatDateDisplay(selectedDate)
                        )}
                      </button>
                      <button
                        onClick={() => navigateDate('right')}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Next day"
                        disabled={useDateRange || showAllTime}
                      >
                        <FiChevronRight size={16} />
                      </button>
                    </div>

                    {/* All Time / Today Toggle Button */}
                    <button
                      onClick={handleAllTime}
                      className={`px-4 py-2 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200 ${
                        showAllTime
                          ? 'bg-gradient-to-r from-accent to-bg-tertiary text-white'
                          : 'bg-[#263F43] border border-white/10 hover:border-accent text-white'
                      }`}
                      title={showAllTime ? "Switch to Today" : "Show all transactions"}
                    >
                      {showAllTime ? 'Today' : 'All Time'}
                    </button>

                    {/* Date Range Picker Dropdown */}
                    {showDateRangePicker && (
                      <div className="absolute top-full right-0 mt-2 bg-[#122D32] border border-white/10 rounded-xl shadow-2xl p-4 z-50 min-w-[340px]">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-white font-medium font-['Albert_Sans'] flex items-center gap-2">
                            <FiCalendar />
                            Select Date Range
                          </h3>
                          <button
                            onClick={() => setShowDateRangePicker(false)}
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <FiX size={20} />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-white/70 text-sm font-['Albert_Sans'] mb-2 flex items-center gap-2">
                              <FiCalendar size={14} />
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={dateRange.start}
                              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                              max={dateRange.end || new Date().toISOString().split('T')[0]}
                              className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                            />
                          </div>
                          <div>
                            <label className="block text-white/70 text-sm font-['Albert_Sans'] mb-2 flex items-center gap-2">
                              <FiCalendar size={14} />
                              End Date
                            </label>
                            <input
                              type="date"
                              value={dateRange.end}
                              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                              min={dateRange.start}
                              max={new Date().toISOString().split('T')[0]}
                              className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleDateRangeApply}
                              disabled={!dateRange.start || !dateRange.end}
                              className="flex-1 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Apply Range
                            </button>
                            <button
                              onClick={() => {
                                handleClearDateRange();
                                setShowDateRangePicker(false);
                              }}
                              className="px-4 py-2 bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white rounded-lg text-sm font-medium font-['Albert_Sans'] transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="pt-2 border-t border-white/10">
                            <button
                              onClick={() => {
                                handleAllTime();
                                setShowDateRangePicker(false);
                              }}
                              className="w-full bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-colors"
                            >
                              All Time
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        fetchMerchantDetails();
                        fetchFilteredData();
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                    {(transactions.length > 0 || payouts.length > 0) && (
                      <ExportCSV
                        data={formatForExport()}
                        filename={`merchant_${merchantId}_${new Date().toISOString().split('T')[0]}.csv`}
                        className="flex items-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  {error}
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 relative">
                  {loading && (
                    <div className="absolute top-2 right-2">
                      <FiRefreshCw className="w-4 h-4 text-accent animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <HiOutlineChartBar size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans']">Total Transactions</h3>
                      <div className={`text-2xl font-semibold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                        {displayStats.transactions.total}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs text-white/60 font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                    Success Rate: {displayStats.transactions.successRate}%
                  </div>
                </div>

                <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 relative">
                  {loading && (
                    <div className="absolute top-2 right-2">
                      <FiRefreshCw className="w-4 h-4 text-accent animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                      <FiDollarSign size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans']">Total Revenue</h3>
                      <div className={`text-2xl font-semibold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                        {formatCurrency(displayStats.transactions.revenue)}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs text-white/60 font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                    Net: {formatCurrency(rev.settled_net_revenue)}
                  </div>
                </div>

                <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 relative">
                  {loading && (
                    <div className="absolute top-2 right-2">
                      <FiRefreshCw className="w-4 h-4 text-accent animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <FiCreditCard size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans']">Total Payouts</h3>
                      <div className={`text-2xl font-semibold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                        {formatCurrency(displayStats.payouts.amount)}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs text-white/60 font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                    Pending: {formatCurrency(displayStats.payouts.pending)}
                  </div>
                </div>

                <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 relative">
                  {loading && (
                    <div className="absolute top-2 right-2">
                      <FiRefreshCw className="w-4 h-4 text-accent animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                      <FiTrendingUp size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans']">Available Balance</h3>
                      <div className={`text-2xl font-semibold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                        {formatCurrency(bal.available_balance)}
                      </div>
                    </div>
                  </div>
                  {bal.blocked_balance && parseFloat(bal.blocked_balance) > 0 && (
                    <div className={`text-xs text-orange-400 font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                      Blocked: {formatCurrency(bal.blocked_balance)}
                    </div>
                  )}
                </div>
              </div>

              {/* Filters Panel */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200 ${showFilters ? 'bg-accent/20 border-accent' : ''}`}
                  >
                    <FiFilter />
                    Filters
                  </button>
                  {showFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="flex items-center gap-2 bg-[#001D22] border border-white/10 hover:border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200"
                    >
                      <FiX />
                      Clear All
                    </button>
                  )}
                </div>

                {showFilters && (
                  <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          <FiCheckCircle size={14} />
                          Transaction Status
                        </label>
                        <select
                          value={filters.transactionStatus}
                          onChange={(e) => handleFilterChange('transactionStatus', e.target.value)}
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
                          <FiCreditCard size={14} />
                          Payout Status
                        </label>
                        <select
                          value={filters.payoutStatus}
                          onChange={(e) => handleFilterChange('payoutStatus', e.target.value)}
                          className="w-full bg-[#001D22] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                        >
                          <option value="">All Status</option>
                          <option value="completed">Completed</option>
                          <option value="pending">Pending</option>
                          <option value="requested">Requested</option>
                          <option value="rejected">Rejected</option>
                        </select>
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
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions Section */}
              <div className="mb-6">
                <h2 className="text-xl font-medium text-white mb-4 font-['Albert_Sans'] flex items-center gap-2">
                  <HiOutlineChartBar className="text-accent" />
                  Transactions
                </h2>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 px-5">
                    <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                    <p className="text-white/80 font-['Albert_Sans']">Loading transactions...</p>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#001D22] border-b border-white/10">
                          <tr>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Transaction ID</th>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase hidden md:table-cell">Order ID</th>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase hidden md:table-cell">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((txn) => (
                            <tr key={txn._id || txn.transactionId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-white text-xs sm:text-sm font-['Albert_Sans'] font-mono">
                                {txn.transactionId?.slice(-12) || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden md:table-cell truncate">
                                {txn.orderId || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-white font-medium text-xs sm:text-sm font-['Albert_Sans']">
                                {formatCurrency(txn.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] ${
                                  txn.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                  txn.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {txn.status?.toUpperCase() || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden md:table-cell">
                                {formatDate(txn.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-5 bg-[#263F43] border border-white/10 rounded-xl">
                    <HiOutlineChartBar className="text-6xl text-white/50 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2 font-['Albert_Sans']">No Transactions Found</h3>
                    <p className="text-white/70 text-sm font-['Albert_Sans']">No transactions match your current filters.</p>
                  </div>
                )}
              </div>

              {/* Payouts Section */}
              <div className="mb-6">
                <h2 className="text-xl font-medium text-white mb-4 font-['Albert_Sans'] flex items-center gap-2">
                  <FiCreditCard className="text-accent" />
                  Payouts
                </h2>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 px-5">
                    <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                    <p className="text-white/80 font-['Albert_Sans']">Loading payouts...</p>
                  </div>
                ) : payouts.length > 0 ? (
                  <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#001D22] border-b border-white/10">
                          <tr>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Payout ID</th>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase hidden md:table-cell">Net Amount</th>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase hidden md:table-cell">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payouts.map((payout) => (
                            <tr key={payout.payoutId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-white text-xs sm:text-sm font-['Albert_Sans'] font-mono">
                                {payout.payoutId?.slice(-12) || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-white font-medium text-xs sm:text-sm font-['Albert_Sans']">
                                {formatCurrency(payout.amount)}
                              </td>
                              <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden md:table-cell">
                                {formatCurrency(payout.netAmount)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] ${
                                  payout.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  payout.status === 'rejected' || payout.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {payout.status?.toUpperCase() || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden md:table-cell">
                                {formatDate(payout.requestedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-5 bg-[#263F43] border border-white/10 rounded-xl">
                    <FiCreditCard className="text-6xl text-white/50 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2 font-['Albert_Sans']">No Payouts Found</h3>
                    <p className="text-white/70 text-sm font-['Albert_Sans']">No payouts match your current filters.</p>
                  </div>
                )}
              </div>
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

export default MerchantDetailPage;

