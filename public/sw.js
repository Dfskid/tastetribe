const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `tastetribe-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `tastetribe-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `tastetribe-images-${CACHE_VERSION}`;
const API_CACHE = `tastetribe-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/discover',
  '/social',
  '/search',
  '/movies',
  '/manifest.json',
  '/offline.html'
];

const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const IMAGE_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = {
  images: 50,
  api: 100,
  dynamic: 50
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => console.error('[SW] Install failed:', error))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('tastetribe-') &&
                     !cacheName.includes(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
      .catch((error) => console.error('[SW] Activation failed:', error))
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Strategy selection based on request type
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImage(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, IMAGE_CACHE_DURATION));
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE, API_CACHE_DURATION));
  } else if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(fetch(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-ratings') {
    event.waitUntil(syncRatings());
  } else if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icon-check.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TasteTribe', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message event for cache management
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  } else if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(cacheUrls(event.data.urls));
  }
});

// Helper functions
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname === asset);
}

function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('supabase.co');
}

// Caching strategies
async function cacheFirst(request, cacheName, maxAge = null) {
  try {
    const cached = await caches.match(request);

    if (cached) {
      // Check cache age if maxAge is specified
      if (maxAge) {
        const cachedDate = new Date(cached.headers.get('date') || 0);
        const now = new Date();
        if (now - cachedDate > maxAge) {
          // Cache expired, fetch new
          return fetchAndCache(request, cacheName);
        }
      }
      return cached;
    }

    return await fetchAndCache(request, cacheName);
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return await caches.match('/offline.html') ||
           new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName, maxAge = null) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      trimCache(cacheName, MAX_CACHE_SIZE.api);
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    const cached = await caches.match(request);

    if (cached) {
      if (maxAge) {
        const cachedDate = new Date(cached.headers.get('date') || 0);
        const now = new Date();
        if (now - cachedDate > maxAge) {
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      return cached;
    }

    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, response.clone()));
      trimCache(cacheName, MAX_CACHE_SIZE.dynamic);
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());

    if (cacheName === IMAGE_CACHE) {
      trimCache(cacheName, MAX_CACHE_SIZE.images);
    }
  }

  return response;
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`[SW] Trimmed ${keysToDelete.length} items from ${cacheName}`);
  }
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('tastetribe-'))
      .map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls);
  console.log(`[SW] Cached ${urls.length} URLs`);
}

async function syncRatings() {
  try {
    const db = await openDB();
    const pendingRatings = await db.getAll('pendingRatings');

    for (const rating of pendingRatings) {
      try {
        await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rating)
        });
        await db.delete('pendingRatings', rating.id);
      } catch (error) {
        console.error('[SW] Failed to sync rating:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync ratings failed:', error);
  }
}

async function syncPosts() {
  try {
    const db = await openDB();
    const pendingPosts = await db.getAll('pendingPosts');

    for (const post of pendingPosts) {
      try {
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post)
        });
        await db.delete('pendingPosts', post.id);
      } catch (error) {
        console.error('[SW] Failed to sync post:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync posts failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TasteTribeDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingRatings')) {
        db.createObjectStore('pendingRatings', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingPosts')) {
        db.createObjectStore('pendingPosts', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

console.log('[SW] Service worker loaded');
