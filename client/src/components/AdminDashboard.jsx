import React, { useState, useEffect } from "react";
import { HiOutlineChartBar } from "react-icons/hi2";
import {
  FiCopy,
  FiRefreshCw,
  FiDollarSign,
  FiBook,
  FiArrowUp,
  FiArrowDown,
  FiPlus,
  FiZap,
  FiCreditCard,
  FiExternalLink,
  FiX,
  FiSmartphone,
  FiClock,
} from "react-icons/fi";
import { TbArrowsTransferDown } from "react-icons/tb";
import { RiMoneyDollarCircleLine, RiWalletLine } from "react-icons/ri";
import { MdPayments } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import apiKeyService from "../services/apiKeyService";
import paymentService from "../services/paymentService";
import Navbar from "./Navbar";
import MetricCard from "./dashboard/MetricCard";
import QuickAnalytics from "./dashboard/QuickAnalytics";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    balance: null,
    transactions: null,
    payouts: null,
    loading: true,
  });

  const [dateRange, setDateRange] = useState("monthly");
  const [merchantName, setMerchantName] = useState("");
  const [todayPayinFilter, setTodayPayinFilter] = useState("all"); // 'all', 'payin', 'payout', 'settlement'
  const [chartData, setChartData] = useState({
    payin: [],
    payout: [],
    settlement: [],
    loading: true,
  });
  const [todayTransactions, setTodayTransactions] = useState({
    payin: [],
    payout: [],
    settlement: [],
    loading: true,
  });


  // Payment link modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createLinkLoading, setCreateLinkLoading] = useState(false);
  const [createLinkError, setCreateLinkError] = useState("");
  const [createdPaymentLink, setCreatedPaymentLink] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    description: "",
  });

  // Helper to get relative time from timestamp
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diff = date - now;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) {
      return 'now';
    } else if (minutes < 60) {
      return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (hours < 24) {
      return `in ${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${(minutes % 60) > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }
  };

  // Fetch data on component mount and when date range changes
  useEffect(() => {
    checkExistingApiKey();
    fetchDashboardStats();
    fetchChartData(); // Fetches chart data for Quick Analytics (payin, payout, settlement)
    fetchTodayTransactions(); // Fetches today's transactions for Today Transactions table
  }, [dateRange]);

  // Refresh today's transactions periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodayTransactions();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);


  const fetchDashboardStats = async () => {
    try {
      setDashboardStats((prev) => ({ ...prev, loading: true }));

      // ✅ Fetch all data in parallel for faster loading
      const [balanceResult, transactionsResult, payoutsResult] = await Promise.allSettled([
        paymentService.getBalance().catch(err => {
          console.error("❌ Balance fetch error:", err.message);
          return null;
        }),
        paymentService.getTransactions().catch(err => {
          console.error("❌ Transactions fetch error:", err.message);
          // Return empty data if API key not found
          return {
            transactions: [],
            summary: {
              total_transactions: 0,
              successful_transactions: 0,
            },
          };
        }),
        paymentService.getPayouts().catch(err => {
          console.error("❌ Payouts fetch error:", err.message);
          return {
            payouts: [],
            summary: {
              total_payout_requests: 0,
            },
          };
        })
      ]);

      // Extract results
      const balanceData = balanceResult.status === 'fulfilled' ? balanceResult.value : null;
      const transactionsData = transactionsResult.status === 'fulfilled' ? transactionsResult.value : {
        transactions: [],
        summary: { total_transactions: 0, successful_transactions: 0 },
      };
      const payoutsData = payoutsResult.status === 'fulfilled' ? payoutsResult.value : {
        payouts: [],
        summary: { total_payout_requests: 0 },
      };

      // Extract merchant name from balance data
      if (balanceData?.merchant?.merchantName) {
        setMerchantName(balanceData.merchant.merchantName);
      }

      setDashboardStats({
        balance: balanceData,
        transactions: transactionsData,
        payouts: payoutsData,
        loading: false,
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
        startDate.setDate(now.getDate() - 6); // Last 7 days (including today)
      } else if (dateRange === "weekly") {
        startDate.setDate(now.getDate() - 6); // Last 7 days (including today)
      } else {
        // monthly
        startDate.setDate(now.getDate() - 29); // Last 30 days (including today)
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

  // Fetch transactions for the last 24 hours (frontend filtered)
  const fetchTodayTransactions = async () => {
    try {
      setTodayTransactions((prev) => ({ ...prev, loading: true }));

      // Calculate 24 hours ago timestamp
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      console.log("📅 Fetching transactions from last 24 hours:", {
        now: now.toISOString(),
        twentyFourHoursAgo: twentyFourHoursAgo.toISOString(),
      });

      // Fetch all payin transactions (no date limit, we'll filter on frontend)
      // Endpoint: /api/payments/merchant/transactions/search
      let payinData = [];
      try {
        const payinResult = await paymentService.searchTransactions({
          limit: 1000, // Fetch more data, filter on frontend
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const rawPayins = payinResult.transactions || [];
        // Filter: must be within last 24 hours (createdAt or updatedAt)
        // IMPORTANT: Exclude settled transactions from payin data
        payinData = rawPayins.filter((txn) => {
          if (!txn) return false;
          // Exclude settled transactions - they belong in settlement array
          const isSettled =
            txn.settlementStatus === "settled" ||
            txn.settlement_status === "settled" ||
            txn.settlementDate ||
            txn.settlement_date;
          if (isSettled) return false; // Skip settled transactions

          const createdAt = txn.createdAt || txn.created_at;
          const updatedAt = txn.updatedAt || txn.updated_at;
          const txnDate = createdAt
            ? new Date(createdAt)
            : updatedAt
            ? new Date(updatedAt)
            : null;
          if (!txnDate) return false;
          const isWithin24Hours = txnDate >= twentyFourHoursAgo;
          const hasValidAmount =
            typeof (txn.amount || 0) === "number" &&
            parseFloat(txn.amount || 0) > 0;
          return isWithin24Hours && hasValidAmount;
        });
        console.log(
          "✅ Payin fetched (last 24 hours):",
          payinData.length,
          "valid transactions out of",
          rawPayins.length,
          "total"
        );
      } catch (err) {
        console.error("❌ Payin fetch error:", err.message);
        payinData = [];
      }

      // Fetch all payouts (no date limit, we'll filter on frontend)
      // Endpoint: /api/payments/merchant/payouts/search
      let payoutData = [];
      try {
        const payoutResult = await paymentService.searchPayouts({
          limit: 1000, // Fetch more data, filter on frontend
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const rawPayouts = payoutResult.payouts || [];
        // Filter: must be within last 24 hours (createdAt or updatedAt)
        // IMPORTANT: Only include actual payout records (not transactions)
        payoutData = rawPayouts.filter((payout) => {
          if (!payout) return false;
          // Ensure this is actually a payout (has payoutId or is from payout endpoint)
          const isPayout = payout.payoutId || payout.payout_id || payout.id;
          if (!isPayout) return false; // Skip if not a valid payout

          const createdAt = payout.createdAt || payout.created_at;
          const updatedAt = payout.updatedAt || payout.updated_at;
          const payoutDate = createdAt
            ? new Date(createdAt)
            : updatedAt
            ? new Date(updatedAt)
            : null;
          if (!payoutDate) return false;
          const isWithin24Hours = payoutDate >= twentyFourHoursAgo;
          const hasValidAmount =
            typeof (payout.netAmount || payout.amount || 0) === "number" &&
            parseFloat(payout.netAmount || payout.amount || 0) > 0;
          return isWithin24Hours && hasValidAmount;
        });
        console.log(
          "✅ Payout fetched (last 24 hours):",
          payoutData.length,
          "valid payouts out of",
          rawPayouts.length,
          "total"
        );
      } catch (err) {
        console.error("❌ Payout fetch error:", err.message);
        payoutData = [];
      }

      // Fetch all settled transactions (no date limit, we'll filter on frontend)
      // Endpoint: /api/payments/merchant/transactions/search
      // Filter for transactions with settlementStatus: "settled" (server-side filter)
      let settlementData = [];
      try {
        const settlementResult = await paymentService.searchTransactions({
          settlementStatus: "settled", // Server-side filter
          limit: 1000, // Fetch more data, filter on frontend
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const rawSettlements = settlementResult.transactions || [];
        // Filter: must be within last 24 hours (createdAt or updatedAt)
        // IMPORTANT: Only include truly settled transactions
        settlementData = rawSettlements.filter((txn) => {
          if (!txn) return false;
          // Must be settled - double check settlement status
          const isSettled =
            txn.settlementStatus === "settled" ||
            txn.settlement_status === "settled" ||
            txn.settlementDate ||
            txn.settlement_date;
          if (!isSettled) return false; // Skip if not settled

          const createdAt = txn.createdAt || txn.created_at;
          const updatedAt = txn.updatedAt || txn.updated_at;
          const txnDate = createdAt
            ? new Date(createdAt)
            : updatedAt
            ? new Date(updatedAt)
            : null;
          if (!txnDate) return false;
          const isWithin24Hours = txnDate >= twentyFourHoursAgo;
          const hasValidAmount =
            typeof (txn.netAmount || txn.net_amount || txn.amount || 0) ===
              "number" &&
            parseFloat(txn.netAmount || txn.net_amount || txn.amount || 0) > 0;
          return isWithin24Hours && hasValidAmount;
        });
        console.log(
          "✅ Settlement fetched (last 24 hours):",
          settlementData.length,
          "valid settled transactions out of",
          rawSettlements.length,
          "total transactions"
        );
      } catch (err) {
        console.error("❌ Settlement fetch error:", err.message);
        settlementData = [];
      }

      // Map data with type and ensure all required fields
      const processedPayins = payinData.map((txn) => {
        // Ensure type is explicitly set to "payin" and override any existing type
        const processed = {
          ...txn,
          type: "payin", // Explicitly set type to payin
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
        };
        // Force type to be "payin" to prevent any type confusion
        processed.type = "payin";
        return processed;
      });

      const processedPayouts = payoutData.map((payout) => {
        // Ensure type is explicitly set to "payout" and override any existing type
        const processed = {
          ...payout,
          type: "payout", // Explicitly set type to payout
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
        };
        // Force type to be "payout" to prevent any type confusion
        processed.type = "payout";
        return processed;
      });

      const processedSettlements = settlementData.map((txn) => {
        // Ensure type is explicitly set to "settlement" and override any existing type
        // Settlement transactions are identified by settlementStatus: "settled"
        const processed = {
          ...txn,
          type: "settlement", // Explicitly set type to settlement
          settlementStatus:
            txn.settlementStatus || txn.settlement_status || "settled", // Ensure settlementStatus is set
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
        };
        // Force type to be "settlement" and ensure settlementStatus is "settled"
        processed.type = "settlement";
        processed.settlementStatus = "settled";
        return processed;
      });

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
    setError("");

    try {
      const result = await apiKeyService.getApiKey();
      console.log("API key result:", result);

      const apiKeyValue =
        result?.apiKey ||
        result?.key ||
        result?.data?.apiKey ||
        result?.data?.key ||
        result;

      if (
        apiKeyValue &&
        typeof apiKeyValue === "string" &&
        apiKeyValue.length > 0
      ) {
        setApiKey(apiKeyValue);
        setHasApiKey(true);
        setSuccess("Existing API key loaded successfully!");
      } else {
        setError("No API key found. You may need to create one first.");
        setHasApiKey(false);
      }
    } catch (error) {
      if (error.message.includes("Unauthorized")) {
        setError("Session expired. Please log in again.");
        setTimeout(() => {
          authService.logout();
          navigate("/login");
        }, 2000);
      } else if (error.message.includes("Forbidden")) {
        setError("You do not have permission to access API keys.");
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
    setError("");
    setSuccess("");

    try {
      const result = await apiKeyService.createApiKey();
      const apiKeyValue =
        result?.apiKey ||
        result?.key ||
        result?.data?.apiKey ||
        result?.data?.key ||
        result;

      if (
        apiKeyValue &&
        typeof apiKeyValue === "string" &&
        apiKeyValue.length > 0
      ) {
        setApiKey(apiKeyValue);
        setHasApiKey(true);
        setSuccess("API key created successfully!");
        // ✅ Refresh dashboard stats after creating API key
        fetchDashboardStats();
      } else {
        setApiKey("API Key created successfully");
        setHasApiKey(true);
        setSuccess("API key created successfully!");
      }
    } catch (error) {
      if (
        error.message.includes("already exists") ||
        error.message.includes("already created")
      ) {
        setError(
          'You have already created an API key. Use the "Get API Key" button to retrieve it.'
        );
        setHasApiKey(true);
      } else if (error.message.includes("Unauthorized")) {
        setError("Session expired. Please log in again.");
        setTimeout(() => {
          authService.logout();
          navigate("/login");
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
      setSuccess("API key copied to clipboard!");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // Payment link handlers
  const handleOpenPaymentModal = () => {
    setShowPaymentModal(true);
    setCreateLinkError("");
    setCreatedPaymentLink(null);
    setPaymentData({
      amount: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      description: "",
    });
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setCreateLinkError("");
    setCreatedPaymentLink(null);
    setPaymentData({
      amount: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      description: "",
    });
  };

  const handlePaymentDataChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreatePaymentLink = async (e) => {
    e.preventDefault();
    setCreateLinkLoading(true);
    setCreateLinkError("");
    setCreatedPaymentLink(null);

    // Validate phone number
    if (paymentData.customerPhone && paymentData.customerPhone.length !== 10) {
      setCreateLinkError("Phone number must be exactly 10 digits");
      setCreateLinkLoading(false);
      return;
    }

    try {
      const result = await paymentService.createPaymentLink({
        amount: parseFloat(paymentData.amount),
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        customerPhone: paymentData.customerPhone,
        description: paymentData.description,
      });

      setCreatedPaymentLink(result);
      setPaymentData({
        amount: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        description: "",
      });
    } catch (error) {
      setCreateLinkError(error.message);
    } finally {
      setCreateLinkLoading(false);
    }
  };

  const copyPaymentLinkToClipboard = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setSuccess("Payment link copied to clipboard!");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const openPaymentLink = (url, paytmParams, easebuzzParams) => {
    // Handle form-based payment (Paytm or Easebuzz)
    const formParams = paytmParams || easebuzzParams;
    if (formParams && url) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      form.target = '_blank';
      
      // Add all parameters as hidden inputs
      Object.keys(formParams).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formParams[key];
        form.appendChild(input);
      });
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } else if (url) {
      // Regular URL opening for other payment gateways
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openDeepLink = (url, appName) => {
    if (!url || url === 'Not available' || url === null) {
      setSuccess(`${appName} deep link not available`);
      setTimeout(() => setSuccess(""), 3000);
      return;
    }
    // Try to open the deep link
    window.location.href = url;
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getTodayTransactions = () => {
    if (!dashboardStats.transactions?.transactions)
      return { count: 0, amount: 0 };

    const today = new Date().toDateString();
    const todayTxns = dashboardStats.transactions.transactions.filter(
      (txn) =>
        new Date(txn.created_at).toDateString() === today &&
        txn.status === "paid"
    );

    return {
      count: todayTxns.length,
      amount: todayTxns.reduce((sum, txn) => sum + (txn.amount || 0), 0),
    };
  };

  const getTodayPayouts = () => {
    if (!dashboardStats.payouts?.payouts) return { count: 0, amount: 0 };

    const today = new Date().toDateString();
    const todayPayouts = dashboardStats.payouts.payouts.filter(
      (payout) => new Date(payout.requestedAt).toDateString() === today
    );

    return {
      count: todayPayouts.length,
      amount: todayPayouts.reduce(
        (sum, payout) => sum + (payout.netAmount || 0),
        0
      ),
    };
  };

  // Filter transactions based on selected filter - using real API data
  // Limit to 25 items maximum
  const getFilteredTransactions = () => {
    if (todayTransactions.loading) return [];

    let filtered = [];

    // Apply filter based on selected tab - show only the selected type
    // Strictly filter to ensure only the correct type is shown
    if (todayPayinFilter === "payin") {
      // Show only payin transactions (label: "In")
      // Filter from payin array and ensure type is exactly "payin" AND not settled
      filtered = todayTransactions.payin.filter((txn) => {
        if (!txn) return false;
        // Must be payin type
        if (txn.type !== "payin") return false;
        // Must NOT be settled (settled transactions should not appear in payin)
        const isSettled =
          txn.settlementStatus === "settled" ||
          txn.settlement_status === "settled" ||
          txn.settlementDate ||
          txn.settlement_date;
        if (isSettled) return false;
        return true;
      });
    } else if (todayPayinFilter === "payout") {
      // Show only payout transactions (label: "Out")
      // Filter from payout array and ensure type is exactly "payout"
      filtered = todayTransactions.payout.filter((txn) => {
        if (!txn) return false;
        // Must be payout type
        return txn.type === "payout";
      });
    } else if (todayPayinFilter === "settlement") {
      // Show only settlement transactions (label: "Settled")
      // Filter from settlement array - transactions with settlementStatus: "settled"
      filtered = todayTransactions.settlement.filter((txn) => {
        if (!txn) return false;
        // Must be settlement type
        if (txn.type !== "settlement") return false;
        // Must have settlementStatus: "settled" (this is the key identifier)
        const isSettled =
          txn.settlementStatus === "settled" ||
          txn.settlement_status === "settled" ||
          txn.settlementDate ||
          txn.settlement_date;
        if (!isSettled) return false;
        return true;
      });
    } else {
      // Show all transactions (when filter is "all")
      // Include: payin (non-settled), payout, and settlement (settlementStatus: "settled")
      filtered = [
        // Payin transactions (excluding settled ones)
        ...todayTransactions.payin.filter((txn) => {
          if (!txn) return false;
          if (txn.type !== "payin") return false;
          // Exclude settled from payin - settled transactions belong in settlement
          const isSettled =
            txn.settlementStatus === "settled" ||
            txn.settlement_status === "settled" ||
            txn.settlementDate ||
            txn.settlement_date;
          return !isSettled;
        }),
        // Payout transactions
        ...todayTransactions.payout.filter(
          (txn) => txn && txn.type === "payout"
        ),
        // Settlement transactions (settlementStatus: "settled")
        ...todayTransactions.settlement.filter((txn) => {
          if (!txn) return false;
          // Must be settlement type
          if (txn.type !== "settlement") return false;
          // Must have settlementStatus: "settled" - this is the key identifier for settlement data
          const isSettled =
            txn.settlementStatus === "settled" ||
            txn.settlement_status === "settled" ||
            txn.settlementDate ||
            txn.settlement_date;
          return isSettled;
        }),
      ];
    }

    // Sort by date (most recent first) - prioritize createdAt, fallback to updatedAt
    filtered.sort((a, b) => {
      const dateA = new Date(
        a.createdAt || a.created_at || a.updatedAt || a.updated_at || 0
      );
      const dateB = new Date(
        b.createdAt || b.created_at || b.updatedAt || b.updated_at || 0
      );
      return dateB - dateA; // Descending (newest first)
    });

    // Limit to 25 items maximum
    return filtered.slice(0, 25);
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
  // Use weekly/monthly data based on selected date range
  const getPeriodData = () => {
    if (dateRange === "weekly" && balanceData?.balanceOfPastWeek) {
      return balanceData.balanceOfPastWeek;
    } else if (dateRange === "monthly" && balanceData?.balanceOfPastMonth) {
      return balanceData.balanceOfPastMonth;
    }
    return null; // Use default balance for daily
  };

  const periodData = getPeriodData();
  const totalRevenue = periodData
    ? periodData.total_revenue
    : balance?.total_revenue || balance?.settled_revenue || "0.00";
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
  const totalPayinCommission = periodData
    ? periodData.total_commission
    : balance?.totalPayinCommission || 0;
  const totalPaidOut = periodData
    ? periodData.total_paid_out
    : balance?.total_paid_out || "0.00";
  const totalPayoutCommission = periodData
    ? periodData.total_payout_commission
    : balance?.totalTodaysPayoutCommission || 0;

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
      title: "Total Paid payout",
      value: `${formatCurrency(totalPaidOut)}`,
      trendColor: "text-white/60",
    },
    {
      icon: <FiArrowUp className="text-xl" />,
      title: dateRange === "weekly" ? "Week Payin" : dateRange === "monthly" ? "Month Payin" : "Today payin",
      value: dateRange === "weekly" || dateRange === "monthly"
        ? formatCurrency(parseFloat(totalRevenue || 0))
        : formatCurrency(todayPayinAmount),
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
      subtitle: balanceData?.balance?.blocked_balance && parseFloat(balanceData.balance.blocked_balance) > 0
        ? `Freezed: ${formatCurrency(parseFloat(balanceData.balance.blocked_balance))}`
        : null,
    },
    {
      icon: <TbArrowsTransferDown className="text-xl" />,
      title: "Unsettled Balance",
      value: formatCurrency(unsettledBalance),
      trendColor: "text-white/60",
    },
    {
      icon: <FiBook className="text-xl" />,
      title: dateRange === "weekly" ? "Week Payin Commission" : dateRange === "monthly" ? "Month Payin Commission" : "Today payin Commission",
      value: formatCurrency(parseFloat(totalPayinCommission || 0)),
      subtitle: (() => {
        // Calculate GST from commission
        // Commission stored is total (baseCommission + GST)
        // Formula: totalCommission = baseCommission + GST
        // GST = baseCommission * 18% = baseCommission * 0.18
        // So: totalCommission = baseCommission + (baseCommission * 0.18) = baseCommission * 1.18
        // Therefore: baseCommission = totalCommission / 1.18
        // And: GST = totalCommission - baseCommission = totalCommission * (0.18 / 1.18)
        const commission = parseFloat(totalPayinCommission || 0);
        const gstRate = 18; // 18% GST rate
        // GST = commission * (gstRate / (100 + gstRate))
        const gstAmount = commission * (gstRate / (100 + gstRate));
        return `GST Rate: ${gstRate}% | Total GST: ${formatCurrency(gstAmount)}`;
      })(),
    },
    {
      icon: <FiBook className="text-xl" />,
      title: dateRange === "weekly" ? "Week Payout commission" : dateRange === "monthly" ? "Month Payout commission" : "Today Payout commission",
      value: formatCurrency(parseFloat(totalPayoutCommission || 0)),
      progressLabel: "Low",
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
    
    if (dateRange === "daily") {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      return `Displaying data from ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (Last 7 days)`;
    } else if (dateRange === "weekly") {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      return `Displaying data from ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (Last 7 days)`;
    } else {
      // monthly
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29);
      return `Displaying data from ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (Last 30 days)`;
    }
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
                  {dashboardStats.loading ? (
                    // Show skeleton cards while loading
                    Array.from({ length: 8 }).map((_, index) => (
                      <MetricCard key={index} loading={true} />
                    ))
                  ) : (
                    metricCards.map((card, index) => (
                      <MetricCard key={index} {...card} loading={false} />
                    ))
                  )}
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
                        Last 24 Hours{" "}
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
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
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
                          filteredTransactions.map((txn, index) => (
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
                                    txn.beneficiaryDetails?.accountHolderName ||
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
                                        : txn.type === "settlement"
                                        ? "text-blue-400"
                                        : "text-white/60"
                                    }`}
                                  >
                                    {txn.type === "payin"
                                      ? "In"
                                      : txn.type === "payout"
                                      ? "Out"
                                      : txn.type === "settlement"
                                      ? "Settled"
                                      : "-"}
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

                  {/* Error Message */}
                  {error && (
                    <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 sm:p-4">
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-3 h-3 text-red-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <p className="text-red-400 text-sm sm:text-base font-medium font-['Albert_Sans'] flex-1">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Success Message */}
                  {success && !apiKey && (
                    <div className="mb-5 flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3 sm:p-4">
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
                        {success}
                      </p>
                    </div>
                  )}

                  {/* API Key Display */}
                  {apiKey && (
                    <div className="bg-bg-tertiary rounded-xl p-5 sm:p-6 border border-white/10 shadow-inner">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                          <FiCopy className="text-accent text-xl" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-semibold text-white font-['Albert_Sans']">
                            Your API Key
                          </h3>
                          <p className="text-white/60 text-xs sm:text-sm font-['Albert_Sans'] mt-0.5">
                            Copy this key to use in your API requests
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={apiKey}
                            readOnly
                            className="w-full px-4 py-3.5 border-2 border-white/10 rounded-lg text-xs sm:text-sm font-mono bg-bg-secondary text-green-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 hover:border-white/20 break-all pr-20"
                          />
                          <button
                            onClick={copyToClipboard}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-medium font-['Albert_Sans'] cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-95 flex items-center gap-2"
                            title="Copy to clipboard"
                          >
                            <FiCopy className="text-sm" />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 sm:p-4">
                        <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg
                            className="w-3 h-3 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-yellow-400 text-xs sm:text-sm font-medium font-['Albert_Sans'] flex-1 leading-relaxed">
                          Keep this API key secure and don't share it publicly.
                          Anyone with access to this key can make requests on
                          your behalf.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        </section>
      </div>

      {/* Payment Link Creation Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClosePaymentModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl sm:text-2xl font-medium text-white font-['Albert_Sans']">
                Create Payment Link
              </h3>
              <button
                onClick={handleClosePaymentModal}
                className="text-white/70 hover:text-white transition-colors duration-200 p-2 hover:bg-white/5 rounded-lg"
                aria-label="Close modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Error Message */}
              {createLinkError && (
                <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 sm:p-4">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-red-400 text-sm sm:text-base font-medium font-['Albert_Sans'] flex-1">
                    {createLinkError}
                  </p>
                </div>
              )}

              {/* Success - Created Link Display */}
              {createdPaymentLink && (
                <div className="mb-5 bg-green-500/10 border border-green-500/30 rounded-lg p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-green-400"
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
                    <h4 className="text-green-400 text-lg font-semibold font-['Albert_Sans']">
                      Payment Link Created Successfully!
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {/* Payment Link - Show for all gateways including Cashfree */}
                    <div>
                      <label className="block text-white/70 text-sm font-medium font-['Albert_Sans'] mb-2">
                        Payment Link:
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            createdPaymentLink.paymentLink || 
                            createdPaymentLink.payment_url || 
                            createdPaymentLink.raw?.link_url || // Cashfree Payment Links API
                            createdPaymentLink.raw?.payment_url ||
                            createdPaymentLink.raw?.paymentLink ||
                            ""
                          }
                          readOnly
                          className="w-full px-4 py-3 border-2 border-white/10 rounded-lg text-sm font-mono bg-bg-secondary text-green-400 focus:outline-none break-all pr-24"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                          <button
                            onClick={() =>
                              copyPaymentLinkToClipboard(
                                createdPaymentLink.paymentLink || 
                                createdPaymentLink.payment_url || 
                                createdPaymentLink.raw?.link_url || // Cashfree Payment Links API
                                createdPaymentLink.raw?.payment_url ||
                                createdPaymentLink.raw?.paymentLink
                              )
                            }
                            className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-3 py-1.5 rounded-lg text-xs font-medium font-['Albert_Sans'] transition-all duration-200 hover:shadow-lg active:scale-95 flex items-center gap-1.5"
                            title="Copy link"
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                          <button
                            onClick={() => {
                              // Get payment URL - prioritize Cashfree link_url
                              const paymentUrl = createdPaymentLink.paymentLink || 
                                createdPaymentLink.payment_url || 
                                createdPaymentLink.raw?.link_url || // Cashfree Payment Links API direct link
                                createdPaymentLink.raw?.payment_url ||
                                createdPaymentLink.raw?.paymentLink;
                              
                              // For Cashfree, it's a direct URL - just open it
                              const gatewayUsed = createdPaymentLink?.gateway_used || createdPaymentLink?.raw?.gateway_used;
                              if (gatewayUsed === 'cashfree' || createdPaymentLink.raw?.link_url) {
                                if (paymentUrl) {
                                  window.open(paymentUrl, '_blank', 'noopener,noreferrer');
                                }
                              } else {
                                // For other gateways, use existing openPaymentLink function
                                openPaymentLink(paymentUrl || createdPaymentLink.paytmPaymentUrl, createdPaymentLink.paytmParams, createdPaymentLink.easebuzzParams);
                              }
                            }}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium font-['Albert_Sans'] transition-all duration-200 hover:shadow-lg active:scale-95 flex items-center gap-1.5"
                            title="Open payment link"
                          >
                            <FiExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Open</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* UPI Deep Links Section */}
                    {(createdPaymentLink.phonepe_deep_link || createdPaymentLink.gpay_deep_link || createdPaymentLink.gpay_intent || createdPaymentLink.upi_deep_link) && (
                      <div className="bg-[#263F43] border border-white/10 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FiSmartphone className="text-accent text-base" />
                          <label className="block text-white/80 text-sm font-medium font-['Albert_Sans']">
                            UPI Deep Links (Quick Pay)
                          </label>
                        </div>
                        <p className="text-white/60 text-xs mb-3 font-['Albert_Sans']">
                          Click to open directly in UPI apps or copy the links to share
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {createdPaymentLink.phonepe_deep_link && createdPaymentLink.phonepe_deep_link !== 'Not available' && (
                            <div className="bg-bg-secondary border border-white/5 rounded-lg p-2.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-purple-400 text-sm font-bold">PhonePe</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openDeepLink(createdPaymentLink.phonepe_deep_link, 'PhonePe')}
                                  className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 flex items-center gap-1"
                                  title="Open in PhonePe"
                                >
                                  <FiExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => copyPaymentLinkToClipboard(createdPaymentLink.phonepe_deep_link)}
                                  className="bg-white/5 hover:bg-white/10 text-white/70 px-2 py-1 rounded text-xs transition-all hover:scale-105"
                                  title="Copy PhonePe link"
                                >
                                  <FiCopy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {createdPaymentLink.gpay_deep_link && createdPaymentLink.gpay_deep_link !== 'Not available' && (
                            <div className="bg-bg-secondary border border-white/5 rounded-lg p-2.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 text-sm font-bold">Google Pay</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openDeepLink(createdPaymentLink.gpay_deep_link, 'Google Pay')}
                                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 flex items-center gap-1"
                                  title="Open in Google Pay"
                                >
                                  <FiExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => copyPaymentLinkToClipboard(createdPaymentLink.gpay_deep_link)}
                                  className="bg-white/5 hover:bg-white/10 text-white/70 px-2 py-1 rounded text-xs transition-all hover:scale-105"
                                  title="Copy Google Pay link"
                                >
                                  <FiCopy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {createdPaymentLink.gpay_intent && createdPaymentLink.gpay_intent !== 'Not available' && (
                            <div className="bg-bg-secondary border border-white/5 rounded-lg p-2.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 text-sm font-bold">GPay (Android)</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openDeepLink(createdPaymentLink.gpay_intent, 'Google Pay')}
                                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 flex items-center gap-1"
                                  title="Open in Google Pay (Android Intent)"
                                >
                                  <FiExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => copyPaymentLinkToClipboard(createdPaymentLink.gpay_intent)}
                                  className="bg-white/5 hover:bg-white/10 text-white/70 px-2 py-1 rounded text-xs transition-all hover:scale-105"
                                  title="Copy Google Pay Intent"
                                >
                                  <FiCopy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {createdPaymentLink.upi_deep_link && createdPaymentLink.upi_deep_link !== 'Not available' && (
                            <div className="bg-bg-secondary border border-white/5 rounded-lg p-2.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FiZap className="text-yellow-400 text-base" />
                                <span className="text-white/80 text-sm font-medium">UPI</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openDeepLink(createdPaymentLink.upi_deep_link, 'UPI')}
                                  className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 flex items-center gap-1"
                                  title="Open in UPI app"
                                >
                                  <FiExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => copyPaymentLinkToClipboard(createdPaymentLink.upi_deep_link)}
                                  className="bg-white/5 hover:bg-white/10 text-white/70 px-2 py-1 rounded text-xs transition-all hover:scale-105"
                                  title="Copy UPI link"
                                >
                                  <FiCopy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Form */}
              {!createdPaymentLink && (
                <form onSubmit={handleCreatePaymentLink} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                        Amount (₹) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        value={paymentData.amount}
                        onChange={(e) =>
                          handlePaymentDataChange("amount", e.target.value)
                        }
                        required
                        placeholder="500"
                        className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                        Customer Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={paymentData.customerName}
                        onChange={(e) =>
                          handlePaymentDataChange(
                            "customerName",
                            e.target.value
                          )
                        }
                        required
                        placeholder="Amit Kumar"
                        className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                        Customer Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={paymentData.customerEmail}
                        onChange={(e) =>
                          handlePaymentDataChange(
                            "customerEmail",
                            e.target.value
                          )
                        }
                        required
                        placeholder="amit@example.com"
                        className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                        Customer Phone <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        value={paymentData.customerPhone}
                        onChange={(e) =>
                          handlePaymentDataChange(
                            "customerPhone",
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        required
                        placeholder="9876543210"
                        maxLength="10"
                        className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentData.description}
                      onChange={(e) =>
                        handlePaymentDataChange("description", e.target.value)
                      }
                      placeholder="Product purchase"
                      className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleClosePaymentModal}
                      className="bg-bg-secondary text-white border border-accent px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createLinkLoading}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {createLinkLoading ? (
                        <>
                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <FiPlus className="w-4 h-4" />
                          Create Link
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Close button after link creation */}
              {createdPaymentLink && (
                <div className="flex justify-end pt-4 border-t border-white/10">
                  <button
                    onClick={handleClosePaymentModal}
                    className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
