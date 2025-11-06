import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import paymentService from "../../services/paymentService";

// Chart Component using Recharts
const AnalyticsChart = ({ data = [], type = "payin", color = "#10b981" }) => {
  // Format data for Recharts
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item) => {
      // Handle date - item.date should be in YYYY-MM-DD format
      let date;
      if (typeof item.date === "string") {
        // If it's already a date string, parse it
        date = new Date(item.date);
      } else {
        date = item.date;
      }

      // Format date for display
      const dateLabel = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return {
        date: dateLabel,
        fullDate:
          typeof item.date === "string"
            ? item.date
            : date.toISOString().split("T")[0],
        amount: parseFloat(item.amount || 0),
        amountArea: parseFloat(item.amount || 0), // For area fill
        count: parseInt(item.count || 0),
      };
    });
  }, [data]);

  // Format amount for display - Full rupee amount with commas
  const formatAmount = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#122D32] border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-white/80 text-xs font-['Albert_Sans'] mb-1">
            {data.fullDate}
          </p>
          <p className="text-white text-sm font-semibold font-['Albert_Sans']">
            {formatAmount(data.amount)}
          </p>
          {data.count > 0 && (
            <p className="text-white/60 text-xs font-['Albert_Sans'] mt-1">
              {data.count} transaction{data.count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/40 text-xs sm:text-sm font-['Albert_Sans'] mb-2">
            No {type} data available for the selected period
          </div>
          <div className="text-white/20 text-xs font-['Albert_Sans']">
            Chart will appear when data is available
          </div>
        </div>
      </div>
    );
  }

  // Calculate max for Y-axis with proper validation
  const amounts = chartData
    .map((d) => parseFloat(d.amount) || 0)
    .filter((a) => !isNaN(a) && isFinite(a) && a >= 0);
  const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 1;
  // Ensure domain doesn't go negative and has reasonable max
  const yAxisDomain =
    maxAmount > 0 ? [0, Math.max(maxAmount * 1.1, 100)] : [0, 1000];

  // Log for debugging
  if (amounts.length > 0) {
    const total = amounts.reduce((sum, a) => sum + a, 0);
    const avg = total / amounts.length;
    console.log(`📊 ${type} chart data:`, {
      dataPoints: chartData.length,
      validAmounts: amounts.length,
      minAmount: Math.min(...amounts),
      maxAmount: maxAmount,
      avgAmount: avg.toFixed(2),
      totalAmount: total.toFixed(2),
      domain: yAxisDomain,
      sampleData: chartData
        .slice(0, 3)
        .map((d) => ({ date: d.date, amount: d.amount, count: d.count })),
    });
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          <defs>
            <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(255, 255, 255, 0.05)"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 10,
              fill: "rgba(255, 255, 255, 0.5)",
              fontFamily: "'Albert Sans', sans-serif",
            }}
            dy={5}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 11,
              fill: "rgba(255, 255, 255, 0.5)",
              fontFamily: "'Albert Sans', sans-serif",
            }}
            tickFormatter={(value) => {
              return `₹${parseFloat(value || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`;
            }}
            domain={yAxisDomain}
            tickMargin={8}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Gradient area fill */}
          <Area
            type="monotone"
            dataKey="amountArea"
            stroke="transparent"
            fill={`url(#gradient-${type})`}
            fillOpacity={1}
          />
          {/* Line with dots */}
          <Line
            type="monotone"
            dataKey="amount"
            stroke={color}
            strokeWidth={2}
            dot={{
              fill: "#001D22",
              strokeWidth: 2,
              r: 4,
              stroke: color,
            }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: "#001D22" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const QuickAnalytics = ({
  dateRange = "monthly", // Accept dateRange as prop from parent
}) => {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState("payin");
  const [chartData, setChartData] = useState({
    payin: [],
    settlement: [],
    loading: true,
  });
  const [summaryCards, setSummaryCards] = useState([
    { label: "Today payin", value: "₹0.00" },
    { label: "Last payin", value: "₹0.00" },
    { label: "Today payout", value: "0 items" },
  ]);

  // Process chart data by grouping transactions/payouts by date
  // Use createdAt for all types to create a consistent timeline
  const processChartData = (data, type) => {
    if (!data || data.length === 0) {
      return [];
    }

    const grouped = {};
    data.forEach((item) => {
      let dateKey;
      let amount;

      // Use createdAt for all types to create a consistent timeline
      // This ensures all data points are plotted based on when they were created
      const date = item.createdAt || item.created_at;
      if (!date) return;

      // Parse the date and get YYYY-MM-DD format for grouping
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return; // Invalid date
      dateKey = dateObj.toISOString().split("T")[0];

      // Calculate amount based on type
      if (type === "payin") {
        // Amount: API returns in rupees (e.g., 100 = ₹100)
        // If amount is very large (> 100000) and divisible by 100, might be in paise
        let rawAmount = parseFloat(item.amount || 0);
        amount =
          rawAmount > 100000 && rawAmount % 100 === 0
            ? rawAmount / 100
            : rawAmount;
      } else if (type === "payout") {
        // Use netAmount for payouts (amount after commission)
        let rawAmount = parseFloat(
          item.netAmount || item.net_amount || item.amount || 0
        );
        amount =
          rawAmount > 100000 && rawAmount % 100 === 0
            ? rawAmount / 100
            : rawAmount;
      } else {
        // settlement - use netAmount (amount after commission)
        let rawAmount = parseFloat(
          item.netAmount || item.net_amount || item.amount || 0
        );
        amount =
          rawAmount > 100000 && rawAmount % 100 === 0
            ? rawAmount / 100
            : rawAmount;
      }

      if (!dateKey || isNaN(amount) || amount <= 0) return;

      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, amount: 0, count: 0 };
      }
      grouped[dateKey].amount += amount;
      grouped[dateKey].count += 1;
    });

    // Convert to array and sort by date
    const sorted = Object.values(grouped).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Fill missing dates for better visualization
    const filled = [];
    if (sorted.length > 0) {
      const start = new Date(sorted[0].date);
      const end = new Date(sorted[sorted.length - 1].date);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      if (daysDiff > 0 && daysDiff <= 90) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          const existing = sorted.find((item) => item.date === dateStr);
          filled.push(existing || { date: dateStr, amount: 0, count: 0 });
        }
      } else {
        return sorted;
      }
    }

    return filled.length > 0 ? filled : sorted;
  };

  // Fetch chart data from API endpoints
  // Fetch ALL data (not date-filtered) for graphs
  const fetchChartData = async () => {
    try {
      setChartData((prev) => ({ ...prev, loading: true }));

      console.log(
        "📊 QuickAnalytics: Fetching ALL chart data (no date filter)"
      );

      // Fetch ALL payin transactions (exclude settled ones)
      // Endpoint: /api/payments/merchant/transactions/search
      // Uses: paymentService.searchTransactions() → API_ENDPOINTS.SEARCH_TRANSACTIONS
      let payinData = [];
      try {
        const payinResult = await paymentService.searchTransactions({
          page: 1,
          limit: 1000, // Fetch more data for graphs
          sortBy: "createdAt",
          sortOrder: "asc",
        });
        const allTransactions = payinResult.transactions || [];
        // Exclude settled transactions from payin - they belong in settlement
        payinData = allTransactions.filter((txn) => {
          if (!txn) return false;
          // Exclude settled transactions
          const isSettled =
            txn.settlementStatus === "settled" ||
            txn.settlement_status === "settled" ||
            txn.settlementDate ||
            txn.settlement_date;
          return !isSettled;
        });
        console.log(
          "✅ QuickAnalytics: Payin data fetched from /api/payments/merchant/transactions/search",
          payinData.length,
          "transactions (excluding settled)"
        );
      } catch (err) {
        console.error("❌ QuickAnalytics: Payin fetch error", err.message);
      }

      // Fetch settlement transactions with settlementStatus: "settled"
      // Endpoint: /api/payments/merchant/transactions/search (with settlementStatus='settled')
      // Uses: paymentService.searchTransactions() → API_ENDPOINTS.SEARCH_TRANSACTIONS
      let settlementData = [];
      try {
        const settlementResult = await paymentService.searchTransactions({
          settlementStatus: "settled", // Filter for settled transactions
          page: 1,
          limit: 1000, // Fetch more data for graphs
          sortBy: "createdAt",
          sortOrder: "asc",
        });
        // Filter to ensure only settled transactions are included
        settlementData = (settlementResult.transactions || []).filter((txn) => {
          if (!txn) return false;
          // Must have settlementStatus: "settled"
          const isSettled =
            txn.settlementStatus === "settled" ||
            txn.settlement_status === "settled" ||
            txn.settlementDate ||
            txn.settlement_date;
          return isSettled;
        });
        console.log(
          "✅ QuickAnalytics: Settlement data fetched from /api/payments/merchant/transactions/search (settlementStatus: 'settled')",
          settlementData.length,
          "settled transactions"
        );
      } catch (err) {
        console.error("❌ QuickAnalytics: Settlement fetch error", err.message);
      }

      // Process data for charts
      const processedPayin = processChartData(payinData, "payin");
      const processedSettlement = processChartData(
        settlementData,
        "settlement"
      );

      // Debug logging
      console.log("📊 QuickAnalytics: Processed chart data", {
        payin: {
          raw: payinData.length,
          processed: processedPayin.length,
          sample: processedPayin.slice(0, 3),
        },
        settlement: {
          raw: settlementData.length,
          processed: processedSettlement.length,
          sample: processedSettlement.slice(0, 3),
        },
      });

      // Fetch today's data for summary cards
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      // Get today's payin for summary cards
      // Endpoint: /api/payments/merchant/transactions/search (same as PayinsPage.jsx)
      // Uses: paymentService.searchTransactions() → API_ENDPOINTS.SEARCH_TRANSACTIONS
      let todayPayin = 0;
      let todayPayoutCount = 0;
      let lastPayinAmount = 0;

      try {
        const todayPayinResult = await paymentService.searchTransactions({
          startDate: todayStr,
          endDate: tomorrowStr,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const todayPayins = todayPayinResult.transactions || [];
        todayPayin = todayPayins.reduce((sum, txn) => {
          let rawAmount = parseFloat(txn.amount || 0);
          // Convert from paise to rupees if needed (if > 100000 and divisible by 100)
          let amount =
            rawAmount > 100000 && rawAmount % 100 === 0
              ? rawAmount / 100
              : rawAmount;
          return sum + amount;
        }, 0);

        // Get last payin amount (most recent)
        if (todayPayins.length > 0) {
          let rawAmount = parseFloat(todayPayins[0].amount || 0);
          lastPayinAmount =
            rawAmount > 100000 && rawAmount % 100 === 0
              ? rawAmount / 100
              : rawAmount;
        } else if (processedPayin.length > 0) {
          // Fallback to most recent from chart data
          const recentPayins = processedPayin
            .filter((d) => d.amount > 0)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          if (recentPayins.length > 0) {
            lastPayinAmount = recentPayins[0].amount;
          }
        }
      } catch (err) {
        console.error(
          "❌ QuickAnalytics: Today payin fetch error",
          err.message
        );
      }

      // Get today's payout count for summary cards
      // Endpoint: /api/payments/merchant/payouts/search (same as PayoutsPage.jsx)
      // Uses: paymentService.searchPayouts() → API_ENDPOINTS.SEARCH_PAYOUTS
      try {
        const todayPayoutResult = await paymentService.searchPayouts({
          startDate: todayStr,
          endDate: tomorrowStr,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const todayPayouts = todayPayoutResult.payouts || [];
        todayPayoutCount = todayPayouts.length;
      } catch (err) {
        console.error(
          "❌ QuickAnalytics: Today payout fetch error",
          err.message
        );
      }

      // Format currency
      const formatCurrency = (amount) => {
        return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      // Update summary cards
      setSummaryCards([
        { label: "Today payin", value: formatCurrency(todayPayin) },
        { label: "Last payin", value: formatCurrency(lastPayinAmount) },
        { label: "Today payout", value: `${todayPayoutCount} items` },
      ]);

      setChartData({
        payin: processedPayin,
        settlement: processedSettlement,
        loading: false,
      });

      console.log("✅ QuickAnalytics: Chart data processed", {
        payin: processedPayin.length,
        settlement: processedSettlement.length,
      });
    } catch (error) {
      console.error("❌ QuickAnalytics: Chart data fetch error", error);
      setChartData((prev) => ({ ...prev, loading: false }));
    }
  };

  // Fetch data on mount and when dateRange changes
  useEffect(() => {
    fetchChartData();
  }, [dateRange]);

  // Handle view change - only updates the graph, no navigation
  const handleViewClick = (view) => {
    // Only allow payin or settlement views
    if (view === "payin" || view === "settlement") {
      setSelectedView(view);
    }
  };

  // Chart configuration
  const chartConfig = {
    payin: {
      label: "Payin",
      color: "#10b981", // Green
    },
    settlement: {
      label: "Settlement",
      color: "#3b82f6", // Blue
    },
  };

  return (
    <div className="bg-bg-secondary border border-white/10 rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
          Quick Analytics
        </h2>

        {/* Badge Buttons - Only Payin and Settlement */}
        <div className="flex items-center gap-2 bg-bg-tertiary border border-white/10 rounded-lg p-1">
          {["payin", "settlement"].map((view) => (
            <button
              key={view}
              onClick={() => handleViewClick(view)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 ${
                selectedView === view
                  ? "bg-accent text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {chartConfig[view].label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-bg-tertiary border border-white/10 rounded-lg p-3 sm:p-4"
          >
            <div className="text-xs text-white/60 mb-1 font-['Albert_Sans']">
              {card.label}
            </div>
            <div className="text-base sm:text-lg font-semibold text-white font-['Albert_Sans']">
              {card.value}
            </div>
          </div>
        ))}
      </div> */}

      {/* Chart */}
      <div className="bg-bg-tertiary border border-white/10 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 h-48 sm:h-64">
        {chartData.loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-white/40 text-xs sm:text-sm font-['Albert_Sans']">
              Loading chart data...
            </div>
          </div>
        ) : (
          <AnalyticsChart
            data={chartData[selectedView] || []}
            type={
              selectedView === "payin" || selectedView === "settlement"
                ? selectedView
                : "payin"
            }
            color={chartConfig[selectedView]?.color || chartConfig.payin.color}
          />
        )}
      </div>

      {/* Action Items */}
      <div>
        <h3 className="text-sm font-medium text-white/80 mb-3 font-['Albert_Sans']">
          Action Items
        </h3>
        <div className="space-y-2">
          <div
            onClick={() => navigate("/admin/payins")}
            className="flex items-center justify-between p-3 bg-bg-tertiary border border-white/10 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <span className="text-white/80 text-sm font-['Albert_Sans']">
              View Payins
            </span>
            <FiArrowRight className="text-white/40 group-hover:text-white/60 transition-colors" />
          </div>
          <div
            onClick={() => navigate("/admin/payouts")}
            className="flex items-center justify-between p-3 bg-bg-tertiary border border-white/10 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <span className="text-white/80 text-sm font-['Albert_Sans']">
              View Payouts
            </span>
            <FiArrowRight className="text-white/40 group-hover:text-white/60 transition-colors" />
          </div>
          <div
            onClick={() => navigate("/admin/transactions?tab=settlement")}
            className="flex items-center justify-between p-3 bg-bg-tertiary border border-white/10 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <span className="text-white/80 text-sm font-['Albert_Sans']">
              View Settlements
            </span>
            <FiArrowRight className="text-white/40 group-hover:text-white/60 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickAnalytics;
