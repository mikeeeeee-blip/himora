import React, { useState, useEffect, useCallback } from "react";
import {
  FiCheck,
  FiAlertTriangle,
  FiLayers,
  FiRefreshCw,
  FiDownload,
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiEye,
  FiFileText,
  FiCheckCircle,
  FiActivity,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import reconService from "../../services/reconService";

const defaultMetrics = {
  totalReconciled: { value: "—", change: "—", trend: "up" },
  exceptions: { value: "—", change: "—", trend: "down" },
  matchRate: { value: "—", change: "—", trend: "up" },
  totalAmount: { value: "—", change: "—", trend: "up" },
};

const ReconShowcasePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateRange, setDateRange] = useState("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const [metrics, setMetrics] = useState(defaultMetrics);
  const [recentRecons, setRecentRecons] = useState([]);
  const [exceptionQueue, setExceptionQueue] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [runDetail, setRunDetail] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const fetchOverview = useCallback(async () => {
    try {
      setError(null);
      const res = await reconService.overview();
      if (res.success && res.data) {
        setMetrics(res.data.metrics || defaultMetrics);
        setRecentRecons(res.data.recentRecons || []);
        setExceptionQueue(res.data.exceptionQueue || []);
      }
    } catch (e) {
      setError(e.message || "Failed to load overview");
    }
  }, []);

  const fetchJournal = useCallback(async () => {
    try {
      const res = await reconService.journal();
      if (res.success && res.data?.entries) setJournalEntries(res.data.entries);
    } catch (_) {}
  }, []);

  const fetchLatestRun = useCallback(async () => {
    try {
      const res = await reconService.runById("RECON_20260127_001");
      if (res.success && res.data) setRunDetail(res.data);
    } catch (_) {}
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await reconService.logs(120);
      if (res.success && res.data?.logs) setLogs(res.data.logs);
    } catch (_) {}
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOverview().finally(() => setLoading(false));
  }, [fetchOverview]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      setLastRefresh(new Date());
      fetchOverview();
    }, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchOverview]);

  useEffect(() => {
    if (activeTab === "journal") fetchJournal();
  }, [activeTab, fetchJournal]);

  useEffect(() => {
    if (activeTab === "recon") fetchLatestRun();
  }, [activeTab, fetchLatestRun]);

  useEffect(() => {
    if (activeTab === "logs") fetchLogs();
  }, [activeTab, fetchLogs]);

  const onRefresh = async () => {
    setLoading(true);
    setLastRefresh(new Date());
    try {
      await fetchOverview();
      if (activeTab === "journal") await fetchJournal();
      else if (activeTab === "recon") await fetchLatestRun();
      else if (activeTab === "logs") await fetchLogs();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#001D22]">
      <div className="bg-transparent pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-4" />
                <p className="text-white/70 font-['Albert_Sans']">Loading reconciliation dashboard…</p>
              </div>
            ) : (
              <>
            {/* Page header - matches Transaction Monitor / Payouts */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans'] flex items-center gap-3">
                    <FiLayers className="text-accent" />
                    Reconciliation Dashboard
                  </h1>
                  <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                    Real-time transaction matching &amp; exception management
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 text-xs text-white/60 font-['Albert_Sans']">
                    <FiClock className="text-sm" />
                    <span>Last updated: {formatTime(lastRefresh)}</span>
                    {autoRefresh && (
                      <span className="flex items-center gap-1 text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Auto-refresh
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiRefreshCw className={loading ? "animate-spin" : ""} />
                    {loading ? "Loading…" : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

      <div className="font-['Albert_Sans'] text-white">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(metrics).map(([key, metric]) => (
            <div
              key={key}
              className="bg-[#263F43] border border-white/10 rounded-xl p-4 hover:border-accent/50 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60 uppercase tracking-wider">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                {metric.trend === "up" ? (
                  <FiTrendingUp className="text-green-400 text-sm" />
                ) : (
                  <FiTrendingDown className="text-red-400 text-sm" />
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
              <div className={`text-xs ${metric.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                {metric.change} from last period
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="bg-[#263F43] border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transactions, orders, references..."
                  className="w-full pl-9 pr-4 py-2 bg-bg-tertiary border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-bg-tertiary border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-white/10 rounded-lg text-sm text-white hover:bg-accent transition-colors">
              <FiFilter /> Filters
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors">
              <FiDownload /> Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10">
          {[
            { id: "overview", label: "Overview", icon: FiLayers },
            { id: "journal", label: "Journal Entries", icon: FiFileText },
            { id: "recon", label: "Reconciliation Runs", icon: FiCheckCircle },
            { id: "exceptions", label: "Exception Queue", icon: FiAlertTriangle },
            { id: "logs", label: "Server Logs", icon: FiActivity },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all border-b-2 ${
                activeTab === id
                  ? "bg-bg-secondary border-accent text-white"
                  : "border-transparent text-white/60 hover:text-white hover:bg-bg-tertiary/50"
              }`}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
                {error}
              </div>
            )}
            {/* Recent Reconciliations */}
            <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 bg-bg-tertiary/50 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <FiClock /> Recent Reconciliation Runs
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("recon")}
                  className="text-xs text-accent hover:text-white transition-colors"
                >
                  View all →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-5 py-3 text-white/60 font-medium">Run ID</th>
                      <th className="px-5 py-3 text-white/60 font-medium">Date &amp; Time</th>
                      <th className="px-5 py-3 text-white/60 font-medium text-right">Matched</th>
                      <th className="px-5 py-3 text-white/60 font-medium text-right">Exceptions</th>
                      <th className="px-5 py-3 text-white/60 font-medium text-right">Amount</th>
                      <th className="px-5 py-3 text-white/60 font-medium">Status</th>
                      <th className="px-5 py-3 text-white/60 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/90">
                    {recentRecons.map((recon) => (
                      <tr key={recon.id} className="border-b border-white/5 hover:bg-bg-tertiary/30 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs">{recon.id}</td>
                        <td className="px-5 py-3">{recon.date}</td>
                        <td className="px-5 py-3 text-right">{recon.matched.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          {recon.exceptions > 0 ? (
                            <span className="text-amber-400">{recon.exceptions}</span>
                          ) : (
                            <span className="text-green-400">0</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-medium">{recon.amount}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                            <FiCheckCircle /> {recon.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/reconciliation-showcase/runs/${recon.id}`)}
                            className="text-accent hover:text-white transition-colors"
                          >
                            <FiEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Exception Queue Preview */}
            <div className="bg-bg-secondary border border-amber-500/30 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 bg-amber-500/10 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <FiAlertTriangle className="text-amber-400" /> Active Exceptions
                </h3>
                <span className="text-xs text-amber-400 font-medium">{exceptionQueue.filter((e) => e.status !== "resolved").length} pending</span>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {exceptionQueue
                    .filter((e) => e.status !== "resolved")
                    .map((exception) => (
                      <div
                        key={exception.id}
                        className="flex items-center justify-between p-3 bg-bg-tertiary/50 rounded-lg border border-white/5"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-white/60">{exception.id}</span>
                              <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                                {exception.type}
                              </span>
                            </div>
                            <div className="text-sm text-white/80">
                              {exception.entity} · {exception.amount}
                              {exception.delta !== "0" && (
                                <span className="text-amber-400 ml-2">Δ {exception.delta}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              exception.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {exception.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/reconciliation-showcase/exceptions/${exception.id}`)}
                            className="p-1.5 text-accent hover:text-white transition-colors"
                          >
                            <FiEye />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Journal Entries Tab */}
        {activeTab === "journal" && (
          <div className="space-y-6">
            {journalEntries.map((entry) => (
              <div key={entry.id} className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 bg-bg-tertiary/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white capitalize">{entry.type.replace(/_/g, " ")}</h3>
                    <p className="text-sm text-white/60 mt-1">
                      {entry.date} · {entry.orderId} · {entry.txnId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.balanced && (
                      <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                        <FiCheck /> Balanced
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/reconciliation-showcase/journal/${entry.id}`)}
                      className="p-2 text-accent hover:text-white transition-colors rounded-lg hover:bg-accent/20"
                      title="View details"
                    >
                      <FiEye />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-5 py-3 text-white/60 font-medium">Account</th>
                        <th className="px-5 py-3 text-white/60 font-medium text-right">Dr (INR)</th>
                        <th className="px-5 py-3 text-white/60 font-medium text-right">Cr (INR)</th>
                        <th className="px-5 py-3 text-white/60 font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {entry.entries.map((e, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="px-5 py-3">{e.account}</td>
                          <td className="px-5 py-3 text-right">{e.dr}</td>
                          <td className="px-5 py-3 text-right">{e.cr}</td>
                          <td className="px-5 py-3 font-mono text-xs">{e.ref}</td>
                        </tr>
                      ))}
                      <tr className="bg-accent/10">
                        <td className="px-5 py-3 font-medium">Total</td>
                        <td className="px-5 py-3 text-right font-medium">
                          {entry.entries.reduce((sum, e) => sum + parseFloat(e.dr.replace(/,/g, "") || 0), 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right font-medium">
                          {entry.entries.reduce((sum, e) => sum + parseFloat(e.cr.replace(/,/g, "") || 0), 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reconciliation Runs Tab */}
        {activeTab === "recon" && (
          <div className="space-y-6">
            {!runDetail ? (
              <div className="bg-bg-secondary border border-white/10 rounded-xl p-12 text-center">
                <div className="w-10 h-10 border-2 border-white/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/70">Loading latest run…</p>
              </div>
            ) : (
              <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 bg-bg-tertiary/50 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <FiCheckCircle className="text-green-400" /> Latest Reconciliation Run
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 font-mono">{runDetail.id}</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/reconciliation-showcase/runs/${runDetail.id}`)}
                      className="text-xs text-accent hover:text-white font-medium"
                    >
                      View full run →
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <div className="text-xs text-white/60 mb-1">Run Date</div>
                      <div className="text-sm font-medium text-white">{runDetail.runDate}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/60 mb-1">Ledger Range</div>
                      <div className="text-sm font-medium text-white">{runDetail.ledgerRange}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/60 mb-1">Bank File</div>
                      <div className="text-sm font-medium text-white font-mono">{runDetail.bankFile}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/60 mb-1">Status</div>
                      <div className="text-sm font-medium text-green-400">{runDetail.status}</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <FiCheck className="text-green-400" /> Matched Items ({(runDetail.matchedItems || []).length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="px-4 py-2 text-white/60 font-medium">Ledger ID</th>
                            <th className="px-4 py-2 text-white/60 font-medium">Order ID</th>
                            <th className="px-4 py-2 text-white/60 font-medium text-right">Amount</th>
                            <th className="px-4 py-2 text-white/60 font-medium">Gateway Ref</th>
                            <th className="px-4 py-2 text-white/60 font-medium">Bank Ref</th>
                            <th className="px-4 py-2 text-white/60 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-white/90">
                          {(runDetail.matchedItems || []).map((item, idx) => (
                            <tr key={idx} className="border-b border-white/5">
                              <td className="px-4 py-2 font-mono">{item.ledgerId}</td>
                              <td className="px-4 py-2">{item.orderId}</td>
                              <td className="px-4 py-2 text-right">{item.amount}</td>
                              <td className="px-4 py-2 font-mono text-xs">{item.gatewayRef}</td>
                              <td className="px-4 py-2 font-mono text-xs">{item.bankRef}</td>
                              <td className="px-4 py-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                                  <FiCheck /> {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {runDetail.exception && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-white flex items-center gap-2">
                          <FiAlertTriangle className="text-amber-400" /> Exception Detected
                        </h4>
                        <span className="text-xs font-mono text-amber-400">{runDetail.exception.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-white/60 mb-1">Entity</div>
                          <div className="text-white">{runDetail.exception.entity}</div>
                        </div>
                        <div>
                          <div className="text-white/60 mb-1">Amount Discrepancy</div>
                          <div className="text-white">{runDetail.exception.amountDiscrepancy}</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-white/60 mb-1">Type</div>
                          <div className="text-white">
                            <code className="bg-black/20 px-2 py-1 rounded">{runDetail.exception.type}</code>
                            {runDetail.exception.description && ` — ${runDetail.exception.description}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(runDetail.resolutionPath || []).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3">Resolution Path</h4>
                      <div className="space-y-3">
                        {runDetail.resolutionPath.map(({ step, action, desc }) => (
                          <div key={step} className="flex gap-3 items-start p-3 bg-bg-tertiary/50 rounded-lg border border-white/5">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-xs font-semibold">
                              {step}
                            </span>
                            <div className="flex-1">
                              <span className="font-medium text-white text-sm">{action}</span>
                              <p className="text-xs text-white/70 mt-1">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {runDetail.summary && (
                    <div className="mt-6 p-4 bg-bg-tertiary/50 rounded-lg border border-white/5 font-mono text-xs">
                      <div className="text-white/60 mb-2">RECONCILIATION SUMMARY</div>
                      <div className="space-y-1 text-white/90">
                        {runDetail.summary.matched != null && (
                          <div>Matched: <span className="text-green-400">{runDetail.summary.matched}</span></div>
                        )}
                        {runDetail.summary.exceptions != null && (
                          <div>Exceptions: <span className="text-amber-400">{runDetail.summary.exceptions}{runDetail.summary.exceptionType ? ` (${runDetail.summary.exceptionType})` : ""}</span></div>
                        )}
                        {runDetail.summary.resolution && <div>Resolution: {runDetail.summary.resolution}</div>}
                        <div className="text-white/60">Unmatched bank: {runDetail.summary.unmatchedBank ?? 0} · Unmatched ledger: {runDetail.summary.unmatchedLedger ?? 0} (after adjustment)</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exception Queue Tab */}
        {activeTab === "exceptions" && (
          <div className="space-y-6">
            {exceptionQueue.map((exception) => (
              <div
                key={exception.id}
                className={`bg-bg-secondary border rounded-xl overflow-hidden ${
                  exception.status === "resolved" ? "border-green-500/30" : "border-amber-500/30"
                }`}
              >
                <div
                  className={`px-5 py-4 border-b border-white/10 flex items-center justify-between ${
                    exception.status === "resolved" ? "bg-green-500/10" : "bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {exception.status === "resolved" ? (
                      <FiCheckCircle className="text-green-400" />
                    ) : (
                      <FiAlertTriangle className="text-amber-400" />
                    )}
                    <div>
                      <h3 className="font-semibold text-white">{exception.id}</h3>
                      <p className="text-xs text-white/60 mt-0.5">{exception.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        exception.status === "resolved"
                          ? "bg-green-500/20 text-green-400"
                          : exception.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {exception.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/reconciliation-showcase/exceptions/${exception.id}`)}
                      className="p-1.5 text-accent hover:text-white transition-colors"
                    >
                      <FiEye />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-white/60 mb-1">Entity</div>
                      <div className="text-white font-mono">{exception.entity}</div>
                    </div>
                    <div>
                      <div className="text-white/60 mb-1">Amount</div>
                      <div className="text-white">{exception.amount}</div>
                    </div>
                    <div>
                      <div className="text-white/60 mb-1">Delta</div>
                      <div className="text-amber-400">{exception.delta}</div>
                    </div>
                    <div>
                      <div className="text-white/60 mb-1">
                        {exception.status === "resolved" ? "Resolved At" : "Created At"}
                      </div>
                      <div className="text-white text-xs">
                        {exception.resolvedAt || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Server Logs Tab */}
        {activeTab === "logs" && (
          <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-bg-tertiary/50 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FiActivity /> Server logs
              </h3>
              <button
                type="button"
                onClick={fetchLogs}
                disabled={logsLoading}
                className="text-xs text-accent hover:text-white font-medium disabled:opacity-50"
              >
                {logsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto font-mono text-xs">
              {logsLoading && logs.length === 0 ? (
                <div className="flex items-center gap-2 text-white/60 py-8">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-accent rounded-full animate-spin" />
                  Loading…
                </div>
              ) : logs.length === 0 ? (
                <p className="text-white/50 py-8">No logs yet. Use the dashboard (Overview, Runs, Journal, etc.) to generate activity.</p>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-wrap gap-x-2 gap-y-0.5 py-1.5 px-2 rounded ${
                        entry.level === "error" ? "bg-red-500/10 text-red-300" : entry.level === "warn" ? "bg-amber-500/10 text-amber-300" : "text-white/80"
                      }`}
                    >
                      <span className="text-white/50 shrink-0">{entry.time}</span>
                      <span className="shrink-0 font-semibold">{entry.level}</span>
                      <span>{entry.message}</span>
                      {entry.runId && <span className="text-accent">{entry.runId}</span>}
                      {entry.id && <span className="text-amber-400">{entry.id}</span>}
                      {entry.type && <span className="text-cyan-400">{entry.type}</span>}
                      {entry.entity && <span className="text-white/70">({entry.entity})</span>}
                      {entry.count != null && <span className="text-green-400/90">count={entry.count}</span>}
                      {entry.matchRate && <span className="text-green-400/90">{entry.matchRate}</span>}
                      {entry.entryCount != null && <span className="text-green-400/90">entries={entry.entryCount}</span>}
                      {entry.unresolved != null && <span className="text-amber-400/90">unresolved={entry.unresolved}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconShowcasePage;
