/* sw.js - Offline/Cache control for Pac-Lúpulo (robust, versioned) */
const CACHE_VERSION = 'v2025-08-21-a';
const STATIC_CACHE = 'static-' + CACHE_VERSION;

const SAME_ORIGIN = self.location.origin;
const MANIFEST_URL = 'asset-manifest.json';

/** Helper: fetch JSON manifest safely */
async function loadManifest() {
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest fetch failed: ' + res.status);
    return await res.json();
  } catch (e) {
    console.warn('[SW] manifest not available:', e);
    return null;
  }
}

/** Precache core shell + assets from manifest */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const core = ['/', '/index.html', '/pacman.js', '/pacman-original.js', '/mobile-controls.js', '/custom-renderer.js', '/performance-optimizations.js', '/achievements.js'];
    const toCache = new Set(core);
    const manifest = await loadManifest();
    if (manifest && Array.isArray(manifest.assets)) {
      for (const a of manifest.assets) toCache.add('/' + a.replace(/^\//, ''));
    }
    await cache.addAll(Array.from(toCache));
    // Prime a fallback offline page (index.html)
    await cache.match('/index.html');
  })());
});

/** Clean old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => !n.endsWith(CACHE_VERSION)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/** Routing strategy helpers */
const ASSET_EXT = /\.(?:js|css|png|jpg|jpeg|webp|gif|svg|ico|ttf|otf|woff2?|mp3|wav|ogg|json|txt)$/i;

function isSameOrigin(req) {
  try { return new URL(req.url).origin === SAME_ORIGIN; } catch { return false; }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req, { ignoreVary: true });
  const fetchPromise = fetch(req).then(res => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await fetchPromise) || cached; // fallback to cached if network fails
}

async function networkFirstNavigate(req) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put('/index.html', res.clone());
    return res;
  } catch (e) {
    const fallback = await cache.match('/index.html');
    if (fallback) return fallback;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const same = isSameOrigin(req);
  if (!same) return; // do not interfere with cross-origin (Firebase, APIs)

  const url = new URL(req.url);

  // Navigation requests → network-first with offline fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstNavigate(req));
    return;
  }

  // Static assets → stale-while-revalidate
  if (ASSET_EXT.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Default: try cache, then network, then offline fallback for index.html
  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === 'navigate') {
        const fallback = await cache.match('/index.html');
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});
