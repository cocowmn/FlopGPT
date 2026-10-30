/* ------------------------------------------------------------------ *
 *  Service worker (web builds on HTTPS or localhost; registered by ui/src/lib/pwa.ts).
 *  Keeps the page working offline and serves the install manifest and icons the page
 *  renders from the config. vite.config.ts fills in the version and file list at build time.
 * ------------------------------------------------------------------ */
const VERSION = '__VERSION__';
const FILES = __FILES__; // the built page, relative to this file
const SHELL = 'flopgpt-shell-' + VERSION;
const BRAND = 'flopgpt-brand'; // written by the page (manifest, icons, last config); outlives app updates
const BRANDED = /^(manifest\.webmanifest|brand-\d+\.png)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== BRAND).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const scope = self.registration.scope;
  if (req.method !== 'GET' || !req.url.startsWith(scope)) return;
  const path = new URL(req.url).pathname.slice(new URL(scope).pathname.length);
  if (path.startsWith('api/')) return; // the app's live config and events
  if (BRANDED.test(path)) e.respondWith(branded(req, path));
  else if (req.mode === 'navigate') e.respondWith(page(req));
  else e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

// The config's manifest and icons; the built-in ones until the page has written them.
async function branded(req, path) {
  const hit = await caches.match(req, { cacheName: BRAND, ignoreSearch: true }); // the page adds ?v= to refetch
  if (hit) return hit;
  return (await caches.match(path === 'manifest.webmanifest' ? path : 'icon.svg', { cacheName: SHELL })) || fetch(req);
}

// Fresh page when online (so updates show up), this version's copy offline.
async function page(req) {
  try {
    return await fetch(req);
  } catch {
    return (await caches.match('index.html', { cacheName: SHELL })) || Response.error();
  }
}
