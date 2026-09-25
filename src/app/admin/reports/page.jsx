'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Download,
  ScanSearch
} from 'lucide-react';
import { formatDate } from '@/lib/formatDate';

export default function AdminReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/admin/reports');

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const result = await res.json();

        if (result.success) {
          setData(result.data);
        } else {
          console.error('Reports API error:', result.error);
        }
      } catch (error) {
        console.error('Failed to load reports:', error);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  async function handleDownload(farmerId = null) {
    const key = farmerId || 'overall';
    setDownloadingId(key);

    try {
      const url = farmerId
        ? `/api/admin/reports/download?farmerId=${farmerId}`
        : '/api/admin/reports/download';

      const res = await fetch(url);

      if (!res.ok) {
        let message = 'Download failed';

        try {
          const errorData = await res.json();
          message = errorData.error || message;
        } catch {}

        throw new Error(message);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = farmerId
        ? `farmer-report-${farmerId}.pdf`
        : 'overall-report.pdf';

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Report download error:', error);
      alert(error.message || 'Could not download the report.');
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-green" />
      </div>
    );
  }

  const overall = data?.overall || {};
  const farmerLevel = data?.farmerLevel || [];
  const diseaseBreakdown = data?.diseaseBreakdown || [];

  const totalConfirmed =
    (overall.accurate || 0) + (overall.inaccurate || 0);

  const accuracyRate =
    totalConfirmed > 0
      ? ((overall.accurate / totalConfirmed) * 100).toFixed(1)
      : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">
            Diagnosis Accuracy Report
          </h1>
          <p className="mt-1 text-sm text-text-subtle">
            Disease scan results, farmer confirmations, and uncertain predictions.
          </p>
        </div>

        <button
          onClick={() => handleDownload()}
          disabled={downloadingId === 'overall'}
          className="btn-primary flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloadingId === 'overall' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download Overall Report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total Scans"
          value={overall.totalScans || 0}
          icon={ScanSearch}
          type="green"
        />

        <StatCard
          label="Confirmed Accurate"
          value={overall.accurate || 0}
          icon={CheckCircle2}
          type="green"
        />

        <StatCard
          label="Marked Incorrect"
          value={overall.inaccurate || 0}
          icon={XCircle}
          type="red"
        />

        <StatCard
          label="Unconfirmed"
          value={overall.unconfirmed || 0}
          icon={HelpCircle}
          type="gray"
        />

        <StatCard
          label="Uncertain"
          value={overall.uncertain || 0}
          icon={AlertTriangle}
          type="cherry"
        />
      </div>

      {accuracyRate !== null && (
        <div className="card-agri">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-text-main">
                Farmer Feedback Accuracy
              </p>
              <p className="text-sm text-text-subtle">
                Based only on scans marked accurate or incorrect by farmers.
              </p>
            </div>

            <div className="text-2xl font-bold text-primary-green">
              {accuracyRate}%
            </div>
          </div>

          <p className="mt-3 text-xs text-text-subtle">
            {overall.accurate || 0} accurate out of {totalConfirmed} confirmed scans
          </p>
        </div>
      )}

      <div className="card-agri">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-text-main">
            Disease Scan Summary
          </h2>
          <p className="mt-1 text-sm text-text-subtle">
            Diseases detected from farmer diagnosis scans.
          </p>
        </div>

        {diseaseBreakdown.length === 0 ? (
          <p className="text-sm text-text-subtle">
            No disease scan data available.
          </p>
        ) : (
          <div className="space-y-2">
            {diseaseBreakdown.map((disease) => (
              <div
                key={disease.disease}
                className="flex flex-col gap-2 rounded-lg bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-text-main">
                    {disease.diseaseName || disease.disease || 'Unknown'}
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-subtle">
                    <span>{disease.count} scans</span>

                    {disease.accurate > 0 && (
                      <span className="text-primary-green">
                        {disease.accurate} accurate
                      </span>
                    )}

                    {disease.inaccurate > 0 && (
                      <span className="text-accent-cherry">
                        {disease.inaccurate} incorrect
                      </span>
                    )}

                    {disease.unconfirmed > 0 && (
                      <span>
                        {disease.unconfirmed} unconfirmed
                      </span>
                    )}

                    {disease.uncertain > 0 && (
                      <span className="font-semibold text-accent-cherry">
                        {disease.uncertain} uncertain
                      </span>
                    )}
                  </div>
                </div>

                <span className="w-fit rounded-full bg-primary-green/10 px-3 py-1 text-xs font-bold text-primary-green">
                  {disease.count} detections
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-agri">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-text-main">
            Per Farmer Breakdown
          </h2>
          <p className="mt-1 text-sm text-text-subtle">
            Diagnosis activity and farmer feedback for each farmer.
          </p>
        </div>

        {farmerLevel.length === 0 ? (
          <p className="text-sm text-text-subtle">
            No farmer diagnosis data available.
          </p>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border-light md:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                    <thead className="bg-surface-muted">
                        <tr className="text-xs uppercase tracking-wide text-text-subtle">
                        <th className="px-4 py-3.5 font-semibold">Farmer</th>
                        <th className="px-4 py-3.5 font-semibold">Scans</th>
                        <th className="px-4 py-3.5 font-semibold">Accurate</th>
                        <th className="px-4 py-3.5 font-semibold">Incorrect</th>
                        <th className="px-4 py-3.5 font-semibold">Unconfirmed</th>
                        <th className="px-4 py-3.5 font-semibold">Uncertain</th>
                        <th className="px-4 py-3.5 font-semibold">Report</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-border-light">
                        {farmerLevel.map((farmer) => (
                        <tr
                            key={farmer._id}
                            className="transition-colors hover:bg-surface-muted/60"
                        >
                            <td className="px-4 py-4 font-semibold text-text-main">
                            {farmer.farmerName}
                            </td>

                            <td className="px-4 py-4">
                            <span className="rounded-full bg-primary-green/10 px-2.5 py-1 text-xs font-semibold text-primary-green">
                                {farmer.totalScans}
                            </span>
                            </td>

                            <td className="px-4 py-4">
                            <span className="rounded-full bg-primary-green/10 px-2.5 py-1 text-xs font-semibold text-primary-green">
                                {farmer.accurate}
                            </span>
                            </td>

                            <td className="px-4 py-4">
                            <span className="rounded-full bg-accent-cherry/10 px-2.5 py-1 text-xs font-semibold text-accent-cherry">
                                {farmer.inaccurate}
                            </span>
                            </td>

                            <td className="px-4 py-4">
                            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text-subtle">
                                {farmer.unconfirmed}
                            </span>
                            </td>

                            <td className="px-4 py-4">
                            <span className="rounded-full bg-accent-cherry/10 px-2.5 py-1 text-xs font-semibold text-accent-cherry">
                                {farmer.uncertain}
                            </span>
                            </td>

                            <td className="px-4 py-4">
                            <DownloadButton
                                loading={downloadingId === farmer._id}
                                onClick={() => handleDownload(farmer._id)}
                            />
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </div>

            <div className="space-y-3 md:hidden">
              {farmerLevel.map((farmer) => (
                <div
                  key={farmer._id}
                  className="rounded-lg bg-surface-muted p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-main">
                        {farmer.farmerName}
                      </p>

                      {farmer.farmerPhone && (
                        <p className="mt-0.5 text-xs text-text-subtle">
                          {farmer.farmerPhone}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-primary-green/10 px-2.5 py-1 text-xs font-bold text-primary-green">
                      {farmer.totalScans} scans
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <MiniStat
                      label="Accurate"
                      value={farmer.accurate}
                      className="text-primary-green"
                    />

                    <MiniStat
                      label="Incorrect"
                      value={farmer.inaccurate}
                      className="text-accent-cherry"
                    />

                    <MiniStat
                      label="Unconfirmed"
                      value={farmer.unconfirmed}
                      className="text-text-subtle"
                    />

                    <MiniStat
                      label="Uncertain"
                      value={farmer.uncertain}
                      className="text-accent-cherry"
                    />
                  </div>

                  <button
                    onClick={() => handleDownload(farmer._id)}
                    disabled={downloadingId === farmer._id}
                    className="btn-secondary mt-3 flex w-full items-center justify-center gap-2 text-sm disabled:opacity-60"
                  >
                    {downloadingId === farmer._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download Farmer PDF
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card-agri">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-text-main">
            Report Interpretation
          </h2>
          <p className="mt-1 text-sm text-text-subtle">
            These categories are kept separate so uncertain model predictions
            are not treated as farmer feedback.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            title="Accurate"
            description="The farmer confirmed that the diagnosis was correct."
            icon={CheckCircle2}
            type="green"
          />

          <InfoCard
            title="Incorrect"
            description="The farmer marked the diagnosis as incorrect."
            icon={XCircle}
            type="red"
          />

          <InfoCard
            title="Unconfirmed"
            description="A diagnosis exists but the farmer has not confirmed it."
            icon={HelpCircle}
            type="gray"
          />

          <InfoCard
            title="Uncertain"
            description="The diagnosis result itself was saved as uncertain."
            icon={AlertTriangle}
            type="cherry"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, type }) {
  const styles = {
    green: 'bg-primary-green/10 text-primary-green',
    red: 'bg-accent-cherry/10 text-accent-cherry',
    gray: 'bg-surface-muted text-text-subtle',
    cherry: 'bg-accent-cherry/10 text-accent-cherry'
  };

  return (
    <div className="card-agri flex items-center gap-3 p-4">
      <div className={`rounded-lg p-2.5 ${styles[type]}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase text-text-subtle">
          {label}
        </p>
        <p className="text-xl font-bold text-text-main">
          {value}
        </p>
      </div>
    </div>
  );
}

function DownloadButton({ loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-primary-green px-3 py-1.5 text-xs font-semibold text-primary-green transition hover:bg-primary-green/10 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      PDF
    </button>
  );
}

function MiniStat({ label, value, className }) {
  return (
    <div className="rounded-md bg-surface-card px-3 py-2">
      <p className="text-text-subtle">{label}</p>
      <p className={`mt-0.5 font-bold ${className}`}>
        {value}
      </p>
    </div>
  );
}

function InfoCard({ title, description, icon: Icon, type }) {
  const styles = {
    green: 'bg-primary-green/10 text-primary-green',
    red: 'bg-accent-cherry/10 text-accent-cherry',
    gray: 'bg-surface-muted text-text-subtle',
    cherry: 'bg-accent-cherry/10 text-accent-cherry'
  };

  return (
    <div className="rounded-lg bg-surface-muted p-4">
      <div className="flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${styles[type]}`}>
          <Icon className="h-4 w-4" />
        </div>

        <p className="font-semibold text-text-main">
          {title}
        </p>
      </div>

      <p className="mt-2 text-xs leading-5 text-text-subtle">
        {description}
      </p>
    </div>
  );
}