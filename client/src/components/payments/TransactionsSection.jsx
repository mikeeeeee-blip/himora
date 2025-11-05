import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiRefreshCw, FiDownload } from 'react-icons/fi';
import paymentService from '../../services/paymentService';
import Sidebar from '../Sidebar';
import ExportCSV from '../ExportCSV';
import './PageLayout.css';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    payment_method: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await paymentService.getTransactions();
      setTransactions(data.transactions || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        ...filters
      };
      const data = await paymentService.getTransactions(params);
      setTransactions(data.transactions || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Format data for CSV export
  const formatForExport = () => {
    return transactions.map(txn => ({
      'Transaction ID': txn.transaction_id,
      'Order ID': txn.order_id,
      'UTR': txn.utr || 'N/A',
      'Bank Transaction ID': txn.bank_transaction_id || 'N/A',
      'Amount': `₹${txn.amount}`,
      'Status': txn.status,
      'Payment Method': txn.payment_method || 'N/A',
      'Customer Name': txn.customer_name,
      'Customer Email': txn.customer_email,
      'Customer Phone': txn.customer_phone,
      'Description': txn.description || 'N/A',
      'Gateway': txn.payment_gateway,
      'Settlement Status': txn.settlement_status || 'unsettled',
      'Created At': txn.created_at,
      'Paid At': txn.paid_at || 'Not paid'
    }));
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
            <h1>Transactions</h1>
            <p>View and manage all payment transactions</p>
          </div>
          <div className="header-actions">
            <button onClick={fetchTransactions} disabled={loading} className="refresh-btn">
              <FiRefreshCw className={loading ? 'spinning' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            {/* ✅ Export Button */}
            <ExportCSV 
              data={formatForExport()} 
              filename={`transactions_${new Date().toISOString().split('T')[0]}.csv`}
              className="primary-btn"
            />
          </div>
        </div>

        <div className="page-content">
          {/* Search Bar */}
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by Transaction ID, UTR, Order ID, Description, Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button onClick={handleSearch} className="search-btn">
              Search
            </button>
          </div>

          {/* Filters */}
          <div className="filter-bar">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filters.payment_method}
              onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
              className="filter-select"
            >
              <option value="">All Methods</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="netbanking">Net Banking</option>
              <option value="wallet">Wallet</option>
            </select>

            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="filter-date"
            />

            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="filter-date"
            />

            <button onClick={handleSearch} className="filter-apply-btn">
              <FiFilter /> Apply Filters
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Transactions Table */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="bg-[#122D32] border border-white/10 rounded-xl overflow-auto shadow-lg">
              <table className="w-full border-collapse">
                <thead className="bg-green-600/30 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                      Transaction ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                      UTR
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                      Payment Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                      Settlement
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#263F43]">
                  {transactions.map((txn, index) => (
                    <tr key={index} className="hover:bg-green-600/10 transition-colors duration-150">
                      <td className="px-4 py-3 text-sm text-white border-b border-white/10 font-['Albert_Sans']">
                        <div className="font-semibold">{txn.transaction_id}</div>
                        <div className="text-xs text-white/60">{txn.order_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white border-b border-white/10 font-mono font-['Albert_Sans']">
                        {txn.utr || txn.bank_transaction_id || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-semibold border-b border-white/10 font-['Albert_Sans']">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-white border-b border-white/10 font-['Albert_Sans']">
                        <div className="font-medium">{txn.customer_name}</div>
                        <div className="text-xs text-white/60">{txn.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm border-b border-white/10">
                        <span className="px-2.5 py-1 bg-accent/20 text-accent rounded-full text-xs font-semibold font-['Albert_Sans']">
                          {txn.payment_method || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm border-b border-white/10">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-['Albert_Sans'] ${
                          txn.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          txn.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          txn.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm border-b border-white/10">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-['Albert_Sans'] ${
                          txn.settlement_status === 'settled' ? 'bg-green-500/20 text-green-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {txn.settlement_status || 'unsettled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/90 border-b border-white/10 font-['Albert_Sans']">
                        <div>{new Date(txn.created_at).toLocaleDateString('en-IN')}</div>
                        <div className="text-xs text-white/60">
                          {new Date(txn.created_at).toLocaleTimeString('en-IN')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No Transactions Found</h3>
              <p>No transactions match your search criteria.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TransactionsPage;
