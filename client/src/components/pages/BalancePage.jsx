import React, { useState, useEffect } from "react";
import {
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiPercent,
  FiInfo,
  FiRefreshCw,
  FiClock,
  FiCheck,
} from "react-icons/fi";
import { HiOutlineChartBar } from "react-icons/hi2";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import paymentService from "../../services/paymentService";
import Navbar from "../Navbar";

const BalancePage = () => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await paymentService.getBalance();
      console.log("Balance data received:", data);
      setBalance(data);
    } catch (error) {
      console.error("Balance fetch error:", error);
      setError(error.message);
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

  return (
    <div className="min-h-screen bg-[#001D22]">
      <Navbar />
      <main className="bg-transparent pt-24 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans'] flex items-center gap-3">
                <FiDollarSign className="text-accent" />
                Balance & Revenue
              </h1>
              <p className="text-white/70 text-sm sm:text-base font-['Albert_Sans']">
                Complete financial overview with T+1/2 settlement tracking
              </p>
            </div>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className="bg-accent hover:bg-bg-tertiary text-white px-4 sm:px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none self-start sm:self-auto"
            >
              <FiRefreshCw
                className={`text-base ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FiInfo className="w-3 h-3 text-red-400" />
            </div>
            <p className="text-red-400 text-sm sm:text-base font-medium font-['Albert_Sans'] flex-1">
              {error}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white/70 text-sm sm:text-base font-['Albert_Sans']">
              Loading balance information...
            </p>
          </div>
        ) : balance ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Balance Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {/* Available Balance */}
              <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FiDollarSign className="text-green-400 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                      Available Wallet Balance
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-white font-['Albert_Sans'] mb-1">
                      {formatCurrency(balance.balance?.available_balance || 0)}
                    </div>
                    <div className="text-green-400 text-xs font-medium font-['Albert_Sans'] flex items-center gap-1">
                      <FiCheck className="w-3 h-3" />
                      Ready to withdraw
                    </div>
                  </div>
                </div>
              </div>

              {/* Unsettled Balance */}
              <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <FiClock className="text-amber-400 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                      Unsettled Balance
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-white font-['Albert_Sans'] mb-1">
                      {formatCurrency(
                        balance.balance?.unsettled_net_revenue || 0
                      )}
                    </div>
                    <div className="text-amber-400 text-xs font-medium font-['Albert_Sans'] flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      Waiting for settlement
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Today Revenue */}
              <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FiTrendingUp className="text-blue-400 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                      Total Today Revenue
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-white font-['Albert_Sans'] mb-1">
                      {formatCurrency(balance.balance?.totalTodayRevenue || 0)}
                    </div>
                    <div className="text-blue-400 text-xs font-medium font-['Albert_Sans'] flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      Today's earnings
                    </div>
                  </div>
                </div>
              </div>

              {/* Today Payin Commission */}
              <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <FiPercent className="text-purple-400 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                      Today Payin Commission
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-white font-['Albert_Sans'] mb-1">
                      {formatCurrency(
                        balance.balance?.totalPayinCommission || 0
                      )}
                    </div>
                    <div className="text-purple-400 text-xs font-medium font-['Albert_Sans'] flex items-center gap-1">
                      <FiPercent className="w-3 h-3" />
                      Commission today
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Payouts */}
              <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <FiTrendingUp className="text-yellow-400 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                      Pending Payouts
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-white font-['Albert_Sans'] mb-1">
                      {formatCurrency(balance.balance?.pending_payouts || 0)}
                    </div>
                    <div className="text-yellow-400 text-xs font-medium font-['Albert_Sans'] flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      Waiting for approval
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Paid Out */}
              <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FiDollarSign className="text-green-400 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                      Total Paid Out
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-white font-['Albert_Sans'] mb-1">
                      {formatCurrency(balance.balance?.total_paid_out || 0)}
                    </div>
                    <div className="text-green-400 text-xs font-medium font-['Albert_Sans'] flex items-center gap-1">
                      <FiCheck className="w-3 h-3" />
                      Successfully paid out
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <FiTrendingUp className="text-accent text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                      Total Revenue
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-white font-['Albert_Sans'] mb-1">
                      {formatCurrency(balance.balance?.total_revenue || 0)}
                    </div>
                    <div className="text-accent text-xs font-medium font-['Albert_Sans']">
                      All-time revenue
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Payin Commission */}
              <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 sm:p-6 hover:border-accent/30 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <FiPercent className="text-accent text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                      Total Payin Commission
                    </div>
                    <div className="text-xl sm:text-2xl font-semibold text-white font-['Albert_Sans'] mb-1">
                      {formatCurrency(balance.balance?.total_commission || 0)}
                    </div>
                    <div className="text-accent text-xs font-medium font-['Albert_Sans']">
                      All-time commission
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout Eligibility Section */}
            {balance.payout_eligibility && (
              <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <RiMoneyDollarCircleLine className="text-accent text-xl" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
                    Payout Eligibility
                  </h3>
                </div>
                <div className="bg-[#263F43] border border-white/10 rounded-lg p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1.5 rounded-md text-sm font-medium font-['Albert_Sans'] ${
                          balance.payout_eligibility.can_request_payout
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {balance.payout_eligibility.can_request_payout
                          ? "✓ Eligible for Payout"
                          : "✕ Not Eligible"}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                        Maximum Payout Amount
                      </div>
                      <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                        {formatCurrency(
                          balance.payout_eligibility.maximum_payout_amount || 0
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-accent/10 border border-accent/30 rounded-lg p-3">
                    <FiInfo className="text-accent text-lg flex-shrink-0 mt-0.5" />
                    <p className="text-accent text-sm font-medium font-['Albert_Sans'] flex-1">
                      {balance.payout_eligibility.can_request_payout
                        ? "You can request a payout from your available wallet balance."
                        : "You do not have any available balance for payout."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Merchant Info Section */}
            {balance.merchant && (
              <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <FiInfo className="text-accent text-xl" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
                    Account Information
                  </h3>
                </div>
                <div className="bg-[#263F43] border border-white/10 rounded-lg p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                        Merchant Name
                      </div>
                      <div className="text-white text-sm sm:text-base font-medium font-['Albert_Sans']">
                        {balance.merchant.merchantName}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                        Email
                      </div>
                      <div className="text-white text-sm sm:text-base font-medium font-['Albert_Sans']">
                        {balance.merchant.merchantEmail}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                        Merchant ID
                      </div>
                      <div className="text-white text-sm sm:text-base font-mono font-medium">
                        {balance.merchant.merchantId}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs sm:text-sm font-medium font-['Albert_Sans'] mb-1">
                        Last Updated
                      </div>
                      <div className="text-white text-sm sm:text-base font-medium font-['Albert_Sans']">
                        {new Date().toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
              <FiCreditCard className="text-accent text-2xl" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2 font-['Albert_Sans']">
              Unable to Load Balance
            </h3>
            <p className="text-white/60 text-sm sm:text-base font-['Albert_Sans'] mb-6 text-center max-w-md">
              There was an issue loading your balance information.
            </p>
            <button
              onClick={fetchBalance}
              className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 py-3 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default BalancePage;
