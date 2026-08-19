// components/PWAInstallPrompt.jsx
'use client';

import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState();
  // Testing: Set initial state to true to preview modal on laptop immediately
  const [showPrompt, setShowPrompt] = useState(null); 

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      console.log('✅ beforeinstallprompt fired!');
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Browser native install event not ready yet. Add PNG icons in public/ and test over HTTPS or localhost!");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted PWA install');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '12px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        textAlign: 'center',
        color: '#333'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#111' }}>Install Smart Crop Advisory App</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Install this app on your device for quick access to crop recommendations, disease detection, and live mandi prices.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
            onClick={handleInstallClick}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Install App
          </button>
          
          <button 
            onClick={() => setShowPrompt(false)}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}