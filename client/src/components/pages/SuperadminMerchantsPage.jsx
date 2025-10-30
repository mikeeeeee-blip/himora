import React, { useEffect, useMemo, useState } from 'react';
import superadminPaymentService from '../../services/superadminPaymentService';
import Sidebar from '../Sidebar';
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

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await superadminPaymentService.getAllMerchantsData({
          status: query.status === 'all' ? undefined : query.status,
          includeInactive: query.includeInactive,
        });
        if (mounted) {
          setData(res || { merchants: [], summary: null });
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [query.status, query.includeInactive]);

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>Merchants</h1>
          {data.summary && (
            <div className="summary">
              <div>Total: {data.summary.total_merchants}</div>
              <div>Active: {data.summary.active_merchants}</div>
              <div>Inactive: {data.summary.inactive_merchants}</div>
            </div>
          )}
        </div>

        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by name or email"
            value={query.search}
            onChange={(e) => setQuery((s) => ({ ...s, search: e.target.value }))}
            className="input"
          />
          <select
            value={query.status}
            onChange={(e) => setQuery((s) => ({ ...s, status: e.target.value }))}
            className="select"
          >
            <option value="active">Active</option>
            <option value="all">All</option>
          </select>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={query.includeInactive}
              onChange={(e) => setQuery((s) => ({ ...s, includeInactive: e.target.checked }))}
            />
            Include inactive
          </label>
        </div>

        {loading && <div className="loading">Loading merchants...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && (
          <div className="merchant-list">
            {/* Header Row */}
            <div className="merchant-row head">
              <div className="merchant-col col-merchant">Merchant</div>
              <div className="merchant-col">Transactions</div>
              <div className="merchant-col">Revenue</div>
              <div className="merchant-col">Payouts</div>
              <div className="merchant-col">Balance</div>
            </div>

            {filteredMerchants.map((m) => (
              <div className="merchant-row" key={m.merchant_id}>
                <div className="merchant-col col-merchant">
                  <div className="merchant-title">
                    <div className="merchant-name">{m.merchant_info?.business_name || m.merchant_info?.name}</div>
                    <div className="merchant-sub">{m.merchant_info?.email}</div>
                  </div>
                  <span className={`badge ${m.merchant_info?.status === 'active' ? 'success' : 'warning'}`}>{m.merchant_info?.status || 'active'}</span>
                </div>

                <div className="merchant-col">
                  <div className="mini">Total: {m.transaction_summary?.total_transactions || 0}</div>
                  <div className="mini">Paid: {m.transaction_summary?.by_status?.paid || 0}</div>
                  <div className="mini">Succ %: {m.transaction_summary?.success_rate || 0}%</div>
                </div>

                <div className="merchant-col">
                  <div className="mini">Total: ₹ {currency(m.revenue_summary?.total_revenue)}</div>
                  <div className="mini">Refunded: ₹ {currency(m.revenue_summary?.total_refunded)}</div>
                  <div className="mini">Net: ₹ {currency(m.revenue_summary?.settled_net_revenue)}</div>
                </div>

                <div className="merchant-col">
                  <div className="mini">Completed: ₹ {currency(m.payout_summary?.total_completed)}</div>
                  <div className="mini">Pending: ₹ {currency(m.payout_summary?.total_pending)}</div>
                  <div className="mini"># Requests: {m.payout_summary?.total_payouts || 0}</div>
                </div>

                <div className="merchant-col">
                  <div className="mini">Available: ₹ {currency(m.balance_information?.available_balance)}</div>
                  <div className="mini">Paid Out: ₹ {currency(m.balance_information?.total_paid_out)}</div>
                  <div className="mini">Pending: ₹ {currency(m.balance_information?.pending_payouts)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


