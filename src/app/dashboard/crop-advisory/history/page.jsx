"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Loader2,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Sprout,
  ChevronDown,
  MapPin,
  Info,
} from "lucide-react";

function pretty(value = "") {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

export default function CropHistoryPage() {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history?type=crop");
        const data = await res.json();
        if (data.success) {
          setHistoryLogs(data.history || []);
        } else {
          setError(data.error || "Failed to fetch recommendation history.");
        }
      } catch (err) {
        console.error("History fetch error:", err);
        setError("Something went wrong while loading history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-primary-green animate-spin" />
        <p className="text-sm text-text-subtle font-medium">Loading crop recommendation history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary-green flex items-center gap-2">
            <History className="w-5 h-5 sm:w-6 sm:h-6" /> Crop Recommendation History
          </h1>
          <p className="text-xs sm:text-sm text-text-subtle mt-0.5">
            Tap any past recommendation to see the full breakdown again.
          </p>
        </div>
        <Link
          href="/dashboard/crop-advisory"
          className="shrink-0 text-xs font-semibold text-primary-green border border-primary-green px-3 py-1.5 rounded-lg hover:bg-primary-green/10 transition-all flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-accent-cherry/10 text-accent-cherry border border-accent-cherry/30 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {!error && historyLogs.length === 0 ? (
        <div className="card-agri p-12 text-center space-y-3">
          <History className="w-12 h-12 text-text-subtle mx-auto opacity-40" />
          <p className="text-base font-semibold text-text-main">No Recommendations Yet</p>
          <p className="text-xs text-text-subtle">
            Run a crop recommendation to see your history here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {historyLogs.map((item) => {
            const isExpanded = expandedId === item._id;
            const dateStr = new Date(item.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const recommendations = item.resultData?.recommendations || [];
            const top = recommendations[0];
            const isGeneral = Boolean(item.resultData?.is_general_recommendation);
            const location = item.resultData?.location || {};

            return (
              <div
                key={item._id}
                className="card-agri overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item._id)}
                  className="w-full text-left p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-text-subtle font-medium">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{dateStr}</span>
                    </div>
                    <h3 title={item.title} className="text-base sm:text-lg font-bold text-primary-green truncate">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-text-main border border-border-light">
                        <MapPin className="w-3 h-3 text-primary-green" />
                        {pretty(location.district)}, {pretty(location.state)}
                      </span>
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-text-main border border-border-light">
                        {pretty(location.season)}
                      </span>
                      {isGeneral && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Info className="w-3 h-3" /> General
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    {top && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-green/10 border border-primary-green/30 text-primary-green rounded-lg text-[11px] font-bold whitespace-nowrap">
                        <Sprout className="w-3.5 h-3.5" />
                        {percent(top.model_probability)}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-text-subtle transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border-light bg-surface-muted/50 p-4 sm:p-5 space-y-3">
                    {recommendations.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {recommendations.slice(0, 3).map((rec) => (
                          <div key={rec.crop} className="bg-white rounded-xl border border-border-light p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-text-main">
                                #{rec.rank} {pretty(rec.crop)}
                              </span>
                              <span className="text-xs font-bold text-primary-green">
                                {percent(rec.model_probability)}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-text-subtle">
                              {rec.historical_evidence?.records ?? rec.historical_records ?? 0} historical record(s)
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-subtle">No recommendation details recorded for this entry.</p>
                    )}

                    {item.inputData?.soil_mode === "manual" && (
                      <p className="text-xs text-text-subtle">
                        <span className="font-bold text-text-main">Soil inputs:</span>{" "}
                        N {item.inputData.N} · P {item.inputData.P} · K {item.inputData.K} · pH {item.inputData.ph}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}