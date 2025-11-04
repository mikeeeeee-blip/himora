import React, { useState } from 'react';
import { FiLock, FiZap, FiSmartphone, FiExternalLink, FiCopy, FiPlus, FiX, FiRefreshCw } from 'react-icons/fi';
import paymentService from '../../services/paymentService';
import Navbar from '../Navbar';
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
      setShowCreateForm(false);

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
    <div className="min-h-screen bg-[#001D22]">
      <Navbar />
      <main className="pt-24 p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans']">
                Payment Links
              </h1>
              <p className="text-white/70 text-sm sm:text-base font-['Albert_Sans']">
                Create and manage payment links for your customers
              </p>
            </div>
            <button 
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setError('');
                setSuccess('');
                setCreatedLink(null);
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-4 sm:px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary self-start sm:self-auto"
            >
              {showCreateForm ? (
                <>
                  <FiX className="text-base" />
                  Cancel
                </>
              ) : (
                <>
                  <FiPlus className="text-base" />
                  Create Payment Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-red-400 text-sm sm:text-base font-medium font-['Albert_Sans'] flex-1">
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-green-400 text-sm sm:text-base font-medium font-['Albert_Sans'] flex-1">
              {success}
            </p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <FiPlus className="text-accent text-xl" />
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
                Create New Payment Link
              </h3>
            </div>
            <form onSubmit={handleCreateLink} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                    Amount (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    required
                    placeholder="500"
                    className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                    Customer Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentData.customerName}
                    onChange={(e) => setPaymentData({ ...paymentData, customerName: e.target.value })}
                    required
                    placeholder="Amit Kumar"
                    className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                    Customer Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={paymentData.customerEmail}
                    onChange={(e) => setPaymentData({ ...paymentData, customerEmail: e.target.value })}
                    required
                    placeholder="amit@example.com"
                    className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                    Customer Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={paymentData.customerPhone}
                    onChange={(e) => setPaymentData({ ...paymentData, customerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                    placeholder="9876543210"
                    maxLength="10"
                    className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={paymentData.description}
                  onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                  placeholder="Product purchase"
                  className="w-full px-4 py-2.5 border-2 border-white/10 rounded-lg bg-bg-secondary text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="bg-bg-secondary text-white border border-accent px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createLoading}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {createLoading ? (
                    <>
                      <FiRefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiPlus className="w-4 h-4" />
                      Create Link
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Created Link Card */}
        {createdLink && (
          <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-green-400 font-['Albert_Sans']">
                Payment Link Created Successfully
              </h3>
            </div>
            
            <div className="bg-[#263F43] border border-white/10 rounded-lg p-4 sm:p-5">
              <label className="block text-white/80 text-sm font-medium font-['Albert_Sans'] mb-2">
                Payment Link:
              </label>
              <div className="relative flex gap-2">
                <input 
                  type="text" 
                  value={createdLink.paymentLink || 'Link generated'} 
                  readOnly 
                  className="flex-1 px-4 py-3 border-2 border-white/10 rounded-lg bg-bg-secondary text-green-400 text-sm font-mono focus:outline-none focus:border-accent pr-24"
                />
                <button 
                  onClick={() => copyToClipboard(createdLink.paymentLink)} 
                  className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-3 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:shadow-lg active:scale-95 flex items-center gap-2"
                  title="Copy to clipboard"
                >
                  <FiCopy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button 
                  onClick={() => openPaymentLink(createdLink.paymentLink)} 
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-4 py-3 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:shadow-lg active:scale-95 flex items-center gap-2"
                  title="Open link"
                >
                  <FiExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Open</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
