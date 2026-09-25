// src/app/offline/page.jsx
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4">
      <div className="bg-surface-card border border-border-light rounded-xl p-6 text-center max-w-sm shadow-soft space-y-4">
        <h1 className="text-xl font-bold text-primary-green">📡 You are Offline</h1>
        <p className="text-sm text-text-subtle">
          Internet connectivity lost. You can still use cached features like local crop disease detection.
        </p>
        <Link 
          href="/dashboard/disease-detect" 
          className="inline-block bg-primary-green text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Go to Disease Detection
        </Link>
      </div>
    </div>
  );
}