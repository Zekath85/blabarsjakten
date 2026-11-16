// Gör att spelet funkar utan internet och uppdaterar sig självt.
// VERSION byts ut vid varje publicering, då hämtas alla filer på nytt i bakgrunden.
// Nya versionen syns nästa gång appen öppnas.
const VERSION = 'dev';
const CACHE = 'spelhornan-' + VERSION;

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const files = await fetch('files.json', { cache: 'no-store' }).then(r => r.json());
    await (await caches.open(CACHE)).addAll(files);
  })());
});

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok && res.status === 200) (await caches.open(CACHE)).put(e.request, res.clone());
    return res;
  })());
});
