const CACHE_NAME = 'finance-v30';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './theme.css',
  './fx.js',
  './figure.jpg',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './fonts/tektur-cyrillic.woff2',
  './fonts/tektur-latin.woff2',
  './fonts/golos-cyrillic.woff2',
  './fonts/golos-latin.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
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

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Let Firestore/Google API traffic pass through untouched — don't cache or interfere with it
  const host = new URL(e.request.url).hostname;
  if (/(^|\.)googleapis\.com$|(^|\.)firebaseio\.com$|(^|\.)google\.com$/.test(host)) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
