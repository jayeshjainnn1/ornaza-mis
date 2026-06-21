// Ornaza MIS — Service Worker
// Offline-first: cache shell on install, serve from cache first

const CACHE = 'ornaza-mis-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

// ─── INSTALL: cache app shell ───
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: clean old caches ───
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH: cache-first for shell, network-first for API ───
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // GAS API calls — network only (POST requests)
  if (e.request.method === 'POST') return;

  // CDN assets — cache first
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // App shell — stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
