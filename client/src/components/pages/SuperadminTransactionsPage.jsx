import React, { useState, useEffect } from 'react';
import { 
  FiRefreshCw,
  FiFilter,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertCircle,
  FiDownload,
  FiEye,
  FiDollarSign,
  FiTrendingUp,
  FiCopy,
  FiSearch,
  FiCalendar,
  FiShield
} from 'react-icons/fi';
import { HiOutlineChartBar } from 'react-icons/hi2';
import { RiShieldCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import superadminPaymentService from '../../services/superadminPaymentService';
import Sidebar from '../Sidebar';
import ExportCSV from '../ExportCSV';
import Toast from '../ui/Toast';
import './PageLayout.css';
import './SuperadminTransactionsPage.css';

const SuperadminTransactionsPage = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    merchantId: '',
    status: '',
    settlementStatus: '',
    payoutStatus: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters.page, filters.limit, filters.sortBy, filters.sortOrder]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await superadminPaymentService.getAdminTransactions(filters);
      console.log('Transactions data:', data);
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleApplyFilters = () => {
    fetchTransactions();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 50,
      merchantId: '',
      status: '',
      settlementStatus: '',
      payoutStatus: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    fetchTransactions();
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
      case 'success':
        return <FiCheckCircle size={16} />;
      case 'failed':
        return <FiXCircle size={16} />;
      case 'pending':
      case 'created':
        return <FiClock size={16} />;
      default:
        return <FiAlertCircle size={16} />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'paid':
      case 'success':
        return 'status-paid';
      case 'failed':
        return 'status-failed';
      case 'pending':
      case 'created':
        return 'status-created';
      default:
        return 'status-default';
    }
  };

  const getSettlementBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'settled':
        return 'settlement-settled';
      case 'unsettled':
        return 'settlement-unsettled';
      default:
        return 'settlement-default';
    }
  };

  const formatForExport = () => {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions.map(txn => ({
      'Transaction ID': txn.transactionId || 'N/A',
      'Order ID': txn.orderId || 'N/A',
      'Merchant Name': txn.merchantName || 'N/A',
      'Customer Name': txn.customerName || 'N/A',
      'Customer Email': txn.customerEmail || 'N/A',
      'Amount': txn.amount ? `₹${txn.amount}` : 'N/A',
      'Status': txn.status || 'N/A',
      'Settlement Status': txn.settlementStatus || 'N/A',
      'Payment Method': txn.paymentMethod || 'N/A',
      'Created At': formatDate(txn.createdAt),
      'Paid At': formatDate(txn.paidAt),
      'Settlement Date': formatDate(txn.settlementDate)
    }));
  };

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        {/* Premium Header */}
        <div className="premium-header">
          <div className="header-content">
            <div className="header-title-group">
              <div className="header-icon-wrapper">
                <HiOutlineChartBar size={32} />
              </div>
              <div>
                <h1>Transaction Monitor</h1>
                <p>Complete overview of all platform transactions</p>
              </div>
            </div>
            <div className="header-actions-premium">
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`btn-premium filter ${showFilters ? 'active' : ''}`}
              >
                <FiFilter />
                <span>Filters</span>
              </button>
              <button 
                onClick={fetchTransactions} 
                disabled={loading} 
                className="btn-premium refresh"
              >
                <FiRefreshCw className={loading ? 'spinning' : ''} />
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
              </button>
              {transactions.length > 0 && (
                <ExportCSV 
                  data={formatForExport()} 
                  filename={`transactions_${new Date().toISOString().split('T')[0]}.csv`}
                  className="btn-premium export"
                />
              )}
            </div>
          </div>
        </div>

        {/* Premium Summary Cards */}
        {summary && (
          <div className="premium-stats-section">
            <div className="stats-grid-premium">
              <div className="stat-card-premium primary">
                <div className="stat-icon-premium">
                  <div className="icon-bg primary">
                    <HiOutlineChartBar size={28} />
                  </div>
                </div>
                <div className="stat-content-premium">
                  <div className="stat-value-premium">{summary.total_transactions || 0}</div>
                  <div className="stat-label-premium">Total Transactions</div>
                  <div className="stat-meta-premium">
                    <span className="stat-amount">{formatCurrency(summary.total_revenue)}</span>
                  </div>
                </div>
              </div>

              <div className="stat-card-premium success">
                <div className="stat-icon-premium">
                  <div className="icon-bg success">
                    <FiCheckCircle size={28} />
                  </div>
                </div>
                <div className="stat-content-premium">
                  <div className="stat-value-premium">{summary.successful_transactions || 0}</div>
                  <div className="stat-label-premium">Successful</div>
                  <div className="stat-meta-premium">
                    <span className="stat-percentage success">{summary.success_rate}% success rate</span>
                  </div>
                </div>
              </div>

              <div className="stat-card-premium warning">
                <div className="stat-icon-premium">
                  <div className="icon-bg warning">
                    <FiClock size={28} />
                  </div>
                </div>
                <div className="stat-content-premium">
                  <div className="stat-value-premium">{summary.pending_transactions || 0}</div>
                  <div className="stat-label-premium">Pending</div>
                  <div className="stat-meta-premium">
                    <span className="stat-text">Awaiting payment</span>
                  </div>
                </div>
              </div>

              <div className="stat-card-premium info">
                <div className="stat-icon-premium">
                  <div className="icon-bg info">
                    <FiTrendingUp size={28} />
                  </div>
                </div>
                <div className="stat-content-premium">
                  <div className="stat-value-premium">{formatCurrency(summary.commission_earned)}</div>
                  <div className="stat-label-premium">Commission</div>
                  <div className="stat-meta-premium">
                    <span className="stat-text">Platform revenue</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Premium Filters Panel */}
        {showFilters && (
          <div className="premium-filters-panel">
            <div className="filters-premium-header">
              <div className="filters-title">
                <FiFilter size={20} />
                <h3>Advanced Filters</h3>
              </div>
              <button onClick={() => setShowFilters(false)} className="close-btn-premium">
                <FiX size={20} />
              </button>
            </div>
            <div className="filters-premium-body">
              <div className="filters-premium-grid">
                <div className="filter-input-group">
                  <label>
                    <FiSearch size={14} />
                    Search Transactions
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Transaction ID, Order ID, Customer name..."
                    className="input-premium"
                  />
                </div>

                <div className="filter-input-group">
                  <label>
                    <RiShieldCheckLine size={14} />
                    Payment Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="input-premium"
                  >
                    <option value="">All Status</option>
                    <option value="paid">✓ Paid</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="failed">✗ Failed</option>
                    <option value="created">Created</option>
                  </select>
                </div>

                <div className="filter-input-group">
                  <label>
                    <FiDollarSign size={14} />
                    Settlement Status
                  </label>
                  <select
                    value={filters.settlementStatus}
                    onChange={(e) => handleFilterChange('settlementStatus', e.target.value)}
                    className="input-premium"
                  >
                    <option value="">All</option>
                    <option value="settled">✓ Settled</option>
                    <option value="unsettled">⏳ Unsettled</option>
                  </select>
                </div>

                <div className="filter-input-group">
                  <label>
                    <FiCalendar size={14} />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="input-premium"
                  />
                </div>

                <div className="filter-input-group">
                  <label>
                    <FiCalendar size={14} />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="input-premium"
                  />
                </div>

                <div className="filter-input-group">
                  <label>
                    <FiDollarSign size={14} />
                    Min Amount
                  </label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    placeholder="₹ 0"
                    className="input-premium"
                  />
                </div>

                <div className="filter-input-group">
                  <label>
                    <FiDollarSign size={14} />
                    Max Amount
                  </label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    placeholder="₹ 10,000"
                    className="input-premium"
                  />
                </div>

                <div className="filter-input-group">
                  <label>
                    <FiShield size={14} />
                    Merchant ID
                  </label>
                  <input
                    type="text"
                    value={filters.merchantId}
                    onChange={(e) => handleFilterChange('merchantId', e.target.value)}
                    placeholder="Enter merchant ID"
                    className="input-premium"
                  />
                </div>
              </div>

              <div className="filters-premium-actions">
                <button onClick={handleClearFilters} className="btn-premium-outline">
                  <FiX />
                  Clear All
                </button>
                <button onClick={handleApplyFilters} className="btn-premium-solid">
                  <FiFilter />
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="page-content">
          {error && (
            <div className="error-message-premium">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="loading-premium">
              <div className="loading-spinner-premium"></div>
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="premium-table-container">
              <table className="premium-table">
               <thead>
  <tr>
    <th style={{ width: '120px' }}>Transaction ID</th>
    <th style={{ width: '110px' }}>Order ID</th>
    <th style={{ width: '120px' }}>Merchant</th>
    <th style={{ width: '130px' }}>Customer</th>
    <th style={{ width: '90px' }}>Amount</th>
    <th style={{ width: '100px' }}>Status</th>
    <th style={{ width: '100px' }}>Settlement</th>
    <th style={{ width: '100px' }}>Created</th>
    <th style={{ width: '90px' }}>Actions</th>
  </tr>
</thead>

                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn._id || txn.transactionId} className="premium-table-row">
                      <td>
                        <div className="txn-id-cell">
                          <span className="txn-id-badge" title={txn.transactionId}>
                            {txn.transactionId?.slice(-12) || 'N/A'}
                          </span>
                          <button
                            className="copy-icon-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(txn.transactionId);
                              setToast({ message: '✓ Copied to clipboard!', type: 'success' });
                            }}
                            title="Copy full ID"
                          >
                            <FiCopy size={13} />
                          </button>
                        </div>
                      </td>

                      <td>
                        <div className="order-id-cell" title={txn.orderId}>
                          {txn.orderId?.slice(0, 18) || 'N/A'}...
                        </div>
                      </td>

                      <td>
                        <div className="merchant-cell-premium">
                          <div className="merchant-name-premium" title={txn.merchantName}>
                            {txn.merchantName || 'Unknown'}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="customer-cell-premium">
                          <div className="customer-name-premium" title={txn.customerName}>
                            {txn.customerName || 'Anonymous'}
                          </div>
                          <div className="customer-email-premium" title={txn.customerEmail}>
                            {txn.customerEmail || 'No email'}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="amount-cell-premium">
                          ₹{txn.amount?.toLocaleString('en-IN') || '0'}
                        </div>
                      </td>

                      <td>
                        <span className={`status-badge-premium ${getStatusBadgeClass(txn.status)}`}>
                          {getStatusIcon(txn.status)}
                          <span>{txn.status?.toUpperCase() || 'N/A'}</span>
                        </span>
                      </td>

                      <td>
                        <span className={`settlement-badge-premium ${getSettlementBadgeClass(txn.settlementStatus)}`}>
                          {txn.settlementStatus?.toUpperCase() || 'UNSETTLED'}
                        </span>
                      </td>

                      <td>
                        <div className="date-cell-premium">
                          <div className="date-main">
                            {new Date(txn.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="date-time">
                            {new Date(txn.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      </td>

                      <td>
                        <button
                          onClick={() => navigate(`/admin/transactions/${txn.transactionId}`)}
                          className="view-btn-premium"
                          title="View Details"
                        >
                          <FiEye size={15} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-premium">
              <div className="empty-icon-premium">
                <HiOutlineChartBar size={64} />
              </div>
              <h3>No Transactions Found</h3>
              <p>No transactions match your current filters.</p>
              <button onClick={handleClearFilters} className="btn-premium-solid">
                Clear Filters
              </button>
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

export default SuperadminTransactionsPage;
