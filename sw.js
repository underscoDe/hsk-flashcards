const VERSION = 'v1';
const STATIC_CACHE = `hsk-static-${VERSION}`;
const DATA_CACHE   = `hsk-data-${VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/flashcard.js',
  '/js/results.js',
  '/js/setup.js',
  '/js/state.js',
  '/js/utils.js',
  '/manifest.json',
];

// Install: pre-cache shell assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Vocabulary JSON from GitHub — cache-first, fall back to network
  if (url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(
      caches.open(DATA_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Google Fonts — network-first (skip caching to avoid CORS issues)
  if (url.hostname.includes('fonts.')) return;

  // Shell assets — cache-first
  e.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
