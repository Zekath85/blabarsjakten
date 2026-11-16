// Gör att spelet funkar utan internet och uppdaterar sig självt.
// VERSION byts ut vid varje publicering. Då jämförs fingeravtrycken i files.json med förra versionen:
// bara ändrade filer hämtas från nätet, resten kopieras från plattans egen lagring.
// Nya versionen syns nästa gång appen öppnas.
const VERSION = 'dev';
const CACHE = 'spelhornan-' + VERSION;

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const manifest = await fetch('files.json', { cache: 'no-store' }).then(r => r.json());
    const cache = await caches.open(CACHE);

    // Förra versionens lista och lagring (om den finns).
    let old = {}, oldCache = null;
    for (const key of await caches.keys()) {
      if (key === CACHE) continue;
      const c = await caches.open(key), m = await c.match('files.json');
      if (m) { old = await m.json(); oldCache = c; }
    }

    let fetched = 0, copied = 0;
    await Promise.all(Object.entries(manifest).map(async ([path, hash]) => {
      if (oldCache && old[path] === hash) {
        const hit = await oldCache.match(path);
        if (hit) { copied++; return cache.put(path, hit); }
      }
      const res = await fetch(path, { cache: 'reload' }); // förbi webbläsarens egen cache, så vi får den nya filen
      if (!res.ok) throw new Error(`Kunde inte hämta ${path}`);
      fetched++;
      await cache.put(path, res);
    }));
    // Spara listan, så att nästa uppdatering kan jämföra. Och hur det gick (för felsökning).
    await cache.put('files.json', new Response(JSON.stringify(manifest)));
    await cache.put('update-stats.json', new Response(JSON.stringify({ version: VERSION, fetched, copied })));
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
