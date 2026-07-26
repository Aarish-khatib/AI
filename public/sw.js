const CACHE = "limitless-shell-v5";
const SHELL = ["/", "/manifest.webmanifest", "/limitless-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  const cacheable =
    event.request.mode === "navigate" ||
    /\.(?:css|js|mjs|json|webmanifest|svg|png|jpg|jpeg|webp|gif|woff2?)$/i.test(
      url.pathname,
    );
  if (!cacheable) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response.ok &&
          response.type === "basic" &&
          !response.headers.get("cache-control")?.includes("no-store")
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || (event.request.mode === "navigate" ? caches.match("/") : undefined)),
      ),
  );
});
