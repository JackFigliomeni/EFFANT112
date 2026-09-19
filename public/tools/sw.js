// Minimal service worker for installed tools, scoped to /tools/ only (see
// the registration call in ToolServiceWorker.tsx) — never touches the rest
// of the app (builder, pricing, etc). Network-first with a cache fallback:
// an installed tool keeps showing its last-loaded state offline instead of
// a browser error page, without any complex pre-caching logic.
const CACHE_NAME = "effant-tool-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
