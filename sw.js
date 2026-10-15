/* ================= Service Worker ================= */
const CACHE_NAME = 'sadaf-building-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* نصب: ذخیره‌ی فایل‌ها در حافظه */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 فایل‌ها ذخیره شدند');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch((err) => console.log('⚠️ خطا در ذخیره‌سازی:', err))
  );
  self.skipWaiting();
});

/* فعال‌سازی: پاک کردن کش‌های قدیمی */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('🗑️ کش قدیمی حذف شد:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/* واکشی: اول از کش، بعد از شبکه */
self.addEventListener('fetch', (event) => {
  // فقط درخواست‌های GET رو کش کن
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // از کش برگردون، همزمان شبکه رو هم چک کن (برای آپدیت)
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        // اگه در کش نبود، از شبکه بگیر
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          // اگه آفلاین بود و درخواست HTML بود، صفحه اصلی رو نشون بده
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});