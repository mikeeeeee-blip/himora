import React, { useState } from 'react';
import { FiLock, FiZap, FiSmartphone, FiExternalLink, FiCopy } from 'react-icons/fi';
import paymentService from '../../services/paymentService';
import Sidebar from '../Sidebar';
import './PageLayout.css';
import Toast from '../ui/Toast';

const PaymentsPage = () => {
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
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const handleCreateLink = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');
    setSuccess('');
    
    // Validate phone number
    if (paymentData.customerPhone && paymentData.customerPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      setToast({ message: 'Phone number must be exactly 10 digits', type: 'error' });
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
      setToast({ message: 'Payment link created successfully!', type: 'success' });
      setPaymentData({
        amount: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        description: ''
      });
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
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
    setToast({ message: 'Link copied to clipboard!', type: 'success' });
  };

  const openPaymentLink = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>Payment Links</h1>
          <p>Create and manage payment links for your customers</p>
          <div className="header-actions">
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)} 
              className="primary-btn"
            >
              {showCreateForm ? 'Cancel' : 'Create Payment Link'}
            </button>
          </div>
        </div>
        
        <div className="page-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          {showCreateForm && (
            <div className="create-form-card">
              <h3>Create New Payment Link</h3>
              <form onSubmit={handleCreateLink} className="payment-form">
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
                  <button type="button" onClick={() => setShowCreateForm(false)} className="secondary-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={createLoading} className="primary-btn">
                    {createLoading ? 'Creating...' : 'Create Link'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {createdLink && (
            <div className="created-link-card">
              <h3>✅ Payment Link Created Successfully</h3>
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
                      className="copy-btn"
                      title="Copy link"
                    >
                      <FiCopy />
                    </button>
                    <button 
                      onClick={() => openPaymentLink(createdLink.paymentLink || createdLink.link)} 
                      className="copy-btn redirect"
                      title="Open payment link"
                    >
                      <FiExternalLink />
                    </button>
                  </div>
                </div>
                {createdLink.qrCode && (
                  <div className="link-item">
                    <label>QR Code:</label>
                    <img src={createdLink.qrCode} alt="Payment QR" style={{ maxWidth: '220px', borderRadius: '8px', border: '1px solid #c3e6cb' }} />
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
                      className="copy-btn"
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
                <div className="link-item">
                  <label>Customer:</label>
                  <span className="link-value">{createdLink.customerName || paymentData.customerName}</span>
                </div>
                {createdLink.expiresAt && (
                  <div className="link-item">
                    <label>Expires At:</label>
                    <span className="link-value">{createdLink.expiresAt}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="payment-info">
            <h3>Payment Link Information</h3>
            <div className="info-cards">
              <div className="info-card">
                <div className="info-icon"><FiLock /></div>
                <div className="info-content">
                  <h4>Secure Payments</h4>
                  <p>All payments are processed securely with industry-standard encryption.</p>
                </div>
              </div>
              <div className="info-card">
                <div className="info-icon"><FiZap /></div>
                <div className="info-content">
                  <h4>Instant Processing</h4>
                  <p>Payment links are generated instantly and ready to use immediately.</p>
                </div>
              </div>
              <div className="info-card">
                <div className="info-icon"><FiSmartphone /></div>
                <div className="info-content">
                  <h4>Mobile Friendly</h4>
                  <p>Payment links work seamlessly on all devices and platforms.</p>
                </div>
              </div>
            </div>
          </div>
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

export default PaymentsPage;
