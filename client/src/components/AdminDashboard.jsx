import React, { useState, useEffect } from 'react';
import { HiOutlineChartBar } from 'react-icons/hi2';
import { FiCopy, FiRefreshCw, FiDollarSign, FiBook } from 'react-icons/fi';
import { TbArrowsTransferDown } from 'react-icons/tb';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { MdPayments } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import apiKeyService from '../services/apiKeyService';
import paymentService from '../services/paymentService';
import Sidebar from './Sidebar';
import './Dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    balance: null,
    transactions: null,
    payouts: null,
    loading: true
  });

  useEffect(() => {
    checkExistingApiKey();
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setDashboardStats(prev => ({ ...prev, loading: true }));

      // ✅ Fetch balance (requires JWT token only)
      let balanceData = null;
      let transactionsData = null;
      let payoutsData = null;

      try {
        balanceData = await paymentService.getBalance();
        console.log('✅ Balance fetched:', balanceData);
      } catch (err) {
        console.error('❌ Balance fetch error:', err.message);
      }

      // ✅ Fetch transactions (requires API key - may fail if no API key)
      try {
        transactionsData = await paymentService.getTransactions();
        console.log('✅ Transactions fetched:', transactionsData);
      } catch (err) {
        console.error('❌ Transactions fetch error:', err.message);
        // Set empty data if API key not found
        transactionsData = {
          transactions: [],
          summary: {
            total_transactions: 0,
            successful_transactions: 0
          }
        };
      }
      
      // ✅ Fetch payouts (requires JWT token only)
      try {
        payoutsData = await paymentService.getPayouts();
        console.log('✅ Payouts fetched:', payoutsData);
      } catch (err) {
        console.error('❌ Payouts fetch error:', err.message);
        payoutsData = {
          payouts: [],
          summary: {
            total_payout_requests: 0
          }
        };
      }

      setDashboardStats({
        balance: balanceData,
        transactions: transactionsData,
        payouts: payoutsData,
        loading: false
      });
    } catch (error) {
      console.error("❌ Dashboard stats error:", error);
      setDashboardStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchChartData = async () => {
    try {
      setChartData((prev) => ({ ...prev, loading: true }));

      // Calculate date range based on selected period
      const now = new Date();
      let startDate = new Date();

      if (dateRange === "daily") {
        startDate.setDate(now.getDate() - 7); // Last 7 days
      } else if (dateRange === "weekly") {
        startDate.setDate(now.getDate() - 30); // Last 30 days
      } else {
        startDate.setDate(now.getDate() - 90); // Last 90 days
      }

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = now.toISOString().split("T")[0];

      console.log("📊 Fetching chart data:", {
        dateRange,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      // Fetch payin transactions using API_ENDPOINTS.SEARCH_TRANSACTIONS from api.js
      // Endpoint: /api/payments/merchant/transactions/search
      let payinData = [];
      try {
        const payinResult = await paymentService.searchTransactions({
          startDate: startDateStr,
          endDate: endDateStr,
          page: 1,
          limit: 1000, // Get more data for better chart visualization
          sortBy: "createdAt",
          sortOrder: "asc", // Ascending for chronological chart display
        });
        payinData = payinResult.transactions || [];
        // Validate that we have real transaction data
        const validPayins = payinData.filter(
          (txn) =>
            txn &&
            (txn.createdAt || txn.created_at) &&
            typeof (txn.amount || 0) === "number"
        );
        console.log(
          "✅ Payin data fetched:",
          validPayins.length,
          "valid transactions out of",
          payinData.length,
          "total"
        );
        payinData = validPayins;
      } catch (err) {
        console.error("❌ Payin fetch error:", err.message);
        payinData = [];
      }

      // Fetch settlement transactions using API_ENDPOINTS.SEARCH_TRANSACTIONS from api.js
      // Endpoint: /api/payments/merchant/transactions/search (with status=paid, then filtered for settled)
      let settlementData = [];
      try {
        const settlementResult = await paymentService.searchTransactions({
          startDate: startDateStr,
          endDate: endDateStr,
          status: "paid",
          page: 1,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "asc",
        });
        // Filter for settled transactions - must have settlement status or settlement date
        settlementData = (settlementResult.transactions || []).filter((txn) => {
          if (!txn) return false;
          const hasSettlementStatus =
            txn.settlementStatus === "settled" ||
            txn.settlement_status === "settled";
          const hasSettlementDate = txn.settlementDate || txn.settlement_date;
          // Also validate that amount is a valid number
          const hasValidAmount =
            typeof (txn.netAmount || txn.net_amount || txn.amount || 0) ===
            "number";
          return (hasSettlementStatus || hasSettlementDate) && hasValidAmount;
        });
        console.log(
          "✅ Settlement data fetched:",
          settlementData.length,
          "valid settled transactions out of",
          (settlementResult.transactions || []).length,
          "paid transactions"
        );
      } catch (err) {
        console.error("❌ Settlement fetch error:", err.message);
        settlementData = [];
      }

      // Fetch payouts using API_ENDPOINTS.SEARCH_PAYOUTS from api.js
      // Endpoint: /api/payments/merchant/payouts/search
      let payoutData = [];
      try {
        const payoutResult = await paymentService.searchPayouts({
          startDate: startDateStr,
          endDate: endDateStr,
          page: 1,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "asc",
        });
        payoutData = payoutResult.payouts || [];
        // Validate that we have real payout data
        const validPayouts = payoutData.filter(
          (payout) =>
            payout &&
            (payout.requestedAt || payout.createdAt || payout.created_at) &&
            typeof (payout.netAmount || payout.amount || 0) === "number"
        );
        console.log(
          "✅ Payout data fetched:",
          validPayouts.length,
          "valid payouts out of",
          payoutData.length,
          "total"
        );
        payoutData = validPayouts;
      } catch (err) {
        console.error("❌ Payout fetch error:", err.message);
        payoutData = [];
      }

      // Process data for charts
      const processedPayin = processChartData(payinData, "payin");
      const processedPayout = processChartData(payoutData, "payout");
      const processedSettlement = processChartData(
        settlementData,
        "settlement"
      );

      // Log sample data for verification
      console.log("📈 Processed chart data:", {
        payin: {
          length: processedPayin.length,
          sample: processedPayin
            .slice(0, 3)
            .map((d) => ({ date: d.date, amount: d.amount, count: d.count })),
          maxAmount:
            processedPayin.length > 0
              ? Math.max(...processedPayin.map((d) => d.amount))
              : 0,
        },
        payout: {
          length: processedPayout.length,
          sample: processedPayout
            .slice(0, 3)
            .map((d) => ({ date: d.date, amount: d.amount, count: d.count })),
          maxAmount:
            processedPayout.length > 0
              ? Math.max(...processedPayout.map((d) => d.amount))
              : 0,
        },
        settlement: {
          length: processedSettlement.length,
          sample: processedSettlement
            .slice(0, 3)
            .map((d) => ({ date: d.date, amount: d.amount, count: d.count })),
          maxAmount:
            processedSettlement.length > 0
              ? Math.max(...processedSettlement.map((d) => d.amount))
              : 0,
        },
      });

      setChartData({
        payin: processedPayin,
        payout: processedPayout,
        settlement: processedSettlement,
        loading: false,
      });
    } catch (error) {
      console.error("❌ Chart data fetch error:", error);
      setChartData((prev) => ({ ...prev, loading: false }));
    }
  };

  // Fetch today's transactions for the Today Transactions section
  const fetchTodayTransactions = async () => {
    try {
      setTodayTransactions((prev) => ({ ...prev, loading: true }));

      // Get today's date range (00:00:00 to 23:59:59)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      console.log("📅 Fetching today's transactions:", {
        today: todayStr,
        tomorrow: tomorrowStr,
      });

      // Fetch today's payin transactions using API_ENDPOINTS.SEARCH_TRANSACTIONS from api.js
      // Endpoint: /api/payments/merchant/transactions/search
      let payinData = [];
      try {
        const payinResult = await paymentService.searchTransactions({
          startDate: todayStr,
          endDate: tomorrowStr,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const rawPayins = payinResult.transactions || [];
        // Validate payin data - must have createdAt and amount
        payinData = rawPayins.filter(
          (txn) =>
            txn &&
            (txn.createdAt || txn.created_at) &&
            typeof (txn.amount || 0) === "number" &&
            parseFloat(txn.amount || 0) > 0
        );
        console.log(
          "✅ Today payin fetched:",
          payinData.length,
          "valid transactions out of",
          rawPayins.length,
          "total"
        );
      } catch (err) {
        console.error("❌ Today payin fetch error:", err.message);
        payinData = [];
      }

      // Fetch today's payouts using API_ENDPOINTS.SEARCH_PAYOUTS from api.js
      // Endpoint: /api/payments/merchant/payouts/search
      let payoutData = [];
      try {
        const payoutResult = await paymentService.searchPayouts({
          startDate: todayStr,
          endDate: tomorrowStr,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const rawPayouts = payoutResult.payouts || [];
        // Validate payout data - must have requestedAt/createdAt and netAmount/amount
        payoutData = rawPayouts.filter(
          (payout) =>
            payout &&
            (payout.requestedAt || payout.createdAt || payout.created_at) &&
            typeof (payout.netAmount || payout.amount || 0) === "number" &&
            parseFloat(payout.netAmount || payout.amount || 0) > 0
        );
        console.log(
          "✅ Today payout fetched:",
          payoutData.length,
          "valid payouts out of",
          rawPayouts.length,
          "total"
        );
      } catch (err) {
        console.error("❌ Today payout fetch error:", err.message);
        payoutData = [];
      }

      // Get settled transactions from today using API_ENDPOINTS.SEARCH_TRANSACTIONS from api.js
      // Endpoint: /api/payments/merchant/transactions/search (with status=paid, then filtered for settled)
      // Must be paid AND settled
      let settlementData = [];
      try {
        const settlementResult = await paymentService.searchTransactions({
          startDate: todayStr,
          endDate: tomorrowStr,
          status: "paid",
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const rawSettlements = settlementResult.transactions || [];
        // Filter for settled transactions - must have settlement status or settlement date
        settlementData = rawSettlements.filter((txn) => {
          if (!txn) return false;
          const hasSettlementStatus =
            txn.settlementStatus === "settled" ||
            txn.settlement_status === "settled";
          const hasSettlementDate = txn.settlementDate || txn.settlement_date;
          const hasValidAmount =
            typeof (txn.netAmount || txn.net_amount || txn.amount || 0) ===
              "number" &&
            parseFloat(txn.netAmount || txn.net_amount || txn.amount || 0) > 0;
          return (hasSettlementStatus || hasSettlementDate) && hasValidAmount;
        });
        console.log(
          "✅ Today settlement fetched:",
          settlementData.length,
          "valid settled transactions out of",
          rawSettlements.length,
          "paid transactions"
        );
      } catch (err) {
        console.error("❌ Today settlement fetch error:", err.message);
        settlementData = [];
      }

      // Map data with type and ensure all required fields
      const processedPayins = payinData.map((txn) => ({
        ...txn,
        type: "payin",
        transactionId:
          txn.transactionId ||
          txn.transaction_id ||
          txn.id ||
          `payin-${Date.now()}-${Math.random()}`,
        amount: parseFloat(txn.amount || 0),
        customerName:
          txn.customerName ||
          txn.customer_name ||
          txn.customer?.name ||
          "Unknown",
        status: txn.status || "pending",
      }));

      const processedPayouts = payoutData.map((payout) => ({
        ...payout,
        type: "payout",
        payoutId:
          payout.payoutId ||
          payout.payout_id ||
          payout.id ||
          `payout-${Date.now()}-${Math.random()}`,
        netAmount: parseFloat(payout.netAmount || payout.amount || 0),
        amount: parseFloat(payout.amount || 0),
        description:
          payout.description ||
          payout.beneficiaryDetails?.accountHolderName ||
          "Payout",
        status: payout.status || "pending",
      }));

      const processedSettlements = settlementData.map((txn) => ({
        ...txn,
        type: "settlement",
        transactionId:
          txn.transactionId ||
          txn.transaction_id ||
          txn.id ||
          `settlement-${Date.now()}-${Math.random()}`,
        netAmount: parseFloat(
          txn.netAmount || txn.net_amount || txn.amount || 0
        ),
        amount: parseFloat(txn.amount || 0),
        customerName:
          txn.customerName ||
          txn.customer_name ||
          txn.customer?.name ||
          "Unknown",
        status: txn.status || "paid",
      }));

      const totalToday = {
        payin: processedPayins.length,
        payout: processedPayouts.length,
        settlement: processedSettlements.length,
      };

      console.log("📊 Today's transactions summary:", {
        payin: totalToday.payin,
        payout: totalToday.payout,
        settlement: totalToday.settlement,
        total: totalToday.payin + totalToday.payout + totalToday.settlement,
      });

      setTodayTransactions({
        payin: processedPayins,
        payout: processedPayouts,
        settlement: processedSettlements,
        loading: false,
      });
    } catch (error) {
      console.error("❌ Today transactions fetch error:", error);
      setTodayTransactions((prev) => ({ ...prev, loading: false }));
    }
  };

  const processChartData = (data, type) => {
    if (!data || data.length === 0) {
      console.log(`⚠️ No ${type} data to process`);
      return [];
    }

    // Group data by date - using same format as PayinsPage and TransactionsPage
    const grouped = {};
    let totalAmount = 0;
    let processedCount = 0;
    let skippedCount = 0;

    data.forEach((item) => {
      let dateKey;
      let amount;

      if (type === "payin") {
        // Use createdAt for payin transactions (same as PayinsPage)
        const date = item.createdAt || item.created_at;
        if (!date) {
          skippedCount++;
          return;
        }
        // Format date as ISO string for consistency
        dateKey = new Date(date).toISOString().split("T")[0];
        // Use amount field for payin (gross amount)
        const rawAmount = parseFloat(item.amount || 0);
        if (isNaN(rawAmount) || rawAmount <= 0) {
          skippedCount++;
          return;
        }
        amount = rawAmount;
      } else if (type === "payout") {
        // Use requestedAt or createdAt for payouts
        const date = item.requestedAt || item.createdAt || item.created_at;
        if (!date) {
          skippedCount++;
          return;
        }
        dateKey = new Date(date).toISOString().split("T")[0];
        // Use netAmount for payouts (amount after commission)
        const rawAmount = parseFloat(item.netAmount || item.amount || 0);
        if (isNaN(rawAmount) || rawAmount <= 0) {
          skippedCount++;
          return;
        }
        amount = rawAmount;
      } else {
        // settlement - prioritize settlement date, fallback to paid date
        const date =
          item.settlementDate ||
          item.settlement_date ||
          item.paidAt ||
          item.paid_at ||
          item.createdAt ||
          item.created_at;
        if (!date) {
          skippedCount++;
          return;
        }
        dateKey = new Date(date).toISOString().split("T")[0];
        // Use netAmount for settlements (amount after commission)
        const rawAmount = parseFloat(
          item.netAmount || item.net_amount || item.amount || 0
        );
        if (isNaN(rawAmount) || rawAmount <= 0) {
          skippedCount++;
          return;
        }
        amount = rawAmount;
      }

      if (!dateKey || isNaN(amount) || amount <= 0) {
        skippedCount++;
        return;
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, amount: 0, count: 0 };
      }
      grouped[dateKey].amount += amount;
      grouped[dateKey].count += 1;
      totalAmount += amount;
      processedCount += 1;
    });

    // Log processing summary with real data verification
    console.log(`📊 ${type} processing summary:`, {
      totalItems: data.length,
      processedItems: processedCount,
      skippedItems: skippedCount,
      totalAmount: totalAmount.toFixed(2),
      averageAmount:
        processedCount > 0 ? (totalAmount / processedCount).toFixed(2) : 0,
      uniqueDates: Object.keys(grouped).length,
      sampleGrouped: Object.entries(grouped)
        .slice(0, 5)
        .map(([date, data]) => ({
          date,
          amount: data.amount.toFixed(2),
          count: data.count,
        })),
    });

    // Convert to array and sort by date (ascending for chronological display)
    const sorted = Object.values(grouped).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Only fill in missing dates if we have actual data and range is reasonable
    if (sorted.length === 0) {
      console.warn(`⚠️ No valid ${type} data points after processing`);
      return [];
    }

    // Fill in missing dates with zero values for better visualization (only for reasonable ranges)
    const filled = [];
    const start = new Date(sorted[0].date);
    const end = new Date(sorted[sorted.length - 1].date);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Only fill gaps if range is reasonable (max 90 days)
    if (daysDiff > 0 && daysDiff <= 90) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const existing = sorted.find((item) => item.date === dateStr);
        filled.push(existing || { date: dateStr, amount: 0, count: 0 });
      }
    } else {
      // If range is too large, just return sorted data without filling
      return sorted;
    }

    const result = filled.length > 0 ? filled : sorted;
    console.log(
      `✅ Processed ${type} chart data:`,
      result.length,
      "data points",
      `(Total amount: ₹${totalAmount.toFixed(2)})`
    );
    return result;
  };

  const checkExistingApiKey = async () => {
    setFetching(true);
    setError('');
    
    try {
      const result = await apiKeyService.getApiKey();
      console.log('API key result:', result);
      
      const apiKeyValue = result?.apiKey || result?.key || result?.data?.apiKey || result?.data?.key || result;
      
      if (apiKeyValue && typeof apiKeyValue === 'string' && apiKeyValue.length > 0) {
        setApiKey(apiKeyValue);
        setHasApiKey(true);
        setSuccess('Existing API key loaded successfully!');
      } else {
        setError('No API key found. You may need to create one first.');
        setHasApiKey(false);
      }
    } catch (error) {
      if (error.message.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          authService.logout();
          navigate('/login');
        }, 2000);
      } else if (error.message.includes('Forbidden')) {
        setError('You do not have permission to access API keys.');
        setHasApiKey(false);
      } else {
        setError(error.message);
        setHasApiKey(false);
      }
    } finally {
      setFetching(false);
    }
  };

  const handleCreateApiKey = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiKeyService.createApiKey();
      const apiKeyValue = result?.apiKey || result?.key || result?.data?.apiKey || result?.data?.key || result;
      
      if (apiKeyValue && typeof apiKeyValue === 'string' && apiKeyValue.length > 0) {
        setApiKey(apiKeyValue);
        setHasApiKey(true);
        setSuccess('API key created successfully!');
        // ✅ Refresh dashboard stats after creating API key
        fetchDashboardStats();
      } else {
        setApiKey('API Key created successfully');
        setHasApiKey(true);
        setSuccess('API key created successfully!');
      }
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('already created')) {
        setError('You have already created an API key. Use the "Get API Key" button to retrieve it.');
        setHasApiKey(true);
      } else if (error.message.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          authService.logout();
          navigate('/login');
        }, 2000);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setSuccess('API key copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getTodayTransactions = () => {
    if (!dashboardStats.transactions?.transactions) return { count: 0, amount: 0 };
    
    const today = new Date().toDateString();
    const todayTxns = dashboardStats.transactions.transactions.filter(txn => 
      new Date(txn.created_at).toDateString() === today && txn.status === 'paid'
    );
    
    return {
      count: todayTxns.length,
      amount: todayTxns.reduce((sum, txn) => sum + (txn.amount || 0), 0)
    };
  };

  const getTodayPayouts = () => {
    if (!dashboardStats.payouts?.payouts) return { count: 0, amount: 0 };
    
    const today = new Date().toDateString();
    const todayPayouts = dashboardStats.payouts.payouts.filter(payout => 
      new Date(payout.requestedAt).toDateString() === today
    );
    
    return {
      count: todayPayouts.length,
      amount: todayPayouts.reduce((sum, payout) => sum + (payout.netAmount || 0), 0)
    };
  };

  // Filter transactions based on selected filter - using real API data
  const getFilteredTransactions = () => {
    if (todayTransactions.loading) return [];

    let allTransactions = [];

    // Combine all today's transactions
    allTransactions = [
      ...todayTransactions.payin,
      ...todayTransactions.payout,
      ...todayTransactions.settlement,
    ];

    // Apply filter
    if (todayPayinFilter === "all") {
      return allTransactions;
    } else {
      return allTransactions.filter((txn) => txn.type === todayPayinFilter);
    }
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate today's payin and payout from fetched data
  const todayPayin = {
    count: todayTransactions.payin.length,
    amount: todayTransactions.payin.reduce(
      (sum, txn) => sum + parseFloat(txn.amount || 0),
      0
    ),
  };
  const todayPayout = {
    count: todayTransactions.payout.length,
    amount: todayTransactions.payout.reduce(
      (sum, payout) => sum + parseFloat(payout.netAmount || payout.amount || 0),
      0
    ),
  };
  const totalTransactions =
    dashboardStats.transactions?.summary?.total_transactions || 0;
  const balance = dashboardStats.balance?.balance;
  const balanceData = dashboardStats.balance;

  // Calculate metrics from balance API data (using /payments/merchant/balance endpoint structure)
  const totalRevenue =
    balance?.total_revenue || balance?.settled_revenue || "0.00";
  const totalPayoutCount =
    balanceData?.transaction_summary?.total_payouts_completed ||
    dashboardStats.payouts?.summary?.total_payout_requests ||
    0;
  const todayPayinAmount = balance?.totalTodayRevenue || 0;
  const availableBalance = balance?.available_balance || "0.00";
  const unsettledBalance =
    balance?.unsettled_net_revenue || balance?.unsettled_revenue || "0.00";
  const payoutCount =
    balanceData?.transaction_summary?.pending_payout_requests ||
    dashboardStats.payouts?.payouts?.length ||
    0;
  const totalPayinCommission = balance?.totalPayinCommission || 0;

  // Calculate trends (mock data for now - can be enhanced with historical data)
  const calculateTrend = (current, previous = 0) => {
    if (!previous || previous === 0) return "0% VS PREV. 28 DAYS";
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}% VS PREV. 28 DAYS`;
  };

  // Prepare metric cards data
  const metricCards = [
    {
      icon: <FiDollarSign className="text-xl" />,
      title: "Total revenue",
      value: formatCurrency(totalRevenue),
      trend: calculateTrend(
        parseFloat(totalRevenue || 0),
        parseFloat(totalRevenue || 0) * 0.89
      ),
      trendColor:
        parseFloat(totalRevenue || 0) > 0 ? "text-green-400" : "text-white/60",
      showChart: false,
    },
    {
      icon: <TbArrowsTransferDown className="text-xl" />,
      title: "Total Paid Out",
      value: balance?.total_paid_out,
      trend: "0% VS PREV. 28 DAYS",
      trendColor: "text-white/60",
    },
    {
      icon: <FiArrowUp className="text-xl" />,
      title: "Today payin",
      value: formatCurrency(todayPayinAmount),
      progressLabel: "Low",
    },
    {
      icon: <FiArrowDown className="text-xl" />,
      title: "Payout",
      value: payoutCount.toString(),
      trend: null,
      subtitle: "Realtime update",
      isSpecialCard: true,
      backgroundImage: "/cardright4.png",
      actionButton: (
        <button
          onClick={() => navigate("/admin/payouts")}
          disabled={!balanceData?.payout_eligibility?.can_request_payout}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:transform-none flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <FiZap className="text-base" />
          Request payout
        </button>
      ),
    },
    {
      icon: <RiWalletLine className="text-xl" />,
      title: "Available Wallet Balance",
      value: formatCurrency(availableBalance),
      trend: calculateTrend(
        parseFloat(availableBalance || 0),
        parseFloat(availableBalance || 0) * 0.89
      ),
      trendColor:
        parseFloat(availableBalance || 0) > 0
          ? "text-green-400"
          : "text-white/60",
    },
    {
      icon: <TbArrowsTransferDown className="text-xl" />,
      title: "Unsettled Balance",
      value: formatCurrency(unsettledBalance),
      trend: "0% VS PREV. 28 DAYS",
      trendColor: "text-white/60",
    },
    {
      icon: <FiBook className="text-xl" />,
      title: "Today payin Commission",
      value: formatCurrency(totalPayinCommission),
      progressLabel: "Low",
    },
    {
      icon: <FiBook className="text-xl" />,
      title: "Today Payout commission",
      value: formatCurrency(balance?.totalTodaysPayoutCommission || 0),
    },
  ];

  // Quick Analytics data - using REAL fetched data only
  // Get last payin from chart data (most recent transaction)
  const getLastPayinAmount = () => {
    if (chartData.payin && chartData.payin.length > 0) {
      // Find the most recent non-zero payin
      const recentPayins = chartData.payin
        .filter((d) => d.amount > 0)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      if (recentPayins.length > 0) {
        return recentPayins[0].amount;
      }
    }
    // Fallback to most recent transaction from today's data
    if (todayTransactions.payin && todayTransactions.payin.length > 0) {
      const sorted = [...todayTransactions.payin].sort(
        (a, b) =>
          new Date(b.createdAt || b.created_at || 0) -
          new Date(a.createdAt || a.created_at || 0)
      );
      return parseFloat(sorted[0]?.amount || 0);
    }
    return 0;
  };

  const summaryCards = [
    {
      label: "Today payin",
      value: formatCurrency(todayPayin.amount || 0),
    },
    {
      label: "Last payin",
      value: formatCurrency(getLastPayinAmount()),
    },
    {
      label: "Today payout",
      value: `${todayPayout.count || 0} items`,
    },
  ];

  const actionItems = [
    {
      label: "View Payin Transactions",
      onClick: () => navigate("/admin/payins"),
    },
    {
      label: "View Payout Transactions",
      onClick: () => navigate("/admin/payouts"),
    },
    {
      label: "View Settlement Transactions",
      onClick: () => navigate("/admin/transactions?tab=settlement"),
    },
  ];

  const getCurrentDateRange = () => {
    const now = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `Displaying the data from ${
      monthNames[now.getMonth()]
    } ${now.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-[#001D22]">
      <Navbar />

      {/* Split Layout: Top Half (Graphic) + Bottom Half (Data) */}
      <div className="relative">
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
          {/* Spacer to show 70% of image initially - Reduced to move card up */}
          <div className="h-[calc(50vh-4rem)] sm:h-[calc(55vh-4rem)]"></div>

          {/* Cards Section - Scrolls over image */}
          <div className="bg-transparent pt-2 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              {/* Rounded Container with #122D32 background */}
              <div className="bg-[#122D32] rounded-xl p-4 sm:p-6">
                {/* Greeting and Controls */}
                <div className="mb-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                    {/* Left Section - Greeting */}
                    <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans']">
                        Hello{" "}
                        {merchantName ||
                          localStorage.getItem("businessName") ||
                          "User"}
                        !
                      </h1>
                      <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                        {getCurrentDateRange()}
                      </p>
                    </div>

                    {/* Right Section - Date Range & Action */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
                      {/* Date Range Selector */}
                      <div className="flex items-center gap-2 bg-bg-tertiary border border-white/10 rounded-full p-1 flex-1 sm:flex-initial justify-center sm:justify-start">
                        {["Daily", "Weekly", "Monthly"].map((range) => (
                          <button
                            key={range}
                            onClick={() => setDateRange(range.toLowerCase())}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 flex-1 sm:flex-initial ${
                              dateRange === range.toLowerCase()
                                ? "bg-accent text-white shadow-sm"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>

                      {/* Create Payment Link Button */}
                      <button
                        onClick={handleOpenPaymentModal}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-4 sm:px-5 py-2 rounded-full text-sm sm:text-base font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary w-full sm:w-auto whitespace-nowrap"
                      >
                        <FiPlus className="text-base sm:text-lg" />
                        <span className="hidden sm:inline">
                          Create payment link
                        </span>
                        <span className="sm:hidden">Create link</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metric Cards Grid - 2 rows of 4 cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                  {metricCards.map((card, index) => (
                    <MetricCard key={index} {...card} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Below - Appears when scrolling */}
          <div className="bg-transparent px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-[1400px] mx-auto">
              {/* Bottom Section - Quick Analytics and Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8">
                {/* Quick Analytics - Left */}
                <QuickAnalytics
                  summaryCards={summaryCards}
                  actionItems={actionItems}
                  chartData={chartData}
                  dateRange={dateRange}
                />

                {/* Today Payin Table - Right */}
                <div className="bg-bg-secondary border border-white/10 rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h2 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
                        Today Transactions{" "}
                        {todayTransactions.loading
                          ? "..."
                          : filteredTransactions.length || 0}
                      </h2>
                      <div className="relative flex-1 sm:flex-initial max-w-xs">
                        <input
                          type="text"
                          placeholder="Search..."
                          className="bg-bg-tertiary border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent w-full font-['Albert_Sans']"
                        />
                      </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-2 bg-bg-tertiary border border-white/10 rounded-lg p-1">
                      {[
                        { value: "all", label: "All" },
                        { value: "payin", label: "In" },
                        { value: "payout", label: "Out" },
                        { value: "settlement", label: "Settlement" },
                      ].map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => setTodayPayinFilter(filter.value)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 flex-1 sm:flex-initial ${
                            todayPayinFilter === filter.value
                              ? "bg-accent text-white shadow-sm"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table - Scrollable */}
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-bg-secondary z-10">
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs font-medium text-white/60 uppercase tracking-wider font-['Albert_Sans']">
                            <input
                              type="checkbox"
                              className="rounded border-white/20"
                            />
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs font-medium text-white/60 uppercase tracking-wider font-['Albert_Sans']">
                            Name
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs font-medium text-white/60 uppercase tracking-wider font-['Albert_Sans'] hidden sm:table-cell">
                            Amount
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs font-medium text-white/60 uppercase tracking-wider font-['Albert_Sans'] hidden md:table-cell">
                            Type
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs font-medium text-white/60 uppercase tracking-wider font-['Albert_Sans'] hidden lg:table-cell">
                            Status
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs font-medium text-white/60 uppercase tracking-wider font-['Albert_Sans']">
                            Label
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayTransactions.loading ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="py-8 text-center text-white/60 text-xs sm:text-sm font-['Albert_Sans']"
                            >
                              Loading transactions...
                            </td>
                          </tr>
                        ) : filteredTransactions.length > 0 ? (
                          filteredTransactions
                            .slice(0, 10)
                            .map((txn, index) => (
                              <tr
                                key={
                                  txn.transactionId ||
                                  txn.payoutId ||
                                  txn.transaction_id ||
                                  txn.id ||
                                  index
                                }
                                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => {
                                  if (
                                    txn.type === "payin" ||
                                    txn.type === "settlement"
                                  ) {
                                    navigate(
                                      `/admin/transactions/${
                                        txn.transactionId ||
                                        txn.transaction_id ||
                                        txn.id
                                      }`
                                    );
                                  }
                                }}
                              >
                                <td className="py-2 sm:py-3 px-2 sm:px-4">
                                  <input
                                    type="checkbox"
                                    className="rounded border-white/20"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-white text-xs sm:text-sm font-['Albert_Sans']">
                                  {/* Display name based on transaction type */}
                                  {txn.type === "payout"
                                    ? txn.description ||
                                      txn.beneficiaryDetails
                                        ?.accountHolderName ||
                                      `Payout ${txn.payoutId || index + 1}`
                                    : txn.customerName ||
                                      txn.customer_name ||
                                      txn.customer?.name ||
                                      txn.description ||
                                      `Transaction ${index + 1}`}
                                  <span className="ml-2 text-xs text-white/40">
                                    ({txn.type || "payin"})
                                  </span>
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-white text-xs sm:text-sm font-['Albert_Sans'] hidden sm:table-cell">
                                  {/* Show netAmount for payout/settlement, amount for payin */}
                                  {formatCurrency(
                                    txn.type === "payout" ||
                                      txn.type === "settlement"
                                      ? txn.netAmount ||
                                          txn.net_amount ||
                                          txn.amount ||
                                          0
                                      : txn.amount || 0
                                  )}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden md:table-cell">
                                  {txn.type || "payin"}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden lg:table-cell">
                                  {txn.status || "-"}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <span
                                      className={`text-xs font-['Albert_Sans'] ${
                                        txn.type === "payin"
                                          ? "text-green-400"
                                          : txn.type === "payout"
                                          ? "text-amber-400"
                                          : "text-blue-400"
                                      }`}
                                    >
                                      {txn.type === "payin"
                                        ? "In"
                                        : txn.type === "payout"
                                        ? "Out"
                                        : "Settled"}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td
                              colSpan="6"
                              className="py-8 text-center text-white/60 text-xs sm:text-sm font-['Albert_Sans']"
                            >
                              No transactions found for selected filter
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* API Key Management Section - Collapsible */}
              <details className="mt-6 sm:mt-8 bg-[#122D32] border border-white/10 rounded-xl overflow-hidden shadow-lg">
                <summary className="p-4 sm:p-6 cursor-pointer text-white font-medium text-base sm:text-lg font-['Albert_Sans'] hover:bg-white/5 transition-colors flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <FiBook className="text-accent text-lg" />
                  </div>
                  <span>API Key Management</span>
                  <svg
                    className="w-5 h-5 ml-auto transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="p-4 sm:p-6 pt-0 border-t border-white/10">
                  {/* Description */}
                  <div className="mb-6">
                    <p className="text-white/70 text-sm sm:text-base font-['Albert_Sans'] leading-relaxed">
                      Create and manage your API keys for accessing the backend
                      services. Your API key is required to authenticate
                      requests to the API endpoints.
                    </p>
                  </div>

                  {/* Loading State */}
                  {fetching && (
                    <div className="mb-5 flex items-center justify-center gap-2 text-accent bg-accent/10 border border-accent/30 rounded-lg p-3 sm:p-4 text-sm font-medium font-['Albert_Sans']">
                      <FiRefreshCw className="animate-spin" />
                      <span>Checking for existing API key...</span>
                    </div>
                  )}

                  {/* Action Buttons Section */}
                  {!apiKey && (
                    <div className="mb-6">
                      {!hasApiKey ? (
                        <div className="flex flex-col items-center gap-4">
                          <button
                            onClick={handleCreateApiKey}
                            disabled={loading || fetching}
                            className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm sm:text-base font-medium font-['Albert_Sans'] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <>
                                <FiRefreshCw className="animate-spin" />
                                <span>Creating...</span>
                              </>
                            ) : (
                              <>
                                <FiPlus />
                                <span>Create New API Key</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                            <button
                              onClick={checkExistingApiKey}
                              disabled={fetching}
                              className="w-full sm:w-auto bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm sm:text-base font-medium font-['Albert_Sans'] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {fetching ? (
                                <>
                                  <FiRefreshCw className="animate-spin" />
                                  <span>Loading...</span>
                                </>
                              ) : (
                                <>
                                  <FiCopy />
                                  <span>Get API Key</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3 sm:p-4">
                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg
                                className="w-3 h-3 text-green-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <p className="text-green-400 text-sm sm:text-base font-medium font-['Albert_Sans'] flex-1">
                              You have already created an API key. Use the
                              button above to retrieve it.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}

            {apiKey && (
              <div className="api-key-display">
                <h3>Your API Key:</h3>
                <div className="api-key-container">
                  <input 
                    type="text" 
                    value={apiKey} 
                    readOnly 
                    className="api-key-input"
                  />
                  <button onClick={copyToClipboard} className="copy-btn">
                    <FiCopy />
                    Copy
                  </button>
                </div>
                <p className="api-key-warning">
                  ⚠️ Keep this API key secure and don't share it publicly.
                </p>
              </div>
            )}
          </div>

          {/* Quick Access Cards */}
          <div className="quick-access">
            <h2>Quick Access</h2>
            <p>Navigate to different sections of the payment system.</p>
            
            <div className="access-grid">
              <div className="access-card" onClick={() => navigate('/admin/transactions')}>
                <div className="access-icon"><HiOutlineChartBar /></div>
                <h3>Transactions</h3>
                <p>View and manage all payment transactions</p>
                <div className="access-badge">
                  {totalTransactions} Total
                </div>
              </div>
              
              <div className="access-card" onClick={() => navigate('/admin/payouts')}>
                <div className="access-icon"><TbArrowsTransferDown /></div>
                <h3>Payouts</h3>
                <p>Manage payout requests and history</p>
                <div className="access-badge">
                  {dashboardStats.payouts?.summary?.total_payout_requests || 0} Total
                </div>
              </div>
              
              <div className="access-card" onClick={() => navigate('/admin/payins')}>
                <div className="access-icon"><RiMoneyDollarCircleLine /></div>
                <h3>Balance</h3>
                <p>View account balance and financial overview</p>
                <div className="access-badge">
                  {formatCurrency(availableBalance)}
                </div>
              </div>
              
              <div className="access-card" onClick={() => navigate('/admin/payments')}>
                <div className="access-icon"><MdPayments /></div>
                <h3>Payments</h3>
                <p>Create and manage payment links</p>
                <div className="access-badge">
                  Create Link
                </div>
              </div>
              
              <div className="access-card" onClick={() => navigate('/admin/api-docs')}>
                <div className="access-icon"><FiBook /></div>
                <h3>API Documentation</h3>
                <p>Integration guide and API reference</p>
                <div className="access-badge">
                  View Docs
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
