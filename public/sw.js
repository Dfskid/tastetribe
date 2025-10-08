const CACHE_NAME = 'tastetribe-v1';
const STATIC_CACHE = 'tastetribe-static-v1';
const DYNAMIC_CACHE = 'tastetribe-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/discover',
  '/social',
  '/search',
  '/manifest.json',
];

const API_CACHE_DURATION = 5 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin === location.origin && STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.origin === location.origin) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, API_CACHE_DURATION));
  } else {
    event.respondWith(fetch(request));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName, maxAge = null) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      if (maxAge) {
        const cachedDate = new Date(cached.headers.get('date'));
        const now = new Date();
        if (now - cachedDate > maxAge) {
          return new Response('Offline', { status: 503 });
        }
      }
      return cached;
    }
    return new Response('Offline', { status: 503 });
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
