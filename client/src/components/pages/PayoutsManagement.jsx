// components/superadmin/PayoutsManagement.jsx

import React, { useState, useEffect } from 'react';
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
  FiCopy
} from 'react-icons/fi';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import superadminPaymentService from '../../services/superadminPaymentService'; // ✅ CHANGED
import Sidebar from '../../components/Sidebar';
import ExportCSV from '../../components/ExportCSV';
import Toast from '../../components/ui/Toast';
import "./PayoutManagement.css";
const PayoutsManagement = () => {
  const [payouts, setPayouts] = useState([]);
  const [payoutsSummary, setPayoutsSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20
  });

  // Form states for actions
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processUtr, setProcessUtr] = useState('');
  const [processNotes, setProcessNotes] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, [filters]);

  const fetchPayouts = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await superadminPaymentService.getAllPayouts(filters); // ✅ CHANGED
      console.log('All payouts data:', data);
      setPayouts(data.payouts || []);
      setPayoutsSummary(data.summary || null);
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatForExport = () => {
    if (!payouts || payouts.length === 0) {
      return [];
    }

    return payouts.map(payout => ({
      'Payout ID': payout.payoutId || 'N/A',
      'Merchant Name': payout.merchantName || 'N/A',
      'Merchant ID': payout.merchantId?._id || payout.merchantId || 'N/A',
      'Amount': payout.amount ? `₹${payout.amount}` : 'N/A',
      'Commission': payout.commission ? `₹${payout.commission}` : 'N/A',
      'Net Amount': payout.netAmount ? `₹${payout.netAmount}` : 'N/A',
      'Status': payout.status || 'N/A',
      'Transfer Mode': payout.transferMode === 'bank_transfer' ? 'Bank Transfer' : 'UPI',
      'Requested By': payout.requestedByName || 'N/A',
      'Requested At': formatDate(payout.requestedAt),
      'Approved By': payout.approvedByName || 'N/A',
      'Approved At': payout.approvedAt ? formatDate(payout.approvedAt) : 'N/A',
      'Completed At': payout.completedAt ? formatDate(payout.completedAt) : 'N/A',
      'UTR': payout.utr || 'N/A',
      'Notes': payout.adminNotes || 'N/A'
    }));
  };

  const handleApprovePayout = async () => {
    setActionLoading(true);
    try {
      await superadminPaymentService.approvePayout(selectedPayout.payoutId, approveNotes); // ✅ CHANGED
      setToast({ message: 'Payout approved successfully!', type: 'success' });
      setShowModal(false);
      setApproveNotes('');
      fetchPayouts();
    } catch (error) {
      setToast({ message: error.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayout = async () => {
    if (!rejectReason.trim()) {
      setToast({ message: 'Rejection reason is required', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      await superadminPaymentService.rejectPayout(selectedPayout.payoutId, rejectReason); // ✅ CHANGED
      setToast({ message: 'Payout rejected successfully', type: 'success' });
      setShowModal(false);
      setRejectReason('');
      fetchPayouts();
    } catch (error) {
      setToast({ message: error.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!processUtr.trim()) {
      setToast({ message: 'UTR/Transaction reference is required', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      await superadminPaymentService.processPayout(selectedPayout.payoutId, processUtr, processNotes); // ✅ CHANGED
      setToast({ message: 'Payout processed successfully!', type: 'success' });
      setShowModal(false);
      setProcessUtr('');
      setProcessNotes('');
      fetchPayouts();
    } catch (error) {
      setToast({ message: error.message, type: 'error' });
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
    setModalType('');
    setSelectedPayout(null);
    setApproveNotes('');
    setRejectReason('');
    setProcessUtr('');
    setProcessNotes('');
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <FiCheckCircle className="status-icon success" />;
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return <FiXCircle className="status-icon error" />;
      case 'requested':
        return <FiAlertCircle className="status-icon warning" />;
      case 'pending':
      case 'processing':
        return <FiClock className="status-icon info" />;
      default:
        return <FiAlertCircle className="status-icon" />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'badge-success';
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return 'badge-error';
      case 'requested':
        return 'badge-warning';
      case 'pending':
      case 'processing':
        return 'badge-info';
      default:
        return 'badge-default';
    }
  };

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <div>
            <h1><RiMoneyDollarCircleLine /> Payout Management</h1>
            <p>Approve, reject, and process merchant payout requests</p>
          </div>
          <div className="header-actions">
            <button
              onClick={fetchPayouts}
              disabled={loading}
              className="refresh-btn"
            >
              <FiRefreshCw className={loading ? 'spinning' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>

            {payouts.length > 0 && (
              <ExportCSV
                data={formatForExport()}
                filename={`all_payouts_${new Date().toISOString().split('T')[0]}.csv`}
                className="export-btn"
              />
            )}
          </div>
        </div>

        <div className="page-content">
          {error && (
            <div className="error-message">
              <FiAlertCircle /> {error}
            </div>
          )}

          {/* Summary Cards */}
          {payoutsSummary && (
            <div className="payout-summary-section">
              <h3><FiDollarSign /> Summary Statistics</h3>
              <div className="summary-cards-grid">
                <div className="summary-stat-card">
                  <div className="stat-icon"><RiMoneyDollarCircleLine /></div>
                  <div className="stat-content">
                    <div className="stat-value">{payoutsSummary.total_payout_requests || 0}</div>
                    <div className="stat-label">Total Requests</div>
                  </div>
                </div>

                <div className="summary-stat-card warning">
                  <div className="stat-icon"><FiClock /></div>
                  <div className="stat-content">
                    <div className="stat-value">{payoutsSummary.requested_payouts || 0}</div>
                    <div className="stat-label">Pending Approval</div>
                    <div className="stat-amount">{formatCurrency(payoutsSummary.total_pending)}</div>
                  </div>
                </div>

                <div className="summary-stat-card success">
                  <div className="stat-icon"><FiCheck /></div>
                  <div className="stat-content">
                    <div className="stat-value">{payoutsSummary.completed_payouts || 0}</div>
                    <div className="stat-label">Completed</div>
                    <div className="stat-amount">{formatCurrency(payoutsSummary.total_completed)}</div>
                  </div>
                </div>

                <div className="summary-stat-card error">
                  <div className="stat-icon"><FiXCircle /></div>
                  <div className="stat-content">
                    <div className="stat-value">{(payoutsSummary.rejected_payouts || 0) + (payoutsSummary.failed_payouts || 0)}</div>
                    <div className="stat-label">Rejected/Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="filter-bar">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="filter-select"
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
          {/* Payouts Table - OPTIMIZED FOR ONE SCREEN */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading payout requests...</p>
            </div>
          ) : payouts.length > 0 ? (
            <div className="modern-table-wrapper">
              <table className="modern-table-optimized">
                <thead>
                  <tr>
                    <th style={{ width: '140px' }}>Payout ID</th>
                    <th style={{ width: '160px' }}>Merchant</th>
                    <th style={{ width: '100px' }}>Amount</th>
                    <th style={{ width: '100px' }}>Net</th>
                    <th style={{ width: '90px' }}>Mode</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '110px' }}>Requested</th>
                    <th style={{ width: '280px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.payoutId} className="table-row-optimized">
                      <td>
                        <div className="payout-id-compact">
                          <div className="id-short" title={payout.payoutId}>
                            {payout.payoutId.slice(-12)}
                          </div>
                          <button
                            className="copy-btn-tiny"
                            onClick={() => {
                              navigator.clipboard.writeText(payout.payoutId);
                              setToast({ message: 'Copied!', type: 'success' });
                            }}
                            title="Copy full ID"
                          >
                            <FiCopy size={12} />
                          </button>
                        </div>
                      </td>

                      <td>
                        <div className="merchant-compact">
                          <div className="merchant-name-short" title={payout.merchantName}>
                            {payout.merchantName}
                          </div>
                          <div className="merchant-email-short" title={payout.requestedByName}>
                            {payout.requestedByName}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="amount-compact">
                          ₹{payout.amount.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td>
                        <div className="amount-net-compact">
                          ₹{payout.netAmount.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td>
                        <span className={`mode-badge-compact ${payout.transferMode === 'upi' ? 'mode-upi' : 'mode-bank'}`}>
                          {payout.transferMode === 'upi' ? '📱' : '🏦'}
                        </span>
                      </td>

                      <td>
                        <span className={`status-badge-compact ${getStatusBadgeClass(payout.status)}`}>
                          {getStatusIcon(payout.status)}
                          <span>{payout.status}</span>
                        </span>
                      </td>

                      <td>
                        <div className="date-compact">
                          <div className="date-line">
                            {new Date(payout.requestedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </div>
                          <div className="time-line">
                            {new Date(payout.requestedAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="action-buttons-compact">
                          <button
                            onClick={() => openModal('view', payout)}
                            className="action-btn-compact view"
                            title="View Details"
                          >
                            <FiEye size={14} />
                            View
                          </button>

                          {payout.status === 'requested' && (
                            <>
                              <button
                                onClick={() => openModal('approve', payout)}
                                className="action-btn-compact approve"
                                title="Approve"
                              >
                                <FiCheck size={14} />
                                Approve
                              </button>
                              <button
                                onClick={() => openModal('reject', payout)}
                                className="action-btn-compact reject"
                                title="Reject"
                              >
                                <FiX size={14} />
                                Reject
                              </button>
                            </>
                          )}

                          {(payout.status === 'pending' || payout.status === 'processing') && (
                            <button
                              onClick={() => openModal('process', payout)}
                              className="action-btn-compact process"
                              title="Process & Complete"
                            >
                              <FiSend size={14} />
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mobile-payout-cards mobile-only">
                {payouts.map((payout) => (
                  <div key={payout.payoutId} className="payout-card-mobile">
                    {/* Card Header */}
                    <div className="payout-card-header">
                      <div className="payout-id-mobile">
                        {payout.payoutId.slice(-12)}
                        <button
                          className="copy-btn-tiny"
                          onClick={() => {
                            navigator.clipboard.writeText(payout.payoutId);
                            setToast({ message: 'Copied!', type: 'success' });
                          }}
                        >
                          <FiCopy size={10} />
                        </button>
                      </div>
                      <span className={`status-badge-mobile ${getStatusBadgeClass(payout.status)}`}>
                        {getStatusIcon(payout.status)}
                        {payout.status}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="payout-card-body">
                      {/* Merchant Info */}
                      <div className="merchant-info-mobile">
                        <div className="merchant-name-mobile">{payout.merchantName}</div>
                        <div className="merchant-email-mobile">{payout.requestedByName}</div>
                      </div>

                      {/* Amount */}
                      <div className="card-info-row">
                        <span className="card-label">Net Amount</span>
                        <span className="card-value amount">
                          ₹{payout.netAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Transfer Mode */}
                      <div className="card-info-row">
                        <span className="card-label">Transfer Mode</span>
                        <span className="card-value">
                          {payout.transferMode === 'upi' ? '📱 UPI' : '🏦 Bank'}
                        </span>
                      </div>

                      {/* Requested Date */}
                      <div className="card-info-row">
                        <span className="card-label">Requested</span>
                        <span className="card-value">
                          {new Date(payout.requestedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer - Actions */}
                    <div className="payout-card-footer">
                      <button
                        onClick={() => openModal('view', payout)}
                        className="btn-view-mobile"
                      >
                        <FiEye size={14} />
                        View
                      </button>

                      {payout.status === 'requested' && (
                        <>
                          <button
                            onClick={() => openModal('approve', payout)}
                            className="btn-approve-mobile"
                          >
                            <FiCheck size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => openModal('reject', payout)}
                            className="btn-reject-mobile"
                          >
                            <FiX size={14} />
                            Reject
                          </button>
                        </>
                      )}

                      {(payout.status === 'pending' || payout.status === 'processing') && (
                        <button
                          onClick={() => openModal('process', payout)}
                          className="btn-process-mobile"
                        >
                          <FiSend size={14} />
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <RiMoneyDollarCircleLine className="empty-icon" size={64} />
              <h3>No Payout Requests</h3>
              <p>There are no payout requests at the moment.</p>
            </div>
          )}

        </div>
      </main>

      {/* Modal for Actions */}
      {showModal && selectedPayout && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'view' && '📋 Payout Details'}
                {modalType === 'approve' && '✅ Approve Payout'}
                {modalType === 'reject' && '❌ Reject Payout'}
                {modalType === 'process' && '🚀 Process Payout'}
              </h3>
              <button onClick={closeModal} className="modal-close-btn">
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {/* View Details - IMPROVED DESIGN */}
              {modalType === 'view' && (
                <div className="payout-details-modern">
                  {/* Header Card */}
                  <div className="detail-header-card">
                    <div className="payout-id-badge">
                      <span className="badge-label">Payout ID</span>
                      <span className="badge-value">{selectedPayout.payoutId}</span>
                    </div>
                    <div className={`status-badge-large ${getStatusBadgeClass(selectedPayout.status)}`}>
                      {getStatusIcon(selectedPayout.status)}
                      <span>{selectedPayout.status?.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Amount Summary Card */}
                  <div className="amount-summary-card">
                    <div className="amount-grid">
                      <div className="amount-item">
                        <div className="amount-label">Gross Amount</div>
                        <div className="amount-value">{formatCurrency(selectedPayout.amount)}</div>
                      </div>
                      <div className="amount-divider">-</div>
                      <div className="amount-item negative">
                        <div className="amount-label">Commission</div>
                        <div className="amount-value">{formatCurrency(selectedPayout.commission)}</div>
                      </div>
                      <div className="amount-divider">=</div>
                      <div className="amount-item primary">
                        <div className="amount-label">Net Amount</div>
                        <div className="amount-value large">{formatCurrency(selectedPayout.netAmount)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Merchant Information */}
                  <div className="info-section">
                    <div className="section-title">
                      <FiUser style={{ fontSize: '18px' }} />
                      Merchant Information
                    </div>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Merchant Name</span>
                        <span className="info-value">{selectedPayout.merchantName}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Requested By</span>
                        <span className="info-value">{selectedPayout.requestedByName}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Requested Date</span>
                        <span className="info-value">{formatDate(selectedPayout.requestedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Beneficiary Details */}
                  <div className="info-section">
                    <div className="section-title">
                      <FiCreditCard style={{ fontSize: '18px' }} />
                      Beneficiary Details
                    </div>
                    <div className="info-grid">
                      <div className="info-item full-width">
                        <span className="info-label">Transfer Mode</span>
                        <span className="transfer-mode-badge-large">
                          {selectedPayout.transferMode === 'bank_transfer' ? (
                            <>🏦 Bank Transfer</>
                          ) : (
                            <>📱 UPI</>
                          )}
                        </span>
                      </div>

                      {selectedPayout.beneficiaryDetails?.upiId && (
                        <div className="info-item full-width">
                          <span className="info-label">UPI ID</span>
                          <span className="info-value mono highlight">{selectedPayout.beneficiaryDetails.upiId}</span>
                        </div>
                      )}

                      {selectedPayout.beneficiaryDetails?.accountNumber && (
                        <>
                          <div className="info-item">
                            <span className="info-label">Account Number</span>
                            <span className="info-value mono">{selectedPayout.beneficiaryDetails.accountNumber}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">IFSC Code</span>
                            <span className="info-value mono">{selectedPayout.beneficiaryDetails.ifscCode}</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">Account Holder</span>
                            <span className="info-value">{selectedPayout.beneficiaryDetails.accountHolderName}</span>
                          </div>
                          {selectedPayout.beneficiaryDetails.bankName && (
                            <div className="info-item">
                              <span className="info-label">Bank Name</span>
                              <span className="info-value">{selectedPayout.beneficiaryDetails.bankName}</span>
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
                        <FiCheckCircle style={{ fontSize: '18px' }} />
                        Transaction Details
                      </div>
                      <div className="info-grid">
                        <div className="info-item full-width">
                          <span className="info-label">UTR / Reference Number</span>
                          <span className="info-value mono highlight-success">{selectedPayout.utr}</span>
                        </div>
                        {selectedPayout.completedAt && (
                          <div className="info-item">
                            <span className="info-label">Completed Date</span>
                            <span className="info-value">{formatDate(selectedPayout.completedAt)}</span>
                          </div>
                        )}
                        {selectedPayout.processedByName && (
                          <div className="info-item">
                            <span className="info-label">Processed By</span>
                            <span className="info-value">{selectedPayout.processedByName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedPayout.adminNotes && (
                    <div className="info-section">
                      <div className="section-title">
                        <FiInfo style={{ fontSize: '18px' }} />
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
                      <FiClock style={{ fontSize: '18px' }} />
                      Timeline
                    </div>
                    <div className="timeline">
                      <div className="timeline-item active">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-label">Requested</div>
                          <div className="timeline-date">{formatDate(selectedPayout.requestedAt)}</div>
                        </div>
                      </div>
                      {selectedPayout.approvedAt && (
                        <div className="timeline-item active">
                          <div className="timeline-dot"></div>
                          <div className="timeline-content">
                            <div className="timeline-label">Approved</div>
                            <div className="timeline-date">{formatDate(selectedPayout.approvedAt)}</div>
                            {selectedPayout.approvedByName && (
                              <div className="timeline-meta">by {selectedPayout.approvedByName}</div>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedPayout.completedAt && (
                        <div className="timeline-item active">
                          <div className="timeline-dot success"></div>
                          <div className="timeline-content">
                            <div className="timeline-label">Completed</div>
                            <div className="timeline-date">{formatDate(selectedPayout.completedAt)}</div>
                            {selectedPayout.processedByName && (
                              <div className="timeline-meta">by {selectedPayout.processedByName}</div>
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
                  <div className="modal-container" onClick={(e) => e.stopPropagation()}>

                    {/* HEADER */}
                    <div className="modal-header">
                      <h3>
                        {modalType === 'view' && (
                          <>
                            <FiEye style={{ color: '#3b82f6' }} />
                            Payout Details
                          </>
                        )}
                        {modalType === 'approve' && (
                          <>
                            <FiCheckCircle style={{ color: '#10b981' }} />
                            Approve Payout
                          </>
                        )}
                        {modalType === 'reject' && (
                          <>
                            <FiXCircle style={{ color: '#ef4444' }} />
                            Reject Payout
                          </>
                        )}
                        {modalType === 'process' && (
                          <>
                            <FiSend style={{ color: '#3b82f6' }} />
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
                      {modalType === 'view' && (
                        <div>
                          {/* Payout ID */}
                          <div className="info-box">
                            <div className="info-row">
                              <span className="info-label">Payout ID</span>
                              <span className="info-value" style={{ fontFamily: 'monospace' }}>
                                {selectedPayout.payoutId}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Status</span>
                              <span className={`status-badge ${getStatusBadgeClass(selectedPayout.status)}`}>
                                {getStatusIcon(selectedPayout.status)}
                                {selectedPayout.status}
                              </span>
                            </div>
                          </div>

                          {/* Amount Details */}
                          <div className="info-box success">
                            <div className="info-row">
                              <span className="info-label">Gross Amount</span>
                              <span className="info-value">{formatCurrency(selectedPayout.amount)}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Commission (₹30)</span>
                              <span className="info-value" style={{ color: '#ef4444' }}>
                                - {formatCurrency(selectedPayout.commission)}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Net Amount</span>
                              <span className="info-value highlight">{formatCurrency(selectedPayout.netAmount)}</span>
                            </div>
                          </div>

                          {/* Merchant Info */}
                          <div className="info-box">
                            <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, color: '#1f2937' }}>
                              Merchant Information
                            </h4>
                            <div className="info-row">
                              <span className="info-label">Merchant Name</span>
                              <span className="info-value">{selectedPayout.merchantName}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Requested By</span>
                              <span className="info-value">{selectedPayout.requestedByName}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Requested Date</span>
                              <span className="info-value">{formatDate(selectedPayout.requestedAt)}</span>
                            </div>
                          </div>

                          {/* Beneficiary Details */}
                          <div className="info-box">
                            <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, color: '#1f2937' }}>
                              Beneficiary Details
                            </h4>
                            <div className="info-row">
                              <span className="info-label">Transfer Mode</span>
                              <span className="info-value">
                                {selectedPayout.transferMode === 'bank_transfer' ? '🏦 Bank Transfer' : '📱 UPI'}
                              </span>
                            </div>

                            {selectedPayout.beneficiaryDetails?.upiId && (
                              <div className="info-row">
                                <span className="info-label">UPI ID</span>
                                <span className="info-value" style={{ fontFamily: 'monospace', fontSize: 14 }}>
                                  {selectedPayout.beneficiaryDetails.upiId}
                                </span>
                              </div>
                            )}

                            {selectedPayout.beneficiaryDetails?.accountNumber && (
                              <>
                                <div className="info-row">
                                  <span className="info-label">Account Number</span>
                                  <span className="info-value" style={{ fontFamily: 'monospace', fontSize: 14 }}>
                                    {selectedPayout.beneficiaryDetails.accountNumber}
                                  </span>
                                </div>
                                <div className="info-row">
                                  <span className="info-label">IFSC Code</span>
                                  <span className="info-value" style={{ fontFamily: 'monospace' }}>
                                    {selectedPayout.beneficiaryDetails.ifscCode}
                                  </span>
                                </div>
                                <div className="info-row">
                                  <span className="info-label">Account Holder</span>
                                  <span className="info-value">{selectedPayout.beneficiaryDetails.accountHolderName}</span>
                                </div>
                                {selectedPayout.beneficiaryDetails.bankName && (
                                  <div className="info-row">
                                    <span className="info-label">Bank Name</span>
                                    <span className="info-value">{selectedPayout.beneficiaryDetails.bankName}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* UTR if completed */}
                          {selectedPayout.utr && (
                            <div className="info-box success">
                              <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, color: '#065f46' }}>
                                ✅ Transaction Completed
                              </h4>
                              <div className="info-row">
                                <span className="info-label">UTR / Reference</span>
                                <span className="info-value" style={{ fontFamily: 'monospace', fontSize: 14 }}>
                                  {selectedPayout.utr}
                                </span>
                              </div>
                              {selectedPayout.completedAt && (
                                <div className="info-row">
                                  <span className="info-label">Completed Date</span>
                                  <span className="info-value">{formatDate(selectedPayout.completedAt)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          {selectedPayout.adminNotes && (
                            <div className="info-box warning">
                              <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, color: '#92400e' }}>
                                📝 Notes
                              </h4>
                              <p style={{ margin: 0, color: '#78350f', lineHeight: 1.6 }}>
                                {selectedPayout.adminNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* APPROVE FORM */}
                      {modalType === 'approve' && (
                        <div>
                          <div className="confirmation-box">
                            <div className="confirmation-icon success">
                              <FiCheckCircle size={32} />
                            </div>
                            <p className="confirmation-message">
                              Are you sure you want to approve this payout request?
                            </p>
                          </div>

                          <div className="info-box">
                            <div className="info-row">
                              <span className="info-label">Merchant</span>
                              <span className="info-value">{selectedPayout.merchantName}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Net Amount</span>
                              <span className="info-value highlight">{formatCurrency(selectedPayout.netAmount)}</span>
                            </div>
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
                      {modalType === 'reject' && (
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

                      {/* PROCESS FORM */}
                      {modalType === 'process' && (
                        <div>
                          <div className="confirmation-box">
                            <div className="confirmation-icon info">
                              <FiSend size={32} />
                            </div>
                            <p className="confirmation-message">
                              Mark this payout as completed by providing transaction details.
                            </p>
                          </div>

                          <div className="info-box">
                            <div className="info-row">
                              <span className="info-label">Merchant</span>
                              <span className="info-value">{selectedPayout.merchantName}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Net Amount</span>
                              <span className="info-value highlight">{formatCurrency(selectedPayout.netAmount)}</span>
                            </div>
                          </div>

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
                      <button onClick={closeModal} className="btn btn-secondary">
                        <FiX />
                        Cancel
                      </button>

                      {modalType === 'approve' && (
                        <button
                          onClick={handleApprovePayout}
                          disabled={actionLoading}
                          className="btn btn-approve"
                        >
                          <FiCheck />
                          {actionLoading ? 'Approving...' : 'Approve Payout'}
                        </button>
                      )}

                      {modalType === 'reject' && (
                        <button
                          onClick={handleRejectPayout}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="btn btn-reject"
                        >
                          <FiX />
                          {actionLoading ? 'Rejecting...' : 'Reject Payout'}
                        </button>
                      )}

                      {modalType === 'process' && (
                        <button
                          onClick={handleProcessPayout}
                          disabled={actionLoading || !processUtr.trim()}
                          className="btn btn-complete"
                        >
                          <FiSend />
                          {actionLoading ? 'Processing...' : 'Complete Payout'}
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

              {modalType === 'approve' && (
                <button
                  onClick={handleApprovePayout}
                  disabled={actionLoading}
                  className="primary-btn approve-btn"
                >
                  <FiCheck />
                  {actionLoading ? 'Approving...' : 'Approve Payout'}
                </button>
              )}

              {modalType === 'reject' && (
                <button
                  onClick={handleRejectPayout}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="primary-btn reject-btn"
                >
                  <FiX />
                  {actionLoading ? 'Rejecting...' : 'Reject Payout'}
                </button>
              )}

              {modalType === 'process' && (
                <button
                  onClick={handleProcessPayout}
                  disabled={actionLoading || !processUtr.trim()}
                  className="primary-btn process-btn"
                >
                  <FiSend />
                  {actionLoading ? 'Processing...' : 'Complete Payout'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
};

export default PayoutsManagement;
