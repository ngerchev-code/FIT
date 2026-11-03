/* FIT — офлайн работа на уеб версията (iPhone/PWA). Мрежата е първа, кешът е резерва. */
const CACHE = "fit-pwa-v1";
const CORE = ["./", "index.html", "fit-core.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "drop.wav", "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
