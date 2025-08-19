/* sw.js - Offline/Cache control for Pac-Lúpulo (versioned) */
const CACHE_VERSION = 'v2025-08-10';
const STATIC_CACHE = 'static-' + CACHE_VERSION;

// Precache list comes from a generated manifest during build
const MANIFEST_URL = 'asset-manifest.json';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      try {
        const res = await fetch(MANIFEST_URL, {cache:'no-store'});
        const manifest = await res.json();
        const assets = (manifest && manifest.assets) ? manifest.assets : [];
        // Ensure we also cache root
        const toCache = Array.from(new Set(['/', 'index.html', ...assets]));
        await cache.addAll(toCache);
        console.log('[SW] Precached', toCache.length, 'files');
      } catch (e) {
        console.warn('[SW] Manifest fetch failed:', e);
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys.filter(k => k.startsWith('static-') && k !== STATIC_CACHE)
            .map(k => caches.delete(k))
      );
      await self.clients.claim();
    })
  );
});

const STATIC_EXTS = ['.js','.css','.png','.jpg','.jpeg','.webp','.gif','.svg','.mp3','.wav','.ogg','.ttf','.otf','.woff','.woff2','.html'];

function isStaticAsset(url) {
  try {
    const u = new URL(url);
    if (u.origin !== location.origin) return false;
    return STATIC_EXTS.some(ext => u.pathname.endsWith(ext)) || u.pathname === '/' || u.pathname === '/index.html';
  } catch(e) { return false; }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (isStaticAsset(req.url)) {
    // Cache-first with network fallback
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req, {ignoreSearch: true});
        if (cached) {
          // Stale-while-revalidate
          fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); }).catch(()=>{});
          return cached;
        }
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch (e) {
          // Offline fallback to index.html for navigation requests
          if (req.mode === 'navigate') {
            const fallback = await cache.match('/index.html');
            if (fallback) return fallback;
          }
          throw e;
        }
      })
    );
  } else {
    // Bypass cross-origin (Firebase, APIs) to avoid interfering
    return;
  }
});
