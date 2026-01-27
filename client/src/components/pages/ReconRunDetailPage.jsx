import React, { useState, useEffect } from "react";
import {
  FiCheck,
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import reconService from "../../services/reconService";

const ReconRunDetailPage = () => {
  const navigate = useNavigate();
  const { runId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reconService
      .runById(runId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setRun(res.data);
        else setError("Run not found");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load run");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [runId]);

  const {
    id,
    runDate,
    ledgerRange,
    bankFile,
    status,
    matchedItems = [],
    exception,
    resolutionPath = [],
    summary = {},
  } = run || {};

  return (
    <div className="min-h-screen bg-[#001D22]">
      <div className="bg-transparent pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
            {/* Page header - matches other superadmin pages */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/reconciliation-showcase")}
                    className="flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white p-2 rounded-full font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <FiArrowLeft />
                  </button>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-medium text-white font-['Albert_Sans'] flex items-center gap-3">
                      <FiCheckCircle className="text-accent" />
                      {loading ? "Loading…" : error || !run ? "Run not found" : id}
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mt-1">
                      Reconciliation run details
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-4" />
                <p className="text-white/70 font-['Albert_Sans']">Loading run details…</p>
              </div>
            ) : error || !run ? (
              <div className="text-center py-12">
                <p className="text-red-400 font-['Albert_Sans'] mb-4">{error || "Run not found"}</p>
                <button
                  type="button"
                  onClick={() => navigate("/reconciliation-showcase")}
                  className="flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans']"
                >
                  <FiArrowLeft /> Back to Reconciliation
                </button>
              </div>
            ) : (
              <div className="space-y-6 font-['Albert_Sans'] text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-white/60 mb-1">Run Date</div>
            <div className="text-sm font-medium text-white">{runDate}</div>
          </div>
          <div>
            <div className="text-xs text-white/60 mb-1">Ledger Range</div>
            <div className="text-sm font-medium text-white">{ledgerRange}</div>
          </div>
          <div>
            <div className="text-xs text-white/60 mb-1">Bank File</div>
            <div className="text-sm font-medium text-white font-mono">{bankFile}</div>
          </div>
          <div>
            <div className="text-xs text-white/60 mb-1">Status</div>
            <div className="text-sm font-medium text-green-400">{status}</div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 bg-bg-tertiary/50 flex items-center gap-2">
            <FiCheckCircle className="text-green-400" />
            <h3 className="font-semibold text-white">Matched Items ({matchedItems.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-white/60 font-medium">Ledger ID</th>
                  <th className="px-4 py-3 text-white/60 font-medium">Order ID</th>
                  <th className="px-4 py-3 text-white/60 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 text-white/60 font-medium">Gateway Ref</th>
                  <th className="px-4 py-3 text-white/60 font-medium">Bank Ref</th>
                  <th className="px-4 py-3 text-white/60 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-white/90">
                {matchedItems.map((item, idx) => (
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

        {exception && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FiAlertTriangle className="text-amber-400" /> Exception
              </h3>
              <span className="text-xs font-mono text-amber-400">{exception.id}</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-white/60 mb-1">Entity</div>
                <div className="text-white">{exception.entity}</div>
              </div>
              <div>
                <div className="text-white/60 mb-1">Amount discrepancy</div>
                <div className="text-white">{exception.amountDiscrepancy}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-white/60 mb-1">Type</div>
                <div className="text-white">
                  <code className="bg-black/20 px-2 py-1 rounded">{exception.type}</code>
                  {exception.description && ` — ${exception.description}`}
                </div>
              </div>
            </div>
          </div>
        )}

        {resolutionPath.length > 0 && (
          <div className="bg-bg-secondary border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-bg-tertiary/50">
              <h3 className="font-semibold text-white">Resolution path</h3>
            </div>
            <div className="p-5 space-y-3">
              {resolutionPath.map(({ step, action, desc }) => (
                <div key={step} className="flex gap-3 items-start p-3 bg-bg-tertiary/50 rounded-lg border border-white/5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-xs font-semibold">
                    {step}
                  </span>
                  <div>
                    <span className="font-medium text-white text-sm">{action}</span>
                    <p className="text-xs text-white/70 mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary && (summary.matched != null || summary.exceptions != null) && (
          <div className="p-4 bg-[#263F43]/50 rounded-xl border border-white/10 font-mono text-sm">
            <div className="text-white/60 mb-2">Summary</div>
            <div className="space-y-1 text-white/90">
              {summary.matched != null && (
                <div>Matched: <span className="text-green-400">{summary.matched}</span></div>
              )}
              {summary.exceptions != null && (
                <div>Exceptions: <span className="text-amber-400">{summary.exceptions}</span></div>
              )}
              {summary.resolution && <div>Resolution: {summary.resolution}</div>}
            </div>
          </div>
        )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconRunDetailPage;
