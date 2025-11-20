import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiCopy } from 'react-icons/fi';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get('transaction_id');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#001D22] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-[#122D32] border border-white/10 rounded-xl p-8 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <FiCheckCircle className="w-20 h-20 text-green-500 mx-auto" />
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-white mb-4 font-['Albert_Sans']">
          Payment Successful! ✅
        </h1>
        <p className="text-white/70 text-lg mb-8 font-['Albert_Sans']">
          Your payment has been processed successfully.
        </p>

        {/* Transaction Details */}
        {transactionId && (
          <div className="bg-[#263F43] border border-white/10 rounded-lg p-6 mb-6 text-left">
            <h2 className="text-xl font-semibold text-white mb-4 font-['Albert_Sans']">
              Transaction Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/70 font-['Albert_Sans']">Transaction ID:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm font-['Albert_Sans']">
                    {transactionId}
                  </span>
                  <button
                    onClick={() => copyToClipboard(transactionId)}
                    className="text-accent hover:text-accent/80"
                    title="Copy Transaction ID"
                  >
                    <FiCopy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 py-3 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

