const CACHE_NAME = 'finance-v41';
// App files: all must cache, or the install fails (an incomplete offline copy is worse than the previous one)
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './theme.css?v=41',
  './fx.js?v=41',
  './figure.jpg',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './fonts/tektur-cyrillic.woff2',
  './fonts/tektur-latin.woff2',
  './fonts/golos-cyrillic.woff2',
  './fonts/golos-latin.woff2'
];
// CDN files: cached one by one — a CDN that is down must not break the install
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check-compat.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore-compat.js'
];
// A slow network (one bar, captive Wi-Fi) falls back to the cached copy after this long
const NET_TIMEOUT_MS = 3000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c =>
    c.addAll(LOCAL_ASSETS).then(() => Promise.all(CDN_ASSETS.map(u => c.add(u).catch(() => {}))))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cached copy: shortcut launches (?action=add, ?view=…) are the same page, so navigations ignore the query
function fromCache(req) {
  const nav = req.mode === 'navigate';
  return caches.match(req, nav ? { ignoreSearch: true } : undefined)
    .then(r => r || (nav ? caches.match('./index.html') : undefined));
}

// Network first with a timeout: answer from the network; if it fails, or is slower than NET_TIMEOUT_MS and a cached
// copy exists, answer from the cache. Only ok responses are cached (no 404/500 pages, no opaque responses).
function networkFirst(req) {
  return new Promise(resolve => {
    let settled = false, timer = null;
    const done = r => { if (!settled) { settled = true; clearTimeout(timer); resolve(r); } };
    const net = fetch(req).then(r => {
      if (r && r.ok) {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
      }
      return r;
    });
    timer = setTimeout(() => { fromCache(req).then(r => { if (r) done(r); }).catch(() => {}); }, NET_TIMEOUT_MS);
    net.then(done, () => fromCache(req).then(r => done(r || Response.error()), () => done(Response.error())));
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Let Firestore/Google API traffic pass through untouched — don't cache or interfere with it
  const host = new URL(e.request.url).hostname;
  if (/(^|\.)googleapis\.com$|(^|\.)firebaseio\.com$|(^|\.)google\.com$/.test(host)) return;
  // reCAPTCHA (App Check) scripts must never come from the cache
  if (e.request.url.includes('/recaptcha/')) return;
  e.respondWith(networkFirst(e.request));
});
