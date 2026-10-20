const VERSION = 'v2';
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
    // cache: 'reload' bypasses the HTTP cache so we never pre-cache stale files
    caches.open(STATIC_CACHE).then(c =>
      c.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
    )
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
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Google Fonts — network-first (skip caching to avoid CORS issues)
  if (url.hostname.includes('fonts.')) return;

  // Shell assets — network-first so updates reach users, cache as offline fallback
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
