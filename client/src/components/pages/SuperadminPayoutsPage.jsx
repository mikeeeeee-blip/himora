import React, { useState, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import superadminPaymentService from '../../services/superadminPaymentService';
import Navbar from '../Navbar';
import './PageLayout.css';

const SuperadminPayoutsPage = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await superadminPaymentService.getAdminPayouts();
      setPayouts(data.payouts || data || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutAction = async (payoutId, action) => {
    setActionLoading(payoutId + action);
    setError('');
    try {
      await superadminPaymentService.updateAdminPayoutStatus(payoutId, action);
      await fetchPayouts();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#001D22] relative">
      {/* Background Image */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <img
          src="/bgdashboard.png"
          alt="Background"
          className="object-cover w-full h-full opacity-10"
          style={{
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
      </div>

      <Navbar />
      
      {/* Scrollable Content Section */}
      <section className="relative z-10 min-h-screen bg-transparent">
        <div className="bg-transparent pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            <main className="space-y-6 sm:space-y-8">
              {/* Header */}
              <div className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8">
                <div className="flex justify-between items-start gap-5 flex-wrap">
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white mb-3 font-['Albert_Sans']">
                      Admin Payouts
                    </h1>
                    <p className="text-white/70 text-base sm:text-lg font-['Albert_Sans']">
                      Approve or reject payout requests from merchants
                    </p>
                  </div>
                  <button 
                    onClick={fetchPayouts} 
                    disabled={loading} 
                    className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {error && (
                  <div className="text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                    {error}
                  </div>
                )}
                
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 px-5 bg-[#122D32] border border-white/10 rounded-xl">
                    <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                    <p className="text-white/80 font-['Albert_Sans']">Loading admin payouts...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {payouts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {payouts.map((payout, index) => (
                          <div key={index} className="bg-[#122D32] border border-white/10 rounded-xl p-6 hover:border-accent/50 transition-all duration-200">
                            <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/10">
                              <div className="text-white/70 text-sm font-['Albert_Sans']">
                                ID: <span className="text-white font-medium">{payout.id || `PAYOUT-${index + 1}`}</span>
                              </div>
                              <div className={`px-3 py-1 rounded-lg text-xs font-medium font-['Albert_Sans'] ${
                                (payout.status || 'pending').toLowerCase() === 'approved' || (payout.status || 'pending').toLowerCase() === 'completed'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                  : (payout.status || 'pending').toLowerCase() === 'rejected'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                              }`}>
                                {payout.status || 'Pending'}
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="text-3xl font-bold text-white font-['Albert_Sans']">
                                ₹{Number(payout.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm font-['Albert_Sans']">Merchant:</span>
                                  <span className="text-white font-medium text-sm font-['Albert_Sans']">{payout.merchantName || payout.merchantId || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm font-['Albert_Sans']">Commission:</span>
                                  <span className="text-white font-medium text-sm font-['Albert_Sans']">{payout.commissionRate || '0'}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm font-['Albert_Sans']">Mode:</span>
                                  <span className="text-white font-medium text-sm font-['Albert_Sans']">{payout.transferMode || 'Bank Transfer'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm font-['Albert_Sans']">Date:</span>
                                  <span className="text-white font-medium text-sm font-['Albert_Sans']">
                                    {payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString()}
                                  </span>
                                </div>
                                {payout.notes && (
                                  <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
                                    <span className="text-white/70 text-sm font-['Albert_Sans']">Notes:</span>
                                    <span className="text-white text-sm font-['Albert_Sans']">{payout.notes}</span>
                                  </div>
                                )}
                              </div>
                              
                              {String(payout.status).toLowerCase() === 'pending' && (
                                <div className="flex gap-3 pt-4 border-t border-white/10">
                                  <button 
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={actionLoading === payout.id + 'approve'}
                                    onClick={() => handlePayoutAction(payout.id, 'approve')}
                                  >
                                    {actionLoading === payout.id + 'approve' ? 'Approving...' : 'Approve'}
                                  </button>
                                  <button 
                                    className="flex-1 bg-[#122D32] border border-red-500/40 hover:border-red-500 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={actionLoading === payout.id + 'reject'}
                                    onClick={() => handlePayoutAction(payout.id, 'reject')}
                                  >
                                    {actionLoading === payout.id + 'reject' ? 'Rejecting...' : 'Reject'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 px-5 bg-[#122D32] border border-white/10 rounded-xl">
                        <div className="text-6xl mb-4">💰</div>
                        <h3 className="text-xl font-medium text-white mb-2 font-['Albert_Sans']">No Admin Payouts Found</h3>
                        <p className="text-white/70 text-sm font-['Albert_Sans']">No admin payout requests have been made yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SuperadminPayoutsPage;
