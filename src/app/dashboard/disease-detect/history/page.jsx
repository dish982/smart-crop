'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Loader2, 
  Calendar, 
  AlertCircle,
  ArrowLeft 
} from 'lucide-react';

export default function DiseaseHistoryPage() {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch only disease detection history
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-green flex items-center gap-2">
            <History className="w-6 h-6" /> Disease Detection History
          </h1>
          <p className="text-sm text-text-subtle">
            View past leaf disease diagnoses and verified accuracy logs.
          </p>
        </div>

        <Link
          href="/dashboard/disease-detect"
          className="text-xs font-semibold text-primary-green border border-primary-green px-3 py-1.5 rounded-lg hover:bg-primary-green/10 transition-all flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Scanner
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
        <div className="grid grid-cols-1 gap-4">
          {historyLogs.map((item) => {
            const confirmedStatus = item.resultData?.farmerConfirmed;
            const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item._id}
                className="bg-surface-card border border-border-light rounded-xl p-5 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-text-subtle font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dateStr}</span>
                  </div>

                  <h3 className="text-lg font-bold text-primary-green">
                    {item.title}
                  </h3>

                  <p className="text-xs text-text-subtle">
                    Confidence: <span className="font-semibold text-text-main">{item.resultData?.confidence}%</span> | Crop: <span className="font-semibold text-text-main">{item.inputData?.cropName || 'N/A'}</span>
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {confirmedStatus === true && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Verified Accurate
                    </span>
                  )}
                  {confirmedStatus === false && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Marked Incorrect
                    </span>
                  )}
                  {confirmedStatus === null && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      Unconfirmed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}