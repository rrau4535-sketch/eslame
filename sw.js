/* =============================================
   Service Worker — الموسوعة الإسلامية
   GitHub Pages: /eslame/
   ============================================= */

const CACHE_NAME = 'islamic-encyclopedia-v4';
const BASE = '/eslame';

const STATIC_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/quran.html',
  BASE + '/adhkar.html',
  BASE + '/adaya.html',
  BASE + '/ahads.html',
  BASE + '/cbha.html',
  BASE + '/manifest.json',
  BASE + '/sw.js'
];

// ── تثبيت: كاش كل الملفات ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some files failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── تفعيل: احذف الكاش القديم ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── الطلبات: Cache First ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.startsWith('http')) return;
  if (request.method !== 'GET') return;

  // تجاهل APIs الخارجية — دي بتتكاش لوحدها لو محتاجة
  const isExternal =
    request.url.includes('fonts.googleapis.com') ||
    request.url.includes('fonts.gstatic.com') ||
    request.url.includes('api.alquran.cloud') ||
    request.url.includes('cdn.islamic.network');

  if (isExternal) {
    // Network first للـ APIs، لو فشل رجّع من الكاش
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache first للملفات المحلية
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // حدّث في الخلفية
        fetch(request).then(res => {
          if (res && res.status === 200)
            caches.open(CACHE_NAME).then(c => c.put(request, res));
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then((res) => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        }
        return res;
      }).catch(() => {
        // لو صفحة HTML — رجّع index
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
