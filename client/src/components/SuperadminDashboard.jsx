// components/SuperadminDashboard.jsx

import React, { useState, useEffect } from "react";
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
} from "react-icons/fi";
import { HiOutlineChartBar } from "react-icons/hi2";
import { TbArrowsTransferDown } from "react-icons/tb";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import superadminPaymentService from "../services/superadminPaymentService";
import Navbar from "./Navbar";

const SuperadminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [settlementMessage, setSettlementMessage] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);
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

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await superadminPaymentService.getDashboardStats();
      console.log("Dashboard stats:", data);
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError(err.message);
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
        <Navbar />
        <main className="pt-24 p-8 max-w-[1200px] mx-auto">
          <div className="flex flex-col items-center justify-center py-20 px-5 bg-bg-secondary rounded-xl shadow-lg border border-white/10">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-accent rounded-full animate-spin mb-5"></div>
            <p className="text-white/80">Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      <Navbar />
      <main className="pt-24 p-8 max-w-[1200px] mx-auto">
        <div className="bg-bg-secondary border border-white/10 rounded-xl p-8 mb-8 shadow-lg">
          <div className="flex justify-between items-start gap-5 flex-wrap">
            <div>
              <h1 className="text-3xl font-medium text-white mb-2 font-['Albert_Sans']">
                SuperAdmin Dashboard
              </h1>
              <p className="text-white/80">
                Complete overview of platform operations and statistics
              </p>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="bg-accent hover:bg-bg-tertiary text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {error && (
            <div className="text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2">
              <FiAlertCircle /> {error}
            </div>
          )}

          {stats && (
            <>
              {/* Merchants Section */}
              <div className="mb-10">
                <div className="section-header-base">
                  <h2>
                    <FiUsers /> Merchants
                  </h2>
                  <span className="text-sm font-medium text-white/80 bg-bg-tertiary px-4 py-1.5 rounded-full font-['Albert_Sans']">
                    {stats.merchants.total} Total
                  </span>
                </div>
                <div className="stats-grid-base">
                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-accent to-bg-tertiary text-white">
                      <FiUsers />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Total Merchants</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.merchants.total)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-green-400 to-green-600 text-white">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Active</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.merchants.active)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                      <FiClock />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Inactive</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.merchants.inactive)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiTrendingUp />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">New This Week</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.merchants.new_this_week)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Section */}
              <div className="mb-10">
                <div className="section-header-base">
                  <h2>
                    <HiOutlineChartBar /> Transactions
                  </h2>
                  <span className="text-sm font-medium text-white/80 bg-bg-tertiary px-4 py-1.5 rounded-full font-['Albert_Sans']">
                    {stats.transactions.total} Total
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-4">
                  <div
                    className="stat-card-base cursor-pointer hover:border-accent"
                    onClick={() => navigate("/superadmin/transactions")}
                  >
                    <div className="stat-icon-base bg-gradient-to-br from-accent to-bg-tertiary text-white">
                      <HiOutlineChartBar />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Total Transactions</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.transactions.total)}
                      </div>
                      <div className="stat-meta-base">
                        Success Rate: {stats.transactions.success_rate}%
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-green-400 to-green-600 text-white">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Paid</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.transactions.paid)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                      <FiClock />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Pending</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.transactions.pending)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-red-400 to-red-600 text-white">
                      <FiXCircle />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Failed</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.transactions.failed)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Settled</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.transactions.settled)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiClock />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Unsettled</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.transactions.unsettled)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Today & Week Stats */}
                <div className="flex gap-4 mt-4">
                  <div className="flex-1 bg-bg-secondary border-l-4 border-accent px-4 py-3 rounded-lg transition-all duration-200 hover:bg-bg-tertiary hover:translate-x-1">
                    <div className="stat-label-base">Today</div>
                    <div className="stat-value-base text-xl">
                      {formatNumber(stats.transactions.today)}
                    </div>
                  </div>
                  <div className="flex-1 bg-bg-secondary border-l-4 border-accent px-4 py-3 rounded-lg transition-all duration-200 hover:bg-bg-tertiary hover:translate-x-1">
                    <div className="stat-label-base">This Week</div>
                    <div className="stat-value-base text-xl">
                      {formatNumber(stats.transactions.this_week)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Section */}
              <div className="mb-10">
                <div className="section-header-base">
                  <h2>
                    <FiDollarSign /> Revenue
                  </h2>
                  <span className="text-lg font-medium text-green-400 font-['Albert_Sans']">
                    {formatCurrency(stats.revenue.total)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-4">
                  <div className="stat-card-base md:col-span-2">
                    <div className="stat-icon-base bg-gradient-to-br from-accent to-bg-tertiary text-white">
                      <FiDollarSign />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Total Revenue</div>
                      <div className="stat-value-base">
                        {formatCurrency(stats.revenue.total)}
                      </div>
                      <div className="stat-meta-base">
                        Avg: {formatCurrency(stats.revenue.average_transaction)}{" "}
                        per txn
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-green-400 to-green-600 text-white">
                      <FiTrendingUp />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">
                        Commission Earned (3.8%)
                      </div>
                      <div className="stat-value-base">
                        {formatCurrency(stats.revenue.commission_earned)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiCreditCard />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Net Revenue</div>
                      <div className="stat-value-base">
                        {formatCurrency(stats.revenue.net_revenue)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                      <FiArrowDown />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Refunded</div>
                      <div className="stat-value-base">
                        {formatCurrency(stats.revenue.refunded)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <div className="flex-1 bg-bg-secondary border-l-4 border-green-400 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-bg-tertiary hover:translate-x-1">
                    <div className="stat-label-base">Today's Revenue</div>
                    <div className="stat-value-base text-xl">
                      {formatCurrency(stats.revenue.today)}
                    </div>
                  </div>
                  <div className="flex-1 bg-bg-secondary border-l-4 border-green-400 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-bg-tertiary hover:translate-x-1">
                    <div className="stat-label-base">This Week</div>
                    <div className="stat-value-base text-xl">
                      {formatCurrency(stats.revenue.this_week)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payouts Section */}
              <div className="mb-10">
                <div className="section-header-base">
                  <h2>
                    <TbArrowsTransferDown /> Payouts
                  </h2>
                  <span className="text-sm font-medium text-white/80 bg-bg-tertiary px-4 py-1.5 rounded-full font-['Albert_Sans']">
                    {stats.payouts.total_requests} Requests
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-4">
                  <div
                    className="stat-card-base cursor-pointer hover:border-accent"
                    onClick={() => navigate("/superadmin/payouts")}
                  >
                    <div className="stat-icon-base bg-gradient-to-br from-accent to-bg-tertiary text-white">
                      <RiMoneyDollarCircleLine />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Total Requests</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.payouts.total_requests)}
                      </div>
                      <div className="stat-meta-base">
                        {formatCurrency(stats.payouts.total_amount_requested)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                      <FiAlertCircle />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Pending Approval</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.payouts.requested)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiClock />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Processing</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.payouts.pending)}
                      </div>
                      <div className="stat-meta-base">
                        {formatCurrency(stats.payouts.total_pending)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-green-400 to-green-600 text-white">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Completed</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.payouts.completed)}
                      </div>
                      <div className="stat-meta-base">
                        {formatCurrency(stats.payouts.total_completed)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-red-400 to-red-600 text-white">
                      <FiXCircle />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Rejected</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.payouts.rejected)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiDollarSign />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Commission Earned</div>
                      <div className="stat-value-base">
                        {formatCurrency(stats.payouts.commission_earned)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <div className="flex-1 bg-bg-secondary border-l-4 border-accent px-4 py-3 rounded-lg transition-all duration-200 hover:bg-bg-tertiary hover:translate-x-1">
                    <div className="stat-label-base">Today's Requests</div>
                    <div className="stat-value-base text-xl">
                      {formatNumber(stats.payouts.today)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Settlement Section */}
              <div className="mb-10">
                <div className="section-header-base">
                  <h2>
                    <FiPackage /> Settlement Status
                  </h2>
                  <button
                    onClick={handleManualSettlement}
                    disabled={loadingSettlement}
                    className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <FiRefreshCw
                      className={loadingSettlement ? "animate-spin" : ""}
                    />
                    {loadingSettlement
                      ? "Processing..."
                      : "Run Manual Settlement"}
                  </button>
                </div>

                {settlementMessage && (
                  <div
                    className={
                      settlementMessage.includes("✅")
                        ? "alert-success mb-4"
                        : "alert-error mb-4"
                    }
                  >
                    {settlementMessage}
                  </div>
                )}

                <div className="stats-grid-base">
                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-green-400 to-green-600 text-white">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">
                        Settled Transactions
                      </div>
                      <div className="stat-value-base">
                        {formatNumber(stats.settlement.settled_transactions)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                      <FiClock />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Unsettled</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.settlement.unsettled_transactions)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiDollarSign />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">
                        Available for Payout
                      </div>
                      <div className="stat-value-base">
                        {formatNumber(stats.settlement.available_for_payout)}
                      </div>
                      <div className="stat-meta-base">
                        {formatCurrency(stats.settlement.available_balance)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiPackage />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">In Payouts</div>
                      <div className="stat-value-base">
                        {formatNumber(stats.settlement.in_payouts)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Revenue */}
              <div className="mb-10">
                <div className="section-header-base">
                  <h2>
                    <FiTrendingUp /> Platform Revenue
                  </h2>
                  <span className="text-lg font-medium text-green-400 font-['Albert_Sans']">
                    {formatCurrency(stats.platform.total_commission_earned)}
                  </span>
                </div>
                <div className="stats-grid-base">
                  <div className="stat-card-base md:col-span-2">
                    <div className="stat-icon-base bg-gradient-to-br from-accent to-bg-tertiary text-white">
                      <FiDollarSign />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">Total Commission</div>
                      <div className="stat-value-base">
                        {formatCurrency(stats.platform.total_commission_earned)}
                      </div>
                      <div className="stat-meta-base">Payin + Payout fees</div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-green-400 to-green-600 text-white">
                      <FiArrowUp />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">
                        Payin Commission (3.8%)
                      </div>
                      <div className="stat-value-base">
                        {formatCurrency(stats.platform.payin_commission)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card-base">
                    <div className="stat-icon-base bg-gradient-to-br from-bg-tertiary to-accent text-white">
                      <FiArrowDown />
                    </div>
                    <div className="stat-content-base">
                      <div className="stat-label-base">
                        Payout Commission (₹30)
                      </div>
                      <div className="stat-value-base">
                        {formatCurrency(stats.platform.payout_commission)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperadminDashboard;
