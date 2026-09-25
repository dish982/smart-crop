'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  History, CheckCircle2, XCircle, HelpCircle, Loader2, Calendar,
  AlertCircle, ArrowLeft, AlertTriangle, Sprout, ChevronDown, ThumbsUp, ThumbsDown,
} from 'lucide-react';

export default function DiseaseHistoryPage() {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history?type=disease');
        const data = await res.json();
        if (data.success) {
          setHistoryLogs(data.history || []);
        } else {
          setError(data.error || 'Failed to fetch scan history.');
        }
      } catch (err) {
        console.error('History fetch error:', err);
        setError('Something went wrong while loading history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleConfirm = async (historyId, confirmed) => {
    setConfirmingId(historyId);
    try {
      const res = await fetch('/api/diagnose/confirm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId, confirmed }),
      });
      const data = await res.json();
      if (data.success) {
        setHistoryLogs((prev) =>
          prev.map((item) =>
            item._id === historyId
              ? { ...item, resultData: { ...item.resultData, farmerConfirmed: confirmed } }
              : item
          )
        );
      }
    } catch (err) {
      console.error('Confirm error:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-primary-green animate-spin" />
        <p className="text-sm text-text-subtle font-medium">Loading disease diagnosis history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary-green flex items-center gap-2">
            <History className="w-5 h-5 sm:w-6 sm:h-6" /> Disease Detection History
          </h1>
          <p className="text-xs sm:text-sm text-text-subtle mt-0.5">
            Tap any scan to see its full treatment advisory again.
          </p>
        </div>
        <Link
          href="/dashboard/disease-detect"
          className="shrink-0 text-xs font-semibold text-primary-green border border-primary-green px-3 py-1.5 rounded-lg hover:bg-primary-green/10 transition-all flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-accent-cherry border border-red-200 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {!error && historyLogs.length === 0 ? (
        <div className="bg-surface-card border border-border-light rounded-xl p-12 text-center space-y-3 shadow-soft">
          <History className="w-12 h-12 text-text-subtle mx-auto opacity-40" />
          <p className="text-base font-semibold text-text-main">No Disease Scans Recorded</p>
          <p className="text-xs text-text-subtle">
            Diagnose a crop leaf image to see your detailed diagnosis logs here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {historyLogs.map((item) => {
            const confirmedStatus = item.resultData?.farmerConfirmed;
            const isLowConfidence = item.resultData?.isLowConfidence;
            const isExpanded = expandedId === item._id;
            const dateStr = formatDate(item.createdAt);
            const timeStr = new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={item._id}
                className="bg-surface-card border border-border-light rounded-xl shadow-soft hover:shadow-hover transition-shadow overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item._id)}
                  className="w-full text-left p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-text-subtle font-medium">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{dateStr} · {timeStr}</span>
                    </div>
                    <h3 title={item.title} className="text-base sm:text-lg font-bold text-primary-green truncate">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-text-main border border-border-light">
                        <Sprout className="w-3 h-3 text-primary-green" />
                        {item.inputData?.cropName || 'N/A'}
                      </span>
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-text-main border border-border-light">
                        {item.resultData?.confidence ?? '—'}% confidence
                      </span>
                      {isLowConfidence && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> Low confidence
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {confirmedStatus === true && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                      </span>
                    )}
                    {confirmedStatus === false && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] font-bold whitespace-nowrap">
                        <XCircle className="w-3.5 h-3.5 text-red-600" /> Incorrect
                      </span>
                    )}
                    {confirmedStatus === null && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-medium whitespace-nowrap">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Unconfirmed
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-text-subtle transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border-light bg-surface-muted/50 p-4 sm:p-5 space-y-3">
                    {item.resultData?.lowConfidenceWarning && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠️ {item.resultData.lowConfidenceWarning}
                      </p>
                    )}
                    {item.resultData?.icarNotes && (
                      <p className="text-xs text-text-main">{item.resultData.icarNotes}</p>
                    )}
                    {item.resultData?.treatment?.organic?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-emerald-700 mb-1">Organic Treatment</p>
                        <ul className="list-disc list-inside text-xs text-text-subtle space-y-0.5">
                          {item.resultData.treatment.organic.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )}
                    {item.resultData?.treatment?.chemical?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-amber-700 mb-1">Chemical Treatment</p>
                        <ul className="list-disc list-inside text-xs text-text-subtle space-y-0.5">
                          {item.resultData.treatment.chemical.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )}
                    {item.resultData?.treatment?.dosage && (
                      <p className="text-xs text-text-subtle">
                        <span className="font-bold text-text-main">Dosage:</span> {item.resultData.treatment.dosage}
                      </p>
                    )}
                    {item.resultData?.treatment?.prevention?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-text-main mb-1">Prevention</p>
                        <ul className="list-disc list-inside text-xs text-text-subtle space-y-0.5">
                          {item.resultData.treatment.prevention.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )}

                    {confirmedStatus === null && (
                      <div className="pt-2 border-t border-border-light/70">
                        <p className="text-xs font-semibold text-text-main mb-2">Is this diagnosis accurate?</p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleConfirm(item._id, true)}
                            disabled={confirmingId === item._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Yes, Accurate
                          </button>
                          <button
                            onClick={() => handleConfirm(item._id, false)}
                            disabled={confirmingId === item._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" /> Incorrect
                          </button>
                        </div>
                      </div>
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