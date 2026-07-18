/* RecoverPro service worker — minimal app-shell cache.
 *
 * Strategy:
 *   - Install: precache the document root so the app shell is available offline.
 *   - Activate: nuke any older versioned caches so stale assets disappear.
 *   - Fetch (GET, same-origin): network-first; on failure, fall back to cache
 *     (and the cached document for navigation requests).
 *
 * Bumping CACHE_VERSION below invalidates all prior caches on next deploy.
 */

const CACHE_VERSION = 'rp-shell-v1';
const PRECACHE_URLS = ['/', '/index.html', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k.startsWith('rp-shell-'))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Don't cache the SW itself or HMR bits in dev */
  if (url.pathname === '/sw.js') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          /* Only cache successful, basic-type responses */
          if (res.ok && res.type === 'basic') cache.put(req, copy);
        });
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        /* Navigation fallback — serve the cached document so SPA routing keeps working offline */
        if (req.mode === 'navigate') {
          const shell = await caches.match('/index.html');
          if (shell) return shell;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }),
  );
});

/* Allow the page to ask us to skipWaiting on update — see registration code. */
self.addEventListener('message', (event) => {
  if (event.data === 'rp:skip-waiting') self.skipWaiting();
});
