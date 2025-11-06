import React, { useEffect, useMemo, useState } from 'react';
import { FiTrash2, FiKey, FiX } from 'react-icons/fi';
import superadminPaymentService from '../../services/superadminPaymentService';
import '../pages/PageLayout.css';
import './SuperadminMerchantsPage.css';

function Stat({ label, value }) {
  return (
    <div className="stat-item">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

const currency = (n) => (Number(n || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function MerchantCard({ m }) {
  const info = m.merchant_info || {};
  const txn = m.transaction_summary || {};
  const rev = m.revenue_summary || {};
  const payout = m.payout_summary || {};
  const bal = m.balance_information || {};

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className="merchant-name">{info.business_name || info.name}</div>
          <div className="merchant-sub">{info.email}</div>
        </div>
        <div className={`badge ${info.status === 'active' ? 'success' : 'warning'}`}>{info.status || 'active'}</div>
      </div>

      <div className="grid grid-4">
        <div className="panel">
          <div className="panel-title">📈 Transactions</div>
          <div className="stats">
            <Stat label="Total" value={txn.total_transactions || 0} />
            <Stat label="Paid" value={txn.by_status?.paid || 0} />
            <Stat label="Failed" value={txn.by_status?.failed || 0} />
            <Stat label="Success %" value={`${txn.success_rate || 0}%`} />
            <div className="stat-item">
              <div className="stat-label">Avg Value</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(txn.average_transaction_value)}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">💰 Revenue</div>
          <div className="stats">
            <div className="stat-item">
              <div className="stat-label">Total</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(rev.total_revenue)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Refunded</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(rev.total_refunded)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Commission</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(rev.total_commission_paid)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Net (settled)</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(rev.settled_net_revenue)}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">🏦 Payouts</div>
          <div className="stats">
            <div className="stat-item">
              <div className="stat-label">Completed</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(payout.total_completed)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Pending</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(payout.total_pending)}</div>
            </div>
            <Stat label="# Requests" value={payout.total_payouts || 0} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">🧾 Balance</div>
          <div className="stats">
            <div className="stat-item">
              <div className="stat-label">Available</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(bal.available_balance)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Paid Out</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(bal.total_paid_out)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Pending Payouts</div>
              <div className="stat-value currency"><span className="rs">₹</span>{currency(bal.pending_payouts)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">🗓️ Today / This Week / This Month</div>
        <div className="grid grid-3">
          <div>
            <div className="sub">Today</div>
            <div className="mini">Txn: {m.time_based_stats?.today?.transactions || 0}</div>
            <div className="mini">Rev: ₹ {currency(m.time_based_stats?.today?.revenue)}</div>
          </div>
          <div>
            <div className="sub">Week</div>
            <div className="mini">Txn: {m.time_based_stats?.this_week?.transactions || 0}</div>
            <div className="mini">Rev: ₹ {currency(m.time_based_stats?.this_week?.revenue)}</div>
          </div>
          <div>
            <div className="sub">Month</div>
            <div className="mini">Txn: {m.time_based_stats?.this_month?.transactions || 0}</div>
            <div className="mini">Rev: ₹ {currency(m.time_based_stats?.this_month?.revenue)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperadminMerchantsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ merchants: [], summary: null });
  const [query, setQuery] = useState({ search: '', status: 'active', includeInactive: false });
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({ open: false, merchant: null });
  const [passwordModal, setPasswordModal] = useState({ open: false, merchant: null, newPassword: '', loading: false });
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const filteredMerchants = useMemo(() => {
    const q = (query.search || '').toLowerCase().trim();
    return (data.merchants || []).filter((m) => {
      if (!q) return true;
      const info = m.merchant_info || {};
      return (
        (info.business_name || '').toLowerCase().includes(q) ||
        (info.name || '').toLowerCase().includes(q) ||
        (info.email || '').toLowerCase().includes(q)
      );
    });
  }, [data.merchants, query.search]);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await superadminPaymentService.getAllMerchantsData({
        status: query.status === 'all' ? undefined : query.status,
        includeInactive: query.includeInactive,
      });
      setData(res || { merchants: [], summary: null });
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      await loadMerchants();
    }
    load();
    return () => { mounted = false; };
  }, [query.status, query.includeInactive]);

  const handleDeleteClick = (merchant) => {
    setDeleteModal({ open: true, merchant });
    setActionError('');
    setActionSuccess('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.merchant) return;
    
    const userId = deleteModal.merchant.merchant_id || deleteModal.merchant.merchant_info?._id || deleteModal.merchant.merchant_info?.id;
    if (!userId) {
      setActionError('User ID not found');
      return;
    }

    try {
      setActionError('');
      await superadminPaymentService.deleteUser(userId);
      setActionSuccess('User deleted successfully');
      setDeleteModal({ open: false, merchant: null });
      setTimeout(() => {
        setActionSuccess('');
        loadMerchants();
      }, 1500);
    } catch (e) {
      setActionError(e.message || 'Failed to delete user');
    }
  };

  const handlePasswordChangeClick = (merchant) => {
    setPasswordModal({ open: true, merchant, newPassword: '', loading: false });
    setActionError('');
    setActionSuccess('');
  };

  const handlePasswordChange = async () => {
    if (!passwordModal.merchant) return;
    
    const userId = passwordModal.merchant.merchant_id || passwordModal.merchant.merchant_info?._id || passwordModal.merchant.merchant_info?.id;
    if (!userId) {
      setActionError('User ID not found');
      return;
    }

    if (!passwordModal.newPassword || passwordModal.newPassword.length < 6) {
      setActionError('Password must be at least 6 characters long');
      return;
    }

    try {
      setActionError('');
      setPasswordModal(prev => ({ ...prev, loading: true }));
      await superadminPaymentService.changeUserPassword(userId, passwordModal.newPassword);
      setActionSuccess('Password changed successfully');
      setPasswordModal({ open: false, merchant: null, newPassword: '', loading: false });
      setTimeout(() => {
        setActionSuccess('');
      }, 1500);
    } catch (e) {
      setActionError(e.message || 'Failed to change password');
      setPasswordModal(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#001D22]">
      {/* Fixed X Graphic - Background Layer */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{ top: "4rem" }}
      >
        <img
          src="/X.png"
          alt="X graphic"
          className="object-contain hidden sm:block"
          style={{
            filter: "drop-shadow(0 0 40px rgba(94, 234, 212, 0.5))",
            width: "120%",
            height: "85%",
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
        <img
          src="/X.png"
          alt="X graphic"
          className="object-contain sm:hidden"
          style={{
            filter: "drop-shadow(0 0 20px rgba(94, 234, 212, 0.5))",
            width: "100%",
            height: "70%",
            maxWidth: "none",
            maxHeight: "none",
          }}
        />
      </div>

      {/* Scrollable Content Section - Overlays on top */}
      <section className="relative z-10 min-h-screen bg-transparent">
        {/* Spacer to show 70% of image initially */}
        <div className="h-[calc(50vh-4rem)] sm:h-[calc(55vh-4rem)]"></div>

        {/* Cards Section - Scrolls over image */}
        <div className="bg-transparent pt-2 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1400px] mx-auto">
            {/* Rounded Container with #122D32 background */}
            <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
              {/* Header */}
              <div className="mb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                  {/* Left Section - Title */}
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans']">
                      Merchants
                    </h1>
                    {data.summary && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                          Total: <span className="text-white font-medium">{data.summary.total_merchants}</span>
                        </span>
                        <span className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                          Active: <span className="text-green-400 font-medium">{data.summary.active_merchants}</span>
                        </span>
                        <span className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                          Inactive: <span className="text-yellow-400 font-medium">{data.summary.inactive_merchants}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={query.search}
                  onChange={(e) => setQuery((s) => ({ ...s, search: e.target.value }))}
                  className="flex-1 bg-[#263F43] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                />
                <select
                  value={query.status}
                  onChange={(e) => setQuery((s) => ({ ...s, status: e.target.value }))}
                  className="bg-[#263F43] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                >
                  <option value="active">Active</option>
                  <option value="all">All</option>
                </select>
                <label className="flex items-center gap-2 text-white/70 text-sm font-['Albert_Sans'] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={query.includeInactive}
                    onChange={(e) => setQuery((s) => ({ ...s, includeInactive: e.target.checked }))}
                    className="rounded border-white/20"
                  />
                  Include inactive
                </label>
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center py-20 px-5">
                  <div className="w-10 h-10 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-5"></div>
                  <p className="text-white/80 font-['Albert_Sans']">Loading merchants...</p>
                </div>
              )}
              {error && (
                <div className="text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans'] mb-4">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#001D22] border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">Merchant</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden md:table-cell">Transactions</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell">Revenue</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden lg:table-cell">Payouts</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider hidden xl:table-cell">Balance</th>
                          <th className="px-4 py-3 text-left text-white/70 text-xs sm:text-sm font-medium font-['Albert_Sans'] uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMerchants.map((m) => (
                          <tr key={m.merchant_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <div className="text-white font-medium text-sm font-['Albert_Sans']">{m.merchant_info?.business_name || m.merchant_info?.name}</div>
                                <div className="text-white/60 text-xs font-['Albert_Sans']">{m.merchant_info?.email}</div>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium font-['Albert_Sans'] ${
                                  m.merchant_info?.status === 'active' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {m.merchant_info?.status || 'active'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden md:table-cell">
                              <div>Total: {m.transaction_summary?.total_transactions || 0}</div>
                              <div>Paid: {m.transaction_summary?.by_status?.paid || 0}</div>
                              <div>Success: {m.transaction_summary?.success_rate || 0}%</div>
                            </td>
                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden lg:table-cell">
                              <div>Total: ₹ {currency(m.revenue_summary?.total_revenue)}</div>
                              <div>Refunded: ₹ {currency(m.revenue_summary?.total_refunded)}</div>
                              <div>Net: ₹ {currency(m.revenue_summary?.settled_net_revenue)}</div>
                            </td>
                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden lg:table-cell">
                              <div>Completed: ₹ {currency(m.payout_summary?.total_completed)}</div>
                              <div>Pending: ₹ {currency(m.payout_summary?.total_pending)}</div>
                              <div># Requests: {m.payout_summary?.total_payouts || 0}</div>
                            </td>
                            <td className="px-4 py-3 text-white/70 text-xs sm:text-sm font-['Albert_Sans'] hidden xl:table-cell">
                              <div>Available: ₹ {currency(m.balance_information?.available_balance)}</div>
                              <div>Paid Out: ₹ {currency(m.balance_information?.total_paid_out)}</div>
                              <div>Pending: ₹ {currency(m.balance_information?.pending_payouts)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handlePasswordChangeClick(m)}
                                  className="p-2 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-lg text-accent transition-all duration-200"
                                  title="Change Password"
                                >
                                  <FiKey className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(m)}
                                  className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-all duration-200"
                                  title="Delete User"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Success/Error Messages */}
              {actionSuccess && (
                <div className="mt-4 text-green-400 bg-green-500/20 border border-green-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="mt-4 text-red-400 bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center gap-2 font-['Albert_Sans']">
                  {actionError}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white font-['Albert_Sans']">Delete User</h3>
                <button
                  onClick={() => setDeleteModal({ open: false, merchant: null })}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <p className="text-white/80 font-['Albert_Sans'] mb-6">
                Are you sure you want to delete the user{' '}
                <span className="font-semibold text-white">
                  {deleteModal.merchant?.merchant_info?.business_name || deleteModal.merchant?.merchant_info?.name || deleteModal.merchant?.merchant_info?.email}
                </span>?
                <br />
                <span className="text-red-400 text-sm mt-2 block">This action cannot be undone.</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ open: false, merchant: null })}
                  className="flex-1 px-4 py-2.5 bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:shadow-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#122D32] border border-white/10 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white font-['Albert_Sans']">Change Password</h3>
                <button
                  onClick={() => setPasswordModal({ open: false, merchant: null, newPassword: '', loading: false })}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-white/80 font-['Albert_Sans'] mb-2">
                  User: <span className="font-semibold text-white">
                    {passwordModal.merchant?.merchant_info?.business_name || passwordModal.merchant?.merchant_info?.name || passwordModal.merchant?.merchant_info?.email}
                  </span>
                </p>
                <label className="block text-sm font-medium text-white/70 font-['Albert_Sans'] mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordModal.newPassword}
                  onChange={(e) => setPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
                  disabled={passwordModal.loading}
                />
                <p className="text-xs text-white/50 mt-1 font-['Albert_Sans']">
                  Password must be at least 6 characters long
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPasswordModal({ open: false, merchant: null, newPassword: '', loading: false })}
                  disabled={passwordModal.loading}
                  className="flex-1 px-4 py-2.5 bg-[#263F43] hover:bg-[#2a4a4f] border border-white/10 text-white rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordModal.loading || !passwordModal.newPassword || passwordModal.newPassword.length < 6}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white rounded-lg text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {passwordModal.loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


