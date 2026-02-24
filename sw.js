/* =============================================
   Service Worker — الموسوعة الإسلامية
   يكاش كل الصفحات ويشغّل الموقع بدون نت
   ============================================= */

const CACHE_NAME = 'islamic-encyclopedia-v3';

// كل الصفحات والملفات اللي هتتكاش
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/quran.html',
  '/adhkar.html',
  '/adaya.html',
  '/ahads.html',
  '/cbha.html',
  '/manifest.json'
];

// روابط خارجية تتكاش (الفونتات)
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700&display=swap'
];

// ─── التثبيت: كاش كل الملفات ───
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // كاش الملفات المحلية
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some files failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── التفعيل: احذف الكاش القديم ───
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── الطلبات: Cache First ثم Network ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات غير HTTP
  if (!request.url.startsWith('http')) return;

  // تجاهل طلبات POST والـ analytics
  if (request.method !== 'GET') return;
  if (url.hostname.includes('google-analytics')) return;
  if (url.hostname.includes('tiktok')) return;
  if (url.hostname.includes('wa.me')) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // رجّع من الكاش وحدّث في الخلفية
        fetchAndUpdate(request);
        return cachedResponse;
      }

      // مش موجود في الكاش، اجيبه من النت وكاشه
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // لو فشل كل حاجة وكان صفحة HTML، رجّع index
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// تحديث الكاش في الخلفية بدون ما المستخدم يحس
function fetchAndUpdate(request) {
  fetch(request).then((response) => {
    if (response && response.status === 200) {
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, response);
      });
    }
  }).catch(() => {});
}

// ─── رسايل من الصفحة ───
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  // لو الصفحة طلبت تحديث الكاش يدوياً
  if (event.data === 'updateCache') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(STATIC_ASSETS);
    });
  }
});
