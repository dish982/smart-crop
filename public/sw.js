// public/sw.js
const CACHE_NAME = 'crop-disease-cache-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/dashboard/disease-detect',
  '/model/model.json',
  '/model/group1-shard1of1.bin',
  '/model/class_indices.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Direct Bypass for backend endpoints
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline') || new Response('Offline', { status: 503 });
        }
        return new Response('Network Error', { status: 408 });
      });
    })
  );
});