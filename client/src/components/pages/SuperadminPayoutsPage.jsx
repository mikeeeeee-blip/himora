import React, { useState, useEffect } from 'react';
import superadminPaymentService from '../../services/superadminPaymentService';
import Sidebar from '../Sidebar';
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
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>Admin Payouts</h1>
          <p>Approve or reject payout requests from merchants</p>
          <div className="header-actions">
            <button onClick={fetchPayouts} disabled={loading} className="refresh-btn">
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        <div className="page-content">
          {error && <div className="error-message">{error}</div>}
          
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading admin payouts...</p>
            </div>
          ) : (
            <div className="payouts-container">
              {payouts.length > 0 ? (
                <div className="payouts-grid">
                  {payouts.map((payout, index) => (
                    <div key={index} className="payout-card">
                      <div className="payout-header">
                        <div className="payout-id">
                          ID: {payout.id || `PAYOUT-${index + 1}`}
                        </div>
                        <div className={`payout-status status-${(payout.status || 'pending').toLowerCase()}`}>
                          {payout.status || 'Pending'}
                        </div>
                      </div>
                      
                      <div className="payout-body">
                        <div className="payout-amount">
                          ₹{payout.amount || '0.00'}
                        </div>
                        <div className="payout-details">
                          <div className="detail-row">
                            <span className="detail-label">Merchant:</span>
                            <span className="detail-value">{payout.merchantName || payout.merchantId || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Commission:</span>
                            <span className="detail-value">{payout.commissionRate || '0'}%</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Mode:</span>
                            <span className="detail-value">{payout.transferMode || 'Bank Transfer'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Date:</span>
                            <span className="detail-value">{payout.createdAt || new Date().toLocaleDateString()}</span>
                          </div>
                          {payout.notes && (
                            <div className="detail-row">
                              <span className="detail-label">Notes:</span>
                              <span className="detail-value">{payout.notes}</span>
                            </div>
                          )}
                        </div>
                        {String(payout.status).toLowerCase() === 'pending' && (
                          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                            <button 
                              className="primary-btn" 
                              disabled={actionLoading === payout.id + 'approve'}
                              onClick={() => handlePayoutAction(payout.id, 'approve')}
                            >
                              {actionLoading === payout.id + 'approve' ? 'Approving...' : 'Approve'}
                            </button>
                            <button 
                              className="secondary-btn" 
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
                <div className="empty-state">
                  <div className="empty-icon">💰</div>
                  <h3>No Admin Payouts Found</h3>
                  <p>No admin payout requests have been made yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperadminPayoutsPage;
