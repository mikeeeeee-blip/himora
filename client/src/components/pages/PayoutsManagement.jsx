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
  const [processCryptoHash, setProcessCryptoHash] = useState("");
  const [processCryptoExplorerUrl, setProcessCryptoExplorerUrl] = useState("");
  const [processNotes, setProcessNotes] = useState("");

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
      ); // ✅ CHANGED
      setToast({ message: "Payout approved successfully!", type: "success" });
      setShowModal(false);
      setApproveNotes("");
      fetchPayouts();
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
    // ✅ Check transfer mode and validate accordingly
    if (selectedPayout.transferMode === "crypto") {
      if (!processCryptoHash.trim()) {
        setToast({
          message: "Crypto transaction hash is required",
          type: "error",
        });
        return;
      }
    } else {
      if (!processUtr.trim()) {
        setToast({
          message: "UTR/Transaction reference is required",
          type: "error",
        });
        return;
      }
    }

    setActionLoading(true);
    try {
      await superadminPaymentService.processPayout(
        selectedPayout.payoutId,
        processUtr, // For bank/UPI
        processNotes,
        processCryptoHash, // For crypto
        processCryptoExplorerUrl // Optional explorer URL
      );
      setToast({ message: "Payout processed successfully!", type: "success" });
      setShowModal(false);
      setProcessUtr("");
      setProcessCryptoHash("");
      setProcessCryptoExplorerUrl("");
      setProcessNotes("");
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
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType("");
    setSelectedPayout(null);
    setApproveNotes("");
    setRejectReason("");
    setProcessUtr("");
    setProcessCryptoHash("");
    setProcessCryptoExplorerUrl("");
    setProcessNotes("");
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
                                  className="text-white text-xs sm:text-sm font-['Albert_Sans'] font-mono"
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
                                {payout.transferMode === "upi" ? "📱" : "🏦"}
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

      {/* Modal for Actions */}
      {showModal && selectedPayout && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === "view" && "📋 Payout Details"}
                {modalType === "approve" && "✅ Approve Payout"}
                {modalType === "reject" && "❌ Reject Payout"}
                {modalType === "process" && "🚀 Process Payout"}
              </h3>
              <button onClick={closeModal} className="modal-close-btn">
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {/* View Details - IMPROVED DESIGN */}
              {modalType === "view" && (
                <div className="payout-details-modern">
                  {/* Header Card */}
                  <div className="detail-header-card">
                    <div className="payout-id-badge">
                      <span className="badge-label">Payout ID</span>
                      <span className="badge-value">
                        {selectedPayout.payoutId}
                      </span>
                    </div>
                    <div
                      className={`status-badge-large ${getStatusBadgeClass(
                        selectedPayout.status
                      )}`}
                    >
                      {getStatusIcon(selectedPayout.status)}
                      <span>{selectedPayout.status?.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Amount Summary Card */}
                  <div className="amount-summary-card">
                    <div className="amount-grid">
                      <div className="amount-item">
                        <div className="amount-label">Gross Amount</div>
                        <div className="amount-value">
                          {formatCurrency(selectedPayout.amount)}
                        </div>
                      </div>
                      <div className="amount-divider">-</div>
                      <div className="amount-item negative">
                        <div className="amount-label">Commission</div>
                        <div className="amount-value">
                          {formatCurrency(selectedPayout.commission)}
                        </div>
                      </div>
                      <div className="amount-divider">=</div>
                      <div className="amount-item primary">
                        <div className="amount-label">Net Amount</div>
                        <div className="amount-value large">
                          {formatCurrency(selectedPayout.netAmount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Merchant Information */}
                  <div className="info-section">
                    <div className="section-title">
                      <FiUser style={{ fontSize: "18px" }} />
                      Merchant Information
                    </div>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Merchant Name</span>
                        <span className="info-value">
                          {selectedPayout.merchantName}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Requested By</span>
                        <span className="info-value">
                          {selectedPayout.requestedByName}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Requested Date</span>
                        <span className="info-value">
                          {formatDate(selectedPayout.requestedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Beneficiary Details */}
                  <div className="info-section">
                    <div className="section-title">
                      <FiCreditCard style={{ fontSize: "18px" }} />
                      Beneficiary Details
                    </div>
                    <div className="info-grid">
                      <div className="info-item full-width">
                        <span className="info-label">Transfer Mode</span>
                        <span className="transfer-mode-badge-large">
                          {selectedPayout.transferMode === "bank_transfer" ? (
                            <>🏦 Bank Transfer</>
                          ) : (
                            <>📱 UPI</>
                          )}
                        </span>
                      </div>

                      {selectedPayout.beneficiaryDetails?.upiId && (
                        <div className="info-item full-width">
                          <span className="info-label">UPI ID</span>
                          <span className="info-value mono highlight">
                            {selectedPayout.beneficiaryDetails.upiId}
                          </span>
                        </div>
                      )}

                      {selectedPayout.beneficiaryDetails?.accountNumber && (
                        <>
                          <div className="info-item">
                            <span className="info-label">Account Number</span>
                            <span className="info-value mono">
                              {selectedPayout.beneficiaryDetails.accountNumber}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">IFSC Code</span>
                            <span className="info-value mono">
                              {selectedPayout.beneficiaryDetails.ifscCode}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Account Holder</span>
                            <span className="info-value">
                              {
                                selectedPayout.beneficiaryDetails
                                  .accountHolderName
                              }
                            </span>
                          </div>
                          {selectedPayout.beneficiaryDetails.bankName && (
                            <div className="info-item">
                              <span className="info-label">Bank Name</span>
                              <span className="info-value">
                                {selectedPayout.beneficiaryDetails.bankName}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Transaction Details (if completed) */}
                  {selectedPayout.utr && (
                    <div className="info-section success-section">
                      <div className="section-title">
                        <FiCheckCircle style={{ fontSize: "18px" }} />
                        Transaction Details
                      </div>
                      <div className="info-grid">
                        <div className="info-item full-width">
                          <span className="info-label">
                            UTR / Reference Number
                          </span>
                          <span className="info-value mono highlight-success">
                            {selectedPayout.utr}
                          </span>
                        </div>
                        {selectedPayout.completedAt && (
                          <div className="info-item">
                            <span className="info-label">Completed Date</span>
                            <span className="info-value">
                              {formatDate(selectedPayout.completedAt)}
                            </span>
                          </div>
                        )}
                        {selectedPayout.processedByName && (
                          <div className="info-item">
                            <span className="info-label">Processed By</span>
                            <span className="info-value">
                              {selectedPayout.processedByName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedPayout.adminNotes && (
                    <div className="info-section">
                      <div className="section-title">
                        <FiInfo style={{ fontSize: "18px" }} />
                        Notes
                      </div>
                      <div className="notes-box">
                        {selectedPayout.adminNotes}
                      </div>
                    </div>
                  )}

                  {/* Timeline (if available) */}
                  <div className="timeline-section">
                    <div className="section-title">
                      <FiClock style={{ fontSize: "18px" }} />
                      Timeline
                    </div>
                    <div className="timeline">
                      <div className="timeline-item active">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-label">Requested</div>
                          <div className="timeline-date">
                            {formatDate(selectedPayout.requestedAt)}
                          </div>
                        </div>
                      </div>
                      {selectedPayout.approvedAt && (
                        <div className="timeline-item active">
                          <div className="timeline-dot"></div>
                          <div className="timeline-content">
                            <div className="timeline-label">Approved</div>
                            <div className="timeline-date">
                              {formatDate(selectedPayout.approvedAt)}
                            </div>
                            {selectedPayout.approvedByName && (
                              <div className="timeline-meta">
                                by {selectedPayout.approvedByName}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedPayout.completedAt && (
                        <div className="timeline-item active">
                          <div className="timeline-dot success"></div>
                          <div className="timeline-content">
                            <div className="timeline-label">Completed</div>
                            <div className="timeline-date">
                              {formatDate(selectedPayout.completedAt)}
                            </div>
                            {selectedPayout.processedByName && (
                              <div className="timeline-meta">
                                by {selectedPayout.processedByName}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* MODAL OVERLAY */}
              {showModal && selectedPayout && (
                <div className="modal-overlay" onClick={closeModal}>
                  <div
                    className="modal-container"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                            Approve Payout
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
                              <span className="info-label">
                                Commission (₹30)
                              </span>
                              <span
                                className="info-value"
                                style={{ color: "#ef4444" }}
                              >
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
                                  ? "🪙 Crypto"
                                  : "📱 UPI"}
                              </span>
                            </div>

                            {selectedPayout.beneficiaryDetails?.upiId && (
                              <div className="info-row">
                                <span className="info-label">UPI ID</span>
                                <span
                                  className="info-value"
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: 14,
                                  }}
                                >
                                  {selectedPayout.beneficiaryDetails.upiId}
                                </span>
                              </div>
                            )}

                            {selectedPayout.beneficiaryDetails
                              ?.cryptoWalletAddress && (
                              <>
                                <div className="info-row">
                                  <span className="info-label">
                                    Crypto Wallet Address
                                  </span>
                                  <span
                                    className="info-value"
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: 12,
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {
                                      selectedPayout.beneficiaryDetails
                                        .cryptoWalletAddress
                                    }
                                  </span>
                                </div>
                                <div className="info-row">
                                  <span className="info-label">
                                    Crypto Network
                                  </span>
                                  <span className="info-value">
                                    {selectedPayout.beneficiaryDetails
                                      .cryptoNetwork || "N/A"}
                                  </span>
                                </div>
                                <div className="info-row">
                                  <span className="info-label">
                                    Crypto Currency
                                  </span>
                                  <span className="info-value">
                                    {selectedPayout.beneficiaryDetails
                                      .cryptoCurrency || "N/A"}
                                  </span>
                                </div>
                                {selectedPayout.transferMode === "crypto" && (
                                  <div
                                    className="info-box warning"
                                    style={{ marginTop: 12 }}
                                  >
                                    <p
                                      style={{
                                        margin: 0,
                                        color: "#92400e",
                                        fontSize: 13,
                                      }}
                                    >
                                      ⚠️ Crypto transactions are irreversible.
                                      Please verify the wallet address before
                                      processing.
                                    </p>
                                  </div>
                                )}
                              </>
                            )}

                            {selectedPayout.beneficiaryDetails
                              ?.accountNumber && (
                              <>
                                <div className="info-row">
                                  <span className="info-label">
                                    Account Number
                                  </span>
                                  <span
                                    className="info-value"
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: 14,
                                    }}
                                  >
                                    {
                                      selectedPayout.beneficiaryDetails
                                        .accountNumber
                                    }
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
                                  <span className="info-label">
                                    Account Holder
                                  </span>
                                  <span className="info-value">
                                    {
                                      selectedPayout.beneficiaryDetails
                                        .accountHolderName
                                    }
                                  </span>
                                </div>
                                {selectedPayout.beneficiaryDetails.bankName && (
                                  <div className="info-row">
                                    <span className="info-label">
                                      Bank Name
                                    </span>
                                    <span className="info-value">
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .bankName
                                      }
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* UTR / Transaction Hash if completed */}
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
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: 14,
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {selectedPayout.utr}
                                </span>
                                {selectedPayout.transferMode === "crypto" &&
                                  selectedPayout.cryptoExplorerUrl && (
                                    <div style={{ marginTop: 8 }}>
                                      <a
                                        href={selectedPayout.cryptoExplorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "#10b981",
                                          textDecoration: "underline",
                                          fontSize: 13,
                                        }}
                                      >
                                        View on Blockchain Explorer →
                                      </a>
                                    </div>
                                  )}
                              </div>
                              {selectedPayout.transferMode === "crypto" &&
                                selectedPayout.beneficiaryDetails
                                  ?.cryptoNetwork && (
                                  <div className="info-row">
                                    <span className="info-label">Network</span>
                                    <span className="info-value">
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .cryptoNetwork
                                      }{" "}
                                      (
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .cryptoCurrency
                                      }
                                      )
                                    </span>
                                  </div>
                                )}
                              {selectedPayout.completedAt && (
                                <div className="info-row">
                                  <span className="info-label">
                                    Completed Date
                                  </span>
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
                                style={{
                                  margin: 0,
                                  color: "#78350f",
                                  lineHeight: 1.6,
                                }}
                              >
                                {selectedPayout.adminNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* APPROVE FORM */}
                      {modalType === "approve" && (
                        <div>
                          <div className="confirmation-box">
                            <div className="confirmation-icon success">
                              <FiCheckCircle size={32} />
                            </div>
                            <p className="confirmation-message">
                              Are you sure you want to approve this payout
                              request?
                            </p>
                          </div>

                          <div className="info-box">
                            <div className="info-row">
                              <span className="info-label">Merchant</span>
                              <span className="info-value">
                                {selectedPayout.merchantName}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Net Amount</span>
                              <span className="info-value highlight">
                                {formatCurrency(selectedPayout.netAmount)}
                              </span>
                            </div>
                            {selectedPayout.transferMode === "crypto" && (
                              <>
                                <div className="info-row">
                                  <span className="info-label">
                                    Transfer Mode
                                  </span>
                                  <span className="info-value">🪙 Crypto</span>
                                </div>
                                {selectedPayout.beneficiaryDetails
                                  ?.cryptoWalletAddress && (
                                  <div className="info-row">
                                    <span className="info-label">
                                      Wallet Address
                                    </span>
                                    <span
                                      className="info-value"
                                      style={{
                                        fontFamily: "monospace",
                                        fontSize: 12,
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .cryptoWalletAddress
                                      }
                                    </span>
                                  </div>
                                )}
                                {selectedPayout.beneficiaryDetails
                                  ?.cryptoNetwork && (
                                  <div className="info-row">
                                    <span className="info-label">Network</span>
                                    <span className="info-value">
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .cryptoNetwork
                                      }{" "}
                                      (
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .cryptoCurrency
                                      }
                                      )
                                    </span>
                                  </div>
                                )}
                                <div
                                  className="info-box warning"
                                  style={{ marginTop: 12 }}
                                >
                                  <p
                                    style={{
                                      margin: 0,
                                      color: "#92400e",
                                      fontSize: 13,
                                    }}
                                  >
                                    ⚠️ Warning: Crypto transactions are
                                    irreversible. Please verify the wallet
                                    address before approval.
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="form-group">
                            <label>Notes (Optional)</label>
                            <textarea
                              value={approveNotes}
                              onChange={(e) => setApproveNotes(e.target.value)}
                              placeholder="Add any notes for this approval..."
                            />
                          </div>
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
                              Please provide a reason for rejecting this payout
                              request.
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

                      {/* PROCESS FORM */}
                      {modalType === "process" && (
                        <div>
                          <div className="confirmation-box">
                            <div className="confirmation-icon info">
                              <FiSend size={32} />
                            </div>
                            <p className="confirmation-message">
                              Mark this payout as completed by providing
                              transaction details.
                            </p>
                          </div>

                          <div className="info-box">
                            <div className="info-row">
                              <span className="info-label">Merchant</span>
                              <span className="info-value">
                                {selectedPayout.merchantName}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Net Amount</span>
                              <span className="info-value highlight">
                                {formatCurrency(selectedPayout.netAmount)}
                              </span>
                            </div>
                            {selectedPayout.transferMode === "crypto" && (
                              <>
                                <div className="info-row">
                                  <span className="info-label">
                                    Transfer Mode
                                  </span>
                                  <span className="info-value">🪙 Crypto</span>
                                </div>
                                {selectedPayout.beneficiaryDetails
                                  ?.cryptoNetwork && (
                                  <div className="info-row">
                                    <span className="info-label">Network</span>
                                    <span className="info-value">
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .cryptoNetwork
                                      }{" "}
                                      (
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .cryptoCurrency
                                      }
                                      )
                                    </span>
                                  </div>
                                )}
                                {selectedPayout.beneficiaryDetails
                                  ?.cryptoWalletAddress && (
                                  <div className="info-row">
                                    <span className="info-label">
                                      Wallet Address
                                    </span>
                                    <span
                                      className="info-value"
                                      style={{
                                        fontFamily: "monospace",
                                        fontSize: 11,
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      {
                                        selectedPayout.beneficiaryDetails
                                          .cryptoWalletAddress
                                      }
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {selectedPayout.transferMode === "crypto" ? (
                            <>
                              <div className="form-group">
                                <label>Crypto Transaction Hash *</label>
                                <input
                                  type="text"
                                  value={processCryptoHash}
                                  onChange={(e) =>
                                    setProcessCryptoHash(e.target.value)
                                  }
                                  placeholder="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                                  required
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: 13,
                                  }}
                                />
                                <small
                                  style={{
                                    color: "#6b7280",
                                    fontSize: 12,
                                    marginTop: 4,
                                    display: "block",
                                  }}
                                >
                                  Enter the blockchain transaction hash from
                                  your crypto wallet/exchange
                                </small>
                              </div>

                              <div className="form-group">
                                <label>
                                  Blockchain Explorer URL (Optional)
                                </label>
                                <input
                                  type="url"
                                  value={processCryptoExplorerUrl}
                                  onChange={(e) =>
                                    setProcessCryptoExplorerUrl(e.target.value)
                                  }
                                  placeholder="https://etherscan.io/tx/0x..."
                                />
                                <small
                                  style={{
                                    color: "#6b7280",
                                    fontSize: 12,
                                    marginTop: 4,
                                    display: "block",
                                  }}
                                >
                                  Optional: Link to view transaction on
                                  blockchain explorer
                                </small>
                              </div>
                            </>
                          ) : (
                            <div className="form-group">
                              <label>UTR / Transaction Reference *</label>
                              <input
                                type="text"
                                value={processUtr}
                                onChange={(e) => setProcessUtr(e.target.value)}
                                placeholder="Enter UTR or transaction reference"
                                required
                              />
                            </div>
                          )}

                          <div className="form-group">
                            <label>Notes (Optional)</label>
                            <textarea
                              value={processNotes}
                              onChange={(e) => setProcessNotes(e.target.value)}
                              placeholder="Add any additional notes..."
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* FOOTER */}
                    <div className="modal-footer">
                      <button
                        onClick={closeModal}
                        className="btn btn-secondary"
                      >
                        <FiX />
                        Cancel
                      </button>

                      {modalType === "approve" && (
                        <button
                          onClick={handleApprovePayout}
                          disabled={actionLoading}
                          className="btn btn-approve"
                        >
                          <FiCheck />
                          {actionLoading ? "Approving..." : "Approve Payout"}
                        </button>
                      )}

                      {modalType === "reject" && (
                        <button
                          onClick={handleRejectPayout}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="btn btn-reject"
                        >
                          <FiX />
                          {actionLoading ? "Rejecting..." : "Reject Payout"}
                        </button>
                      )}

                      {modalType === "process" && (
                        <button
                          onClick={handleProcessPayout}
                          disabled={
                            actionLoading ||
                            (selectedPayout.transferMode === "crypto"
                              ? !processCryptoHash.trim()
                              : !processUtr.trim())
                          }
                          className="btn btn-complete"
                        >
                          <FiSend />
                          {actionLoading ? "Processing..." : "Complete Payout"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={closeModal} className="secondary-btn">
                Cancel
              </button>

              {modalType === "approve" && (
                <button
                  onClick={handleApprovePayout}
                  disabled={actionLoading}
                  className="primary-btn approve-btn"
                >
                  <FiCheck />
                  {actionLoading ? "Approving..." : "Approve Payout"}
                </button>
              )}

              {modalType === "reject" && (
                <button
                  onClick={handleRejectPayout}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="primary-btn reject-btn"
                >
                  <FiX />
                  {actionLoading ? "Rejecting..." : "Reject Payout"}
                </button>
              )}

              {modalType === "process" && (
                <button
                  onClick={handleProcessPayout}
                  disabled={actionLoading || !processUtr.trim()}
                  className="primary-btn process-btn"
                >
                  <FiSend />
                  {actionLoading ? "Processing..." : "Complete Payout"}
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
