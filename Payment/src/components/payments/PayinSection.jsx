import React, { useState, useEffect } from 'react';
import { FiCreditCard, FiTrendingUp, FiDollarSign, FiPercent, FiInfo } from 'react-icons/fi';
import paymentService from '../../services/paymentService';
import './PaymentSection.css';

const PayinSection = () => {
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
      setBalance(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Derived commission calculations (flat 3.8% on total payins)
  const totalRevenue = Number(balance?.totalBalance || 0);
  const totalRefunded = Number(balance?.raw?.balance?.total_refunded || 0);
  const computedCommissionDeducted = +(totalRevenue * 0.038).toFixed(2);
  const computedNetRevenue = +(totalRevenue - computedCommissionDeducted - totalRefunded).toFixed(2);

  return (
    <div className="payment-section">
      <div className="section-header">
        <div className="header-content">
          <h3><FiDollarSign /> Balance Overview</h3>
          <p className="header-subtitle">Your wallet balance and pay-in summary</p>
        </div>
        <button onClick={fetchBalance} disabled={loading} className="refresh-btn">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading balance information...</p>
        </div>
      ) : balance ? (
        <div className="balance-display">
          {/* Main Balance Cards */}
          <div className="balance-cards-grid">
            <div className="balance-card primary">
              <div className="card-icon available">
                <FiDollarSign />
              </div>
              <div className="card-content">
                <div className="balance-label">Available Wallet Balance</div>
                <div className="balance-amount">{formatCurrency(balance.balance?.available_wallet_balance)}</div>
                <div className="balance-description">
                  Ready to withdraw
                </div>
              </div>
            </div>
            
            <div className="balance-card secondary">
              <div className="card-icon revenue">
                <FiTrendingUp />
              </div>
              <div className="card-content">
                <div className="balance-label">Unsettled Balance</div>
                <div className="balance-amount">{formatCurrency(balance.balance?.unsettled_balance)}</div>
                <div className="balance-description">
                  Waiting for settlement
                </div>
              </div>
            </div>

            <div className="balance-card tertiary">
              <div className="card-icon pending">
                <FiCreditCard />
              </div>
              <div className="card-content">
                <div className="balance-label">Pending Payouts</div>
                <div className="balance-amount">{formatCurrency(balance.balance?.pending_payouts_amount)}</div>
                <div className="balance-description">
                  Awaiting processing
                </div>
              </div>
            </div>

            <div className="balance-card quaternary">
              <div className="card-icon commission">
                <FiPercent />
              </div>
              <div className="card-content">
                <div className="balance-label">Total Paid Out</div>
                <div className="balance-amount">{formatCurrency(balance.balance?.total_paid_out)}</div>
                <div className="balance-description">
                  Successfully paid out
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><FiCreditCard /></div>
          <p>Unable to fetch balance information</p>
          <button onClick={fetchBalance} className="retry-btn">Try Again</button>
        </div>
      )}
    </div>
  );
};

export default PayinSection;
