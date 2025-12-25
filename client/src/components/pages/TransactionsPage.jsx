import React, { useState, useEffect } from "react";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
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
import ExportCSV from "../ExportCSV";
import { FiRefreshCw, FiDownload, FiTrendingUp } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("payin");
  const [downloading, setDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showPayoutDownloadModal, setShowPayoutDownloadModal] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Set active tab from URL query parameter on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && ["payin", "payout", "settlement"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Download filter states for transactions (separate from view filters)
  const [downloadFilters, setDownloadFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    paymentMethod: "",
    paymentGateway: "",
    minAmount: "",
    maxAmount: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    settlementStatus: "",
    limit: "",
  });

  // Download filter states for payouts
  const [payoutDownloadFilters, setPayoutDownloadFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    transferMode: "",
    minAmount: "",
    maxAmount: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: "",
  });

  // Filter states
  const [filters, setFilters] = useState({
    page: 1,
    limit: 999999, // Show all transactions (no pagination)
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
  }, [filters.page, activeTab, filters.start_date, filters.end_date]);

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

      let data = [];
      if (activeTab === "payin" || activeTab === "settlement") {
        const result = await paymentService.searchTransactions({
          startDate,
          endDate,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "asc",
        });
        data = result.transactions || [];
      } else if (activeTab === "payout") {
        const result = await paymentService.searchPayouts({
          startDate,
          endDate,
          limit: 1000,
          sortBy: "createdAt",
          sortOrder: "asc",
        });
        data = result.payouts || [];
      }

      // Group by date
      const grouped = {};
      data.forEach((item) => {
        const date = new Date(
          item.createdAt || item.created_at || item.requestedAt
        )
          .toISOString()
          .split("T")[0];
        if (!grouped[date]) {
          grouped[date] = { date, amount: 0, count: 0, success: 0, failed: 0 };
        }
        const amount = parseFloat(item.amount || item.netAmount || 0);
        grouped[date].amount += amount;
        grouped[date].count += 1;
        if (
          item.status === "paid" ||
          item.status === "completed" ||
          item.status === "success"
        ) {
          grouped[date].success += 1;
        } else if (item.status === "failed" || item.status === "cancelled") {
          grouped[date].failed += 1;
        }
      });

      const chartDataArray = Object.values(grouped).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      setChartData(chartDataArray);
    } catch (error) {
      console.error("Chart data fetch error:", error);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  // ✅ UPDATED: Use search APIs instead of regular getTransactions/getPayouts
  const fetchTransactions = async () => {
    setLoading(true);
    setError("");

    try {
      if (activeTab === "payin" || activeTab === "settlement") {
        // For settlement tab, force status=paid and settlementStatus=settled
        const extra =
          activeTab === "settlement"
            ? { settlementStatus: "settled", status: "paid" }
            : {};

        const data = await paymentService.searchTransactions({
          page: filters.page,
          limit: filters.limit,
          status: filters.status, // user-controlled for payin, will be overridden for settlement by ...extra
          paymentGateway: filters.payment_gateway,
          paymentMethod: filters.payment_method,
          startDate: filters.start_date,
          endDate: filters.end_date,
          search: filters.search,
          sortBy: filters.sort_by,
          sortOrder: filters.sort_order,
          ...extra,
        });

        setTransactions(data.transactions || []);
        setPagination(data.pagination || {});
      } else if (activeTab === "payout") {
        const data = await paymentService.searchPayouts({
          page: filters.page,
          limit: filters.limit,
          status: filters.status,
          startDate: filters.start_date,
          endDate: filters.end_date,
          search: filters.search,
          sortBy: filters.sort_by,
          sortOrder: filters.sort_order,
        });
        setPayouts(data.payouts || []);
        setPagination(data.pagination || {});
      }
    } catch (error) {
      setError(error.message || "Failed to fetch data");
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // Calculate total paid amount from filtered transactions
  const calculateTotalPaidAmount = () => {
    if (activeTab === "payin" || activeTab === "settlement") {
      return transactions
        .filter((txn) => txn.status === "paid" || txn.status === "success")
        .reduce((total, txn) => {
          const amount = parseFloat(txn.amount || 0);
          return total + amount;
        }, 0);
    }
    return 0;
  };

  // Open download modal
  const handleOpenDownloadModal = () => {
    // Pre-fill with current view filters
    setDownloadFilters({
      startDate: filters.start_date || "",
      endDate: filters.end_date || "",
      status: filters.status || "",
      paymentMethod: filters.payment_method || "",
      paymentGateway: filters.payment_gateway || "",
      minAmount: "",
      maxAmount: "",
      search: filters.search || "",
      sortBy: filters.sort_by || "createdAt",
      sortOrder: filters.sort_order || "desc",
      settlementStatus: activeTab === "settlement" ? "settled" : "",
      limit: "",
    });
    setShowDownloadModal(true);
  };

  // Download transaction report (Excel) for payin and settlement tabs
  const handleDownloadTransactionReport = async () => {
    setDownloading(true);
    setError("");
    setShowDownloadModal(false);

    try {
      // Map download filters to API format
      const reportFilters = {
        startDate: downloadFilters.startDate || undefined,
        endDate: downloadFilters.endDate || undefined,
        status: downloadFilters.status || undefined,
        paymentMethod: downloadFilters.paymentMethod || undefined,
        paymentGateway: downloadFilters.paymentGateway || undefined,
        minAmount: downloadFilters.minAmount || undefined,
        maxAmount: downloadFilters.maxAmount || undefined,
        q: downloadFilters.search || undefined, // Global text search
        sortBy: downloadFilters.sortBy
          ? `${downloadFilters.sortBy}:${downloadFilters.sortOrder}`
          : undefined,
        limit: downloadFilters.limit || undefined,
      };

      // For settlement tab, ensure settlement status is set
      if (activeTab === "settlement") {
        reportFilters.status = "paid";
        reportFilters.settlementStatus = "settled";
      } else if (downloadFilters.settlementStatus) {
        reportFilters.settlementStatus = downloadFilters.settlementStatus;
      }

      // Remove undefined values
      Object.keys(reportFilters).forEach(
        (key) => reportFilters[key] === undefined && delete reportFilters[key]
      );

      await paymentService.downloadTransactionReport(reportFilters);
      // Success - file download should trigger automatically
    } catch (error) {
      setError(error.message || "Failed to download report");
      console.error("Download error:", error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadFilterChange = (key, value) => {
    setDownloadFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Open payout download modal
  const handleOpenPayoutDownloadModal = () => {
    // Pre-fill with current view filters
    setPayoutDownloadFilters({
      startDate: filters.start_date || "",
      endDate: filters.end_date || "",
      status: filters.status || "",
      transferMode: "",
      minAmount: "",
      maxAmount: "",
      search: filters.search || "",
      sortBy: filters.sort_by || "createdAt",
      sortOrder: filters.sort_order || "desc",
      limit: "",
    });
    setShowPayoutDownloadModal(true);
  };

  // Download payout report (Excel) for payout tab
  const handleDownloadPayoutReport = async () => {
    setDownloading(true);
    setError("");
    setShowPayoutDownloadModal(false);

    try {
      // Map payout download filters to API format
      const reportFilters = {
        startDate: payoutDownloadFilters.startDate || undefined,
        endDate: payoutDownloadFilters.endDate || undefined,
        status: payoutDownloadFilters.status || undefined,
        transferMode: payoutDownloadFilters.transferMode || undefined,
        minAmount: payoutDownloadFilters.minAmount || undefined,
        maxAmount: payoutDownloadFilters.maxAmount || undefined,
        q: payoutDownloadFilters.search || undefined, // Global text search
        sortBy: payoutDownloadFilters.sortBy
          ? `${payoutDownloadFilters.sortBy}:${payoutDownloadFilters.sortOrder}`
          : undefined,
        limit: payoutDownloadFilters.limit || undefined,
      };

      // Remove undefined values
      Object.keys(reportFilters).forEach(
        (key) => reportFilters[key] === undefined && delete reportFilters[key]
      );

      await paymentService.downloadPayoutReport(reportFilters);
      // Success - file download should trigger automatically
    } catch (error) {
      setError(error.message || "Failed to download payout report");
      console.error("Download error:", error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePayoutDownloadFilterChange = (key, value) => {
    setPayoutDownloadFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Combined report using current modal filters when available, otherwise current page filters
  const handleDownloadCombinedReport = async () => {
    setDownloading(true);
    setError("");
    try {
      const t = {
        startDate: downloadFilters.startDate || filters.start_date || undefined,
        endDate: downloadFilters.endDate || filters.end_date || undefined,
        status:
          downloadFilters.status ||
          (activeTab === "settlement" ? "paid" : filters.status) ||
          undefined,
        paymentMethod:
          downloadFilters.paymentMethod || filters.payment_method || undefined,
        paymentGateway:
          downloadFilters.paymentGateway ||
          filters.payment_gateway ||
          undefined,
        minAmount: downloadFilters.minAmount || undefined,
        maxAmount: downloadFilters.maxAmount || undefined,
        q: downloadFilters.search || filters.search || undefined,
        sortBy: downloadFilters.sortBy
          ? `${downloadFilters.sortBy}:${downloadFilters.sortOrder}`
          : `${filters.sort_by}:${filters.sort_order}`,
        settlementStatus:
          activeTab === "settlement"
            ? "settled"
            : downloadFilters.settlementStatus || undefined,
      };
      const p = {
        startDate:
          payoutDownloadFilters.startDate || filters.start_date || undefined,
        endDate: payoutDownloadFilters.endDate || filters.end_date || undefined,
        status:
          payoutDownloadFilters.status ||
          (activeTab === "payout" ? filters.status : "") ||
          undefined,
        transferMode: payoutDownloadFilters.transferMode || undefined,
        minAmount: payoutDownloadFilters.minAmount || undefined,
        maxAmount: payoutDownloadFilters.maxAmount || undefined,
        q: payoutDownloadFilters.search || filters.search || undefined,
        sortBy: payoutDownloadFilters.sortBy
          ? `${payoutDownloadFilters.sortBy}:${payoutDownloadFilters.sortOrder}`
          : `${filters.sort_by}:${filters.sort_order}`,
      };

      // remove undefineds
      Object.keys(t).forEach((k) => t[k] === undefined && delete t[k]);
      Object.keys(p).forEach((k) => p[k] === undefined && delete p[k]);

      await paymentService.downloadCombinedReport(t, p);
    } catch (err) {
      setError(err.message || "Failed to download combined report");
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatAmount = (amount) => {
    if (!amount) return "₹0.00";
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "success":
      case "completed":
        return "status-success";
      case "pending":
      case "requested":
      case "processing":
        return "status-pending";
      case "failed":
        return "status-failed";
      case "cancelled":
        return "status-cancelled";
      case "refunded":
        return "status-refunded";
      case "partial_refund":
        return "status-partial-refund";
      case "created":
        return "status-created";
      case "expired":
        return "status-expired";
      default:
        return "status-pending";
    }
  };

  const formatForExport = () => {
    if (activeTab === "payin" || activeTab === "settlement") {
      return transactions.map((txn) => ({
        "Transaction ID": txn.transactionId || txn.transaction_id || "-",
        "Order ID": txn.orderId || txn.order_id || "-",
        UTR: txn.acquirerData?.utr || txn.utr || "N/A",
        "Bank Transaction ID": txn.acquirerData?.bank_transaction_id || "N/A",
        Amount: `₹${txn.amount}`,
        Commission: `₹${txn.commission ?? 0}`,
        "Net Amount": `₹${txn.netAmount ?? txn.net_amount ?? 0}`,
        Status: txn.status,
        "Payment Method": txn.paymentMethod || txn.payment_method || "N/A",
        "Customer Name":
          txn.customerName ||
          txn.customer_name ||
          (txn.customer && txn.customer.name) ||
          "-",
        "Customer Email":
          txn.customerEmail ||
          txn.customer_email ||
          (txn.customer && txn.customer.email) ||
          "-",
        "Customer Phone":
          txn.customerPhone ||
          txn.customer_phone ||
          (txn.customer && txn.customer.phone) ||
          "-",
        Description: txn.description || "N/A",
        Gateway: txn.paymentGateway || txn.payment_gateway || "-",
        "Settlement Status":
          txn.settlementStatus || txn.settlement_status || "-",
        "Paid At": txn.paidAt || txn.paid_at || "-",
        "Settled At":
          txn.settlementDate ||
          txn.settlement_date ||
          txn.updatedAt ||
          txn.updated_at ||
          "-",
      }));
    } else {
      return payouts.map((payout) => ({
        "Payout ID": payout.payoutId,
        Amount: `₹${payout.amount}`,
        "Net Amount": `₹${payout.netAmount}`,
        Commission: `₹${payout.commission}`,
        Status: payout.status,
        "Transfer Mode": payout.transferMode,
        Description: payout.description || "N/A",
        "Requested At": payout.requestedAt,
        "Completed At": payout.completedAt || "Not completed",
        UTR: payout.utr || "N/A",
      }));
    }
  };

  const formatCurrencyChart = (amount) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#122D32] border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium text-sm font-['Albert_Sans'] mb-2">
            {payload[0].payload.date}
          </p>
          {payload.map((entry, index) => (
            <p
              key={index}
              className="text-xs font-['Albert_Sans']"
              style={{ color: entry.color }}
            >
              {entry.name}:{" "}
              {entry.name === "Amount"
                ? formatCurrencyChart(entry.value)
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
          {/* Content Section - Scrolls over image */}
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
                        Transactions
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
                      {activeTab === "payin" || activeTab === "settlement" ? (
                        <button
                          onClick={handleOpenDownloadModal}
                          disabled={downloading || loading}
                          className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          <FiDownload />
                          {downloading
                            ? "Downloading..."
                            : "Download Excel Report"}
                        </button>
                      ) : activeTab === "payout" ? (
                        <button
                          onClick={handleOpenPayoutDownloadModal}
                          disabled={downloading || loading}
                          className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          <FiDownload />
                          {downloading
                            ? "Downloading..."
                            : "Download Filtered Excel Report"}
                        </button>
                      ) : null}
                      <ExportCSV
                        data={formatForExport()}
                        filename={`${activeTab}_${
                          new Date().toISOString().split("T")[0]
                        }.csv`}
                        className="bg-bg-secondary text-white border border-accent px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                      />
                    </div>
                  </div>
                </motion.div>
                <div className="flex flex-col gap-6 sm:gap-8">
                  {/* Tabs */}
                  <div className="flex items-center gap-2 bg-bg-tertiary border border-white/10 rounded-lg p-1 self-start">
                    {[
                      { value: "payin", label: "Payin" },
                      { value: "payout", label: "Payout" },
                      { value: "settlement", label: "Settlements" },
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => handleTabChange(tab.value)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 ${
                          activeTab === tab.value
                            ? "bg-accent text-white shadow-sm"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

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
                            Transaction Analytics
                          </h3>
                          <p className="text-white/60 text-xs sm:text-sm font-['Albert_Sans']">
                            {activeTab === "payin"
                              ? "Payin"
                              : activeTab === "payout"
                              ? "Payout"
                              : "Settlement"}{" "}
                            trends over time
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
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 ${
                        activeTab === "payin"
                          ? "lg:grid-cols-5"
                          : "lg:grid-cols-4"
                      } gap-4`}
                    >
                      <input
                        className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                        value={filters.search}
                        onChange={(e) =>
                          handleFilterChange("search", e.target.value)
                        }
                        placeholder={`Search ${
                          activeTab === "payin" ? "transactions" : "payouts"
                        }...`}
                      />
                      <input
                        className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                        type="date"
                        value={filters.start_date}
                        onChange={(e) =>
                          handleFilterChange("start_date", e.target.value)
                        }
                        placeholder="Start Date"
                      />
                      <input
                        className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                        type="date"
                        value={filters.end_date}
                        onChange={(e) =>
                          handleFilterChange("end_date", e.target.value)
                        }
                        placeholder="End Date"
                      />
                      <select
                        className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                        value={filters.status}
                        onChange={(e) =>
                          handleFilterChange("status", e.target.value)
                        }
                      >
                        <option value="">All Status</option>
                        {activeTab === "payin" ? (
                          <>
                            <option value="created">Created</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="refunded">Refunded</option>
                          </>
                        ) : (
                          <>
                            <option value="requested">Requested</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                          </>
                        )}
                      </select>
                      {activeTab === "payin" && (
                        <select
                          className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                          value={filters.payment_method}
                          onChange={(e) =>
                            handleFilterChange("payment_method", e.target.value)
                          }
                        >
                          <option value="">All Methods</option>
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                          <option value="netbanking">Net Banking</option>
                          <option value="wallet">Wallet</option>
                        </select>
                      )}
                      <select
                        className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                        value={filters.sort_by}
                        onChange={(e) =>
                          handleFilterChange("sort_by", e.target.value)
                        }
                      >
                        <option value="createdAt">Sort by Date</option>
                        <option value="amount">Sort by Amount</option>
                        <option value="status">Sort by Status</option>
                      </select>
                      <select
                        className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                        value={filters.sort_order}
                        onChange={(e) =>
                          handleFilterChange("sort_order", e.target.value)
                        }
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                      <button
                        className={`w-full sm:w-auto bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                          activeTab === "payin"
                            ? "col-span-1 sm:col-span-2 lg:col-span-5"
                            : "col-span-1 sm:col-span-2 lg:col-span-4"
                        }`}
                        onClick={fetchTransactions}
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Apply Filters"}
                      </button>
                    </div>
                  </motion.div>

                  {/* Total Paid Amount Summary */}
                  {(activeTab === "payin" || activeTab === "settlement") && transactions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.25 }}
                      className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4 sm:p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white/70 text-sm font-medium font-['Albert_Sans'] mb-1">
                            Total Paid Amount (Filtered Results)
                          </h3>
                          <p className="text-2xl sm:text-3xl font-bold text-green-400 font-['Albert_Sans']">
                            ₹{calculateTotalPaidAmount().toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-white/60 text-xs font-['Albert_Sans'] mt-1">
                            Based on {transactions.filter(txn => txn.status === "paid" || txn.status === "success").length} paid transaction(s)
                          </p>
                        </div>
                        <FiTrendingUp className="text-green-400 text-4xl sm:text-5xl opacity-50" />
                      </div>
                    </motion.div>
                  )}

                  {/* Reports section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <span className="text-white/80 font-semibold text-sm sm:text-base font-['Albert_Sans'] whitespace-nowrap">
                        Reports:
                      </span>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleOpenDownloadModal}
                          disabled={downloading || loading}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                        >
                          <FiDownload className="text-sm" />
                          Download Transactions
                        </button>
                        <button
                          onClick={handleOpenPayoutDownloadModal}
                          disabled={downloading || loading}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                        >
                          <FiDownload className="text-sm" />
                          Download Payouts
                        </button>
                        <button
                          onClick={handleDownloadCombinedReport}
                          disabled={downloading || loading}
                          className="bg-[#263F43] hover:bg-[#2a4549] border border-accent/30 hover:border-accent/50 text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                        >
                          <FiDownload className="text-sm" />
                          {downloading
                            ? "Preparing…"
                            : "Download Combined (2 sheets)"}
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {error && <div className="error-message">{error}</div>}
                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>
                        Loading{" "}
                        {activeTab === "payin" ? "transactions" : "payouts"}...
                      </p>
                    </div>
                  ) : (
                    <div className="transactions-container">
                      {/* PAYIN TAB */}
                      {activeTab === "payin" && transactions.length > 0 ? (
                        <div className="bg-[#122D32] border border-white/10 rounded-xl shadow-lg w-full overflow-hidden">
                          <div className="overflow-x-auto w-full">
                            <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                              <thead className="bg-green-600/30 sticky top-0 z-10">
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
                                      transaction.created_at ||
                                        transaction.createdAt
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </div>
                      ) : activeTab === "payin" && transactions.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">
                            <HiOutlineClipboardDocumentList />
                          </div>
                          <h3>No Transactions Found</h3>
                          <p>No transactions match your current filters.</p>
                        </div>
                      ) : null}

                      {/* PAYOUT TAB */}
                      {activeTab === "payout" && payouts.length > 0 ? (
                        <div className="bg-[#122D32] border border-white/10 rounded-xl overflow-auto shadow-lg">
                          <table className="w-full border-collapse">
                            <thead className="bg-green-600/30 sticky top-0 z-10">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Payout ID
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Net Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Commission
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Transfer Mode
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Requested At
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Completed At
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  UTR
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-[#263F43]">
                              {payouts.map((payout, index) => (
                                <tr
                                  key={payout.payoutId || index}
                                  className="hover:bg-green-600/10 transition-colors duration-150"
                                >
                                  <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                    {payout.payoutId || "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-white font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                    {formatAmount(payout.amount)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-green-400 font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                    {formatAmount(payout.netAmount)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-white font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                    {formatAmount(payout.commission)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                    {payout.description || "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm border-b border-white/10 whitespace-nowrap">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-['Albert_Sans'] ${getStatusClass(
                                        payout.status
                                      )}`}
                                    >
                                      {payout.status || "Pending"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                    {payout.transferMode === "bank_transfer"
                                      ? "Bank Transfer"
                                      : "UPI"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-white/90 border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                    {formatDate(payout.requestedAt)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-white/90 border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                    {formatDate(payout.completedAt)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-mono font-['Albert_Sans']">
                                    {payout.utr || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : activeTab === "payout" && payouts.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">
                            <HiOutlineClipboardDocumentList />
                          </div>
                          <h3>No Payouts Found</h3>
                          <p>No payout requests match your current filters.</p>
                        </div>
                      ) : null}

                      {activeTab === "settlement" && transactions.length > 0 ? (
                        <div className="bg-[#122D32] border border-white/10 rounded-xl overflow-auto shadow-lg">
                          <table className="w-full border-collapse">
                            <thead className="bg-green-600/30 sticky top-0 z-10">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Transaction ID
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Order ID
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Commission
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  GST Rate Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Net Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Payment Method
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Gateway
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Paid At
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  Settled At
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                                  UTR
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-[#263F43]">
                              {transactions.map((txn, index) => {
                                const settledAt =
                                  txn.settlementDate ||
                                  txn.settlement_date ||
                                  txn.updatedAt ||
                                  txn.updated_at ||
                                  txn.paidAt ||
                                  txn.paid_at;
                                return (
                                  <tr
                                    key={
                                      txn.transactionId ||
                                      txn.transaction_id ||
                                      index
                                    }
                                    className="hover:bg-green-600/10 transition-colors duration-150 cursor-pointer"
                                    onClick={() =>
                                      navigate(
                                        `/admin/transactions/${
                                          txn.transactionId ||
                                          txn.transaction_id
                                        }`
                                      )
                                    }
                                  >
                                    <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {txn.transactionId ||
                                        txn.transaction_id ||
                                        "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {txn.orderId || txn.order_id || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {formatAmount(txn.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {formatAmount(txn.commission)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {(() => {
                                        // Calculate GST amount
                                        // GST rate is 18% (from commissionCalculator.js)
                                        const baseRate = 3.8; // 3.8% base commission rate
                                        const gstRate = 18; // 18% GST rate
                                        let gstAmount = 0;
                                        
                                        if (txn.amount && txn.amount > 0) {
                                          // Calculate base commission first, then GST on it
                                          const baseCommission = (txn.amount * baseRate) / 100;
                                          gstAmount = (baseCommission * gstRate) / 100;
                                        }
                                        
                                        return formatAmount(gstAmount);
                                      })()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-green-400 font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {formatAmount(txn.netAmount)}
                                    </td>
                                    <td className="px-4 py-3 text-sm border-b border-white/10 whitespace-nowrap">
                                      <span
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-['Albert_Sans'] ${getStatusClass(
                                          txn.status
                                        )}`}
                                      >
                                        {txn.status || "-"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {txn.paymentMethod ||
                                        txn.payment_method ||
                                        "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {txn.paymentGateway ||
                                        txn.payment_gateway ||
                                        "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white/90 border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {formatDate(txn.paidAt || txn.paid_at)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white/90 border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                      {formatDate(settledAt)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-mono font-['Albert_Sans']">
                                      {txn.acquirerData?.utr || txn.utr || "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : activeTab === "settlement" &&
                        transactions.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">
                            <HiOutlineClipboardDocumentList />
                          </div>
                          <h3>No Settled Transactions</h3>
                          <p>
                            No settled transactions match your current filters.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </section>
      </div>

      {/* Download Report Modal */}
      {showDownloadModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDownloadModal(false)}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "700px" }}
          >
            <div className="modal-header">
              <h3>
                <FiDownload style={{ marginRight: "8px" }} />
                Download Transaction Report
              </h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {/* Date Range */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Date Range (Optional)
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={downloadFilters.startDate}
                        onChange={(e) =>
                          handleDownloadFilterChange(
                            "startDate",
                            e.target.value
                          )
                        }
                        className="filter-date"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        End Date
                      </label>
                      <input
                        type="date"
                        value={downloadFilters.endDate}
                        onChange={(e) =>
                          handleDownloadFilterChange("endDate", e.target.value)
                        }
                        className="filter-date"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                        min={downloadFilters.startDate || undefined}
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={downloadFilters.status}
                    onChange={(e) =>
                      handleDownloadFilterChange("status", e.target.value)
                    }
                    className="filter-select"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="created">Created</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Payment Method & Gateway */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Payment Method
                    </label>
                    <select
                      value={downloadFilters.paymentMethod}
                      onChange={(e) =>
                        handleDownloadFilterChange(
                          "paymentMethod",
                          e.target.value
                        )
                      }
                      className="filter-select"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="">All Methods</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="netbanking">Net Banking</option>
                      <option value="wallet">Wallet</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Payment Gateway
                    </label>
                    <select
                      value={downloadFilters.paymentGateway}
                      onChange={(e) =>
                        handleDownloadFilterChange(
                          "paymentGateway",
                          e.target.value
                        )
                      }
                      className="filter-select"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="">All Gateways</option>
                      <option value="cashfree">Cashfree</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="phonepe">PhonePe</option>
                    </select>
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Amount Range
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Min Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={downloadFilters.minAmount}
                        onChange={(e) =>
                          handleDownloadFilterChange(
                            "minAmount",
                            e.target.value
                          )
                        }
                        placeholder="e.g., 100"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Max Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={downloadFilters.maxAmount}
                        onChange={(e) =>
                          handleDownloadFilterChange(
                            "maxAmount",
                            e.target.value
                          )
                        }
                        placeholder="e.g., 10000"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Settlement Status (only for payin tab) */}
                {activeTab !== "settlement" && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Settlement Status
                    </label>
                    <select
                      value={downloadFilters.settlementStatus}
                      onChange={(e) =>
                        handleDownloadFilterChange(
                          "settlementStatus",
                          e.target.value
                        )
                      }
                      className="filter-select"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="">All Settlement Status</option>
                      <option value="settled">Settled</option>
                      <option value="unsettled">Unsettled</option>
                    </select>
                  </div>
                )}

                {/* Search Query */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Search
                  </label>
                  <input
                    type="text"
                    value={downloadFilters.search}
                    onChange={(e) =>
                      handleDownloadFilterChange("search", e.target.value)
                    }
                    placeholder="Search by transaction ID, order ID, customer name, email, phone, UTR..."
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                    }}
                  />
                </div>

                {/* Sort Options */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Sort By
                    </label>
                    <select
                      value={downloadFilters.sortBy}
                      onChange={(e) =>
                        handleDownloadFilterChange("sortBy", e.target.value)
                      }
                      className="filter-select"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="createdAt">Created Date</option>
                      <option value="amount">Amount</option>
                      <option value="paidAt">Paid Date</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Sort Order
                    </label>
                    <select
                      value={downloadFilters.sortOrder}
                      onChange={(e) =>
                        handleDownloadFilterChange("sortOrder", e.target.value)
                      }
                      className="filter-select"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>

                {/* Limit (optional) */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Limit (Optional)
                  </label>
                  <input
                    type="number"
                    value={downloadFilters.limit}
                    onChange={(e) =>
                      handleDownloadFilterChange("limit", e.target.value)
                    }
                    placeholder="Max number of records (leave empty for all)"
                    min="1"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Leave empty to download all matching records
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadTransactionReport}
                disabled={downloading}
                className="btn btn-primary"
              >
                {downloading ? "Downloading..." : "Download Excel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Download Report Modal */}
      {showPayoutDownloadModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPayoutDownloadModal(false)}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "700px" }}
          >
            <div className="modal-header">
              <h3>
                <FiDownload style={{ marginRight: "8px" }} />
                Download Payout Report
              </h3>
              <button
                onClick={() => setShowPayoutDownloadModal(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div
              className="modal-body"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {/* Date Range */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Date Range (Optional)
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={payoutDownloadFilters.startDate}
                        onChange={(e) =>
                          handlePayoutDownloadFilterChange(
                            "startDate",
                            e.target.value
                          )
                        }
                        className="filter-date"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        End Date
                      </label>
                      <input
                        type="date"
                        value={payoutDownloadFilters.endDate}
                        onChange={(e) =>
                          handlePayoutDownloadFilterChange(
                            "endDate",
                            e.target.value
                          )
                        }
                        className="filter-date"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                        min={payoutDownloadFilters.startDate || undefined}
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={payoutDownloadFilters.status}
                    onChange={(e) =>
                      handlePayoutDownloadFilterChange("status", e.target.value)
                    }
                    className="filter-select"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="requested">Requested</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Transfer Mode */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Transfer Mode
                  </label>
                  <select
                    value={payoutDownloadFilters.transferMode}
                    onChange={(e) =>
                      handlePayoutDownloadFilterChange(
                        "transferMode",
                        e.target.value
                      )
                    }
                    className="filter-select"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <option value="">All Transfer Modes</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>

                {/* Amount Range */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Net Amount Range
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Min Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={payoutDownloadFilters.minAmount}
                        onChange={(e) =>
                          handlePayoutDownloadFilterChange(
                            "minAmount",
                            e.target.value
                          )
                        }
                        placeholder="e.g., 100"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        Max Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={payoutDownloadFilters.maxAmount}
                        onChange={(e) =>
                          handlePayoutDownloadFilterChange(
                            "maxAmount",
                            e.target.value
                          )
                        }
                        placeholder="e.g., 10000"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Search Query */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Search
                  </label>
                  <input
                    type="text"
                    value={payoutDownloadFilters.search}
                    onChange={(e) =>
                      handlePayoutDownloadFilterChange("search", e.target.value)
                    }
                    placeholder="Search by payout ID, merchant name, description, UTR, beneficiary name..."
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                    }}
                  />
                </div>

                {/* Sort Options */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Sort By
                    </label>
                    <select
                      value={payoutDownloadFilters.sortBy}
                      onChange={(e) =>
                        handlePayoutDownloadFilterChange(
                          "sortBy",
                          e.target.value
                        )
                      }
                      className="filter-select"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="createdAt">Created Date</option>
                      <option value="amount">Amount (Gross)</option>
                      <option value="netAmount">Net Amount</option>
                      <option value="requestedAt">Requested Date</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Sort Order
                    </label>
                    <select
                      value={payoutDownloadFilters.sortOrder}
                      onChange={(e) =>
                        handlePayoutDownloadFilterChange(
                          "sortOrder",
                          e.target.value
                        )
                      }
                      className="filter-select"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>

                {/* Limit (optional) */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    Limit (Optional)
                  </label>
                  <input
                    type="number"
                    value={payoutDownloadFilters.limit}
                    onChange={(e) =>
                      handlePayoutDownloadFilterChange("limit", e.target.value)
                    }
                    placeholder="Max number of records (leave empty for all)"
                    min="1"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Leave empty to download all matching records
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowPayoutDownloadModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPayoutReport}
                disabled={downloading}
                className="btn btn-primary"
              >
                {downloading ? "Downloading..." : "Download Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
