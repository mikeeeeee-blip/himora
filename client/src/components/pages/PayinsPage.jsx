import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import paymentService from "../../services/paymentService";
import Navbar from "../Navbar";
import { FiRefreshCw, FiDownload, FiTrendingUp } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const PayinsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    payment_gateway: "",
    payment_method: "",
    start_date: "",
    end_date: "",
    search: "",
    sort_by: "createdAt",
    sort_order: "desc",
  });

  useEffect(() => {
    fetchTransactions();
    fetchChartData();
  }, [filters.page, filters.start_date, filters.end_date]);

  // Fetch chart data for analytics
  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const endDate =
        filters.end_date || new Date().toISOString().split("T")[0];
      const startDate =
        filters.start_date ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

      const result = await paymentService.searchTransactions({
        startDate,
        endDate,
        limit: 1000,
        sortBy: "createdAt",
        sortOrder: "asc",
      });
      const data = result.transactions || [];

      // Group by date
      const grouped = {};
      data.forEach((item) => {
        const date = new Date(
          item.createdAt || item.created_at
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        if (!grouped[date]) {
          grouped[date] = {
            date,
            amount: 0,
            count: 0,
            success: 0,
            failed: 0,
          };
        }
        grouped[date].amount += item.amount || 0;
        grouped[date].count += 1;
        if (item.status === "paid") {
          grouped[date].success += 1;
        } else if (item.status === "failed") {
          grouped[date].failed += 1;
        }
      });

      setChartData(Object.values(grouped));
    } catch (error) {
      console.error("Chart data fetch error:", error);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await paymentService.searchTransactions({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        paymentGateway: filters.payment_gateway,
        paymentMethod: filters.payment_method,
        startDate: filters.start_date,
        endDate: filters.end_date,
        search: filters.search,
        sortBy: filters.sort_by,
        sortOrder: filters.sort_order,
      });

      setTransactions(data.transactions || []);
      setPagination(data.pagination || {});
    } catch (error) {
      setError(error.message || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const formatAmount = (amount) => {
    if (!amount) return "₹0.00";
    return `₹${Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrencyChart = (value) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value}`;
  };

  const getStatusClass = (status) => {
    const statusMap = {
      paid: "bg-green-500/20 text-green-400",
      failed: "bg-red-500/20 text-red-400",
      pending: "bg-yellow-500/20 text-yellow-400",
      created: "bg-blue-500/20 text-blue-400",
      cancelled: "bg-gray-500/20 text-gray-400",
    };
    return statusMap[status?.toLowerCase()] || "bg-gray-500/20 text-gray-400";
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#122D32] border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2 font-['Albert_Sans']">
            {new Date(label).toLocaleDateString("en-IN", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {payload.map((entry, index) => (
            <p
              key={index}
              className="text-white/80 text-sm font-['Albert_Sans']"
              style={{ color: entry.color }}
            >
              {entry.name}:{" "}
              {entry.name === "Amount"
                ? formatAmount(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#1F383D]">
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
          <div className="bg-transparent pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              <main className="space-y-6 sm:space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-5">
                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white mb-3 font-['Albert_Sans']">
                        Payins
                      </h1>
                      <p className="text-white/70 text-base sm:text-lg font-['Albert_Sans']">
                        View and manage all payment transactions
                      </p>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="bg-accent hover:bg-bg-tertiary text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        <FiRefreshCw
                          className={loading ? "animate-spin" : ""}
                        />
                        {loading ? "Loading..." : "Refresh"}
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Analytics Chart */}
                {chartData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                        <FiTrendingUp className="text-accent text-xl" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
                          Payin Analytics
                        </h3>
                        <p className="text-white/60 text-xs sm:text-sm font-['Albert_Sans']">
                          Transaction trends over time
                        </p>
                      </div>
                    </div>
                    {chartLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="amountGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#475C5F"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#475C5F"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#ffffff10"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "#ffffff60", fontSize: 12 }}
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })
                            }
                            stroke="#ffffff20"
                          />
                          <YAxis
                            yAxisId="amount"
                            tick={{ fill: "#ffffff60", fontSize: 12 }}
                            tickFormatter={formatCurrencyChart}
                            stroke="#ffffff20"
                          />
                          <YAxis
                            yAxisId="count"
                            orientation="right"
                            tick={{ fill: "#ffffff60", fontSize: 12 }}
                            stroke="#ffffff20"
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            wrapperStyle={{ paddingTop: "20px" }}
                            iconType="circle"
                            formatter={(value) => (
                              <span className="text-white/80 text-xs font-['Albert_Sans']">
                                {value}
                              </span>
                            )}
                          />
                          <Area
                            yAxisId="amount"
                            type="monotone"
                            dataKey="amount"
                            fill="url(#amountGradient)"
                            stroke="#475C5F"
                            strokeWidth={2}
                            name="Amount"
                          />
                          <Line
                            yAxisId="count"
                            type="monotone"
                            dataKey="count"
                            stroke="#5EEAD4"
                            strokeWidth={2}
                            dot={{ fill: "#5EEAD4", r: 3 }}
                            name="Count"
                          />
                          <Bar
                            yAxisId="count"
                            dataKey="success"
                            fill="#10b981"
                            name="Success"
                          />
                          <Bar
                            yAxisId="count"
                            dataKey="failed"
                            fill="#ef4444"
                            name="Failed"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </motion.div>
                )}

                {/* Filter bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <input
                      className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                      value={filters.search}
                      onChange={(e) =>
                        handleFilterChange("search", e.target.value)
                      }
                      placeholder="Search transactions..."
                    />
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                      value={filters.start_date}
                      onChange={(e) =>
                        handleFilterChange("start_date", e.target.value)
                      }
                    />
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                      value={filters.end_date}
                      onChange={(e) =>
                        handleFilterChange("end_date", e.target.value)
                      }
                    />
                    <select
                      className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                      value={filters.status}
                      onChange={(e) =>
                        handleFilterChange("status", e.target.value)
                      }
                    >
                      <option value="">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                      <option value="created">Created</option>
                    </select>
                    <button
                      className="w-full sm:w-auto bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={fetchTransactions}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Apply Filters"}
                    </button>
                  </div>
                </motion.div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg font-['Albert_Sans']">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-white/70 font-['Albert_Sans']">
                      Loading transactions...
                    </p>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="bg-[#122D32] border border-white/10 rounded-xl shadow-lg w-full overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead className="bg-green-600/20 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']" style={{ width: '15%' }}>
                            Transaction ID
                          </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']" style={{ width: '12%' }}>
                            Order ID
                          </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']" style={{ width: '18%' }}>
                            Customer
                          </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']" style={{ width: '10%' }}>
                            Amount
                          </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']" style={{ width: '10%' }}>
                            Status
                          </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']" style={{ width: '12%' }}>
                            Payment Method
                          </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']" style={{ width: '10%' }}>
                            Gateway
                          </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']" style={{ width: '13%' }}>
                            Created At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#263F43]">
                        {transactions.map((transaction, index) => (
                          <tr
                            key={
                              transaction.transaction_id ||
                              transaction.transactionId ||
                              index
                            }
                            className="hover:bg-green-600/10 transition-colors duration-150 cursor-pointer"
                            onClick={() =>
                              navigate(
                                `/admin/transactions/${
                                  transaction.transaction_id ||
                                  transaction.transactionId
                                }`
                              )
                            }
                          >
                            <td className="px-3 py-3 text-sm text-white border-b border-white/10 font-['Albert_Sans'] truncate" title={transaction.transaction_id || transaction.transactionId || "-"}>
                              {transaction.transaction_id ||
                                transaction.transactionId ||
                                "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-white border-b border-white/10 font-['Albert_Sans'] truncate" title={transaction.order_id || transaction.orderId || "-"}>
                              {transaction.order_id ||
                                transaction.orderId ||
                                "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-white border-b border-white/10 font-['Albert_Sans']">
                              <div className="font-medium truncate" title={transaction.customer_name || transaction.customer?.name || "-"}>
                                {transaction.customer_name ||
                                  transaction.customer?.name ||
                                  "-"}
                              </div>
                              <div className="text-xs text-white/70 mt-0.5 truncate" title={transaction.customer_email || transaction.customer?.email || "-"}>
                                {transaction.customer_email ||
                                  transaction.customer?.email ||
                                  "-"}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-white font-semibold border-b border-white/10 font-['Albert_Sans']">
                              {formatAmount(transaction.amount)}
                            </td>
                            <td className="px-3 py-3 text-sm border-b border-white/10">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-['Albert_Sans'] ${getStatusClass(
                                  transaction.status
                                )}`}
                              >
                                {transaction.status || "Pending"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-white border-b border-white/10 font-['Albert_Sans'] truncate">
                              {transaction.payment_method ||
                                transaction.paymentMethod ||
                                "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-white border-b border-white/10 font-['Albert_Sans'] truncate">
                              {transaction.payment_gateway ||
                                transaction.paymentGateway ||
                                "-"}
                            </td>
                            <td className="px-3 py-3 text-sm text-white/90 border-b border-white/10 font-['Albert_Sans']">
                              {formatDate(
                                transaction.created_at || transaction.createdAt
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#122D32] border border-white/10 rounded-xl p-12 text-center">
                    <p className="text-white/70 text-lg font-['Albert_Sans']">
                      No transactions found
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between bg-[#122D32] border border-white/10 rounded-xl p-4">
                    <p className="text-white/70 text-sm font-['Albert_Sans']">
                      Page {pagination.currentPage || filters.page} of{" "}
                      {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(filters.page - 1)}
                        disabled={filters.page === 1}
                        className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium font-['Albert_Sans'] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(filters.page + 1)}
                        disabled={filters.page >= (pagination.totalPages || 1)}
                        className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium font-['Albert_Sans'] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PayinsPage;
