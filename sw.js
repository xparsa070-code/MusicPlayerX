const CACHE_NAME = 'calc-shell-v1';

const SHELL_URLS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch((e) => console.warn('precache failed', e))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Exact-URL matching (not a fragile string-suffix check) so we only ever
// intern the app's own small shell files, nothing else.
const SHELL_URL_SET = new Set(SHELL_URLS.map((u) => new URL(u, self.registration.scope).href));
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isNavigation = req.mode === 'navigate';
  const isShellUrl = SHELL_URL_SET.has(req.url);
  if (!isNavigation && !isShellUrl) return; // everything else just goes to the network as normal

  const cacheKey = isNavigation ? INDEX_URL : req.url;

  event.respondWith(
    caches.match(cacheKey).then((cached) => {
      // cache-first for instant offline loads, but refresh the cache in the background
      const networkFetch = fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, clone));
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
