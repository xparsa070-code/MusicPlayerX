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
  console.log('%c[SW] 🗿 سرویس‌ورکر فعال شد!', 'color: #00ff00; font-weight: bold;');
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

const SHELL_URL_SET = new Set(SHELL_URLS.map((u) => new URL(u, self.registration.scope).href));
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // ۱. خفت کردن تبلیغات قبل از هر پردازش دیگه! 🛑
  const reqUrl = req.url.toLowerCase();
  if (
    reqUrl.includes('appgeyser') || 
    reqUrl.includes('ads') || 
    reqUrl.includes('admob') || 
    reqUrl.includes('banner')
  ) {
    console.warn(`%c[SW] ⛔ ورود تبلیغات چرت و پرت بدرد نخور اکیداً ممنوع! -> Blocked: ${req.url}`, 'color: #ff3333; font-weight: bold;');
    
    // پاسخ خالی ۴۰۴ برای بنبست کردن تبلیغ
    return event.respondWith(
      new Response('', { status: 404, statusText: 'Ads Completely Blocked' })
    );
  }

  // ۲. منطق تمیز خودت برای مدیریت شِل و شبکه
  const isNavigation = req.mode === 'navigate';
  const isShellUrl = SHELL_URL_SET.has(req.url);
  if (!isNavigation && !isShellUrl) return; // باقی درخواست‌ها عادی میرن شبکه

  const cacheKey = isNavigation ? INDEX_URL : req.url;

  event.respondWith(
    caches.match(cacheKey).then((cached) => {
      // cache-first برای سرعت بالا، همراه با آپدیت پس‌زمینه
      const networkFetch = fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, clone));
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
