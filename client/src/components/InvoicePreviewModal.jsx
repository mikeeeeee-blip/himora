import React, { useState, useEffect } from 'react';
import { FiX, FiDownload, FiLoader } from 'react-icons/fi';
import superadminPaymentService from '../services/superadminPaymentService';

const InvoicePreviewModal = ({ open, transactionId, onClose, onDownload }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && transactionId) {
      loadInvoice();
    } else {
      // Cleanup blob URL when modal closes
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }

    return () => {
      // Cleanup on unmount
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transactionId]);

  const loadInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await superadminPaymentService.getInvoiceBlob(transactionId);
      if (result && result.success && result.url) {
        setPdfUrl(result.url);
      } else {
        throw new Error('Failed to load invoice');
      }
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(err.message || 'Failed to load invoice preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl && onDownload) {
      onDownload();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl sm:text-2xl font-medium text-white font-['Albert_Sans'] flex items-center gap-2">
            <span>📄</span>
            Invoice Preview
          </h3>
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5"
                title="Download Invoice"
              >
                <FiDownload size={16} />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors duration-200 p-2 hover:bg-white/5 rounded-lg"
              aria-label="Close modal"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <FiLoader className="w-10 h-10 text-accent animate-spin mb-4" />
              <p className="text-white/70 font-['Albert_Sans']">
                Loading invoice preview...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="text-red-400 mb-4 text-center">
                <p className="font-['Albert_Sans']">{error}</p>
              </div>
              <button
                onClick={loadInvoice}
                className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg font-medium font-['Albert_Sans'] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : pdfUrl ? (
            <div className="w-full h-full border border-white/10 rounded-lg overflow-hidden bg-white">
              <iframe
                src={pdfUrl}
                className="w-full h-full min-h-[600px]"
                title="Invoice Preview"
                style={{ border: 'none' }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;

