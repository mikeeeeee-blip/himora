// components/SuperadminDashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  FiUsers,
  FiTrendingUp,
  FiDollarSign,
  FiCreditCard,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
  FiArrowUp,
  FiArrowDown,
  FiPackage,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiBook,
  FiLock,
} from "react-icons/fi";
import { HiOutlineChartBar } from "react-icons/hi2";
import { TbArrowsTransferDown } from "react-icons/tb";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import superadminPaymentService from "../services/superadminPaymentService";
import ledgerService from "../services/ledgerService";

const SuperadminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [settlementMessage, setSettlementMessage] = useState("");
  const [merchantsData, setMerchantsData] = useState([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  
  // Notification states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationTarget, setNotificationTarget] = useState('all_superadmins');
  const [notificationUserId, setNotificationUserId] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Date filter states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [useDateRange, setUseDateRange] = useState(false);
  const [showAllTime, setShowAllTime] = useState(false);
  const [ledgerOverview, setLedgerOverview] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const fetchLedgerOverview = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const res = await ledgerService.overview();
      if (res?.success && res?.data) setLedgerOverview(res.data);
    } catch (e) {
      console.error('Ledger overview error:', e);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch both in parallel for better performance
    Promise.all([
      fetchStats(),
      fetchMerchantsData()
    ]).catch(err => {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    });
  }, [selectedDate, useDateRange, dateRange, showAllTime]);

  useEffect(() => {
    fetchLedgerOverview();
  }, [fetchLedgerOverview]);

  const fetchMerchantsData = async () => {
    setLoadingMerchants(true);
    try {
      // Prepare date filters
      let startDate = undefined;
      let endDate = undefined;
      
      if (showAllTime) {
        startDate = undefined;
        endDate = undefined;
      } else if (useDateRange && dateRange.start && dateRange.end) {
        startDate = dateRange.start;
        endDate = dateRange.end;
      } else if (!useDateRange && selectedDate) {
        startDate = selectedDate;
        endDate = selectedDate;
      }

      const data = await superadminPaymentService.getAllMerchantsData({
        startDate,
        endDate,
        limit: 10 // Only fetch top 10 merchants for dashboard preview
      });
      
      if (data && data.merchants) {
        setMerchantsData(data.merchants.slice(0, 10)); // Limit to 10 for dashboard
      }
    } catch (err) {
      console.error('Error fetching merchants data:', err);
    } finally {
      setLoadingMerchants(false);
    }
  };
  const handleSendNotification = async () => {
    if (!notificationTitle || !notificationBody) {
      setNotificationMessage('❌ Title and message are required');
      return;
    }

    if (notificationTarget === 'specific_user' && !notificationUserId) {
      setNotificationMessage('❌ User ID is required when targeting specific user');
      return;
    }

    setSendingNotification(true);
    setNotificationMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/superadmin/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          title: notificationTitle,
          body: notificationBody,
          target: notificationTarget,
          userId: notificationTarget === 'specific_user' ? notificationUserId : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setNotificationMessage(`✅ Notification sent successfully to ${data.sent} device(s)`);
        setNotificationTitle('');
        setNotificationBody('');
        setNotificationUserId('');
        setTimeout(() => {
          setShowNotificationModal(false);
          setNotificationMessage('');
        }, 2000);
      } else {
        setNotificationMessage(`❌ ${data.error || 'Failed to send notification'}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setNotificationMessage('❌ Failed to send notification. Please try again.');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleManualSettlement = async () => {
    if (
      !window.confirm(
        "Are you sure you want to run manual settlement? This will process all eligible transactions."
      )
    ) {
      return;
    }

    setLoadingSettlement(true);
    setSettlementMessage("");

    try {
      const result = await superadminPaymentService.triggerManualSettlement();

      if (result.success) {
        setSettlementMessage("✅ Manual settlement completed successfully!");
        // Refresh dashboard stats to show updated numbers
        setTimeout(() => {
          fetchStats();
        }, 1000);
      } else {
        setSettlementMessage(`❌ Settlement failed: ${result.message}`);
      }
    } catch (err) {
      console.error("Manual settlement error:", err);
      setSettlementMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoadingSettlement(false);
      // Clear message after 5 seconds
      setTimeout(() => {
        setSettlementMessage("");
      }, 5000);
    }
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

  const navigateDate = (direction) => {
    const currentDate = new Date(selectedDate);
    if (direction === 'left') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
    setUseDateRange(false);
    setShowAllTime(false);
    setDateRange({ start: '', end: '' });
  };

  const handleDateRangeApply = () => {
    if (dateRange.start && dateRange.end) {
      if (new Date(dateRange.start) > new Date(dateRange.end)) {
        setError('Start date cannot be after end date');
        return;
      }
      setUseDateRange(true);
      setShowAllTime(false);
      setShowDateRangePicker(false);
    } else {
      setError('Please select both start and end dates');
    }
  };

  const handleClearDateRange = () => {
    setUseDateRange(false);
    setShowAllTime(false);
    setDateRange({ start: '', end: '' });
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleAllTime = () => {
    if (showAllTime) {
      // Switch to today
      setShowAllTime(false);
      setUseDateRange(false);
      setDateRange({ start: '', end: '' });
      setSelectedDate(new Date().toISOString().split('T')[0]);
    } else {
      // Switch to all time
      setShowAllTime(true);
      setUseDateRange(false);
      setDateRange({ start: '', end: '' });
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

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

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      // Prepare date filters
      let startDate = undefined;
      let endDate = undefined;
      
      if (showAllTime) {
        // Don't apply date filter
        startDate = undefined;
        endDate = undefined;
      } else if (useDateRange && dateRange.start && dateRange.end) {
        startDate = dateRange.start;
        endDate = dateRange.end;
      } else if (!useDateRange && selectedDate) {
        startDate = selectedDate;
        endDate = selectedDate;
      }

      const data = await superadminPaymentService.getDashboardStats({
        startDate,
        endDate
      });
      console.log("Dashboard stats:", data);

      // Validate that we have the required data structure
      if (data && typeof data === "object") {
        // Ensure all required sections exist with default values
        const validatedStats = {
          merchants: data.merchants || {
            total: 0,
            active: 0,
            inactive: 0,
            new_this_week: 0,
          },
          transactions: data.transactions || {
            total: 0,
            paid: 0,
            pending: 0,
            failed: 0,
            settled: 0,
            unsettled: 0,
            today: 0,
            this_week: 0,
            success_rate: 0,
          },
          revenue: data.revenue || {
            total: 0,
            commission_earned: 0,
            net_revenue: 0,
            refunded: 0,
            today: 0,
            this_week: 0,
            average_transaction: 0,
          },
          payouts: data.payouts || {
            total_requests: 0,
            requested: 0,
            pending: 0,
            completed: 0,
            rejected: 0,
            failed: 0,
            total_amount_requested: 0,
            total_completed: 0,
            total_pending: 0,
            commission_earned: 0,
            today: 0,
          },
          settlement: data.settlement || {
            settled_transactions: 0,
            unsettled_transactions: 0,
            available_for_payout: 0,
            in_payouts: 0,
            available_balance: 0,
          },
          platform: data.platform || {
            total_commission_earned: 0,
            payin_commission: 0,
            payout_commission: 0,
            net_platform_revenue: 0,
            today_payin_commission: 0,
            today_payout_commission: 0,
            today_total_commission: 0,
          },
          commission: data.commission || {
            today_payin: 0,
            today_payout: 0,
            today_total: 0,
            total_payin: 0,
            total_payout: 0,
            total_all: 0,
          },
        };
        setStats(validatedStats);
      } else {
        throw new Error("Invalid stats data received from server");
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError(
        err.message || "Failed to load dashboard statistics. Please try again."
      );
      // Set empty stats on error so UI doesn't break
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString("en-IN");
  };

  if (loading && !stats) {
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
        <section className="relative z-10 min-h-screen bg-transparent">
          <div className="h-[calc(50vh-4rem)] sm:h-[calc(55vh-4rem)]"></div>
          <div className="bg-transparent pt-2 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              <div className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8">
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                  <p className="text-white/80 font-['Albert_Sans']">
                    Loading dashboard...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

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
              <div className="mb-4 relative">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                  {/* Left Section - Title */}
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans']">
                      SuperAdmin Dashboard
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                      Complete overview of platform operations and statistics
                    </p>
                  </div>

                  {/* Right Section - Date Filter & Refresh */}
                  <div className="flex items-center gap-2 flex-wrap">
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
                      <div className="absolute top-full right-0 mt-2 bg-[#122D32] border border-white/10 rounded-xl shadow-2xl p-4 z-50 min-w-[340px]" data-date-range-picker>
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
                              className={`w-full px-4 py-2 rounded-lg text-sm font-medium font-['Albert_Sans'] transition-colors ${
                                showAllTime
                                  ? 'bg-gradient-to-r from-accent to-bg-tertiary text-white'
                                  : 'bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white'
                              }`}
                            >
                              {showAllTime ? 'Today' : 'All Time'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={fetchStats}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 sm:px-5 py-2 rounded-full text-sm sm:text-base font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full sm:w-auto whitespace-nowrap"
                    >
                      <FiRefreshCw className={loading ? "animate-spin" : ""} />
                      <span>{loading ? "Loading..." : "Refresh"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  <FiAlertCircle /> {error}
                </div>
              )}

              {stats && (
                <div className="space-y-6">
                  {/* Main Stats - Total Payin and Total Payout */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                        <FiTrendingUp /> Platform Overview
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-l-4 border-green-400 border border-white/10 rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative">
                        {loading && (
                          <div className="absolute top-3 right-3">
                            <FiRefreshCw className="w-5 h-5 text-accent animate-spin" />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-green-500/30 flex items-center justify-center text-green-400 flex-shrink-0">
                            <FiArrowUp size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm text-white/70 font-medium font-['Albert_Sans'] mb-1">
                              Total Payin
                            </h3>
                            <div className={`text-3xl font-bold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                              {formatCurrency(stats.revenue.total)}
                            </div>
                            <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                              {formatNumber(stats.transactions.paid)} paid transactions
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-l-4 border-blue-400 border border-white/10 rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative">
                        {loading && (
                          <div className="absolute top-3 right-3">
                            <FiRefreshCw className="w-5 h-5 text-accent animate-spin" />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                            <FiArrowDown size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm text-white/70 font-medium font-['Albert_Sans'] mb-1">
                              Total Payout
                            </h3>
                            <div className={`text-3xl font-bold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                              {formatCurrency(stats.payouts.total_completed)}
                            </div>
                            <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                              {formatNumber(stats.payouts.completed)} completed payouts
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Double-Entry Ledger – Control-plane */}
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                          <FiBook /> Double-Entry Ledger
                        </h2>
                        <button
                          onClick={() => navigate("/superadmin/ledger")}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/50 text-accent hover:bg-accent/30 text-sm font-medium font-['Albert_Sans'] transition-colors"
                        >
                          View Ledger
                        </button>
                      </div>
                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 flex flex-wrap items-center gap-4">
                        {ledgerLoading ? (
                          <div className="flex items-center gap-2 text-white/60">
                            <FiRefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading…</span>
                          </div>
                        ) : ledgerOverview ? (
                          <>
                            <div className="flex items-center gap-2 text-white/90 text-sm">
                              <span className="text-white/60">Accounts:</span>
                              <span className="font-semibold">{ledgerOverview.accountCount ?? 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/90 text-sm">
                              <span className="text-white/60">Journal entries:</span>
                              <span className="font-semibold">{ledgerOverview.journalCount ?? 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/90 text-sm">
                              <span className="text-white/60">Postings:</span>
                              <span className="font-semibold">{ledgerOverview.postingCount ?? 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {ledgerOverview.allBalanced ? (
                                <span className="text-green-400 flex items-center gap-1">
                                  <FiCheckCircle /> Dr = Cr enforced
                                </span>
                              ) : (
                                <span className="text-amber-400">Balance check pending</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-white/70 text-xs">
                              <FiLock className="shrink-0" />
                              <span>Posted journals immutable · Tenant-scoped</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-white/60 text-sm">Ledger not available</span>
                        )}
                      </div>
                    </div>

                    {/* Merchants Leaderboard - Payin & Payout */}
                    {merchantsData.length > 0 && (
                      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Top Payin Merchants */}
                        <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                          <div className="bg-[#001D22] border-b border-white/10 px-4 py-3">
                            <h3 className="text-white font-medium font-['Albert_Sans'] flex items-center gap-2">
                              <FiArrowUp className="text-green-400" />
                              Top Payin Merchants
                            </h3>
                            <p className="text-white/60 text-xs font-['Albert_Sans'] mt-1">
                              Ranked by total revenue
                            </p>
                          </div>
                          <div className="divide-y divide-white/5">
                            {merchantsData
                              .sort((a, b) => {
                                const revA = parseFloat(a.revenue_summary?.total_revenue || 0);
                                const revB = parseFloat(b.revenue_summary?.total_revenue || 0);
                                return revB - revA;
                              })
                              .slice(0, 5)
                              .map((m, index) => {
                                const info = m.merchant_info || {};
                                const rev = m.revenue_summary || {};
                                const txn = m.transaction_summary || {};
                                
                                return (
                                  <div
                                    key={m.merchant_id}
                                    className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/superadmin/merchants/${m.merchant_id}`)}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500/30 to-green-600/30 flex items-center justify-center text-green-400 font-bold text-sm font-['Albert_Sans']">
                                          {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-white font-medium text-sm font-['Albert_Sans'] truncate">
                                            {info.business_name || info.name}
                                          </div>
                                          <div className="text-white/60 text-xs font-['Albert_Sans'] truncate">
                                            {txn.total_transactions || 0} transactions
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0 text-right">
                                        <div className="text-green-400 font-semibold text-sm font-['Albert_Sans']">
                                          {formatCurrency(rev.total_revenue)}
                                        </div>
                                        <div className="text-white/50 text-xs font-['Albert_Sans']">
                                          {txn.by_status?.paid || 0} paid
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Top Payout Merchants */}
                        <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                          <div className="bg-[#001D22] border-b border-white/10 px-4 py-3">
                            <h3 className="text-white font-medium font-['Albert_Sans'] flex items-center gap-2">
                              <FiArrowDown className="text-blue-400" />
                              Top Payout Merchants
                            </h3>
                            <p className="text-white/60 text-xs font-['Albert_Sans'] mt-1">
                              Ranked by total payouts
                            </p>
                          </div>
                          <div className="divide-y divide-white/5">
                            {merchantsData
                              .sort((a, b) => {
                                const payoutA = parseFloat(a.payout_summary?.total_completed || 0);
                                const payoutB = parseFloat(b.payout_summary?.total_completed || 0);
                                return payoutB - payoutA;
                              })
                              .slice(0, 5)
                              .map((m, index) => {
                                const info = m.merchant_info || {};
                                const payout = m.payout_summary || {};
                                
                                return (
                                  <div
                                    key={m.merchant_id}
                                    className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/superadmin/merchants/${m.merchant_id}`)}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center text-blue-400 font-bold text-sm font-['Albert_Sans']">
                                          {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-white font-medium text-sm font-['Albert_Sans'] truncate">
                                            {info.business_name || info.name}
                                          </div>
                                          <div className="text-white/60 text-xs font-['Albert_Sans'] truncate">
                                            {payout.total_payouts || 0} payout requests
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0 text-right">
                                        <div className="text-blue-400 font-semibold text-sm font-['Albert_Sans']">
                                          {formatCurrency(payout.total_completed)}
                                        </div>
                                        <div className="text-white/50 text-xs font-['Albert_Sans']">
                                          {payout.completed_count || 0} completed
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                    {loadingMerchants && (
                      <div className="mt-4 text-center py-4">
                        <FiRefreshCw className="w-5 h-5 text-accent animate-spin mx-auto" />
                        <p className="text-white/60 text-sm font-['Albert_Sans'] mt-2">Loading merchants data...</p>
                      </div>
                    )}
                  </div>

                  {/* Revenue Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                        <FiDollarSign /> Revenue
                      </h2>
                      <span className="text-lg font-medium text-green-400 font-['Albert_Sans']">
                        {formatCurrency(stats.revenue.total)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 sm:col-span-2">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiDollarSign />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Total Revenue
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(stats.revenue.total)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                Avg:{" "}
                                {formatCurrency(
                                  stats.revenue.average_transaction
                                )}{" "}
                                per txn
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                              <FiTrendingUp />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Commission (3.8%)
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(
                                  stats.revenue.commission_earned
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiCreditCard />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Net Revenue
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(stats.revenue.net_revenue)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Today & Week Revenue Stats */}
                    {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="bg-[#263F43] border-l-4 border-green-400 border border-white/10 rounded-xl p-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="text-xs text-white/80 font-medium mb-2 font-['Albert_Sans']">
                          Today's Revenue
                        </div>
                        <div className="text-2xl font-medium text-white font-['Albert_Sans']">
                          {formatCurrency(stats.revenue.today)}
                        </div>
                      </div>
                      <div className="bg-[#263F43] border-l-4 border-green-400 border border-white/10 rounded-xl p-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="text-xs text-white/80 font-medium mb-2 font-['Albert_Sans']">
                          This Week
                        </div>
                        <div className="text-2xl font-medium text-white font-['Albert_Sans']">
                          {formatCurrency(stats.revenue.this_week)}
                        </div>
                      </div>
                    </div> */}
                  </div>

                  {/* Merchants Section - Moved Down */}
                  {/* <div>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                        <FiUsers /> Merchants
                      </h2>
                      <span className="text-sm font-medium text-white/80 bg-bg-tertiary px-4 py-1.5 rounded-full font-['Albert_Sans']">
                        {stats.merchants.total} Total
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-4">
                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative">
                        {loading && (
                          <div className="absolute top-2 right-2">
                            <FiRefreshCw className="w-4 h-4 text-accent animate-spin" />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiUsers />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Total Merchants
                              </h3>
                              <div className={`text-xl font-semibold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                {formatNumber(stats.merchants.total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative">
                        {loading && (
                          <div className="absolute top-2 right-2">
                            <FiRefreshCw className="w-4 h-4 text-accent animate-spin" />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                              <FiCheckCircle />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Active
                              </h3>
                              <div className={`text-xl font-semibold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                {formatNumber(stats.merchants.active)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative">
                        {loading && (
                          <div className="absolute top-2 right-2">
                            <FiRefreshCw className="w-4 h-4 text-accent animate-spin" />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 flex-shrink-0">
                              <FiClock />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Inactive
                              </h3>
                              <div className={`text-xl font-semibold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                {formatNumber(stats.merchants.inactive)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative">
                        {loading && (
                          <div className="absolute top-2 right-2">
                            <FiRefreshCw className="w-4 h-4 text-accent animate-spin" />
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiTrendingUp />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                New This Week
                              </h3>
                              <div className={`text-xl font-semibold text-white font-['Albert_Sans'] transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                {formatNumber(stats.merchants.new_this_week)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                   */}

                                     {/* Commission Breakdown with Filters */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                        <FiTrendingUp /> Commission Breakdown
                      </h2>
                      <span className="text-lg font-medium text-green-400 font-['Albert_Sans']">
                        Today: {formatCurrency(stats.commission.today_total)}
                      </span>
                    </div>

                    {/* Today's Commission Cards */}
                    <div className="mb-6">
                      <h3 className="text-sm text-white/80 font-medium mb-3 font-['Albert_Sans']">
                        Today's Commission (IST)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-4">
                        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-l-4 border-green-400 border border-white/10 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-green-500/30 flex items-center justify-center text-green-400 flex-shrink-0">
                              <FiArrowUp />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Today's Payin Commission
                              </h3>
                              <div className="text-2xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(stats.commission.today_payin)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                From paid transactions
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-l-4 border-blue-400 border border-white/10 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                              <FiArrowDown />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Today's Payout Commission
                              </h3>
                              <div className="text-2xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(stats.commission.today_payout)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                From payout requests
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-l-4 border-purple-400 border border-white/10 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                              <FiDollarSign />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Today's Total Commission
                              </h3>
                              <div className="text-2xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(stats.commission.today_total)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                Payin + Payout
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* All-Time Commission Summary - Not affected by date filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        <div className="bg-[#263F43] border-l-4 border-purple-400 border border-white/10 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 sm:col-span-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                              <FiDollarSign />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-1">
                                Total Commission (All Time)
                              </h3>
                              <div className="text-2xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(stats.commission.total_all)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                Payin + Payout fees (unfiltered)
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#263F43] border-l-4 border-green-400 border border-white/10 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                              <FiArrowUp />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-1">
                                Total Payin Commission (All Time)
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(stats.commission.total_payin)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                3.8% of all paid transactions
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#263F43] border-l-4 border-blue-400 border border-white/10 rounded-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                              <FiArrowDown />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-1">
                                Total Payout Commission (All Time)
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(stats.commission.total_payout)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                From all payout requests
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                        <HiOutlineChartBar /> Transactions
                      </h2>
                      <span className="text-sm font-medium text-white/80 bg-bg-tertiary px-4 py-1.5 rounded-full font-['Albert_Sans']">
                        {stats.transactions.total} Total
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
                      <div
                        className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer hover:border-accent"
                        onClick={() => navigate("/superadmin/transactions")}
                      >
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
                                {formatNumber(stats.transactions.total)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                Success Rate: {stats.transactions.success_rate}%
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
                                {formatNumber(stats.transactions.paid)}
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
                                {formatNumber(stats.transactions.pending)}
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
                                {formatNumber(stats.transactions.failed)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiCheckCircle />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Settled
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(stats.transactions.settled)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiClock />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Unsettled
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(stats.transactions.unsettled)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Today & Week Stats */}
                    {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="bg-[#263F43] border-l-4 border-accent border border-white/10 rounded-xl p-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="text-xs text-white/80 font-medium mb-2 font-['Albert_Sans']">
                          Today
                        </div>
                        <div className="text-2xl font-medium text-white font-['Albert_Sans']">
                          {formatNumber(stats.transactions.today)}
                        </div>
                      </div>
                      <div className="bg-[#263F43] border-l-4 border-accent border border-white/10 rounded-xl p-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="text-xs text-white/80 font-medium mb-2 font-['Albert_Sans']">
                          This Week
                        </div>
                        <div className="text-2xl font-medium text-white font-['Albert_Sans']">
                          {formatNumber(stats.transactions.this_week)}
                        </div>
                      </div>
                    </div> */}
                  </div>

                  {/* Payouts Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                        <TbArrowsTransferDown /> Payouts
                      </h2>
                      <span className="text-sm font-medium text-white/80 bg-bg-tertiary px-4 py-1.5 rounded-full font-['Albert_Sans']">
                        {stats.payouts.total_requests} Requests
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
                      <div
                        className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer hover:border-accent"
                        onClick={() => navigate("/superadmin/payouts")}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <RiMoneyDollarCircleLine />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Total Requests
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(stats.payouts.total_requests)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                {formatCurrency(
                                  stats.payouts.total_amount_requested
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 flex-shrink-0">
                              <FiAlertCircle />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Pending Approval
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(stats.payouts.requested)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiClock />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Processings
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(stats.payouts.pending)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                {formatCurrency(stats.payouts.total_pending)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div> */}

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                              <FiCheckCircle />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Completed
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(stats.payouts.completed)}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                {formatCurrency(stats.payouts.total_completed)}
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
                                Rejected
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(stats.payouts.rejected)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiDollarSign />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Commission Earned
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatCurrency(
                                  stats.payouts.commission_earned
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Today's Requests */}
                    <div className="mt-4">
                      <div className="bg-[#263F43] border-l-4 border-accent border border-white/10 rounded-xl p-4 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="text-xs text-white/80 font-medium mb-2 font-['Albert_Sans']">
                          Today's Requests
                        </div>
                        <div className="text-2xl font-medium text-white font-['Albert_Sans']">
                          {formatNumber(stats.payouts.today)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settlement Section */}
                  {/* <div>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                        <FiPackage /> Settlement Status
                      </h2>
                      <button
                        onClick={handleManualSettlement}
                        disabled={loadingSettlement}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        <FiRefreshCw
                          className={loadingSettlement ? "animate-spin" : ""}
                        />
                        {loadingSettlement ? "Processing..." : "Run Settlement"}
                      </button>
                    </div>

                    {settlementMessage && (
                      <div
                        className={`mb-4 p-4 rounded-lg flex items-center gap-2 font-['Albert_Sans'] ${
                          settlementMessage.includes("✅")
                            ? "bg-green-500/20 border border-green-500/40 text-green-400"
                            : "bg-red-500/20 border border-red-500/40 text-red-400"
                        }`}
                      >
                        {settlementMessage}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                              <FiCheckCircle />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Settled Transactions
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(
                                  stats.settlement.settled_transactions
                                )}
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
                                Unsettled
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(
                                  stats.settlement.unsettled_transactions
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiDollarSign />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                Available for Payout
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(
                                  stats.settlement.available_for_payout
                                )}
                              </div>
                              <div className="text-xs text-white/60 mt-1 font-['Albert_Sans']">
                                {formatCurrency(
                                  stats.settlement.available_balance
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                              <FiPackage />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                                In Payouts
                              </h3>
                              <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                                {formatNumber(stats.settlement.in_payouts)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div> */}

                  {/* Send Notification Section */}
                  <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-white/10 rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:shadow-xl">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                      <h2 className="flex items-center gap-3 text-lg sm:text-xl text-white font-medium font-['Albert_Sans']">
                        <FiAlertCircle /> Send Mobile Notification
                      </h2>
                      <button
                        onClick={() => setShowNotificationModal(true)}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                      >
                        <FiAlertCircle />
                        Send Notification
                      </button>
                    </div>
                    <p className="text-sm text-white/60 font-['Albert_Sans']">
                      Send push notifications to mobile app users. Notifications will be delivered instantly to all registered devices.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl text-white font-semibold font-['Albert_Sans']">
                Send Mobile Notification
              </h3>
              <button
                onClick={() => {
                  setShowNotificationModal(false);
                  setNotificationTitle('');
                  setNotificationBody('');
                  setNotificationTarget('all_superadmins');
                  setNotificationUserId('');
                  setNotificationMessage('');
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {notificationMessage && (
              <div
                className={`mb-4 p-4 rounded-lg flex items-center gap-2 font-['Albert_Sans'] ${
                  notificationMessage.includes('✅') || notificationMessage.includes('success')
                    ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                    : 'bg-red-500/20 border border-red-500/40 text-red-400'
                }`}
              >
                {notificationMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 font-medium font-['Albert_Sans'] mb-2">
                  Target
                </label>
                <select
                  value={notificationTarget}
                  onChange={(e) => setNotificationTarget(e.target.value)}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-2 text-white font-['Albert_Sans'] focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all_superadmins">All SuperAdmins</option>
                  <option value="specific_user">Specific User</option>
                </select>
              </div>

              {notificationTarget === 'specific_user' && (
                <div>
                  <label className="block text-sm text-white/70 font-medium font-['Albert_Sans'] mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={notificationUserId}
                    onChange={(e) => setNotificationUserId(e.target.value)}
                    placeholder="Enter user ID"
                    className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-2 text-white font-['Albert_Sans'] focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-white/70 font-medium font-['Albert_Sans'] mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Notification title"
                  className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-2 text-white font-['Albert_Sans'] focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 font-medium font-['Albert_Sans'] mb-2">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  placeholder="Notification message"
                  rows={4}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-4 py-2 text-white font-['Albert_Sans'] focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setNotificationTitle('');
                    setNotificationBody('');
                    setNotificationTarget('all_superadmins');
                    setNotificationUserId('');
                    setNotificationMessage('');
                  }}
                  className="flex-1 bg-bg-tertiary border border-white/10 text-white px-4 py-2 rounded-lg font-medium font-['Albert_Sans'] hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={sendingNotification || !notificationTitle || !notificationBody || (notificationTarget === 'specific_user' && !notificationUserId)}
                  className="flex-1 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingNotification ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Notification'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminDashboard;
