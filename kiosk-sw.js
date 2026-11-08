// Offline cache for the exhibition kiosk (DEMO_DESIGN_GUIDE §7.4, docs/kiosk.md). Registered ONLY by the kiosk staff panel
// ("Save all demos for offline"), so ordinary visitors of the site never get it. It lives at the site root so its scope covers
// /demos/ and /kiosk/. Network first (fresh files when online, 4 s timeout), Cache Storage when offline. The kiosk's
// "Exit kiosk mode" unregisters it and deletes the cache. The file list: kiosk/precache.json (tools/web/kiosk_precache.py).
const CACHE = 'moheat-kiosk-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('message', (e) => {
  const m = e.data || {}, port = e.ports[0];
  if (m.t === 'precache') e.waitUntil((async () => {
    const c = await caches.open(CACHE), base = self.registration.scope; let n = 0, ok = 0, fail = 0, bytes = 0;
    const queue = [...m.files], work = async () => { for (let f; (f = queue.shift());) {
      try { const r = await fetch(new URL(f, base), { cache: 'reload' }); if (r.ok) { bytes += +(r.headers.get('content-length') || 0); await c.put(new URL(f, base), r); ok++; } else fail++; } catch { fail++; }
      if (++n % 10 === 0) port?.postMessage({ n }); } };
    await Promise.all([work(), work(), work(), work()]);
    port?.postMessage({ done: true, ok, fail, bytes });
  })());
  if (m.t === 'clear') e.waitUntil(caches.delete(CACHE).then(() => port?.postMessage({ cleared: true })));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE), key = new URL(req.url); key.search = '';   // ?v= cache-busting numbers do not matter offline
    const hit = () => c.match(req, { ignoreSearch: true }).then((r) => r || c.match(key.href.endsWith('/') ? key.href + 'index.html' : key.href, { ignoreSearch: true }));
    try {
      const net = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
      if (net.ok && (await c.match(req, { ignoreSearch: true }))) c.put(req, net.clone()).catch(() => {});   // keep cached files fresh
      return net;
    } catch { return (await hit()) || Response.error(); }
  })());
});
