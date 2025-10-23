import React, { useState, useEffect } from 'react';
import { HiOutlineChartBar } from 'react-icons/hi2';
import { FiCopy, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import { TbArrowsTransferDown } from 'react-icons/tb';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { MdPayments } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import apiKeyService from '../services/apiKeyService';
import paymentService from '../services/paymentService';
import Sidebar from './Sidebar';
import './Dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    balance: null,
    transactions: null,
    payouts: null,
    loading: true
  });

  useEffect(() => {
    checkExistingApiKey();
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setDashboardStats(prev => ({ ...prev, loading: true }));

      // ✅ Fetch balance (requires JWT token only)
      let balanceData = null;
      let transactionsData = null;
      let payoutsData = null;

      try {
        balanceData = await paymentService.getBalance();
        console.log('✅ Balance fetched:', balanceData);
      } catch (err) {
        console.error('❌ Balance fetch error:', err.message);
      }

      // ✅ Fetch transactions (requires API key - may fail if no API key)
      try {
        transactionsData = await paymentService.getTransactions();
        console.log('✅ Transactions fetched:', transactionsData);
      } catch (err) {
        console.error('❌ Transactions fetch error:', err.message);
        // Set empty data if API key not found
        transactionsData = {
          transactions: [],
          summary: {
            total_transactions: 0,
            successful_transactions: 0
          }
        };
      }
      
      // ✅ Fetch payouts (requires JWT token only)
      try {
        payoutsData = await paymentService.getPayouts();
        console.log('✅ Payouts fetched:', payoutsData);
      } catch (err) {
        console.error('❌ Payouts fetch error:', err.message);
        payoutsData = {
          payouts: [],
          summary: {
            total_payout_requests: 0
          }
        };
      }

      setDashboardStats({
        balance: balanceData,
        transactions: transactionsData,
        payouts: payoutsData,
        loading: false
      });
    } catch (error) {
      console.error('❌ Dashboard stats error:', error);
      setDashboardStats(prev => ({ ...prev, loading: false }));
    }
  };

  const checkExistingApiKey = async () => {
    setFetching(true);
    setError('');
    
    try {
      const result = await apiKeyService.getApiKey();
      console.log('API key result:', result);
      
      const apiKeyValue = result?.apiKey || result?.key || result?.data?.apiKey || result?.data?.key || result;
      
      if (apiKeyValue && typeof apiKeyValue === 'string' && apiKeyValue.length > 0) {
        setApiKey(apiKeyValue);
        setHasApiKey(true);
        setSuccess('Existing API key loaded successfully!');
      } else {
        setError('No API key found. You may need to create one first.');
        setHasApiKey(false);
      }
    } catch (error) {
      if (error.message.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          authService.logout();
          navigate('/login');
        }, 2000);
      } else if (error.message.includes('Forbidden')) {
        setError('You do not have permission to access API keys.');
        setHasApiKey(false);
      } else {
        setError(error.message);
        setHasApiKey(false);
      }
    } finally {
      setFetching(false);
    }
  };

  const handleCreateApiKey = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiKeyService.createApiKey();
      const apiKeyValue = result?.apiKey || result?.key || result?.data?.apiKey || result?.data?.key || result;
      
      if (apiKeyValue && typeof apiKeyValue === 'string' && apiKeyValue.length > 0) {
        setApiKey(apiKeyValue);
        setHasApiKey(true);
        setSuccess('API key created successfully!');
        // ✅ Refresh dashboard stats after creating API key
        fetchDashboardStats();
      } else {
        setApiKey('API Key created successfully');
        setHasApiKey(true);
        setSuccess('API key created successfully!');
      }
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('already created')) {
        setError('You have already created an API key. Use the "Get API Key" button to retrieve it.');
        setHasApiKey(true);
      } else if (error.message.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          authService.logout();
          navigate('/login');
        }, 2000);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setSuccess('API key copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getTodayTransactions = () => {
    if (!dashboardStats.transactions?.transactions) return { count: 0, amount: 0 };
    
    const today = new Date().toDateString();
    const todayTxns = dashboardStats.transactions.transactions.filter(txn => 
      new Date(txn.created_at).toDateString() === today && txn.status === 'paid'
    );
    
    return {
      count: todayTxns.length,
      amount: todayTxns.reduce((sum, txn) => sum + (txn.amount || 0), 0)
    };
  };

  const getTodayPayouts = () => {
    if (!dashboardStats.payouts?.payouts) return { count: 0, amount: 0 };
    
    const today = new Date().toDateString();
    const todayPayouts = dashboardStats.payouts.payouts.filter(payout => 
      new Date(payout.requestedAt).toDateString() === today
    );
    
    return {
      count: todayPayouts.length,
      amount: todayPayouts.reduce((sum, payout) => sum + (payout.netAmount || 0), 0)
    };
  };

  const todayPayin = getTodayTransactions();
  const todayPayout = getTodayPayouts();
  const totalTransactions = dashboardStats.transactions?.summary?.total_transactions || 0;
   const availableBalance = dashboardStats.balance?.balance.available_balance || 0;
 
  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <div className="header-title-section">
            <div>
              <h1>🏠 Admin Dashboard</h1>
              <p>Welcome to your admin dashboard. Manage API keys and access all payment features.</p>
            </div>
            <button 
              onClick={fetchDashboardStats} 
              disabled={dashboardStats.loading}
              className="refresh-btn"
            >
              <FiRefreshCw className={dashboardStats.loading ? 'spinning' : ''} />
              {dashboardStats.loading ? 'Loading...' : 'Refresh Stats'}
            </button>
          </div>
          
          {/* Overview Widgets */}
          <div className="overview-widgets">
            <div className="overview-card primary">
              <div className="card-icon">
                <FiDollarSign />
              </div>
              <div className="card-content">
                <div className="metric-label">Today's Payin</div>
                <div className="metric-value">
                  {dashboardStats.loading ? '...' : formatCurrency(todayPayin.amount)}
                </div>
                <div className="metric-sub">{todayPayin.count} Transactions</div>
              </div>
            </div>
            
            <div className="overview-card secondary">
              <div className="card-icon">
                <TbArrowsTransferDown />
              </div>
              <div className="card-content">
                <div className="metric-label">Today's Payout</div>
                <div className="metric-value">
                  {dashboardStats.loading ? '...' : formatCurrency(todayPayout.amount)}
                </div>
                <div className="metric-sub">{todayPayout.count} Requests</div>
              </div>
            </div>
            
            <div className="overview-card tertiary">
              <div className="card-icon">
                <HiOutlineChartBar />
              </div>
              <div className="card-content">
                <div className="metric-label">Total Transactions</div>
                <div className="metric-value">
                  {dashboardStats.loading ? '...' : totalTransactions}
                </div>
                <div className="metric-sub">
                  {dashboardStats.transactions?.summary?.successful_transactions || 0} Successful
                </div>
              </div>
            </div>
            
            <div className="overview-card quaternary">
              <div className="card-icon">
                <RiMoneyDollarCircleLine />
              </div>
              <div className="card-content">
                <div className="metric-label">Available Balance</div>
                <div className="metric-value">
                  {dashboardStats.balance?.balance.available_balance}
                </div>
                <div className="metric-sub">Ready to withdraw</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="page-content">
          {/* API Key Management Section */}
          <div className="api-key-section">
            <h2>API Key Management</h2>
            <p>Create and manage your API keys for accessing the backend services.</p>
            
            {fetching && (
              <div className="loading-message">
                Checking for existing API key...
              </div>
            )}
            
            <div className="api-key-form">
              {!hasApiKey ? (
                <button 
                  onClick={handleCreateApiKey} 
                  disabled={loading || fetching}
                  className="create-api-key-btn"
                >
                  {loading ? 'Creating...' : 'Create New API Key'}
                </button>
              ) : (
                <div className="api-key-actions">
                  <button 
                    onClick={checkExistingApiKey} 
                    disabled={fetching}
                    className="get-api-key-btn"
                  >
                    {fetching ? 'Loading...' : 'Get API Key'}
                  </button>
                  <p className="api-key-info">
                    ✅ You have already created an API key. Use the button above to retrieve it.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}

            {apiKey && (
              <div className="api-key-display">
                <h3>Your API Key:</h3>
                <div className="api-key-container">
                  <input 
                    type="text" 
                    value={apiKey} 
                    readOnly 
                    className="api-key-input"
                  />
                  <button onClick={copyToClipboard} className="copy-btn">
                    <FiCopy />
                    Copy
                  </button>
                </div>
                <p className="api-key-warning">
                  ⚠️ Keep this API key secure and don't share it publicly.
                </p>
              </div>
            )}
          </div>

          {/* Quick Access Cards */}
          <div className="quick-access">
            <h2>Quick Access</h2>
            <p>Navigate to different sections of the payment system.</p>
            
            <div className="access-grid">
              <div className="access-card" onClick={() => navigate('/admin/transactions')}>
                <div className="access-icon"><HiOutlineChartBar /></div>
                <h3>Transactions</h3>
                <p>View and manage all payment transactions</p>
                <div className="access-badge">
                  {totalTransactions} Total
                </div>
              </div>
              
              <div className="access-card" onClick={() => navigate('/admin/payouts')}>
                <div className="access-icon"><TbArrowsTransferDown /></div>
                <h3>Payouts</h3>
                <p>Manage payout requests and history</p>
                <div className="access-badge">
                  {dashboardStats.payouts?.summary?.total_payout_requests || 0} Total
                </div>
              </div>
              
              <div className="access-card" onClick={() => navigate('/admin/payins')}>
                <div className="access-icon"><RiMoneyDollarCircleLine /></div>
                <h3>Balance</h3>
                <p>View account balance and financial overview</p>
                <div className="access-badge">
                  {formatCurrency(availableBalance)}
                </div>
              </div>
              
              <div className="access-card" onClick={() => navigate('/admin/payments')}>
                <div className="access-icon"><MdPayments /></div>
                <h3>Payments</h3>
                <p>Create and manage payment links</p>
                <div className="access-badge">
                  Create Link
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
