import React, { useState } from 'react';
import { FiExternalLink, FiCopy } from 'react-icons/fi';
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

  const openPaymentLink = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
                  value={createdLink.paymentLink || createdLink.link || 'Link generated'} 
                  readOnly 
                  className="link-input"
                />
                <button 
                  onClick={() => copyToClipboard(createdLink.paymentLink || createdLink.link)}
                  className="action-btn copy"
                  title="Copy link"
                >
                  <FiCopy />
                </button>
                <button 
                  onClick={() => openPaymentLink(createdLink.paymentLink || createdLink.link)}
                  className="action-btn redirect"
                  title="Open payment link"
                >
                  <FiExternalLink />
                </button>
              </div>
            </div>
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
