import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiExternalLink, FiCopy, FiSmartphone, FiZap, FiRefreshCw } from 'react-icons/fi';
import { SiGooglepay, SiPhonepe } from 'react-icons/si';
import paymentService from '../../services/paymentService';
import './PaymentSection.css';

const PaymentSection = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentData, setPaymentData] = useState({
    amount: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    description: ''
  });
  const [createdLink, setCreatedLink] = useState(null);
  const [gatewayStatus, setGatewayStatus] = useState({
    activeGateway: null,
    remainingTransactions: null,
    currentTransactionCount: null,
    gatewayTransactionLimit: null,
    gatewayIntervals: {
      paytm: 10,
      easebuzz: 5,
      razorpay: 10,
      phonepe: 10,
      sabpaisa: 10,
      cashfree: 10
    }
  });
  const intervalRef = useRef(null);

  // Gateway labels
  const gatewayLabels = {
    razorpay: 'Razorpay',
    paytm: 'Paytm',
    phonepe: 'PhonePe',
    easebuzz: 'Easebuzz',
    sabpaisa: 'SabPaisa',
    cashfree: 'Cashfree'
  };

  // Fetch gateway status (lightweight update)
  const updateGatewayStatus = useCallback(async () => {
    try {
      const response = await paymentService.getAvailableGateways();
      if (response.success && response.time_based_rotation) {
        setGatewayStatus(prev => {
          // Only update if values changed
          if (
            prev.activeGateway !== response.time_based_rotation.active_gateway ||
            prev.remainingTransactions !== response.time_based_rotation.remaining_transactions ||
            prev.currentTransactionCount !== response.time_based_rotation.current_transaction_count
          ) {
            return {
              activeGateway: response.time_based_rotation.active_gateway || null,
              remainingTransactions: response.time_based_rotation.remaining_transactions || null,
              currentTransactionCount: response.time_based_rotation.current_transaction_count || null,
              gatewayTransactionLimit: response.time_based_rotation.gateway_transaction_limit || null,
              gatewayIntervals: response.time_based_rotation.gateway_intervals || prev.gatewayIntervals
            };
          }
          return prev;
        });
      }
    } catch (err) {
      // Silently fail for transaction count updates
      console.error('Gateway status update error:', err);
    }
  }, []);

  // Initial fetch and set up interval
  useEffect(() => {
    updateGatewayStatus();
    
    // Update every 2 seconds
    intervalRef.current = setInterval(() => {
      updateGatewayStatus();
    }, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateGatewayStatus]);

  const handleCreateLink = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');
    setSuccess('');
    
    // Validate phone number
    if (paymentData.customerPhone && paymentData.customerPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      setCreateLoading(false);
      return;
    }
    
    try {
      const linkData = {
        amount: parseFloat(paymentData.amount),
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        customerPhone: paymentData.customerPhone,
        description: paymentData.description
      };
      
      const result = await paymentService.createPaymentLink(linkData);
      setCreatedLink(result);
      setSuccess('Payment link created successfully!');
      setPaymentData({
        amount: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        description: ''
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Link copied to clipboard!');
  };

  const openPaymentLink = (url, paytmParams) => {
    if (paytmParams && url) {
      // Paytm requires form submission
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      form.target = '_blank';
      
      // Add all Paytm parameters as hidden inputs
      Object.keys(paytmParams).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = paytmParams[key];
        form.appendChild(input);
      });
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } else if (url) {
      // Regular URL opening for other payment gateways
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openDeepLink = (url, appName) => {
    if (!url || url === 'Not available' || url === null) {
      setSuccess(`${appName} deep link not available`);
      return;
    }
    // Try to open the deep link
    window.location.href = url;
  };

  return (
    <div className="payment-section">
      <div className="section-header">
        <h3>🔗 Payment Links</h3>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)} 
          className="create-btn"
        >
          {showCreateForm ? 'Cancel' : 'Create Link'}
        </button>
      </div>
      
      {/* Active Gateway Status Display */}
      {gatewayStatus.activeGateway && (
        <div className="gateway-status-card">
          <div className="gateway-status-left">
            <div className="gateway-status-icon">
              <FiRefreshCw />
            </div>
            <div className="gateway-status-info">
              <div className="gateway-status-label">
                Currently In Use
              </div>
              <div className="gateway-status-name">
                {gatewayLabels[gatewayStatus.activeGateway] || gatewayStatus.activeGateway}
              </div>
              <div className="gateway-status-interval">
                {gatewayStatus.gatewayIntervals[gatewayStatus.activeGateway] || 10} transaction limit
              </div>
            </div>
          </div>
          <div className="gateway-status-right">
            <div className="gateway-status-timer-label">
              Transaction Count
            </div>
            <div className="gateway-status-timer">
              {gatewayStatus.currentTransactionCount !== null && gatewayStatus.gatewayTransactionLimit !== null
                ? `${gatewayStatus.currentTransactionCount}/${gatewayStatus.gatewayTransactionLimit}`
                : '--/--'}
            </div>
            <div className="gateway-status-live">
              <div className="gateway-status-live-dot"></div>
              <span className="gateway-status-live-text">Live</span>
            </div>
          </div>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {showCreateForm && (
        <div className="create-form">
          <h4>Create Payment Link</h4>
          <form onSubmit={handleCreateLink}>
            <div className="form-row">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                  placeholder="500"
                />
              </div>
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={paymentData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  required
                  placeholder="Amit Kumar"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Customer Email</label>
                <input
                  type="email"
                  value={paymentData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  required
                  placeholder="amit@example.com"
                />
              </div>
              <div className="form-group">
                <label>Customer Phone</label>
                <input
                  type="tel"
                  value={paymentData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  required
                  placeholder="9876543210"
                  maxLength="10"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  value={paymentData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Product purchase"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {createdLink && (
        <div className="created-link">
          <h4>Payment Link Created</h4>
          <div className="link-details">
            <div className="link-item">
              <label>Checkout Page (UPI Payment):</label>
              <div className="link-container">
                <input 
                  type="text" 
                  value={createdLink.checkout_page || createdLink.paymentLink || createdLink.payment_url || createdLink.link || 'Link generated'} 
                  readOnly 
                  className="link-input"
                />
                <button 
                  onClick={() => copyToClipboard(createdLink.checkout_page || createdLink.paymentLink || createdLink.payment_url || createdLink.link)}
                  className="action-btn copy"
                  title="Copy checkout link"
                >
                  <FiCopy />
                </button>
                <button 
                  onClick={() => {
                    const url = createdLink.checkout_page || createdLink.paymentLink || createdLink.payment_url;
                    if (url) {
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="action-btn redirect"
                  title="Open checkout page"
                >
                  <FiExternalLink />
                </button>
              </div>
            </div>
            
            {/* UPI Deep Links Section */}
            {(createdLink.phonepe_deep_link || createdLink.gpay_deep_link || createdLink.gpay_intent || createdLink.upi_deep_link) && (
              <div className="link-item deep-links-section">
                <label>
                  <FiSmartphone style={{ display: 'inline', marginRight: '8px' }} />
                  UPI Deep Links (Quick Pay):
                </label>
                <div className="deep-links-grid">
                  {createdLink.phonepe_deep_link && createdLink.phonepe_deep_link !== 'Not available' && (
                    <div className="deep-link-card">
                      <div className="deep-link-header">
                        <SiPhonepe className="phonepe-icon" />
                        <span>PhonePe</span>
                      </div>
                      <div className="deep-link-actions">
                        <button
                          onClick={() => openDeepLink(createdLink.phonepe_deep_link, 'PhonePe')}
                          className="deep-link-btn open"
                          title="Open in PhonePe"
                        >
                          <FiExternalLink /> Open
                        </button>
                        <button
                          onClick={() => copyToClipboard(createdLink.phonepe_deep_link)}
                          className="deep-link-btn copy"
                          title="Copy PhonePe link"
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </div>
                  )}

                  {createdLink.gpay_deep_link && createdLink.gpay_deep_link !== 'Not available' && (
                    <div className="deep-link-card">
                      <div className="deep-link-header">
                        <SiGooglepay className="gpay-icon" />
                        <span>Google Pay</span>
                      </div>
                      <div className="deep-link-actions">
                        <button
                          onClick={() => openDeepLink(createdLink.gpay_deep_link, 'Google Pay')}
                          className="deep-link-btn open"
                          title="Open in Google Pay"
                        >
                          <FiExternalLink /> Open
                        </button>
                        <button
                          onClick={() => copyToClipboard(createdLink.gpay_deep_link)}
                          className="deep-link-btn copy"
                          title="Copy Google Pay link"
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </div>
                  )}

                  {createdLink.gpay_intent && createdLink.gpay_intent !== 'Not available' && (
                    <div className="deep-link-card">
                      <div className="deep-link-header">
                        <SiGooglepay className="gpay-icon" />
                        <span>GPay (Android)</span>
                      </div>
                      <div className="deep-link-actions">
                        <button
                          onClick={() => openDeepLink(createdLink.gpay_intent, 'Google Pay')}
                          className="deep-link-btn open"
                          title="Open in Google Pay (Android Intent)"
                        >
                          <FiExternalLink /> Open
                        </button>
                        <button
                          onClick={() => copyToClipboard(createdLink.gpay_intent)}
                          className="deep-link-btn copy"
                          title="Copy Google Pay Intent"
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </div>
                  )}

                  {createdLink.upi_deep_link && createdLink.upi_deep_link !== 'Not available' && (
                    <div className="deep-link-card">
                      <div className="deep-link-header">
                        <FiZap className="upi-icon" />
                        <span>UPI</span>
                      </div>
                      <div className="deep-link-actions">
                        <button
                          onClick={() => openDeepLink(createdLink.upi_deep_link, 'UPI')}
                          className="deep-link-btn open"
                          title="Open in UPI app"
                        >
                          <FiExternalLink /> Open
                        </button>
                        <button
                          onClick={() => copyToClipboard(createdLink.upi_deep_link)}
                          className="deep-link-btn copy"
                          title="Copy UPI link"
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="link-item">
              <label>Order ID:</label>
              <div className="link-container">
                <input 
                  type="text" 
                  value={createdLink.orderId || createdLink.id || 'N/A'} 
                  readOnly 
                  className="link-input"
                />
                <button 
                  onClick={() => copyToClipboard(createdLink.orderId || createdLink.id)}
                  className="action-btn copy"
                  title="Copy Order ID"
                >
                  <FiCopy />
                </button>
              </div>
            </div>
            <div className="link-item">
              <label>Amount:</label>
              <span className="link-value">₹{createdLink.amount || paymentData.amount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSection;
