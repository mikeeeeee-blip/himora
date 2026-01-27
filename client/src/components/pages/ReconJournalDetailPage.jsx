import React, { useState, useEffect } from "react";
import { FiCheck, FiArrowLeft, FiFileText } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import reconService from "../../services/reconService";

const ReconJournalDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reconService
      .journalById(id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setEntry(res.data);
        else setError("Journal entry not found");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load entry");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const e = entry || {};
  const { date, type, orderId, txnId, entries = [], balanced } = e;
  const totalDr = (entries || []).reduce((s, x) => s + parseFloat(String(x.dr).replace(/,/g, "") || 0), 0);
  const totalCr = (entries || []).reduce((s, x) => s + parseFloat(String(x.cr).replace(/,/g, "") || 0), 0);

  return (
    <div className="min-h-screen bg-[#001D22]">
      <div className="bg-transparent pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6">
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
                      <FiFileText className="text-accent" />
                      {loading ? "Loading…" : error || !entry ? "Journal entry not found" : entry.id}
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mt-1">
                      {entry ? `${date} · ${orderId} · ${txnId} · ${(type || "").replace(/_/g, " ")}` : "Journal entry details"}
                    </p>
                  </div>
                  {entry && balanced && (
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      <FiCheck /> Balanced
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-4" />
                <p className="text-white/70 font-['Albert_Sans']">Loading journal entry…</p>
              </div>
            ) : error || !entry ? (
              <div className="text-center py-12">
                <p className="text-red-400 font-['Albert_Sans'] mb-4">{error || "Entry not found"}</p>
                <button
                  type="button"
                  onClick={() => navigate("/reconciliation-showcase")}
                  className="flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans']"
                >
                  <FiArrowLeft /> Back to Reconciliation
                </button>
              </div>
            ) : (
              <div className="bg-[#263F43] border border-white/10 rounded-xl overflow-hidden font-['Albert_Sans'] text-white">
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
                      {entries.map((x, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          <td className="px-5 py-3">{x.account}</td>
                          <td className="px-5 py-3 text-right">{x.dr}</td>
                          <td className="px-5 py-3 text-right">{x.cr}</td>
                          <td className="px-5 py-3 font-mono text-xs">{x.ref}</td>
                        </tr>
                      ))}
                      <tr className="bg-accent/10">
                        <td className="px-5 py-3 font-medium">Total</td>
                        <td className="px-5 py-3 text-right font-medium">
                          {totalDr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-right font-medium">
                          {totalCr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconJournalDetailPage;
