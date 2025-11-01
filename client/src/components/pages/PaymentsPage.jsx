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
    
    if (paymentData.customerPhone && paymentData.customerPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      setToast({ message: 'Phone number must be exactly 10 digits', type: 'error' });
      setCreateLoading(false);
      return;
    }

    try {
      const result = await paymentService.createPaymentLink({
        amount: parseFloat(paymentData.amount),
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        customerPhone: paymentData.customerPhone,
        description: paymentData.description
      });

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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast({ message: 'Copied to clipboard!', type: 'success' });
  };

  const openPaymentLink = (url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
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
                      onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                      required
                      placeholder="500"
                    />
                  </div>
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      value={paymentData.customerName}
                      onChange={(e) => setPaymentData({ ...paymentData, customerName: e.target.value })}
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
                      onChange={(e) => setPaymentData({ ...paymentData, customerEmail: e.target.value })}
                      required
                      placeholder="amit@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Customer Phone</label>
                    <input
                      type="tel"
                      value={paymentData.customerPhone}
                      onChange={(e) => setPaymentData({ ...paymentData, customerPhone: e.target.value })}
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
                      onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
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

                {/* Primary Payment Link */}
                <div className="link-item">
                  <label>Payment Link:</label>
                  <div className="link-container">
                    <input 
                      type="text" 
                      value={createdLink.paymentLink || 'Link generated'} 
                      readOnly 
                      className="link-input"
                    />
                    <button onClick={() => copyToClipboard(createdLink.paymentLink)} className="copy-btn">
                      <FiCopy />
                    </button>
                    <button onClick={() => openPaymentLink(createdLink.paymentLink)} className="copy-btn redirect">
                      <FiExternalLink />
                    </button>
                  </div>
                </div>

                {/* Deep Links Section */}
                {/* {(createdLink.phonepe_deep_link || createdLink.gpay_deep_link || createdLink.upi_deep_link) && (
                  <div className="deep-link-section">
                    <h4>💡 UPI Deep Links</h4>
                    <div className="deep-link-buttons">

                      {createdLink.phonepe_deep_link && (
                        <div className="deep-link-item">
                          <span>PhonePe:</span>
                          <div className="deep-link-actions">
                            <button onClick={() => copyToClipboard(createdLink.phonepe_deep_link)} className="copy-btn">
                              <FiCopy />
                            </button>
                            <button onClick={() => openPaymentLink(createdLink.phonepe_deep_link)} className="copy-btn redirect">
                              <FiExternalLink />
                            </button>
                          </div>
                        </div>
                      )}

                      {createdLink.gpay_deep_link && (
                        <div className="deep-link-item">
                          <span>Google Pay:</span>
                          <div className="deep-link-actions">
                            <button onClick={() => copyToClipboard(createdLink.gpay_deep_link)} className="copy-btn">
                              <FiCopy />
                            </button>
                            <button onClick={() => openPaymentLink(createdLink.gpay_intent || createdLink.gpay_deep_link)} className="copy-btn redirect">
                              <FiExternalLink />
                            </button>
                          </div>
                        </div>
                      )}

                      {createdLink.upi_deep_link && (
                        <div className="deep-link-item">
                          <span>UPI (Generic):</span>
                          <div className="deep-link-actions">
                            <button onClick={() => copyToClipboard(createdLink.upi_deep_link)} className="copy-btn">
                              <FiCopy />
                            </button>
                            <button onClick={() => openPaymentLink(createdLink.upi_deep_link)} className="copy-btn redirect">
                              <FiExternalLink />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )} */}
              </div>
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

export default PaymentsPage;
