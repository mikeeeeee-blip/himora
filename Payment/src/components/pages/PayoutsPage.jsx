import React, { useState, useEffect } from 'react';
import {
  FiRefreshCw,
  FiPlus,
  FiX,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiInfo,
  FiPercent,
  FiDollarSign,
  FiDownload
} from 'react-icons/fi';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import paymentService from '../../services/paymentService';
import Sidebar from '../Sidebar';
import ExportCSV from '../ExportCSV';
import Toast from '../ui/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const PayoutsPage = () => {
  const [payouts, setPayouts] = useState([]);
  const [payoutsSummary, setPayoutsSummary] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState({
    amount: '',
    transferMode: 'upi',
    beneficiaryDetails: {
      upiId: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      bankName: '',
      branchName: ''
    },
    notes: ''
  });

  const [error, setError] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [eligibility, setEligibility] = useState({
    can_request_payout: false,
    minimum_payout_amount: 0,
    maximum_payout_amount: 0
  });

  // Function to generate and download invoice PDF
  const downloadInvoicePDF = (payout) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Payout Invoice', 14, 22);

    doc.setFontSize(12);
    doc.text(`Payout ID: ${payout.payoutId}`, 14, 32);
    doc.text(`Status: ${payout.status}`, 14, 38);
    doc.text(`Requested At: ${formatDate(payout.requestedAt)}`, 14, 44);

    if (payout.approvedAt) {
      doc.text(`Approved At: ${formatDate(payout.approvedAt)}`, 14, 50);
    }
    if (payout.completedAt) {
      doc.text(`Completed At: ${formatDate(payout.completedAt)}`, 14, 56);
    }
    if (payout.utr) {
      doc.text(`UTR / Transaction Ref: ${payout.utr}`, 14, 62);
    }

    // Beneficiary Details Section
    doc.setFontSize(14);
    doc.text('Beneficiary Details:', 14, 72);

    doc.setFontSize(12);
    const beneficiary = payout.beneficiaryDetails || {};
    let y = 80;
    if (beneficiary.accountHolderName) {
      doc.text(`Account Holder Name: ${beneficiary.accountHolderName}`, 14, y);
      y += 6;
    }
    if (beneficiary.bankName) {
      doc.text(`Bank Name: ${beneficiary.bankName}`, 14, y);
      y += 6;
    }
    if (beneficiary.branchName) {
      doc.text(`Branch Name: ${beneficiary.branchName}`, 14, y);
      y += 6;
    }
    if (beneficiary.accountNumber) {
      doc.text(`Account Number: ${beneficiary.accountNumber}`, 14, y);
      y += 6;
    }
    if (beneficiary.ifscCode) {
      doc.text(`IFSC Code: ${beneficiary.ifscCode}`, 14, y);
      y += 6;
    }
    if (beneficiary.upiId) {
      doc.text(`UPI ID: ${beneficiary.upiId}`, 14, y);
      y += 6;
    }

    // Payment Details Table
    autoTable(doc, {
      startY: y + 8,
      head: [['Description', 'Amount (₹)']],
      body: [
        ['Gross Amount', payout.amount.toFixed(2)],
        ['Commission Deducted', `- ${payout.commission.toFixed(2)}`],
        ['Net Amount Paid', payout.netAmount.toFixed(2)]
      ],
    });

    doc.save(`PayoutInvoice_${payout.payoutId}.pdf`);
  };

  useEffect(() => {
    fetchPayouts();
    loadEligibility();
  }, []);

  const loadEligibility = async () => {
    try {
      const bal = await paymentService.getBalance();
      console.log('Balance data:', bal);
      setBalance(bal);
      const pe = bal.payout_eligibility || bal.payoutEligibility || {};
      setEligibility({
        can_request_payout: pe.can_request_payout ?? false,
        minimum_payout_amount: pe.minimum_payout_amount ?? 0,
        maximum_payout_amount: pe.maximum_payout_amount ?? 0,
      });
    } catch (e) {
      console.error('Error loading eligibility:', e);
    }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await paymentService.getPayouts();
      console.log('Payouts data:', data);
      setPayouts(data.payouts || []);
      setPayoutsSummary(data.summary || null);
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed: Only format if payouts exist
  const formatForExport = () => {
    if (!payouts || payouts.length === 0) {
      return [];
    }

    return payouts.map(payout => ({
      'Payout ID': payout.payoutId || 'N/A',
      'Amount': payout.amount ? `₹${payout.amount}` : 'N/A',
      'Commission': payout.commission ? `₹${payout.commission}` : 'N/A',
      'Net Amount': payout.netAmount ? `₹${payout.netAmount}` : 'N/A',
      'Status': payout.status || 'N/A',
      'Transfer Mode': payout.transferMode === 'bank_transfer' ? 'Bank Transfer' : payout.transferMode === 'upi' ? 'UPI' : 'N/A',
      'UPI ID': payout.beneficiaryDetails?.upiId || 'N/A',
      'Account Number': payout.beneficiaryDetails?.accountNumber || 'N/A',
      'IFSC Code': payout.beneficiaryDetails?.ifscCode || 'N/A',
      'Account Holder': payout.beneficiaryDetails?.accountHolderName || 'N/A',
      'Bank Name': payout.beneficiaryDetails?.bankName || 'N/A',
      'Requested At': payout.requestedAt ? formatDate(payout.requestedAt) : 'N/A',
      'Approved At': payout.approvedAt ? formatDate(payout.approvedAt) : 'N/A',
      'Completed At': payout.completedAt ? formatDate(payout.completedAt) : 'N/A',
      'Notes': payout.adminNotes || 'N/A',
      'UTR': payout.utr || 'N/A'
    }));
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setRequestLoading(true);
    setError('');

    try {
        if (!eligibility.can_request_payout) {
            throw new Error('You are not eligible to request a payout at this time. Wait for settlement to complete.');
        }

        // ✅ Parse amount properly to avoid precision issues
        const payoutAmount = parseFloat(requestData.amount);

        if (!payoutAmount || payoutAmount <= 0) {
            throw new Error('Please enter a valid payout amount.');
        }

        if (payoutAmount > eligibility.maximum_payout_amount) {
            throw new Error(`The requested amount exceeds your available balance of ${formatCurrency(eligibility.maximum_payout_amount)}.`);
        }

        const payoutData = {
            amount: payoutAmount, // ✅ Use parsed number instead of string
            transferMode: requestData.transferMode,
            beneficiaryDetails: requestData.transferMode === 'upi'
                ? { upiId: requestData.beneficiaryDetails.upiId }
                : {
                    accountNumber: requestData.beneficiaryDetails.accountNumber,
                    ifscCode: requestData.beneficiaryDetails.ifscCode,
                    accountHolderName: requestData.beneficiaryDetails.accountHolderName,
                    bankName: requestData.beneficiaryDetails.bankName,
                    branchName: requestData.beneficiaryDetails.branchName
                },
            notes: requestData.notes
        };

        await paymentService.requestPayout(payoutData);
        setShowRequestForm(false);
        setToast({ message: 'Payout request submitted successfully!', type: 'success' });
        resetForm();
        fetchPayouts();
        loadEligibility();
    } catch (error) {
        setError(error.message);
        setToast({ message: error.message, type: 'error' });
    } finally {
        setRequestLoading(false);
    }
};



  const resetForm = () => {
    setRequestData({
      amount: '',
      transferMode: 'upi',
      beneficiaryDetails: {
        upiId: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        bankName: '',
        branchName: ''
      },
      notes: ''
    });
  };



  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setRequestData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setRequestData(prev => ({
        ...prev,
        [field]: value
      }));
    }
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
        return <FiCheck className="status-icon" />;
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return <FiX className="status-icon" />;
      case 'requested':
      case 'pending':
      case 'processing':
        return <FiClock className="status-icon" />;
      default:
        return <FiAlertCircle className="status-icon" />;
    }
  };

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <div>
            <h1><RiMoneyDollarCircleLine /> Payouts Management</h1>
            <p>Request and track your payout withdrawals</p>
          </div>
          <div className="header-actions">
            <button
              onClick={() => {
                fetchPayouts();
                loadEligibility();
              }}
              disabled={loading}
              className="refresh-btn"
            >
              <FiRefreshCw className={loading ? 'spinning' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>

            {/* ✅ Export Button - Only show if payouts exist */}
            {payouts.length > 0 && (
              <ExportCSV
                data={formatForExport()}
                filename={`payouts_${new Date().toISOString().split('T')[0]}.csv`}
                className="export-btn"
              />
            )}

            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="primary-btn"
              disabled={!eligibility.can_request_payout}
            >
              {showRequestForm ? <><FiX /> Cancel</> : <><FiPlus /> Request Payout</>}
            </button>
          </div>
        </div>

        <div className="page-content">
          {error && (
            <div className="error-message">
              <FiAlertCircle /> {error}
            </div>
          )}

          {/* Balance Summary Cards */}
          {balance && (
            <div className="balance-cards">
              {/* Available Wallet Balance */}
              <div className="balance-card primary">
                <div className="balance-icon">
                  <FiDollarSign />
                </div>
                <div className="balance-content">
                  <div className="balance-label">Available Wallet Balance</div>
                  <div className="balance-amount">
                    {formatCurrency(balance.balance?.available_balance || 0)}
                  </div>
                  <div className="balance-description">
                    ✓ Ready to withdraw
                  </div>
                </div>
              </div>

              {/* Unsettled Balance */}
              <div className="balance-card warning">
                <div className="balance-icon">
                  <FiClock />
                </div>
                <div className="balance-content">
                  <div className="balance-label">Unsettled Balance</div>
                  <div className="balance-amount">
                    {formatCurrency(balance.balance?.unsettled_revenue || 0)}
                  </div>
                  <div className="balance-description">
                    ⏳ Waiting for settlement
                  </div>
                </div>
              </div>

              {/* Pending Payouts */}
              <div className="balance-card tertiary">
                <div className="balance-icon">
                  <FiClock />
                </div>
                <div className="balance-content">
                  <div className="balance-label">Pending Payouts</div>
                  <div className="balance-amount">
                    {formatCurrency(balance.balance?.pending_payouts || 0)}
                  </div>
                  <div className="balance-description">
                    Awaiting processing
                  </div>
                </div>
              </div>

              {/* Total Paid Out */}
              <div className="balance-card quaternary">
                <div className="balance-icon">
                  <FiCheck />
                </div>
                <div className="balance-content">
                  <div className="balance-label">Total Paid Out</div>
                  <div className="balance-amount">
                    {formatCurrency(balance.balance?.total_paid_out || 0)}
                  </div>
                  <div className="balance-description">
                    Successfully paid out
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settlement Info Banner */}
          {balance?.settlement_info && (
            <div className="settlement-info-card">
              <div className="settlement-header">
                <FiInfo />
                <h4>Settlement Information - T+1/2 Policy</h4>
              </div>
              <div className="settlement-details">
                <div className="settlement-stat">
                  <div className="stat-label">Settled Transactions</div>
                  <div className="stat-value success">{balance.settlement_info.settled_transactions || 0}</div>
                </div>
                <div className="settlement-stat">
                  <div className="stat-label">Unsettled Transactions</div>
                  <div className="stat-value warning">{balance.settlement_info.unsettled_transactions || 0}</div>
                </div>
                <div className="settlement-stat">
                  <div className="stat-label">Next Settlement</div>
                  <div className="stat-value">{balance.settlement_info.next_settlement || 'N/A'}</div>
                </div>
              </div>
              <div className="settlement-policy">
                <p><strong>Settlement Policy:</strong> T+1/2 settlement  </p>
                <p><strong>Weekend Policy:</strong> {balance.settlement_info.weekend_policy}</p>
              </div>
              <div className="settlement-examples">
                Once you request a payout, the amount will typically start reflecting in your bank the same day.
                However, due to bank processing delays or if the amount exceeds ₹2 lakh, it may take 24–48 hours to appear in your account, as per bank policies.
                Please ensure you provide the correct bank account details for smooth processing.


                If any available funds are not withdrawn via payout, they will automatically be settled to the provided bank account.
              </div>

            </div>
          )}

          {/* Payout Summary Cards */}
          {payoutsSummary && (
            <div className="payout-summary-section">
              <h3><FiPercent /> Payout Statistics</h3>
              <div className="summary-cards-grid">
                <div className="summary-stat-card">
                  <div className="stat-icon"><RiMoneyDollarCircleLine /></div>
                  <div className="stat-content">
                    <div className="stat-value">{payoutsSummary.total_payout_requests || 0}</div>
                    <div className="stat-label">Total Requests</div>
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

                <div className="summary-stat-card warning">
                  <div className="stat-icon"><FiClock /></div>
                  <div className="stat-content">
                    <div className="stat-value">{payoutsSummary.pending_payouts || 0}</div>
                    <div className="stat-label">Pending</div>
                    <div className="stat-amount">{formatCurrency(payoutsSummary.total_pending)}</div>
                  </div>
                </div>

                <div className="summary-stat-card info">
                  <div className="stat-icon"><FiPercent /></div>
                  <div className="stat-content">
                    <div className="stat-value">{formatCurrency(payoutsSummary.total_commission_paid)}</div>
                    <div className="stat-label">Commission Paid</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commission Info */}
          <div className="info-message">
            <FiInfo /> <strong>Payout Charges:</strong>
            {balance?.merchant?.freePayoutsRemaining > 0 && ` Under ₹500: FREE (${balance.merchant.freePayoutsRemaining} left) | `}
            ₹500-₹1000: Flat ₹35.40 | Above ₹1000: 1.77%
          </div>


          {/* Eligibility Notice */}
          {!eligibility.can_request_payout && (
            <div className="warning-message">
              <FiAlertCircle /> <strong>Cannot Request Payout:</strong> {balance?.payout_eligibility?.reason || 'No settled balance available.'}
              {balance?.settlement_info?.unsettled_transactions > 0 && (
                <span> Your unsettled funds will be available after {balance.settlement_info.next_settlement}.</span>
              )}
            </div>
          )}

          {/* Request Form */}
          {showRequestForm && (
            <div className="request-form-card">
              <h3><FiPlus /> Request New Payout</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Select a settlement date to withdraw all transactions settled on that day
              </p>

              <form onSubmit={handleRequestPayout} className="payout-form">
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    value={requestData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    required
                    placeholder={`Max: ${formatCurrency(eligibility.maximum_payout_amount)}`}
                    max={eligibility.maximum_payout_amount}
                    min="1"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Transfer Mode *</label>
                    <select
                      value={requestData.transferMode}
                      onChange={(e) => {
                        handleInputChange('transferMode', e.target.value);
                      }}
                    >
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {requestData.transferMode === 'upi' ? (
                  <div className="form-group">
                    <label>UPI ID *</label>
                    <input
                      type="text"
                      value={requestData.beneficiaryDetails.upiId}
                      onChange={(e) => handleInputChange('beneficiaryDetails.upiId', e.target.value)}
                      required
                      placeholder="merchant@paytm"
                      pattern="[a-zA-Z0-9._-]+@[a-zA-Z]+"
                    />
                    <small style={{ fontSize: '12px', color: '#666' }}>
                      Example: merchant@paytm, user@ybl
                    </small>
                  </div>
                ) : (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Account Holder Name *</label>
                        <input
                          type="text"
                          value={requestData.beneficiaryDetails.accountHolderName}
                          onChange={(e) => handleInputChange('beneficiaryDetails.accountHolderName', e.target.value)}
                          required
                          placeholder="Full name as per bank"
                        />
                      </div>

                      <div className="form-group">
                        <label>Account Number *</label>
                        <input
                          type="text"
                          value={requestData.beneficiaryDetails.accountNumber}
                          onChange={(e) => handleInputChange('beneficiaryDetails.accountNumber', e.target.value)}
                          required
                          placeholder="1234567890123456"
                          minLength="9"
                          maxLength="18"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>IFSC Code *</label>
                        <input
                          type="text"
                          value={requestData.beneficiaryDetails.ifscCode}
                          onChange={(e) => handleInputChange('beneficiaryDetails.ifscCode', e.target.value.toUpperCase())}
                          required
                          placeholder="SBIN0001234"
                          pattern="[A-Z]{4}0[A-Z0-9]{6}"
                          maxLength="11"
                        />
                      </div>

                      <div className="form-group">
                        <label>Bank Name</label>
                        <input
                          type="text"
                          value={requestData.beneficiaryDetails.bankName}
                          onChange={(e) => handleInputChange('beneficiaryDetails.bankName', e.target.value)}
                          placeholder="State Bank of India"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Branch Name</label>
                      <input
                        type="text"
                        value={requestData.beneficiaryDetails.branchName}
                        onChange={(e) => handleInputChange('beneficiaryDetails.branchName', e.target.value)}
                        placeholder="Katraj Branch"
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={requestData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Optional: Add notes for this payout"
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestForm(false);
                      resetForm();
                    }}
                    className="secondary-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requestLoading || !eligibility.can_request_payout}
                    className="primary-btn"
                  >
                    {requestLoading ? 'Processing...' : 'Submit Payout Request'}
                  </button>
                </div>
              </form>
            </div>
          )}


          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading payouts...</p>
            </div>
          ) : (
            <div className="payouts-container">
              {payouts.length > 0 ? (
                <>
                  <h3><FiClock /> Payout History</h3>
                  <div className="payouts-grid">
                    {payouts.map((payout, index) => (
                      <div key={payout.payoutId || index} className="payout-card">
                        <div className="payout-header">
                          <div className="payout-id">
                            {payout.payoutId || `PAYOUT-${index + 1}`}
                          </div>
                          <div className={`payout-status status-${(payout.status || 'pending').toLowerCase()}`}>
                            {getStatusIcon(payout.status)}
                            {payout.status || 'Pending'}
                          </div>
                        </div>

                        <div className="payout-body">
                          <div className="payout-amount">
                            {formatCurrency(payout.amount)}
                          </div>

                          <div className="payout-details">
                            <div className="detail-row">
                              <span className="detail-label">Net Amount:</span>
                              <span className="detail-value" style={{ color: '#10b981', fontWeight: 600 }}>
                                {formatCurrency(payout.netAmount)}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Commission:</span>
                              <span className="detail-value">{formatCurrency(payout.commission)}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Mode:</span>
                              <span className="detail-value">
                                {payout.transferMode === 'bank_transfer' ? 'Bank Transfer' : 'UPI'}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Requested:</span>
                              <span className="detail-value">{formatDate(payout.requestedAt)}</span>
                            </div>

                            {payout.utr && (
                              <div className="detail-row">
                                <span className="detail-label">UTR:</span>
                                <span className="detail-value">{payout.utr}</span>
                              </div>
                            )}

                            {payout.adminNotes && (
                              <div className="detail-row">
                                <span className="detail-label">Notes:</span>
                                <span className="detail-value">{payout.adminNotes}</span>
                              </div>
                            )}

                            {/* ✅ Download Invoice Button - visible only if payout status is 'approved' or 'pending' or 'completed' */}
                            {(payout.status === 'approved' || payout.status === 'pending' || payout.status === 'completed') && (
                              <div className="invoice-btn-wrapper">
                                <button
                                  className="primary-btn"
                                  onClick={() => downloadInvoicePDF(payout)}
                                >
                                  <FiDownload /> Download Invoice
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><RiMoneyDollarCircleLine /></div>
                  <h3>No Payouts Found</h3>
                  <p>No payout requests have been made yet.</p>
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="primary-btn"
                    disabled={!eligibility.can_request_payout}
                  >
                    Request Your First Payout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
};

export default PayoutsPage;
