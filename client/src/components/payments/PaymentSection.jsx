import React, { useState } from 'react';
import { FiExternalLink, FiCopy, FiSmartphone, FiZap } from 'react-icons/fi';
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
              <label>Payment Link:</label>
              <div className="link-container">
                <input 
                  type="text" 
                  value={createdLink.paymentLink || createdLink.payment_url || createdLink.link || 'Link generated'} 
                  readOnly 
                  className="link-input"
                />
                <button 
                  onClick={() => copyToClipboard(createdLink.paymentLink || createdLink.payment_url || createdLink.link)}
                  className="action-btn copy"
                  title="Copy link"
                >
                  <FiCopy />
                </button>
                <button 
                  onClick={() => openPaymentLink(createdLink.paymentLink || createdLink.payment_url || createdLink.paytmPaymentUrl, createdLink.paytmParams)}
                  className="action-btn redirect"
                  title="Open payment link"
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
