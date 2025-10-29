import React, { useState, useEffect } from 'react';
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import paymentService from '../../services/paymentService';
import Sidebar from '../Sidebar';
import './PageLayout.css';
import '../pages/PayoutManagement.css';
import ExportCSV from '../ExportCSV';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('payin');
  const [downloading, setDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showPayoutDownloadModal, setShowPayoutDownloadModal] = useState(false);
  const navigate = useNavigate();

  // Download filter states for transactions (separate from view filters)
  const [downloadFilters, setDownloadFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    paymentMethod: '',
    paymentGateway: '',
    minAmount: '',
    maxAmount: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    settlementStatus: '',
    limit: ''
  });

  // Download filter states for payouts
  const [payoutDownloadFilters, setPayoutDownloadFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    transferMode: '',
    minAmount: '',
    maxAmount: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: ''
  });

  // Filter states
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    payment_gateway: '',
    payment_method: '',
    start_date: '',
    end_date: '',
    search: '',
    sort_by: 'createdAt',
    sort_order: 'desc'
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters.page, activeTab]);

  // ✅ UPDATED: Use search APIs instead of regular getTransactions/getPayouts
const fetchTransactions = async () => {
  setLoading(true);
  setError('');

  try {
    if (activeTab === 'payin' || activeTab === 'settlement') {
      // For settlement tab, force status=paid and settlementStatus=settled
      const extra = activeTab === 'settlement'
        ? { settlementStatus: 'settled', status: 'paid' }
        : {};

      const data = await paymentService.searchTransactions({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,               // user-controlled for payin, will be overridden for settlement by ...extra
        paymentGateway: filters.payment_gateway,
        paymentMethod: filters.payment_method,
        startDate: filters.start_date,
        endDate: filters.end_date,
        search: filters.search,
        sortBy: filters.sort_by,
        sortOrder: filters.sort_order,
        ...extra
      });

      setTransactions(data.transactions || []);
      setPagination(data.pagination || {});
    } else if (activeTab === 'payout') {
      const data = await paymentService.searchPayouts({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        startDate: filters.start_date,
        endDate: filters.end_date,
        search: filters.search,
        sortBy: filters.sort_by,
        sortOrder: filters.sort_order
      });
      setPayouts(data.payouts || []);
      setPagination(data.pagination || {});
    }
  } catch (error) {
    setError(error.message || 'Failed to fetch data');
  } finally {
    setLoading(false);
  }
};


  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters(prev => ({
      ...prev,
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // Open download modal
  const handleOpenDownloadModal = () => {
    // Pre-fill with current view filters
    setDownloadFilters({
      startDate: filters.start_date || '',
      endDate: filters.end_date || '',
      status: filters.status || '',
      paymentMethod: filters.payment_method || '',
      paymentGateway: filters.payment_gateway || '',
      minAmount: '',
      maxAmount: '',
      search: filters.search || '',
      sortBy: filters.sort_by || 'createdAt',
      sortOrder: filters.sort_order || 'desc',
      settlementStatus: activeTab === 'settlement' ? 'settled' : '',
      limit: ''
    });
    setShowDownloadModal(true);
  };

  // Download transaction report (Excel) for payin and settlement tabs
  const handleDownloadTransactionReport = async () => {
    setDownloading(true);
    setError('');
    setShowDownloadModal(false);

    try {
      // Map download filters to API format
      const reportFilters = {
        startDate: downloadFilters.startDate || undefined,
        endDate: downloadFilters.endDate || undefined,
        status: downloadFilters.status || undefined,
        paymentMethod: downloadFilters.paymentMethod || undefined,
        paymentGateway: downloadFilters.paymentGateway || undefined,
        minAmount: downloadFilters.minAmount || undefined,
        maxAmount: downloadFilters.maxAmount || undefined,
        q: downloadFilters.search || undefined, // Global text search
        sortBy: downloadFilters.sortBy ? `${downloadFilters.sortBy}:${downloadFilters.sortOrder}` : undefined,
        limit: downloadFilters.limit || undefined
      };

      // For settlement tab, ensure settlement status is set
      if (activeTab === 'settlement') {
        reportFilters.status = 'paid';
        reportFilters.settlementStatus = 'settled';
      } else if (downloadFilters.settlementStatus) {
        reportFilters.settlementStatus = downloadFilters.settlementStatus;
      }

      // Remove undefined values
      Object.keys(reportFilters).forEach(key => 
        reportFilters[key] === undefined && delete reportFilters[key]
      );

      await paymentService.downloadTransactionReport(reportFilters);
      // Success - file download should trigger automatically
    } catch (error) {
      setError(error.message || 'Failed to download report');
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadFilterChange = (key, value) => {
    setDownloadFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Open payout download modal
  const handleOpenPayoutDownloadModal = () => {
    // Pre-fill with current view filters
    setPayoutDownloadFilters({
      startDate: filters.start_date || '',
      endDate: filters.end_date || '',
      status: filters.status || '',
      transferMode: '',
      minAmount: '',
      maxAmount: '',
      search: filters.search || '',
      sortBy: filters.sort_by || 'createdAt',
      sortOrder: filters.sort_order || 'desc',
      limit: ''
    });
    setShowPayoutDownloadModal(true);
  };

  // Download payout report (Excel) for payout tab
  const handleDownloadPayoutReport = async () => {
    setDownloading(true);
    setError('');
    setShowPayoutDownloadModal(false);

    try {
      // Map payout download filters to API format
      const reportFilters = {
        startDate: payoutDownloadFilters.startDate || undefined,
        endDate: payoutDownloadFilters.endDate || undefined,
        status: payoutDownloadFilters.status || undefined,
        transferMode: payoutDownloadFilters.transferMode || undefined,
        minAmount: payoutDownloadFilters.minAmount || undefined,
        maxAmount: payoutDownloadFilters.maxAmount || undefined,
        q: payoutDownloadFilters.search || undefined, // Global text search
        sortBy: payoutDownloadFilters.sortBy ? `${payoutDownloadFilters.sortBy}:${payoutDownloadFilters.sortOrder}` : undefined,
        limit: payoutDownloadFilters.limit || undefined
      };

      // Remove undefined values
      Object.keys(reportFilters).forEach(key => 
        reportFilters[key] === undefined && delete reportFilters[key]
      );

      await paymentService.downloadPayoutReport(reportFilters);
      // Success - file download should trigger automatically
    } catch (error) {
      setError(error.message || 'Failed to download payout report');
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePayoutDownloadFilterChange = (key, value) => {
    setPayoutDownloadFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'success':
      case 'completed':
        return 'status-success';
      case 'pending':
      case 'requested':
      case 'processing':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      case 'cancelled':
        return 'status-cancelled';
      case 'refunded':
        return 'status-refunded';
      case 'partial_refund':
        return 'status-partial-refund';
      case 'created':
        return 'status-created';
      case 'expired':
        return 'status-expired';
      default:
        return 'status-pending';
    }
  };

  const formatForExport = () => {
    if (activeTab === 'payin' || activeTab === 'settlement') {
      return transactions.map(txn => ({
        'Transaction ID': txn.transactionId || txn.transaction_id || '-',
        'Order ID': txn.orderId || txn.order_id || '-',
        'UTR': txn.acquirerData?.utr || txn.utr || 'N/A',
        'Bank Transaction ID': txn.acquirerData?.bank_transaction_id || 'N/A',
        'Amount': `₹${txn.amount}`,
        'Commission': `₹${txn.commission ?? 0}`,
        'Net Amount': `₹${txn.netAmount ?? txn.net_amount ?? 0}`,
        'Status': txn.status,
        'Payment Method': txn.paymentMethod || txn.payment_method || 'N/A',
        'Customer Name': txn.customerName || txn.customer_name || (txn.customer && txn.customer.name) || '-',
        'Customer Email': txn.customerEmail || txn.customer_email || (txn.customer && txn.customer.email) || '-',
        'Customer Phone': txn.customerPhone || txn.customer_phone || (txn.customer && txn.customer.phone) || '-',
        'Description': txn.description || 'N/A',
        'Gateway': txn.paymentGateway || txn.payment_gateway || '-',
        'Settlement Status': txn.settlementStatus || txn.settlement_status || '-',
        'Paid At': txn.paidAt || txn.paid_at || '-',
        'Settled At': txn.settlementDate || txn.settlement_date || txn.updatedAt || txn.updated_at || '-'
      }));
    } else {
      return payouts.map(payout => ({
        'Payout ID': payout.payoutId,
        'Amount': `₹${payout.amount}`,
        'Net Amount': `₹${payout.netAmount}`,
        'Commission': `₹${payout.commission}`,
        'Status': payout.status,
        'Transfer Mode': payout.transferMode,
        'Description': payout.description || 'N/A',
        'Requested At': payout.requestedAt,
        'Completed At': payout.completedAt || 'Not completed',
        'UTR': payout.utr || 'N/A'
      }));
    }
  };


  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>Transactions</h1>
          <p>View and manage all payment transactions</p>

          <div className="header-actions">
            <button onClick={fetchTransactions} disabled={loading} className="refresh-btn">
              <FiRefreshCw className={loading ? 'spinning' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            {(activeTab === 'payin' || activeTab === 'settlement') ? (
              <button
                onClick={handleOpenDownloadModal}
                disabled={downloading || loading}
                className="primary-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FiDownload />
                {downloading ? 'Downloading...' : 'Download Excel Report'}
              </button>
            ) : activeTab === 'payout' ? (
              <button
                onClick={handleOpenPayoutDownloadModal}
                disabled={downloading || loading}
                className="primary-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FiDownload />
                {downloading ? 'Downloading...' : 'Download Excel Report'}
              </button>
            ) : null}
            <ExportCSV
              data={formatForExport()}
              filename={`${activeTab}_${new Date().toISOString().split('T')[0]}.csv`}
              className="secondary-btn"
              style={{ marginLeft: '8px' }}
            />
          </div>
        </div>

        <div className="page-content">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'payin' ? 'active' : ''}`}
              onClick={() => handleTabChange('payin')}
            >
              Payin
            </button>
            <button
              className={`tab ${activeTab === 'payout' ? 'active' : ''}`}
              onClick={() => handleTabChange('payout')}
            >
              Payout
            </button>

            <button
              className={`tab ${activeTab === 'settlement' ? 'active' : ''}`}
              onClick={() => handleTabChange('settlement')}
            >
              Settlements
            </button>


          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            <input
              className="filter-input"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={`Search ${activeTab === 'payin' ? 'transactions' : 'payouts'}...`}
            />
            <input
              className="filter-date"
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              placeholder="Start Date"
            />
            <input
              className="filter-date"
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              placeholder="End Date"
            />
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {activeTab === 'payin' ? (
                <>
                  <option value="created">Created</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </>
              ) : (
                <>
                  <option value="requested">Requested</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </>
              )}
            </select>
            {activeTab === 'payin' && (
              <select
                className="filter-select"
                value={filters.payment_method}
                onChange={(e) => handleFilterChange('payment_method', e.target.value)}
              >
                <option value="">All Methods</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Net Banking</option>
                <option value="wallet">Wallet</option>
              </select>
            )}
            <select
              className="filter-select"
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            >
              <option value="createdAt">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
            <select
              className="filter-select"
              value={filters.sort_order}
              onChange={(e) => handleFilterChange('sort_order', e.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <button
              className="secondary-btn"
              onClick={fetchTransactions}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading {activeTab === 'payin' ? 'transactions' : 'payouts'}...</p>
            </div>
          ) : (
            <div className="transactions-container">
              {/* PAYIN TAB */}
              {activeTab === 'payin' && transactions.length > 0 ? (
                <div className="table-card">
                  <table className="tx-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Order ID</th>
                        <th>Description</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Commission</th>
                        <th>Net Amount</th>
                        <th>Status</th>
                        <th>Payment Method</th>
                        <th>Gateway</th>
                        <th>Created At</th>
                        <th>Paid At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction, index) => (
                        <tr
                          key={transaction.transaction_id || transaction.transactionId || index}
                          className="clickable-row"
                          onClick={() => navigate(`/admin/transactions/${transaction.transaction_id || transaction.transactionId}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="transaction-id">{transaction.transaction_id || transaction.transactionId || '-'}</td>
                          <td className="order-id">{transaction.order_id || transaction.orderId || '-'}</td>
                          <td className="order-id">{transaction.description || transaction.description || '-'}</td>
                          <td className="customer-info">
                            <div className="customer-name">{transaction.customer_name || transaction.customer?.name || '-'}</div>
                            <div className="customer-email">{transaction.customer_email || transaction.customer?.email || '-'}</div>
                          </td>
                          <td className="amount">{formatAmount(transaction.amount)}</td>
                           <td className="amount">{formatAmount(transaction.commission)}</td>
                            <td className="amount">{formatAmount(transaction.netAmount)}</td>
                          <td>
                            <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
                              {transaction.status || 'Pending'}
                            </span>
                          </td>
                          <td className="payment-method">{transaction.payment_method || transaction.paymentMethod || '-'}</td>
                          <td className="gateway">{transaction.payment_gateway || transaction.paymentGateway || '-'}</td>
                          <td className="date">{formatDate(transaction.created_at || transaction.createdAt)}</td>
                          <td className="date">{formatDate(transaction.paid_at || transaction.paidAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === 'payin' && transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><HiOutlineClipboardDocumentList /></div>
                  <h3>No Transactions Found</h3>
                  <p>No transactions match your current filters.</p>
                </div>
              ) : null}

              {/* PAYOUT TAB */}
              {activeTab === 'payout' && payouts.length > 0 ? (
                <div className="table-card">
                  <table className="tx-table">
                    <thead>
                      <tr>
                        <th>Payout ID</th>
                        <th>Amount</th>
                        <th>Net Amount</th>
                        <th>Commission</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Transfer Mode</th>
                        <th>Requested At</th>
                        <th>Completed At</th>
                        <th>UTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((payout, index) => (
                        <tr key={payout.payoutId || index}>
                          <td className="transaction-id">{payout.payoutId || '-'}</td>
                          <td className="amount">{formatAmount(payout.amount)}</td>
                          <td className="amount" style={{ color: '#10b981', fontWeight: 600 }}>
                            {formatAmount(payout.netAmount)}
                          </td>
                          <td className="amount">{formatAmount(payout.commission)}</td>
                          <td className="description">{payout.description || '-'}</td>
                          <td>
                            <span className={`transaction-status ${getStatusClass(payout.status)}`}>
                              {payout.status || 'Pending'}
                            </span>
                          </td>
                          <td>{payout.transferMode === 'bank_transfer' ? 'Bank Transfer' : 'UPI'}</td>
                          <td className="date">{formatDate(payout.requestedAt)}</td>
                          <td className="date">{formatDate(payout.completedAt)}</td>
                          <td>{payout.utr || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === 'payout' && payouts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><HiOutlineClipboardDocumentList /></div>
                  <h3>No Payouts Found</h3>
                  <p>No payout requests match your current filters.</p>
                </div>
              ) : null}

               {activeTab === 'settlement' && transactions.length > 0 ? (
                <div className="table-card">
                  <table className="tx-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Order ID</th>
                        <th>Amount</th>
                        <th>Commission</th>
                        <th>Net Amount</th>
                        <th>Status</th>
                        <th>Payment Method</th>
                        <th>Gateway</th>
                        <th>Paid At</th>
                        <th>Settled At</th>
                        <th>UTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn, index) => {
                        const settledAt = txn.settlementDate || txn.settlement_date || txn.updatedAt || txn.updated_at || txn.paidAt || txn.paid_at;
                        return (
                          <tr
                            key={txn.transactionId || txn.transaction_id || index}
                            className="clickable-row"
                            onClick={() => navigate(`/admin/transactions/${txn.transactionId || txn.transaction_id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="transaction-id">{txn.transactionId || txn.transaction_id || '-'}</td>
                            <td className="order-id">{txn.orderId || txn.order_id || '-'}</td>
                            <td className="amount">{formatAmount(txn.amount)}</td>
                            <td className="amount">{formatAmount(txn.commission)}</td>
                            <td className="amount" style={{ color: '#10b981', fontWeight: 600 }}>{formatAmount(txn.netAmount)}</td>
                            <td>
                              <span className={`transaction-status ${getStatusClass(txn.status)}`}>
                                {txn.status || '-'}
                              </span>
                            </td>
                            <td className="payment-method">{txn.paymentMethod || txn.payment_method || '-'}</td>
                            <td className="gateway">{txn.paymentGateway || txn.payment_gateway || '-'}</td>
                            <td className="date">{formatDate(txn.paidAt || txn.paid_at)}</td>
                            <td className="date">{formatDate(settledAt)}</td>
                            <td>{txn.acquirerData?.utr || txn.utr || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === 'settlement' && transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><HiOutlineClipboardDocumentList /></div>
                  <h3>No Settled Transactions</h3>
                  <p>No settled transactions match your current filters.</p>
                </div>
              ) : null}


              {/* Pagination */}
              {pagination && Object.keys(pagination).length > 0 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} {activeTab === 'payin' ? 'transactions' : 'payouts'}
                  </div>
                  <div className="pagination-controls">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage || loading}
                      className="pagination-btn"
                    >
                      Previous
                    </button>
                    <span className="pagination-page">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage || loading}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Download Report Modal */}
      {showDownloadModal && (
        <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>
                <FiDownload style={{ marginRight: '8px' }} />
                Download Transaction Report
              </h3>
              <button onClick={() => setShowDownloadModal(false)} className="modal-close-btn">
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Date Range */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>
                    Date Range (Optional)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Start Date</label>
                      <input
                        type="date"
                        value={downloadFilters.startDate}
                        onChange={(e) => handleDownloadFilterChange('startDate', e.target.value)}
                        className="filter-date"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>End Date</label>
                      <input
                        type="date"
                        value={downloadFilters.endDate}
                        onChange={(e) => handleDownloadFilterChange('endDate', e.target.value)}
                        className="filter-date"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        min={downloadFilters.startDate || undefined}
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Status</label>
                  <select
                    value={downloadFilters.status}
                    onChange={(e) => handleDownloadFilterChange('status', e.target.value)}
                    className="filter-select"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">All Status</option>
                    <option value="created">Created</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Payment Method & Gateway */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Payment Method</label>
                    <select
                      value={downloadFilters.paymentMethod}
                      onChange={(e) => handleDownloadFilterChange('paymentMethod', e.target.value)}
                      className="filter-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">All Methods</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="netbanking">Net Banking</option>
                      <option value="wallet">Wallet</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Payment Gateway</label>
                    <select
                      value={downloadFilters.paymentGateway}
                      onChange={(e) => handleDownloadFilterChange('paymentGateway', e.target.value)}
                      className="filter-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">All Gateways</option>
                      <option value="cashfree">Cashfree</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="phonepe">PhonePe</option>
                    </select>
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Amount Range</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Min Amount (₹)</label>
                      <input
                        type="number"
                        value={downloadFilters.minAmount}
                        onChange={(e) => handleDownloadFilterChange('minAmount', e.target.value)}
                        placeholder="e.g., 100"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Max Amount (₹)</label>
                      <input
                        type="number"
                        value={downloadFilters.maxAmount}
                        onChange={(e) => handleDownloadFilterChange('maxAmount', e.target.value)}
                        placeholder="e.g., 10000"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Settlement Status (only for payin tab) */}
                {activeTab !== 'settlement' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Settlement Status</label>
                    <select
                      value={downloadFilters.settlementStatus}
                      onChange={(e) => handleDownloadFilterChange('settlementStatus', e.target.value)}
                      className="filter-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">All Settlement Status</option>
                      <option value="settled">Settled</option>
                      <option value="unsettled">Unsettled</option>
                    </select>
                  </div>
                )}

                {/* Search Query */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Search</label>
                  <input
                    type="text"
                    value={downloadFilters.search}
                    onChange={(e) => handleDownloadFilterChange('search', e.target.value)}
                    placeholder="Search by transaction ID, order ID, customer name, email, phone, UTR..."
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                {/* Sort Options */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Sort By</label>
                    <select
                      value={downloadFilters.sortBy}
                      onChange={(e) => handleDownloadFilterChange('sortBy', e.target.value)}
                      className="filter-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                      <option value="createdAt">Created Date</option>
                      <option value="amount">Amount</option>
                      <option value="paidAt">Paid Date</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Sort Order</label>
                    <select
                      value={downloadFilters.sortOrder}
                      onChange={(e) => handleDownloadFilterChange('sortOrder', e.target.value)}
                      className="filter-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>

                {/* Limit (optional) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Limit (Optional)</label>
                  <input
                    type="number"
                    value={downloadFilters.limit}
                    onChange={(e) => handleDownloadFilterChange('limit', e.target.value)}
                    placeholder="Max number of records (leave empty for all)"
                    min="1"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Leave empty to download all matching records</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDownloadModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDownloadTransactionReport}
                disabled={downloading}
                className="btn btn-primary"
              >
                {downloading ? 'Downloading...' : 'Download Excel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Download Report Modal */}
      {showPayoutDownloadModal && (
        <div className="modal-overlay" onClick={() => setShowPayoutDownloadModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>
                <FiDownload style={{ marginRight: '8px' }} />
                Download Payout Report
              </h3>
              <button onClick={() => setShowPayoutDownloadModal(false)} className="modal-close-btn">
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Date Range */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>
                    Date Range (Optional)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Start Date</label>
                      <input
                        type="date"
                        value={payoutDownloadFilters.startDate}
                        onChange={(e) => handlePayoutDownloadFilterChange('startDate', e.target.value)}
                        className="filter-date"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>End Date</label>
                      <input
                        type="date"
                        value={payoutDownloadFilters.endDate}
                        onChange={(e) => handlePayoutDownloadFilterChange('endDate', e.target.value)}
                        className="filter-date"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        min={payoutDownloadFilters.startDate || undefined}
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Status</label>
                  <select
                    value={payoutDownloadFilters.status}
                    onChange={(e) => handlePayoutDownloadFilterChange('status', e.target.value)}
                    className="filter-select"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">All Status</option>
                    <option value="requested">Requested</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Transfer Mode */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Transfer Mode</label>
                  <select
                    value={payoutDownloadFilters.transferMode}
                    onChange={(e) => handlePayoutDownloadFilterChange('transferMode', e.target.value)}
                    className="filter-select"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">All Transfer Modes</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>

                {/* Amount Range */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Net Amount Range</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Min Amount (₹)</label>
                      <input
                        type="number"
                        value={payoutDownloadFilters.minAmount}
                        onChange={(e) => handlePayoutDownloadFilterChange('minAmount', e.target.value)}
                        placeholder="e.g., 100"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>Max Amount (₹)</label>
                      <input
                        type="number"
                        value={payoutDownloadFilters.maxAmount}
                        onChange={(e) => handlePayoutDownloadFilterChange('maxAmount', e.target.value)}
                        placeholder="e.g., 10000"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Search Query */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Search</label>
                  <input
                    type="text"
                    value={payoutDownloadFilters.search}
                    onChange={(e) => handlePayoutDownloadFilterChange('search', e.target.value)}
                    placeholder="Search by payout ID, merchant name, description, UTR, beneficiary name..."
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                {/* Sort Options */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Sort By</label>
                    <select
                      value={payoutDownloadFilters.sortBy}
                      onChange={(e) => handlePayoutDownloadFilterChange('sortBy', e.target.value)}
                      className="filter-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                      <option value="createdAt">Created Date</option>
                      <option value="amount">Amount (Gross)</option>
                      <option value="netAmount">Net Amount</option>
                      <option value="requestedAt">Requested Date</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Sort Order</label>
                    <select
                      value={payoutDownloadFilters.sortOrder}
                      onChange={(e) => handlePayoutDownloadFilterChange('sortOrder', e.target.value)}
                      className="filter-select"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>

                {/* Limit (optional) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1f2937' }}>Limit (Optional)</label>
                  <input
                    type="number"
                    value={payoutDownloadFilters.limit}
                    onChange={(e) => handlePayoutDownloadFilterChange('limit', e.target.value)}
                    placeholder="Max number of records (leave empty for all)"
                    min="1"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Leave empty to download all matching records</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPayoutDownloadModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDownloadPayoutReport}
                disabled={downloading}
                className="btn btn-primary"
              >
                {downloading ? 'Downloading...' : 'Download Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
