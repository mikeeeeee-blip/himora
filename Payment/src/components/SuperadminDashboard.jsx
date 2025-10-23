// components/SuperadminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiTrendingUp, 
  FiDollarSign, 
  FiCreditCard,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertCircle,
  FiRefreshCw,
  FiArrowUp,
  FiArrowDown,
  FiPackage
} from 'react-icons/fi';
import { HiOutlineChartBar } from 'react-icons/hi2';
import { TbArrowsTransferDown } from 'react-icons/tb';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import superadminPaymentService from '../services/superadminPaymentService';
import Sidebar from './Sidebar';
import './Dashboard.css';
import './Dashboard.css';
import './pages/PageLayout.css';

const SuperadminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
const [loadingSettlement, setLoadingSettlement] = useState(false);
const [settlementMessage, setSettlementMessage] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);
const handleManualSettlement = async () => {
  if (!window.confirm('Are you sure you want to run manual settlement? This will process all eligible transactions.')) {
    return;
  }

  setLoadingSettlement(true);
  setSettlementMessage('');
  
  try {
    const result = await superadminPaymentService.triggerManualSettlement();
    
    if (result.success) {
      setSettlementMessage('✅ Manual settlement completed successfully!');
      // Refresh dashboard stats to show updated numbers
      setTimeout(() => {
        fetchStats();
      }, 1000);
    } else {
      setSettlementMessage(`❌ Settlement failed: ${result.message}`);
    }
  } catch (err) {
    console.error('Manual settlement error:', err);
    setSettlementMessage(`❌ Error: ${err.message}`);
  } finally {
    setLoadingSettlement(false);
    // Clear message after 5 seconds
    setTimeout(() => {
      setSettlementMessage('');
    }, 5000);
  }
};

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await superadminPaymentService.getDashboardStats();
      console.log('Dashboard stats:', data);
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
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

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString('en-IN');
  };

  if (loading && !stats) {
    return (
      <div className="page-container with-sidebar">
        <Sidebar />
        <main className="page-main">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <div>
            <h1>SuperAdmin Dashboard</h1>
            <p>Complete overview of platform operations and statistics</p>
          </div>
          <button 
            onClick={fetchStats} 
            disabled={loading} 
            className="refresh-btn"
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
        
        <div className="page-content">
          {error && (
            <div className="error-message">
              <FiAlertCircle /> {error}
            </div>
          )}

          {stats && (
            <>
              {/* Merchants Section */}
              <div className="stats-section">
                <div className="section-header">
                  <h2><FiUsers /> Merchants</h2>
                  <span className="section-count">{stats.merchants.total} Total</span>
                </div>
                <div className="stats-grid">
                  <div className="stat-card primary">
                    <div className="stat-icon">
                      <FiUsers />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total Merchants</div>
                      <div className="stat-value">{formatNumber(stats.merchants.total)}</div>
                    </div>
                  </div>

                  <div className="stat-card success">
                    <div className="stat-icon">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Active</div>
                      <div className="stat-value">{formatNumber(stats.merchants.active)}</div>
                    </div>
                  </div>

                  <div className="stat-card warning">
                    <div className="stat-icon">
                      <FiClock />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Inactive</div>
                      <div className="stat-value">{formatNumber(stats.merchants.inactive)}</div>
                    </div>
                  </div>

                  <div className="stat-card info">
                    <div className="stat-icon">
                      <FiTrendingUp />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">New This Week</div>
                      <div className="stat-value">{formatNumber(stats.merchants.new_this_week)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Section */}
              <div className="stats-section">
                <div className="section-header">
                  <h2><HiOutlineChartBar /> Transactions</h2>
                  <span className="section-count">{stats.transactions.total} Total</span>
                </div>
                <div className="stats-grid large">
                  <div className="stat-card primary clickable" onClick={() => navigate('/superadmin/transactions')}>
                    <div className="stat-icon">
                      <HiOutlineChartBar />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total Transactions</div>
                      <div className="stat-value">{formatNumber(stats.transactions.total)}</div>
                      <div className="stat-meta">
                        Success Rate: {stats.transactions.success_rate}%
                      </div>
                    </div>
                  </div>

                  <div className="stat-card success">
                    <div className="stat-icon">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Paid</div>
                      <div className="stat-value">{formatNumber(stats.transactions.paid)}</div>
                    </div>
                  </div>

                  <div className="stat-card warning">
                    <div className="stat-icon">
                      <FiClock />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Pending</div>
                      <div className="stat-value">{formatNumber(stats.transactions.pending)}</div>
                    </div>
                  </div>

                  <div className="stat-card error">
                    <div className="stat-icon">
                      <FiXCircle />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Failed</div>
                      <div className="stat-value">{formatNumber(stats.transactions.failed)}</div>
                    </div>
                  </div>

                  <div className="stat-card info">
                    <div className="stat-icon">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Settled</div>
                      <div className="stat-value">{formatNumber(stats.transactions.settled)}</div>
                    </div>
                  </div>

                  <div className="stat-card tertiary">
                    <div className="stat-icon">
                      <FiClock />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Unsettled</div>
                      <div className="stat-value">{formatNumber(stats.transactions.unsettled)}</div>
                    </div>
                  </div>
                </div>

                {/* Today & Week Stats */}
                <div className="stats-row">
                  <div className="stat-mini">
                    <div className="stat-mini-label">Today</div>
                    <div className="stat-mini-value">{formatNumber(stats.transactions.today)}</div>
                  </div>
                  <div className="stat-mini">
                    <div className="stat-mini-label">This Week</div>
                    <div className="stat-mini-value">{formatNumber(stats.transactions.this_week)}</div>
                  </div>
                </div>
              </div>

              {/* Revenue Section */}
              <div className="stats-section">
                <div className="section-header">
                  <h2><FiDollarSign /> Revenue</h2>
                  <span className="section-amount">{formatCurrency(stats.revenue.total)}</span>
                </div>
                <div className="stats-grid large">
                  <div className="stat-card primary large">
                    <div className="stat-icon">
                      <FiDollarSign />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total Revenue</div>
                      <div className="stat-value">{formatCurrency(stats.revenue.total)}</div>
                      <div className="stat-meta">
                        Avg: {formatCurrency(stats.revenue.average_transaction)} per txn
                      </div>
                    </div>
                  </div>

                  <div className="stat-card success">
                    <div className="stat-icon">
                      <FiTrendingUp />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Commission Earned (3.8%)</div>
                      <div className="stat-value">{formatCurrency(stats.revenue.commission_earned)}</div>
                    </div>
                  </div>

                  <div className="stat-card info">
                    <div className="stat-icon">
                      <FiCreditCard />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Net Revenue</div>
                      <div className="stat-value">{formatCurrency(stats.revenue.net_revenue)}</div>
                    </div>
                  </div>

                  <div className="stat-card warning">
                    <div className="stat-icon">
                      <FiArrowDown />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Refunded</div>
                      <div className="stat-value">{formatCurrency(stats.revenue.refunded)}</div>
                    </div>
                  </div>
                </div>

                <div className="stats-row">
                  <div className="stat-mini success">
                    <div className="stat-mini-label">Today's Revenue</div>
                    <div className="stat-mini-value">{formatCurrency(stats.revenue.today)}</div>
                  </div>
                  <div className="stat-mini success">
                    <div className="stat-mini-label">This Week</div>
                    <div className="stat-mini-value">{formatCurrency(stats.revenue.this_week)}</div>
                  </div>
                </div>
              </div>

              {/* Payouts Section */}
              <div className="stats-section">
                <div className="section-header">
                  <h2><TbArrowsTransferDown /> Payouts</h2>
                  <span className="section-count">{stats.payouts.total_requests} Requests</span>
                </div>
                <div className="stats-grid large">
                  <div className="stat-card primary clickable" onClick={() => navigate('/superadmin/payouts')}>
                    <div className="stat-icon">
                      <RiMoneyDollarCircleLine />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total Requests</div>
                      <div className="stat-value">{formatNumber(stats.payouts.total_requests)}</div>
                      <div className="stat-meta">
                        {formatCurrency(stats.payouts.total_amount_requested)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card warning">
                    <div className="stat-icon">
                      <FiAlertCircle />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Pending Approval</div>
                      <div className="stat-value">{formatNumber(stats.payouts.requested)}</div>
                    </div>
                  </div>

                  <div className="stat-card info">
                    <div className="stat-icon">
                      <FiClock />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Processing</div>
                      <div className="stat-value">{formatNumber(stats.payouts.pending)}</div>
                      <div className="stat-meta">
                        {formatCurrency(stats.payouts.total_pending)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card success">
                    <div className="stat-icon">
                      <FiCheckCircle />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Completed</div>
                      <div className="stat-value">{formatNumber(stats.payouts.completed)}</div>
                      <div className="stat-meta">
                        {formatCurrency(stats.payouts.total_completed)}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card error">
                    <div className="stat-icon">
                      <FiXCircle />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Rejected</div>
                      <div className="stat-value">{formatNumber(stats.payouts.rejected)}</div>
                    </div>
                  </div>

                  <div className="stat-card tertiary">
                    <div className="stat-icon">
                      <FiDollarSign />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Commission Earned</div>
                      <div className="stat-value">{formatCurrency(stats.payouts.commission_earned)}</div>
                    </div>
                  </div>
                </div>

                <div className="stats-row">
                  <div className="stat-mini info">
                    <div className="stat-mini-label">Today's Requests</div>
                    <div className="stat-mini-value">{formatNumber(stats.payouts.today)}</div>
                  </div>
                </div>
              </div>

              {/* Settlement Section */}
              {/* Settlement Section */}
<div className="stats-section">
  <div className="section-header">
    <h2><FiPackage /> Settlement Status</h2>
    <button 
      onClick={handleManualSettlement} 
      disabled={loadingSettlement}
      className="btn-primary"
      style={{ 
        padding: '8px 16px', 
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <FiRefreshCw className={loadingSettlement ? 'spinning' : ''} />
      {loadingSettlement ? 'Processing...' : 'Run Manual Settlement'}
    </button>
  </div>

  {settlementMessage && (
    <div className={`alert ${settlementMessage.includes('✅') ? 'success' : 'error'}`}>
      {settlementMessage}
    </div>
  )}

  <div className="stats-grid">
    <div className="stat-card success">
      <div className="stat-icon">
        <FiCheckCircle />
      </div>
      <div className="stat-content">
        <div className="stat-label">Settled Transactions</div>
        <div className="stat-value">{formatNumber(stats.settlement.settled_transactions)}</div>
      </div>
    </div>

    <div className="stat-card warning">
      <div className="stat-icon">
        <FiClock />
      </div>
      <div className="stat-content">
        <div className="stat-label">Unsettled</div>
        <div className="stat-value">{formatNumber(stats.settlement.unsettled_transactions)}</div>
      </div>
    </div>

    <div className="stat-card info">
      <div className="stat-icon">
        <FiDollarSign />
      </div>
      <div className="stat-content">
        <div className="stat-label">Available for Payout</div>
        <div className="stat-value">{formatNumber(stats.settlement.available_for_payout)}</div>
        <div className="stat-meta">
          {formatCurrency(stats.settlement.available_balance)}
        </div>
      </div>
    </div>

    <div className="stat-card tertiary">
      <div className="stat-icon">
        <FiPackage />
      </div>
      <div className="stat-content">
        <div className="stat-label">In Payouts</div>
        <div className="stat-value">{formatNumber(stats.settlement.in_payouts)}</div>
      </div>
    </div>
  </div>
</div>


              {/* Platform Revenue */}
              <div className="stats-section">
                <div className="section-header">
                  <h2><FiTrendingUp /> Platform Revenue</h2>
                  <span className="section-amount">{formatCurrency(stats.platform.total_commission_earned)}</span>
                </div>
                <div className="stats-grid">
                  <div className="stat-card primary large">
                    <div className="stat-icon">
                      <FiDollarSign />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Total Commission</div>
                      <div className="stat-value">{formatCurrency(stats.platform.total_commission_earned)}</div>
                      <div className="stat-meta">
                        Payin + Payout fees
                      </div>
                    </div>
                  </div>

                  <div className="stat-card success">
                    <div className="stat-icon">
                      <FiArrowUp />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Payin Commission (3.8%)</div>
                      <div className="stat-value">{formatCurrency(stats.platform.payin_commission)}</div>
                    </div>
                  </div>

                  <div className="stat-card info">
                    <div className="stat-icon">
                      <FiArrowDown />
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">Payout Commission (₹30)</div>
                      <div className="stat-value">{formatCurrency(stats.platform.payout_commission)}</div>
                    </div>
                  </div>

                  <div className="stat-card tertiary">
                    <div className="stat-icon">
                      <FiTrendingUp />
                    </div>
                     
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperadminDashboard;

