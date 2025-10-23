import React, { useState, useEffect } from 'react';
import { 
  RiMoneyDollarCircleLine, 
  FiRefreshCw, 
  FiPlus, 
  FiCheck, 
  FiX, 
  FiClock,
  FiAlertCircle,
  FiInfo
} from 'react-icons/fi';
import paymentService from '../../services/paymentService';
import './PaymentSection.css';

const PayoutSection = () => {
  const [payouts, setPayouts] = useState([]);
  const [payoutsSummary, setPayoutsSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
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

  const [balance, setBalance] = useState(null);
  const [eligibility, setEligibility] = useState({
    can_request_payout: false,
    maximum_payout_amount: 0,
  });

  useEffect(() => {
    loadEligibility();
  }, []);

  const loadEligibility = async () => {
    try {
      const bal = await paymentService.getBalance();
      setBalance(bal);
      const pe = bal.payout_eligibility || {};
      setEligibility({
        can_request_payout: pe.can_request_payout ?? false,
        maximum_payout_amount: pe.maximum_payout_amount ?? 0,
      });
    } catch (e) {
      console.error('Error loading eligibility:', e);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await paymentService.getPayouts();
      setPayouts(data.payouts || []);
      setPayoutsSummary(data.summary || null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setRequestLoading(true);
    setError('');
    setSuccess('');
    
    try {
        if (!eligibility.can_request_payout) {
            throw new Error('You are not eligible to request a payout at this time.');
        }

        const amount = parseFloat(requestData.amount);
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid payout amount.');
        }

        if (amount > eligibility.maximum_payout_amount) {
            throw new Error(`The requested amount exceeds your available balance of ${formatCurrency(eligibility.maximum_payout_amount)}.`);
        }

      const payoutData = {
        amount: amount,
        transferMode: requestData.transferMode,
        beneficiaryDetails: requestData.transferMode === 'upi' 
          ? {
              upiId: requestData.beneficiaryDetails.upiId
            }
          : {
              accountNumber: requestData.beneficiaryDetails.accountNumber,
              ifscCode: requestData.beneficiaryDetails.ifscCode,
              accountHolderName: requestData.beneficiaryDetails.accountHolderName,
              bankName: requestData.beneficiaryDetails.bankName,
              branchName: requestData.beneficiaryDetails.branchName
            },
        notes: requestData.notes
      };
      
      const result = await paymentService.requestPayout(payoutData);
      setSuccess('Payout request submitted successfully! Awaiting approval.');
      setShowRequestForm(false);
      resetForm();
      fetchPayouts();
      loadEligibility();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError(error.message);
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

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
        return <FiCheck className="status-icon success" />;
      case 'failed':
      case 'cancelled':
        return <FiX className="status-icon error" />;
      case 'requested':
      case 'pending':
      case 'processing':
        return <FiClock className="status-icon warning" />;
      default:
        return <FiAlertCircle className="status-icon" />;
    }
  };

  const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
        return 'status-badge success';
      case 'failed':
      case 'cancelled':
        return 'status-badge error';
      case 'requested':
        return 'status-badge info';
      case 'pending':
      case 'processing':
        return 'status-badge warning';
      default:
        return 'status-badge';
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
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="payment-section">
      <div className="section-header">
        <div className="header-content">
          <h3><RiMoneyDollarCircleLine /> Payout Management</h3>
          <p className="header-subtitle">Request and track your payouts</p>
        </div>
        <div className="section-actions">
          <button 
            onClick={fetchPayouts} 
            disabled={loading} 
            className="refresh-btn"
            title="Refresh payouts"
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button 
            onClick={() => setShowRequestForm(!showRequestForm)} 
            className="request-btn"
          >
            {showRequestForm ? <FiX /> : <FiPlus />}
            {showRequestForm ? 'Cancel' : 'Request Payout'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          <FiAlertCircle /> {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <FiCheck /> {success}
        </div>
      )}

      {/* Summary Cards */}
      {payoutsSummary && (
        <div className="payout-summary">
          <div className="summary-card">
            <div className="summary-label">Total Payouts</div>
            <div className="summary-value">{payoutsSummary.total_payout_requests || 0}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Completed</div>
            <div className="summary-value success">{payoutsSummary.completed_payouts || 0}</div>
            <div className="summary-amount">{formatCurrency(payoutsSummary.total_completed)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Pending</div>
            <div className="summary-value warning">{payoutsSummary.pending_payouts || 0}</div>
            <div className="summary-amount">{formatCurrency(payoutsSummary.total_pending)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Commission Paid</div>
            <div className="summary-value">{formatCurrency(payoutsSummary.total_commission_paid)}</div>
          </div>
        </div>
      )}
      
      {/* Request Form */}
      {showRequestForm && (
        <div className="request-form-card">
          <h4><FiPlus /> Request New Payout</h4>
          
          <div className="payout-info-box">
            <FiInfo /> 
            <div>
              <strong>Payout Charges:</strong>
              <ul>
                <li>₹500 - ₹1000: Flat ₹35.40 (₹30 + 18% GST)</li>
                <li>Above ₹1000: 1.77% (1.50% + 18% GST)</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleRequestPayout} className="payout-form">
            <div className="form-row">
              <div className="form-group">
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  value={requestData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                  min="1"
                  max={eligibility.maximum_payout_amount}
                  step="0.01"
                  placeholder={`Max: ${formatCurrency(eligibility.maximum_payout_amount)}`}
                />
                <small className="form-hint">Minimum: ₹500 | Maximum: ₹1,00,000</small>
              </div>
              
              <div className="form-group">
                <label>Transfer Mode *</label>
                <select
                  value={requestData.transferMode}
                  onChange={(e) => {
                    handleInputChange('transferMode', e.target.value);
                    resetForm();
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
                <small className="form-hint">Example: merchant@paytm, user@ybl</small>
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
                    <small className="form-hint">11 characters (e.g., SBIN0001234)</small>
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={requestLoading}
                className="btn-primary"
              >
                {requestLoading ? 'Processing...' : 'Submit Payout Request'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Payouts List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading payouts...</p>
        </div>
      ) : (
        <div className="payouts-list">
          {payouts.length > 0 ? (
            payouts.map((payout, index) => (
              <div key={payout.payoutId || index} className="payout-card">
                <div className="payout-header">
                  <div className="payout-id-section">
                    <span className="payout-id">{payout.payoutId}</span>
                    <span className={getStatusClass(payout.status)}>
                      {getStatusIcon(payout.status)}
                      {payout.status}
                    </span>
                  </div>
                  <div className="payout-amount-section">
                    <div className="amount-label">Request Amount</div>
                    <div className="amount-value">{formatCurrency(payout.amount)}</div>
                  </div>
                </div>

                <div className="payout-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Net Amount:</span>
                    <span className="detail-value success">{formatCurrency(payout.netAmount)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Commission:</span>
                    <span className="detail-value">{formatCurrency(payout.commission)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Transfer Mode:</span>
                    <span className="detail-value">{payout.transferMode === 'bank_transfer' ? 'Bank Transfer' : 'UPI'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Requested:</span>
                    <span className="detail-value">{formatDate(payout.requestedAt)}</span>
                  </div>
                </div>

                {payout.commissionBreakdown && (
                  <div className="commission-breakdown">
                    <strong>Commission Breakdown:</strong>
                    <div className="breakdown-details">
                      {payout.commissionType === 'flat' ? (
                        <span>Flat Fee: ₹30 + GST (18%) = ₹{payout.commission}</span>
                      ) : (
                        <span>Rate: 1.50% + GST (18%) = {payout.commission}</span>
                      )}
                    </div>
                  </div>
                )}

                {payout.beneficiaryDetails && (
                  <div className="beneficiary-details">
                    <strong>Beneficiary Details:</strong>
                    {payout.transferMode === 'upi' ? (
                      <div>UPI ID: {payout.beneficiaryDetails.upiId}</div>
                    ) : (
                      <div>
                        <div>Account: {payout.beneficiaryDetails.accountNumber}</div>
                        <div>IFSC: {payout.beneficiaryDetails.ifscCode}</div>
                        <div>Name: {payout.beneficiaryDetails.accountHolderName}</div>
                      </div>
                    )}
                  </div>
                )}

                {payout.adminNotes && (
                  <div className="payout-notes">
                    <strong>Notes:</strong> {payout.adminNotes}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><RiMoneyDollarCircleLine /></div>
              <p>No payout requests found</p>
              <button onClick={() => setShowRequestForm(true)} className="btn-primary">
                Request Your First Payout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PayoutSection;
