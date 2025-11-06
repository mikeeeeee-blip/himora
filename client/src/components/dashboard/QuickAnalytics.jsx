import React, { useState, useMemo } from "react";
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
  chartData: chartDataProp = { payin: [], payout: [], settlement: [], loading: true }, // Accept chartData from parent
  summaryCards: summaryCardsProp = [], // Accept summaryCards from parent
  actionItems = [], // Accept actionItems from parent
}) => {
  const [selectedView, setSelectedView] = useState("payin");
  
  // Use props if provided, otherwise use local state (for backward compatibility)
  const chartData = chartDataProp;
  const summaryCards = summaryCardsProp.length > 0 ? summaryCardsProp : [
    { label: "Today payin", value: "₹0.00" },
    { label: "Last payin", value: "₹0.00" },
    { label: "Today payout", value: "0 items" },
  ];

  // Process chart data by grouping transactions/payouts by date
  const processChartData = (data, type) => {
    if (!data || data.length === 0) {
      return [];
    }

    const grouped = {};
    data.forEach((item) => {
      let dateKey;
      let amount;

      if (type === "payin") {
        const date = item.createdAt || item.created_at;
        if (!date) return;
        dateKey = new Date(date).toISOString().split("T")[0];
        amount = parseFloat(item.amount || 0);
      } else if (type === "payout") {
        const date = item.requestedAt || item.createdAt || item.created_at;
        if (!date) return;
        dateKey = new Date(date).toISOString().split("T")[0];
        amount = parseFloat(item.netAmount || item.amount || 0);
      } else {
        // settlement
        const date =
          item.settlementDate ||
          item.settlement_date ||
          item.paidAt ||
          item.paid_at ||
          item.createdAt ||
          item.created_at;
        if (!date) return;
        dateKey = new Date(date).toISOString().split("T")[0];
        amount = parseFloat(
          item.netAmount || item.net_amount || item.amount || 0
        );
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

  // Note: Data fetching is now handled by parent component (AdminDashboard)
  // This component receives chartData, summaryCards, and actionItems as props

  // Handle view change - only updates the graph, no navigation
  const handleViewClick = (view) => {
    setSelectedView(view);
  };

  // Chart configuration
  const chartConfig = {
    payin: {
      label: "Payin",
      color: "#10b981", // Green
    },
    payout: {
      label: "Payout",
      color: "#f59e0b", // Amber
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

        {/* Badge Buttons */}
        <div className="flex items-center gap-2 bg-bg-tertiary border border-white/10 rounded-lg p-1">
          {["payin", "payout", "settlement"].map((view) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
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
      </div>

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
            type={selectedView}
            color={chartConfig[selectedView].color}
          />
        )}
      </div>

      {/* Action Items */}
      {actionItems && actionItems.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/80 mb-3 font-['Albert_Sans']">
            Action Items
          </h3>
          <div className="space-y-2">
            {actionItems.map((item, index) => (
              <div
                key={index}
                onClick={item.onClick}
                className="flex items-center justify-between p-3 bg-bg-tertiary border border-white/10 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <span className="text-white/80 text-sm font-['Albert_Sans']">
                  {item.label}
                </span>
                <FiArrowRight className="text-white/40 group-hover:text-white/60 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAnalytics;
