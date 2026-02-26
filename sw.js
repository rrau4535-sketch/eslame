/* =============================================
   Service Worker — الموسوعة الإسلامية
   GitHub Pages: /eslame/
   ============================================= */

const CACHE_NAME = 'islamic-encyclopedia-v6';
const BASE = '/eslame';

/* ── الملفات المحلية ── */
const STATIC_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/quran.html',
  BASE + '/adhkar.html',
  BASE + '/adaya.html',
  BASE + '/ahads.html',
  BASE + '/cbha.html',
  BASE + '/qibla.html',
  BASE + '/manifest.json',
  BASE + '/sw.js'
];

/* ── الفونتات الخارجية ── */
const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:ital,wght@0,400;0,700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700&display=swap'
];

/* ══ INSTALL ══ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      /* كاش الملفات المحلية */
      try { await cache.addAll(STATIC_ASSETS); } 
      catch(e) { console.warn('[SW] local cache partial:', e); }
      /* كاش الفونتات */
      for (const url of FONT_ASSETS) {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (res.ok) await cache.put(url, res);
        } catch(e) {}
      }
    }).then(() => self.skipWaiting())
  );
});

/* ══ ACTIVATE ══ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ══ FETCH ══ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.startsWith('http')) return;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* تجاهل analytics وسوشيال ميديا */
  if (['google-analytics.com','tiktok.com','wa.me','facebook.com'].some(d => url.hostname.includes(d))) return;

  /* API القرآن — Network first (محتاج نت دايماً للآيات) */
  if (url.hostname === 'api.alquran.cloud' || url.hostname === 'cdn.islamic.network') {
    event.respondWith(
      fetch(request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  /* فونتات Google — Cache first */
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          }
          return res;
        }).catch(() => {});
      })
    );
    return;
  }

  /* باقي الملفات المحلية — Cache first + background update */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        /* حدّث في الخلفية */
        fetch(request).then(res => {
          if (res && res.status === 200)
            caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then(res => {
        if (res && res.status === 200)
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        return res;
      }).catch(() => {
        /* offline fallback للصفحات */
        if (request.headers.get('accept')?.includes('text/html'))
          return caches.match(BASE + '/index.html');
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
