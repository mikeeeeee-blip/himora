import React, { useState, useEffect } from 'react';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiCreditCard,
  FiPercent,
  FiInfo,
  FiRefreshCw,
  FiClock,
  FiCheck  // ✅ ADD THIS!
} from 'react-icons/fi';
import { HiOutlineChartBar } from 'react-icons/hi2';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import paymentService from '../../services/paymentService';
import Sidebar from '../Sidebar';
import './PageLayout.css';
import './BalancePage.css';

const BalancePage = () => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await paymentService.getBalance();
      console.log('Balance data received:', data); // ✅ Debug log
      setBalance(data);
    } catch (error) {
      console.error('Balance fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <div>
            <h1><FiDollarSign /> Balance & Revenue</h1>
            <p>Complete financial overview with T+1/2 settlement tracking</p>
          </div>
          <button 
            onClick={fetchBalance} 
            disabled={loading} 
            className="refresh-btn"
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        <div className="page-content">
          {error && (
            <div className="error-message">
              <FiInfo /> {error}
            </div>
          )}
          
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading balance information...</p>
            </div>
          ) : balance ? (
            <div className="balance-container">
              {/* Primary Balance Cards */}
              <div className="balance-cards">
                {/* Available Balance (Settled) */}
                <div className="balance-card primary">
                  <div className="balance-icon">
                    <FiDollarSign />
                  </div>
                  <div className="balance-content">
                    <div className="balance-label">Available Wallet Balance</div>
                    <div className="balance-amount">
                      {formatCurrency(balance.balance?.available_wallet_balance || 0)}
                    </div>
                    <div className="balance-description">
                      ✓ Ready to withdraw
                    </div>
                  </div>
                </div>
                
                {/* Unsettled Balance (Locked) */}
                <div className="balance-card warning">
                  <div className="balance-icon">
                    <FiClock />
                  </div>
                  <div className="balance-content">
                    <div className="balance-label">Unsettled Balance</div>
                    <div className="balance-amount">
                      {formatCurrency(balance.balance?.unsettled_balance || 0)}
                    </div>
                    <div className="balance-description">
                      ⏳ Waiting for settlement
                    </div>
                  </div>
                </div>

                {/* Pending Payouts */}
                <div className="balance-card secondary">
                  <div className="balance-icon">
                    <FiTrendingUp />
                  </div>
                  <div className="balance-content">
                    <div className="balance-label">Pending Payouts</div>
                    <div className="balance-amount">
                      {formatCurrency(balance.balance?.pending_payouts_amount || 0)}
                    </div>
                    <div className="balance-description">
                      Waiting for approval
                    </div>
                  </div>
                </div>

                {/* Total Paid Out */}
                <div className="balance-card quaternary">
                  <div className="balance-icon">
                    <FiPercent />
                  </div>
                  <div className="balance-content">
                    <div className="balance-label">Total Paid Out</div>
                    <div className="balance-amount">
                      {formatCurrency(balance.balance?.total_paid_out || 0)}
                    </div>
                    <div className="balance-description">
                      Successfully paid out
                    </div>
                  </div>
                </div>
              </div>

              {/* Payout Eligibility */}
              {balance.payout_eligibility && (
                <div className="eligibility-section">
                  <h3><RiMoneyDollarCircleLine /> Payout Eligibility</h3>
                  <div className="eligibility-card">
                    <div className="eligibility-status">
                      <span className={`status-badge ${balance.payout_eligibility.can_request_payout ? 'eligible' : 'not-eligible'}`}>
                        {balance.payout_eligibility.can_request_payout ? '✓ Eligible for Payout' : '✕ Not Eligible'}
                      </span>
                    </div>
                    <div className="eligibility-details">
                      <div className="eligibility-item">
                        <span className="eligibility-label">Maximum Payout Amount:</span>
                        <span className="eligibility-value">
                          {formatCurrency(balance.payout_eligibility.maximum_payout_amount || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="eligibility-reason">
                      <FiInfo /> {balance.payout_eligibility.can_request_payout ? 'You can request a payout from your available wallet balance.' : 'You do not have any available balance for payout.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Merchant Info */}
              {balance.merchant && (
                <div className="merchant-section">
                  <h3><FiInfo /> Account Information</h3>
                  <div className="merchant-card">
                    <div className="merchant-detail">
                      <span className="merchant-label">Merchant Name:</span>
                      <span className="merchant-value">{balance.merchant.merchantName}</span>
                    </div>
                    <div className="merchant-detail">
                      <span className="merchant-label">Email:</span>
                      <span className="merchant-value">{balance.merchant.merchantEmail}</span>
                    </div>
                    <div className="merchant-detail">
                      <span className="merchant-label">Merchant ID:</span>
                      <span className="merchant-value mono">{balance.merchant.merchantId}</span>
                    </div>
                    <div className="merchant-detail">
                      <span className="merchant-label">Last Updated:</span>
                      <span className="merchant-value">{new Date().toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><FiCreditCard /></div>
              <h3>Unable to Load Balance</h3>
              <p>There was an issue loading your balance information.</p>
              <button onClick={fetchBalance} className="primary-btn">
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BalancePage;
