/* ══════════════════════════════════════════════════
   Firebase Messaging Service Worker
   بيشتغل في الخلفية حتى لو المتصفح مقفول
══════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDd60k9tk6MOtyIbC6VoZbjG8Ny5AFbuo4",
  authDomain:        "eslam-b3994.firebaseapp.com",
  projectId:         "eslam-b3994",
  storageBucket:     "eslam-b3994.firebasestorage.app",
  messagingSenderId: "251677169117",
  appId:             "1:251677169117:web:b49083ae14519ebd091234"
});

const messaging = firebase.messaging();

/* إشعار في الخلفية */
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || '🕌 الموسوعة الإسلامية', {
    body: body || 'حان وقت ذكرك',
    icon: icon || '/eslame/icons/icon-192.png',
    badge: '/eslame/icons/icon-96.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'افتح الأذكار' },
      { action: 'dismiss', title: 'إغلاق' }
    ]
  });
});

/* لما يضغط على الإشعار */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const url = '/eslame/adhkar.html';
      for (const c of list) {
        if (c.url.includes('/eslame/') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
