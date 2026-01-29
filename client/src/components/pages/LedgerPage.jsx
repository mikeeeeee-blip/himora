import React, { useState, useEffect, useCallback } from "react";
import {
  FiFileText,
  FiLayers,
  FiCheckCircle,
  FiLock,
  FiUsers,
  FiRefreshCw,
  FiEye,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import ledgerService from "../../services/ledgerService";

const LedgerPage = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, ac, j] = await Promise.all([
        ledgerService.overview(),
        ledgerService.accounts(),
        ledgerService.journal(undefined, 20),
      ]);
      if (ov?.success && ov?.data) setOverview(ov.data);
      if (ac?.success && ac?.data?.accounts) setAccounts(ac.data.accounts);
      if (j?.success && j?.data?.entries) setJournal(j.data.entries);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-[#001D22] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 font-['Albert_Sans']">Loading ledger…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#001D22]">
      <div className="bg-transparent pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white mb-2 font-['Albert_Sans'] flex items-center gap-3">
                    <FiLayers className="text-accent" />
                    Double-Entry Ledger
                  </h1>
                  <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans']">
                    Accounts, journal entries, postings. Dr = Cr enforced. Tenant-scoped. Posted entries immutable.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchAll}
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans'] transition-all disabled:opacity-50"
                  >
                    <FiRefreshCw className={loading ? "animate-spin" : ""} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/superadmin")}
                    className="flex items-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-3 sm:px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans']"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Invariants */}
            <div className="mb-6 p-4 rounded-xl bg-accent/5 border border-accent/30">
              <h3 className="text-sm font-semibold text-accent uppercase tracking-wider mb-3 font-['Albert_Sans']">
                Control-plane invariants
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <FiCheckCircle className="text-green-400 shrink-0" />
                  <span><strong>Dr = Cr</strong> enforced at write time</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <FiUsers className="text-cyan-400 shrink-0" />
                  <span><strong>Tenant-scoped</strong> (merchantId)</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <FiLock className="text-amber-400 shrink-0" />
                  <span><strong>Immutability</strong> — posted journals cannot be edited</span>
                </div>
              </div>
            </div>

            {/* Overview cards */}
            {overview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Accounts</div>
                  <div className="text-2xl font-bold text-white">{overview.accountCount ?? 0}</div>
                </div>
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Journal entries</div>
                  <div className="text-2xl font-bold text-white">{overview.journalCount ?? 0}</div>
                </div>
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Postings</div>
                  <div className="text-2xl font-bold text-white">{overview.postingCount ?? 0}</div>
                </div>
                <div className="bg-[#263F43] border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-white/60 uppercase tracking-wider mb-1">All balanced</div>
                  <div className="flex items-center gap-2">
                    {overview.allBalanced ? (
                      <span className="text-green-400 font-semibold flex items-center gap-2">
                        <FiCheckCircle /> Yes
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold">No</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Accounts */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3 font-['Albert_Sans'] flex items-center gap-2">
                <FiLayers /> Chart of accounts
              </h3>
              <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-white/60 font-medium">Code</th>
                        <th className="px-4 py-3 text-white/60 font-medium">Name</th>
                        <th className="px-4 py-3 text-white/60 font-medium">Type</th>
                        <th className="px-4 py-3 text-white/60 font-medium">Tenant</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {accounts.map((a) => (
                        <tr key={a._id} className="border-b border-white/5">
                          <td className="px-4 py-2 font-mono">{a.code}</td>
                          <td className="px-4 py-2">{a.name}</td>
                          <td className="px-4 py-2">{a.type}</td>
                          <td className="px-4 py-2 text-white/70">
                            {a.tenantId?.businessName || a.tenantId?.name || a.tenantId?._id || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Journal entries */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 font-['Albert_Sans'] flex items-center gap-2">
                <FiFileText /> Journal entries
              </h3>
              <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-white/60 font-medium">ID</th>
                        <th className="px-4 py-3 text-white/60 font-medium">Type</th>
                        <th className="px-4 py-3 text-white/60 font-medium">Order / Txn</th>
                        <th className="px-4 py-3 text-white/60 font-medium">Posted</th>
                        <th className="px-4 py-3 text-white/60 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {journal.map((j) => (
                        <tr key={j._id} className="border-b border-white/5">
                          <td className="px-4 py-2 font-mono text-xs">{j.externalId}</td>
                          <td className="px-4 py-2">{String(j.type).replace(/_/g, " ")}</td>
                          <td className="px-4 py-2">{j.orderId || "—"} / {j.txnId || "—"}</td>
                          <td className="px-4 py-2">
                            {j.isPosted ? (
                              <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                                <FiLock /> Immutable
                              </span>
                            ) : (
                              <span className="text-white/50">Draft</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/superadmin/ledger/journal/${j._id}`)}
                              className="text-accent hover:text-white flex items-center gap-1 text-xs"
                            >
                              <FiEye /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LedgerPage;
