'use client';

import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-surface-card rounded-xl shadow-hover max-w-sm w-full p-6 text-center">
        <h3 className="text-lg font-bold text-text-main mb-2">
          Install Smart Crop Advisory App
        </h3>
        <p className="text-sm text-text-subtle mb-5">
          Install this app on your device for quick access to crop recommendations, disease detection, and live mandi prices.
        </p>
        <div className="flex gap-3">
          <button onClick={handleInstallClick} className="flex-1 btn-primary">
            Install App
          </button>
          <button onClick={() => setShowPrompt(false)} className="flex-1 btn-secondary">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}