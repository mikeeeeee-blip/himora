import React, { useState, useEffect } from 'react';
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import paymentService from '../../services/paymentService';
import Sidebar from '../Sidebar';
import './PageLayout.css';
import ExportCSV from '../ExportCSV';
import { FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('payin');
  const navigate = useNavigate();

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
      if (activeTab === 'payin') {
        // ✅ Use searchTransactions with all filters
        const data = await paymentService.searchTransactions({
          page: filters.page,
          limit: filters.limit,
          status: filters.status,
          paymentGateway: filters.payment_gateway,
          paymentMethod: filters.payment_method,
          startDate: filters.start_date,
          endDate: filters.end_date,
          search: filters.search, // Global search
          sortBy: filters.sort_by,
          sortOrder: filters.sort_order
        });
        setTransactions(data.transactions || []);
        setPagination(data.pagination || {});
      } else if (activeTab === 'payout') {
        // ✅ Use searchPayouts with all filters
        const data = await paymentService.searchPayouts({
          page: filters.page,
          limit: filters.limit,
          status: filters.status,
          startDate: filters.start_date,
          endDate: filters.end_date,
          search: filters.search, // Global search
          sortBy: filters.sort_by,
          sortOrder: filters.sort_order
        });
        setPayouts(data.payouts || []);
        setPagination(data.pagination || {});
      }
    } catch (error) {
      setError(error.message);
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
    if (activeTab === 'payin') {
      return transactions.map(txn => ({
        'Transaction ID': txn.transaction_id || txn.transactionId,
        'Order ID': txn.order_id || txn.orderId,
        'UTR': txn.utr || txn.acquirerData?.utr || 'N/A',
        'Bank Transaction ID': txn.bank_transaction_id || txn.acquirerData?.bank_transaction_id || 'N/A',
        'Amount': `₹${txn.amount}`,
        'Status': txn.status,
        'Payment Method': txn.payment_method || txn.paymentMethod || 'N/A',
        'Customer Name': txn.customer_name || txn.customer?.name,
        'Customer Email': txn.customer_email || txn.customer?.email,
        'Customer Phone': txn.customer_phone || txn.customer?.phone,
        'Description': txn.description || 'N/A',
        'Gateway': txn.payment_gateway || txn.paymentGateway,
        'Settlement Status': txn.settlement_status || txn.settlementStatus || 'unsettled',
        'Created At': txn.created_at || txn.createdAt,
        'Paid At': txn.paid_at || txn.paidAt || 'Not paid'
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
            <ExportCSV
              data={formatForExport()}
              filename={`${activeTab}_${new Date().toISOString().split('T')[0]}.csv`}
              className="primary-btn"
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
    </div>
  );
};

export default TransactionsPage;
