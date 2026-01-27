import React, { useState, useEffect } from "react";
import { FiCheckCircle, FiAlertTriangle, FiArrowLeft } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import reconService from "../../services/reconService";

const ReconExceptionDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ex, setEx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reconService
      .exceptionById(id)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setEx(res.data);
        else setError("Exception not found");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load exception");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const isResolved = ex?.status === "resolved";

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
                      {ex ? (isResolved ? <FiCheckCircle className="text-green-400" /> : <FiAlertTriangle className="text-amber-400" />) : null}
                      {loading ? "Loading…" : error || !ex ? "Exception not found" : ex.id}
                    </h1>
                    <p className="text-white/70 text-xs sm:text-sm font-['Albert_Sans'] mt-1">
                      {ex?.type || "Exception details"}
                    </p>
                  </div>
                  {ex && (
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                        isResolved ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {isResolved ? <FiCheckCircle /> : <FiAlertTriangle />}
                      {ex.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-white/30 border-t-accent rounded-full animate-spin mb-4" />
                <p className="text-white/70 font-['Albert_Sans']">Loading exception…</p>
              </div>
            ) : error || !ex ? (
              <div className="text-center py-12">
                <p className="text-red-400 font-['Albert_Sans'] mb-4">{error || "Exception not found"}</p>
                <button
                  type="button"
                  onClick={() => navigate("/reconciliation-showcase")}
                  className="flex items-center justify-center gap-2 bg-[#263F43] border border-white/10 hover:border-accent text-white px-4 py-2 rounded-full text-sm font-medium font-['Albert_Sans']"
                >
                  <FiArrowLeft /> Back to Reconciliation
                </button>
              </div>
            ) : (
              <div
                className={`rounded-xl overflow-hidden border font-['Albert_Sans'] text-white ${
                  isResolved ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <div className="text-white/60 mb-1">Entity</div>
                    <div className="font-mono">{ex.entity}</div>
                  </div>
                  <div>
                    <div className="text-white/60 mb-1">Amount</div>
                    <div>{ex.amount}</div>
                  </div>
                  <div>
                    <div className="text-white/60 mb-1">Delta</div>
                    <div className="text-amber-400">{ex.delta}</div>
                  </div>
                  <div>
                    <div className="text-white/60 mb-1">{isResolved ? "Resolved at" : "Created"}</div>
                    <div className="text-xs">{ex.resolvedAt || "—"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconExceptionDetailPage;
