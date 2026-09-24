'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  ScanSearch, 
  Sprout, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import LogoutButton from '@/components/auth/LogoutButton';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    async function fetchAnalytics() {
        try {
        const res = await fetch('/api/admin/analytics');
        
        // Safety check for non-JSON responses (e.g. 404/500 HTML pages)
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            throw new Error(`Expected JSON but got HTML/Text (Status: ${res.status})`);
        }

        const result = await res.json();
        if (result.success) {
            setData(result.data);
        } else {
            console.error('Analytics API Error:', result.error);
        }
        } catch (err) {
        console.error('Failed to load admin analytics:', err.message);
        } finally {
        setLoading(false);
        }
    }
    fetchAnalytics();
    }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-green" />
      </div>
    );
  }

  const { totalFarmers, totalChecks, diseaseBreakdown, recentLogs } = data || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-text-main">Admin Dashboard</h1>
        <p className="text-sm text-text-subtle mt-1">
          Monitor farmer participation, diagnostic trends, and platform usage metrics.
        </p>
      </div>

      {/* OVERVIEW STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border-light p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-subtle uppercase font-semibold">Total Farmers</p>
            <p className="text-2xl font-bold text-text-main">{totalFarmers || 0}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-light p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <ScanSearch className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-subtle uppercase font-semibold">Diseases Diagnosed</p>
            <p className="text-2xl font-bold text-text-main">{totalChecks?.disease || 0}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-light p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-primary-green rounded-lg">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-subtle uppercase font-semibold">Crop Advice Sent</p>
            <p className="text-2xl font-bold text-text-main">{totalChecks?.crop || 0}</p>
          </div>
        </div>

        <div className="bg-surface-card border border-border-light p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-text-subtle uppercase font-semibold">Market Searches</p>
            <p className="text-2xl font-bold text-text-main">{totalChecks?.market || 0}</p>
          </div>
        </div>
      </div>

      {/* TOP DISEASES TRENDS */}
      <div className="bg-surface-card border border-border-light p-6 rounded-xl shadow-sm space-y-4">
        <h2 className="font-bold text-lg text-text-main">Top Detected Crop Diseases</h2>
        {diseaseBreakdown?.length === 0 ? (
          <p className="text-sm text-text-subtle">No disease detection data recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {diseaseBreakdown?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-surface-muted rounded-lg text-sm">
                <span className="font-medium text-text-main">
                  {item._id ? item._id.replace(/___/g, ': ').replace(/_/g, ' ') : 'Unknown Condition'}
                </span>
                <span className="font-bold px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                  {item.count} detections
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT FARMER ACTIVITY LOGS */}
      <div className="bg-surface-card border border-border-light p-6 rounded-xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-text-main">Recent Farmer Activity Logs</h2>
          <span className="text-xs text-text-subtle flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Real-time stream
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-light text-text-subtle text-xs uppercase">
                <th className="py-3 px-4">Farmer</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4">Title / Query</th>
                <th className="py-3 px-4">Result Summary</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {recentLogs?.map((log) => (
                <tr key={log._id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-text-main">
                    {log.userId?.name || 'Anonymous Farmer'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 border text-text-subtle">
                      {log.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-main">{log.title}</td>
                  <td className="py-3 px-4 text-xs text-text-subtle max-w-xs truncate">
                    {typeof log.resultData === 'string'
                      ? log.resultData
                      : JSON.stringify(log.resultData)}
                  </td>
                  <td className="py-3 px-4 text-xs text-text-subtle whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}