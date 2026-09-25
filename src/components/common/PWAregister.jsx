// src/components/PwaRegister.jsx
'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('✅ Service Worker registered:', reg.scope))
        .catch((err) => console.error('❌ Service Worker registration failed:', err));
    }
  }, []);

  return null;
}