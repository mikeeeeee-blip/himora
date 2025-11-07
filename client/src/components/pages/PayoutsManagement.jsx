// components/superadmin/PayoutsManagement.jsx

import React, { useState, useEffect } from "react";
import {
  FiRefreshCw,
  FiX,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiDollarSign,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiSend,
  FiUser,
  FiCreditCard,
  FiInfo,
  FiCopy,
  FiArrowLeft,
} from "react-icons/fi";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import superadminPaymentService from "../../services/superadminPaymentService";
import ExportCSV from "../../components/ExportCSV";
import Toast from "../../components/ui/Toast";
import "./PayoutManagement.css";
const PayoutsManagement = () => {
  const [payouts, setPayouts] = useState([]);
  const [payoutsSummary, setPayoutsSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    page: 1,
    limit: 20,
  });

  // Form states for actions
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processUtr, setProcessUtr] = useState("");
  const [processNotes, setProcessNotes] = useState("");

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(2);

  useEffect(() => {
    fetchPayouts();
  }, [filters]);

  const fetchPayouts = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await superadminPaymentService.getAllPayouts(filters); // ✅ CHANGED
      console.log("All payouts data:", data);
      setPayouts(data.payouts || []);
      setPayoutsSummary(data.summary || null);
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const formatForExport = () => {
    if (!payouts || payouts.length === 0) {
      return [];
    }

    return payouts.map((payout) => ({
      "Payout ID": payout.payoutId || "N/A",
      "Merchant Name": payout.merchantName || "N/A",
      "Merchant ID": payout.merchantId?._id || payout.merchantId || "N/A",
      Amount: payout.amount ? `₹${payout.amount}` : "N/A",
      Commission: payout.commission ? `₹${payout.commission}` : "N/A",
      "Net Amount": payout.netAmount ? `₹${payout.netAmount}` : "N/A",
      Status: payout.status || "N/A",
      "Transfer Mode":
        payout.transferMode === "bank_transfer"
          ? "Bank Transfer"
          : payout.transferMode === "crypto"
          ? "Crypto"
          : "UPI",
      "Requested By": payout.requestedByName || "N/A",
      "Requested At": formatDate(payout.requestedAt),
      "Approved By": payout.approvedByName || "N/A",
      "Approved At": payout.approvedAt ? formatDate(payout.approvedAt) : "N/A",
      "Completed At": payout.completedAt
        ? formatDate(payout.completedAt)
        : "N/A",
      UTR: payout.utr || "N/A",
      Notes: payout.adminNotes || "N/A",
    }));
  };

  const handleApprovePayout = async () => {
    setActionLoading(true);
    try {
      await superadminPaymentService.approvePayout(
        selectedPayout.payoutId,
        approveNotes
      );
      // Move to next step after approval
      setCurrentStep(2);
      setToast({
        message: "Payout approved successfully! Now complete the payout.",
        type: "success",
      });
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayout = async () => {
    if (!rejectReason.trim()) {
      setToast({ message: "Rejection reason is required", type: "error" });
      return;
    }

    setActionLoading(true);
    try {
      await superadminPaymentService.rejectPayout(
        selectedPayout.payoutId,
        rejectReason
      ); // ✅ CHANGED
      setToast({ message: "Payout rejected successfully", type: "success" });
      setShowModal(false);
      setRejectReason("");
      fetchPayouts();
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!processUtr.trim()) {
      const fieldName =
        selectedPayout?.transferMode === "crypto"
          ? "Transaction Hash"
          : "UTR/Transaction reference";
      setToast({ message: `${fieldName} is required`, type: "error" });
      return;
    }

    setActionLoading(true);
    try {
      await superadminPaymentService.processPayout(
        selectedPayout.payoutId,
        processUtr,
        processNotes,
        selectedPayout.transferMode === "crypto" ? processUtr : undefined
      );
      setToast({ message: "Payout processed successfully!", type: "success" });
      setShowModal(false);
      setProcessUtr("");
      setProcessNotes("");
      setApproveNotes("");
      setCurrentStep(1);
      fetchPayouts();
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (type, payout) => {
    setModalType(type);
    setSelectedPayout(payout);
    setShowModal(true);
    setCurrentStep(1); // Reset to first step when opening modal
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType("");
    setSelectedPayout(null);
    setApproveNotes("");
    setRejectReason("");
    setProcessUtr("");
    setProcessNotes("");
    setCurrentStep(1); // Reset to first step
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <FiCheckCircle className="status-icon success" />;
      case "failed":
      case "cancelled":
      case "rejected":
        return <FiXCircle className="status-icon error" />;
      case "requested":
        return <FiAlertCircle className="status-icon warning" />;
      case "pending":
      case "processing":
        return <FiClock className="status-icon info" />;
      default:
        return <FiAlertCircle className="status-icon" />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "badge-success";
      case "failed":
      case "cancelled":
      case "rejected":
        return "badge-error";
      case "requested":
        return "badge-warning";
      case "pending":
      case "processing":
        return "badge-info";
      default:
        return "badge-default";
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
              <div className="mb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                  {/* Left Section - Title */}
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans'] flex items-center gap-3">
                      <RiMoneyDollarCircleLine className="text-accent" />
                      Payout Management
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                      Approve, reject, and process merchant payout requests
                    </p>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    <button
                      onClick={fetchPayouts}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiRefreshCw className={loading ? "animate-spin" : ""} />
                      <span>{loading ? "Loading..." : "Refresh"}</span>
                    </button>
                    {payouts.length > 0 && (
                      <ExportCSV
                        data={formatForExport()}
                        filename={`all_payouts_${
                          new Date().toISOString().split("T")[0]
                        }.csv`}
                        className="flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  <FiAlertCircle />
                  <span>{error}</span>
                </div>
              )}

              {/* Summary Cards */}
              {payoutsSummary && (
                <div className="mb-6">
                  <h3 className="text-lg sm:text-xl font-medium text-white mb-4 font-['Albert_Sans'] flex items-center gap-2">
                    <FiDollarSign className="text-accent" />
                    Summary Statistics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
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
                              {payoutsSummary.total_payout_requests || 0}
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
                              Pending Approval
                            </h3>
                            <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                              {payoutsSummary.requested_payouts || 0}
                            </div>
                            <div className="text-xs text-yellow-400 mt-1 font-['Albert_Sans']">
                              {formatCurrency(payoutsSummary.total_pending)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#263F43] border border-white/10 rounded-xl p-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
                            <FiCheck />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs text-white/70 font-medium font-['Albert_Sans'] mb-0.5">
                              Completed
                            </h3>
                            <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                              {payoutsSummary.completed_payouts || 0}
                            </div>
                            <div className="text-xs text-green-400 mt-1 font-['Albert_Sans']">
                              {formatCurrency(payoutsSummary.total_completed)}
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
                              Rejected/Failed
                            </h3>
                            <div className="text-xl font-semibold text-white font-['Albert_Sans']">
                              {(payoutsSummary.rejected_payouts || 0) +
                                (payoutsSummary.failed_payouts || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="mb-6">
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value, page: 1 })
                  }
                  className="bg-[#263F43] border border-white/10 text-white rounded-lg px-4 py-2.5 font-['Albert_Sans'] focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors w-full sm:w-auto"
                >
                  <option value="">All Status</option>
                  <option value="requested">Requested</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payouts Table */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                  <p className="text-white/80 font-['Albert_Sans']">
                    Loading payout requests...
                  </p>
                </div>
              ) : payouts.length > 0 ? (
                <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#001D22] border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">
                            Payout ID
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden md:table-cell">
                            Merchant
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell">
                            Net
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden md:table-cell">
                            Mode
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell">
                            Requested
                          </th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.map((payout) => (
                          <tr
                            key={payout.payoutId}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-white text-xs sm:text-sm font-mono"
                                  title={payout.payoutId}
                                >
                                  {payout.payoutId.slice(-12)}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      payout.payoutId
                                    );
                                    setToast({
                                      message: "Copied!",
                                      type: "success",
                                    });
                                  }}
                                  className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                                  title="Copy full ID"
                                >
                                  <FiCopy size={12} />
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-3 hidden md:table-cell">
                              <div
                                className="text-white font-medium text-xs sm:text-sm font-['Albert_Sans']"
                                title={payout.merchantName}
                              >
                                {payout.merchantName}
                              </div>
                              <div
                                className="text-white/60 text-xs font-['Albert_Sans']"
                                title={payout.requestedByName}
                              >
                                {payout.requestedByName}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-white font-medium text-xs sm:text-sm font-['Albert_Sans']">
                              ₹{payout.amount.toLocaleString("en-IN")}
                            </td>

                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden lg:table-cell">
                              ₹{payout.netAmount.toLocaleString("en-IN")}
                            </td>

                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-lg">
                                {payout.transferMode === "upi"
                                  ? "📱"
                                  : payout.transferMode === "crypto"
                                  ? "₿"
                                  : "🏦"}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] ${
                                  getStatusBadgeClass(payout.status) ===
                                  "badge-success"
                                    ? "bg-green-500/20 text-green-400"
                                    : getStatusBadgeClass(payout.status) ===
                                      "badge-error"
                                    ? "bg-red-500/20 text-red-400"
                                    : getStatusBadgeClass(payout.status) ===
                                      "badge-warning"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-white/10 text-white/70"
                                }`}
                              >
                                {getStatusIcon(payout.status)}
                                <span>{payout.status}</span>
                              </span>
                            </td>

                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden lg:table-cell">
                              <div>
                                {new Date(
                                  payout.requestedAt
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </div>
                              <div className="text-white/50 text-xs">
                                {new Date(
                                  payout.requestedAt
                                ).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                <button
                                  onClick={() => openModal("view", payout)}
                                  className="flex items-center gap-1 px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg text-xs font-medium font-['Albert_Sans'] transition-colors"
                                  title="View Details"
                                >
                                  <FiEye size={12} />
                                  <span className="hidden sm:inline">View</span>
                                </button>

                                {payout.status === "requested" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        openModal("approve", payout)
                                      }
                                      className="flex items-center gap-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium font-['Albert_Sans'] transition-colors"
                                      title="Approve"
                                    >
                                      <FiCheck size={12} />
                                      <span className="hidden sm:inline">
                                        Approve
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        openModal("reject", payout)
                                      }
                                      className="flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium font-['Albert_Sans'] transition-colors"
                                      title="Reject"
                                    >
                                      <FiX size={12} />
                                      <span className="hidden sm:inline">
                                        Reject
                                      </span>
                                    </button>
                                  </>
                                )}

                                {(payout.status === "pending" ||
                                  payout.status === "processing") && (
                                  <button
                                    onClick={() => openModal("process", payout)}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium font-['Albert_Sans'] transition-colors"
                                    title="Process & Complete"
                                  >
                                    <FiSend size={12} />
                                    <span className="hidden sm:inline">
                                      Complete
                                    </span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <RiMoneyDollarCircleLine className="text-6xl text-white/50 mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2 font-['Albert_Sans']">
                    No Payout Requests
                  </h3>
                  <p className="text-white/70 text-sm font-['Albert_Sans']">
                    There are no payout requests at the moment.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal for Actions - IMPROVED UI */}
      {showModal && selectedPayout && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <div className="modal-header">
              <h3>
                {modalType === "view" && (
                  <>
                    <FiEye style={{ color: "#3b82f6" }} />
                    Payout Details
                  </>
                )}
                {modalType === "approve" && (
                  <>
                    <FiCheckCircle style={{ color: "#10b981" }} />
                    {currentStep === 1 ? "Approve Payout" : "Complete Payout"}
                  </>
                )}
                {modalType === "reject" && (
                  <>
                    <FiXCircle style={{ color: "#ef4444" }} />
                    Reject Payout
                  </>
                )}
                {modalType === "process" && (
                  <>
                    <FiSend style={{ color: "#3b82f6" }} />
                    Process Payout
                  </>
                )}
              </h3>
              <button onClick={closeModal} className="modal-close-btn">
                <FiX size={20} />
              </button>
            </div>

            {/* BODY */}
            <div className="modal-body">
              {/* VIEW DETAILS */}
              {modalType === "view" && (
                <div>
                  {/* Payout ID */}
                  <div className="info-box">
                    <div className="info-row">
                      <span className="info-label">Payout ID</span>
                      <span
                        className="info-value"
                        style={{ fontFamily: "monospace" }}
                      >
                        {selectedPayout.payoutId}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Status</span>
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          selectedPayout.status
                        )}`}
                      >
                        {getStatusIcon(selectedPayout.status)}
                        {selectedPayout.status}
                      </span>
                    </div>
                  </div>

                  {/* Amount Details */}
                  <div className="info-box success">
                    <div className="info-row">
                      <span className="info-label">Gross Amount</span>
                      <span className="info-value">
                        {formatCurrency(selectedPayout.amount)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Commission (₹30)</span>
                      <span className="info-value" style={{ color: "#ef4444" }}>
                        - {formatCurrency(selectedPayout.commission)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Net Amount</span>
                      <span className="info-value highlight">
                        {formatCurrency(selectedPayout.netAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Merchant Info */}
                  <div className="info-box">
                    <h4
                      style={{
                        marginTop: 0,
                        marginBottom: 16,
                        fontSize: 16,
                        color: "#1f2937",
                      }}
                    >
                      Merchant Information
                    </h4>
                    <div className="info-row">
                      <span className="info-label">Merchant Name</span>
                      <span className="info-value">
                        {selectedPayout.merchantName}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Requested By</span>
                      <span className="info-value">
                        {selectedPayout.requestedByName}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Requested Date</span>
                      <span className="info-value">
                        {formatDate(selectedPayout.requestedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Beneficiary Details */}
                  <div className="info-box">
                    <h4
                      style={{
                        marginTop: 0,
                        marginBottom: 16,
                        fontSize: 16,
                        color: "#1f2937",
                      }}
                    >
                      Beneficiary Details
                    </h4>
                    <div className="info-row">
                      <span className="info-label">Transfer Mode</span>
                      <span className="info-value">
                        {selectedPayout.transferMode === "bank_transfer"
                          ? "🏦 Bank Transfer"
                          : selectedPayout.transferMode === "crypto"
                          ? "₿ Crypto"
                          : "📱 UPI"}
                      </span>
                    </div>

                    {selectedPayout.beneficiaryDetails?.upiId && (
                      <div className="info-row">
                        <span className="info-label">UPI ID</span>
                        <span
                          className="info-value"
                          style={{ fontFamily: "monospace", fontSize: 14 }}
                        >
                          {selectedPayout.beneficiaryDetails.upiId}
                        </span>
                      </div>
                    )}

                    {selectedPayout.beneficiaryDetails?.walletAddress && (
                      <>
                        <div className="info-row">
                          <span className="info-label">Wallet Address</span>
                          <span
                            className="info-value"
                            style={{ fontFamily: "monospace", fontSize: 14 }}
                          >
                            {selectedPayout.beneficiaryDetails.walletAddress}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Network</span>
                          <span className="info-value">
                            {selectedPayout.beneficiaryDetails.networkName}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Currency</span>
                          <span className="info-value">
                            {selectedPayout.beneficiaryDetails.currencyName}
                          </span>
                        </div>
                      </>
                    )}

                    {selectedPayout.beneficiaryDetails?.accountNumber && (
                      <>
                        <div className="info-row">
                          <span className="info-label">Account Number</span>
                          <span
                            className="info-value"
                            style={{ fontFamily: "monospace", fontSize: 14 }}
                          >
                            {selectedPayout.beneficiaryDetails.accountNumber}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">IFSC Code</span>
                          <span
                            className="info-value"
                            style={{ fontFamily: "monospace" }}
                          >
                            {selectedPayout.beneficiaryDetails.ifscCode}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Account Holder</span>
                          <span className="info-value">
                            {
                              selectedPayout.beneficiaryDetails
                                .accountHolderName
                            }
                          </span>
                        </div>
                        {selectedPayout.beneficiaryDetails.bankName && (
                          <div className="info-row">
                            <span className="info-label">Bank Name</span>
                            <span className="info-value">
                              {selectedPayout.beneficiaryDetails.bankName}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* UTR/Transaction Hash if completed */}
                  {selectedPayout.utr && (
                    <div className="info-box success">
                      <h4
                        style={{
                          marginTop: 0,
                          marginBottom: 16,
                          fontSize: 16,
                          color: "#065f46",
                        }}
                      >
                        ✅ Transaction Completed
                      </h4>
                      <div className="info-row">
                        <span className="info-label">
                          {selectedPayout.transferMode === "crypto"
                            ? "Transaction Hash"
                            : "UTR / Reference"}
                        </span>
                        <span
                          className="info-value"
                          style={{ fontFamily: "monospace", fontSize: 14 }}
                        >
                          {selectedPayout.utr}
                        </span>
                      </div>
                      {selectedPayout.completedAt && (
                        <div className="info-row">
                          <span className="info-label">Completed Date</span>
                          <span className="info-value">
                            {formatDate(selectedPayout.completedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {selectedPayout.adminNotes && (
                    <div className="info-box warning">
                      <h4
                        style={{
                          marginTop: 0,
                          marginBottom: 12,
                          fontSize: 16,
                          color: "#92400e",
                        }}
                      >
                        📝 Notes
                      </h4>
                      <p
                        style={{ margin: 0, color: "#78350f", lineHeight: 1.6 }}
                      >
                        {selectedPayout.adminNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* MULTI-STEP APPROVE & COMPLETE FORM */}
              {modalType === "approve" && (
                <div className="space-y-6">
                  {/* Step Indicator */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center gap-4">
                      {/* Step 1 */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold font-['Albert_Sans'] transition-all duration-200 ${
                            currentStep >= 1
                              ? "bg-accent text-white shadow-lg shadow-accent/50"
                              : "bg-[#263F43] text-white/50 border border-white/10"
                          }`}
                        >
                          {currentStep > 1 ? <FiCheckCircle size={20} /> : "1"}
                        </div>
                        <span
                          className={`text-sm font-medium font-['Albert_Sans'] ${
                            currentStep >= 1 ? "text-accent" : "text-white/50"
                          }`}
                        >
                          Approve
                        </span>
                      </div>

                      {/* Connector Line */}
                      <div
                        className={`h-0.5 w-16 transition-all duration-200 ${
                          currentStep >= 2 ? "bg-accent" : "bg-white/10"
                        }`}
                      />

                      {/* Step 2 */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold font-['Albert_Sans'] transition-all duration-200 ${
                            currentStep >= 2
                              ? "bg-accent text-white shadow-lg shadow-accent/50"
                              : "bg-[#263F43] text-white/50 border border-white/10"
                          }`}
                        >
                          2
                        </div>
                        <span
                          className={`text-sm font-medium font-['Albert_Sans'] ${
                            currentStep >= 2 ? "text-accent" : "text-white/50"
                          }`}
                        >
                          Complete
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* STEP 1: APPROVE PAYOUT */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      {/* Confirmation Header */}
                      <div className="text-center py-4">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 border-2 border-accent/50 flex items-center justify-center shadow-lg shadow-accent/30">
                          <FiCheckCircle className="text-accent" size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 font-['Albert_Sans']">
                          Approve Payout
                        </h3>
                        <p className="text-white/70 text-base font-['Albert_Sans']">
                          Review and approve this payout request
                        </p>
                      </div>

                      {/* Payout Summary Card */}
                      <div className="bg-[#263F43] border border-accent/30 rounded-xl p-6 shadow-lg">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <span className="text-sm font-medium text-white/70 font-['Albert_Sans'] flex items-center gap-2">
                              <FiUser className="text-accent" size={16} />
                              Merchant
                            </span>
                            <span className="text-base font-semibold text-white font-['Albert_Sans']">
                              {selectedPayout.merchantName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white/70 font-['Albert_Sans'] flex items-center gap-2">
                              <RiMoneyDollarCircleLine
                                className="text-accent"
                                size={18}
                              />
                              Net Amount
                            </span>
                            <span className="text-2xl font-bold text-white font-['Albert_Sans']">
                              {formatCurrency(selectedPayout.netAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes Input */}
                      <div className="form-group">
                        <label className="block text-sm font-semibold text-white/90 mb-2 font-['Albert_Sans']">
                          Approval Notes{" "}
                          <span className="text-white/50 font-normal">
                            (Optional)
                          </span>
                        </label>
                        <textarea
                          value={approveNotes}
                          onChange={(e) => setApproveNotes(e.target.value)}
                          placeholder="Add any notes for this approval..."
                          className="w-full px-4 py-3 bg-[#263F43] border-2 border-white/10 text-white placeholder-white/40 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] resize-none"
                          rows={4}
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: COMPLETE PAYOUT */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      {/* Confirmation Header */}
                      <div className="text-center py-4">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent/20 to-accent/40 border-2 border-accent/50 flex items-center justify-center shadow-lg shadow-accent/30">
                          <FiSend className="text-accent" size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 font-['Albert_Sans']">
                          Complete Payout
                        </h3>
                        <p className="text-white/70 text-base font-['Albert_Sans']">
                          Mark this payout as completed by providing transaction
                          details
                        </p>
                      </div>

                      {/* Payout Summary Card */}
                      <div className="bg-[#263F43] border border-accent/30 rounded-xl p-6 shadow-lg">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <span className="text-sm font-medium text-white/70 font-['Albert_Sans'] flex items-center gap-2">
                              <FiUser className="text-accent" size={16} />
                              Merchant
                            </span>
                            <span className="text-base font-semibold text-white font-['Albert_Sans']">
                              {selectedPayout.merchantName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white/70 font-['Albert_Sans'] flex items-center gap-2">
                              <RiMoneyDollarCircleLine
                                className="text-accent"
                                size={18}
                              />
                              Net Amount
                            </span>
                            <span className="text-2xl font-bold text-accent font-['Albert_Sans']">
                              {formatCurrency(selectedPayout.netAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Transaction Reference Input */}
                      <div className="form-group">
                        <label className="block text-sm font-semibold text-white/90 mb-2 font-['Albert_Sans']">
                          {selectedPayout.transferMode === "crypto"
                            ? "Transaction Hash"
                            : "UTR / Transaction Reference"}
                          <span className="text-red-400 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          value={processUtr}
                          onChange={(e) => setProcessUtr(e.target.value)}
                          placeholder={
                            selectedPayout.transferMode === "crypto"
                              ? "Enter blockchain transaction hash (e.g., 0x1234...)"
                              : "Enter UTR or transaction reference"
                          }
                          required
                          className="w-full px-4 py-3 bg-[#263F43] border-2 border-white/10 text-white placeholder-white/40 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-mono text-sm"
                        />
                        {selectedPayout.transferMode === "crypto" && (
                          <p className="mt-2 text-xs text-white/50 font-['Albert_Sans'] flex items-center gap-1">
                            <FiInfo size={12} />
                            Enter the transaction hash from the blockchain
                            explorer
                          </p>
                        )}
                      </div>

                      {/* Notes Input */}
                      <div className="form-group">
                        <label className="block text-sm font-semibold text-white/90 mb-2 font-['Albert_Sans']">
                          Completion Notes{" "}
                          <span className="text-white/50 font-normal">
                            (Optional)
                          </span>
                        </label>
                        <textarea
                          value={processNotes}
                          onChange={(e) => setProcessNotes(e.target.value)}
                          placeholder="Add any additional notes..."
                          className="w-full px-4 py-3 bg-[#263F43] border-2 border-white/10 text-white placeholder-white/40 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] resize-none"
                          rows={4}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REJECT FORM */}
              {modalType === "reject" && (
                <div>
                  <div className="confirmation-box">
                    <div className="confirmation-icon error">
                      <FiXCircle size={32} />
                    </div>
                    <p className="confirmation-message">
                      Please provide a reason for rejecting this payout request.
                    </p>
                  </div>

                  <div className="form-group">
                    <label>Rejection Reason *</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      required
                    />
                  </div>
                </div>
              )}

              {/* PROCESS FORM - IMPROVED UI */}
              {modalType === "process" && (
                <div className="space-y-6">
                  {/* Confirmation Header */}
                  <div className="text-center py-4">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                      <FiSend className="text-white" size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2 font-['Albert_Sans']">
                      Process Payout
                    </h3>
                    <p className="text-gray-600 text-base font-['Albert_Sans']">
                      Mark this payout as completed by providing transaction
                      details.
                    </p>
                  </div>

                  {/* Payout Summary Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                        <span className="text-sm font-medium text-gray-600 font-['Albert_Sans'] flex items-center gap-2">
                          <FiUser className="text-gray-500" size={16} />
                          Merchant
                        </span>
                        <span className="text-base font-semibold text-gray-800 font-['Albert_Sans']">
                          {selectedPayout.merchantName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 font-['Albert_Sans'] flex items-center gap-2">
                          <RiMoneyDollarCircleLine
                            className="text-gray-500"
                            size={18}
                          />
                          Net Amount
                        </span>
                        <span className="text-2xl font-bold text-blue-600 font-['Albert_Sans']">
                          {formatCurrency(selectedPayout.netAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Reference Input */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 font-['Albert_Sans']">
                      {selectedPayout.transferMode === "crypto"
                        ? "Transaction Hash"
                        : "UTR / Transaction Reference"}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={processUtr}
                      onChange={(e) => setProcessUtr(e.target.value)}
                      placeholder={
                        selectedPayout.transferMode === "crypto"
                          ? "Enter blockchain transaction hash (e.g., 0x1234...)"
                          : "Enter UTR or transaction reference"
                      }
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-mono text-sm"
                    />
                    {selectedPayout.transferMode === "crypto" && (
                      <p className="mt-2 text-xs text-gray-500 font-['Albert_Sans'] flex items-center gap-1">
                        <FiInfo size={12} />
                        Enter the transaction hash from the blockchain explorer
                      </p>
                    )}
                  </div>

                  {/* Notes Input */}
                  <div className="form-group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 font-['Albert_Sans']">
                      Notes{" "}
                      <span className="text-gray-400 font-normal">
                        (Optional)
                      </span>
                    </label>
                    <textarea
                      value={processNotes}
                      onChange={(e) => setProcessNotes(e.target.value)}
                      placeholder="Add any additional notes..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-['Albert_Sans'] resize-none"
                      rows={4}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER - IMPROVED */}
            <div className="modal-footer">
              <button
                onClick={closeModal}
                className="btn btn-secondary flex items-center justify-center gap-2 px-6 py-3 font-['Albert_Sans'] font-semibold"
              >
                <FiX size={18} />
                Cancel
              </button>

              {modalType === "approve" && (
                <>
                  {currentStep === 1 ? (
                    <button
                      onClick={handleApprovePayout}
                      disabled={actionLoading}
                      className="btn btn-approve flex items-center justify-center gap-2 px-6 py-3 font-['Albert_Sans'] font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {actionLoading ? (
                        <>
                          <FiRefreshCw className="animate-spin" size={18} />
                          Approving...
                        </>
                      ) : (
                        <>
                          <FiCheck size={18} />
                          Approve & Continue
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setCurrentStep(1)}
                        disabled={actionLoading}
                        className="btn btn-secondary flex items-center justify-center gap-2 px-6 py-3 font-['Albert_Sans'] font-semibold"
                      >
                        <FiArrowLeft size={18} />
                        Back
                      </button>
                      <button
                        onClick={handleProcessPayout}
                        disabled={actionLoading || !processUtr.trim()}
                        className="btn btn-complete flex items-center justify-center gap-2 px-6 py-3 font-['Albert_Sans'] font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {actionLoading ? (
                          <>
                            <FiRefreshCw className="animate-spin" size={18} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <FiSend size={18} />
                            Complete Payout
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}

              {modalType === "reject" && (
                <button
                  onClick={handleRejectPayout}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="btn btn-reject flex items-center justify-center gap-2 px-6 py-3 font-['Albert_Sans'] font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {actionLoading ? (
                    <>
                      <FiRefreshCw className="animate-spin" size={18} />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <FiX size={18} />
                      Reject Payout
                    </>
                  )}
                </button>
              )}

              {modalType === "process" && (
                <button
                  onClick={handleProcessPayout}
                  disabled={actionLoading || !processUtr.trim()}
                  className="btn btn-complete flex items-center justify-center gap-2 px-6 py-3 font-['Albert_Sans'] font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {actionLoading ? (
                    <>
                      <FiRefreshCw className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiSend size={18} />
                      Complete Payout
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
};

export default PayoutsManagement;
