import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiFileText, FiCheckCircle, FiLock } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import ledgerService from "../../services/ledgerService";

const LedgerJournalDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    ledgerService
      .journalById(id)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res?.data) setData(res.data);
        else setError("Journal entry not found");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.error || e?.message || "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#001D22] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 font-['Albert_Sans']">Loading journal entry…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#001D22] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Not found"}</p>
          <button
            type="button"
            onClick={() => navigate("/superadmin/ledger")}
            className="px-4 py-2 rounded-lg bg-[#263F43] border border-white/10 text-white hover:bg-accent"
          >
            Back to Ledger
          </button>
        </div>
      </div>
    );
  }

  const { postings = [], totalDr = 0, totalCr = 0, balanced, externalId, type, orderId, txnId, isPosted } = data;

  return (
    <div className="min-h-screen bg-[#001D22]">
      <div className="bg-transparent pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/superadmin/ledger")}
                  className="flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white p-2 rounded-full transition-all"
                >
                  <FiArrowLeft />
                </button>
                <div>
                  <h1 className="text-2xl font-medium text-white font-['Albert_Sans'] flex items-center gap-3">
                    <FiFileText className="text-accent" />
                    {externalId}
                  </h1>
                  <p className="text-white/70 text-sm mt-1">
                    {String(type).replace(/_/g, " ")} · {orderId || "—"} / {txnId || "—"}
                    {isPosted && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-400 text-xs">
                        <FiLock /> Immutable
                      </span>
                    )}
                  </p>
                </div>
                {balanced && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                    <FiCheckCircle /> Dr = Cr
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-white/60 font-medium">Account</th>
                    <th className="px-4 py-3 text-white/60 font-medium text-right">Dr (INR)</th>
                    <th className="px-4 py-3 text-white/60 font-medium text-right">Cr (INR)</th>
                    <th className="px-4 py-3 text-white/60 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody className="text-white/90">
                  {postings.map((p) => (
                    <tr key={p._id} className="border-b border-white/5">
                      <td className="px-4 py-2">
                        {p.accountId?.code || "—"} · {p.accountId?.name || "—"}
                      </td>
                      <td className="px-4 py-2 text-right">{p.side === "dr" ? p.amount?.toFixed(2) : "—"}</td>
                      <td className="px-4 py-2 text-right">{p.side === "cr" ? p.amount?.toFixed(2) : "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{p.ref || "—"}</td>
                    </tr>
                  ))}
                  <tr className="bg-accent/10">
                    <td className="px-4 py-3 font-medium">Total</td>
                    <td className="px-4 py-3 text-right font-medium">{Number(totalDr).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">{Number(totalCr).toFixed(2)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LedgerJournalDetailPage;
