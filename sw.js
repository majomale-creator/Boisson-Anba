const BASE = self.registration.scope;
const PREFIX = "anba-pages-" + new URL(BASE).pathname + "-";
const CACHE = PREFIX + "1599160e690c9d6d";
const FILES = [".nojekyll", "404.html", "404/index.html", "DejaVuSans-Bold.ttf", "__next.__PAGE__.txt", "__next._full.txt", "__next._head.txt", "__next._index.txt", "__next._tree.txt", "_next/static/YqvRWN7iSu2SizMFtXhwP/_buildManifest.js", "_next/static/YqvRWN7iSu2SizMFtXhwP/_ssgManifest.js", "_next/static/chunks/4bd1b696-215e5051988c3dde.js", "_next/static/chunks/794-2a8bd403d68bff19.js", "_next/static/chunks/app/_global-error/page-aba28f88d5781771.js", "_next/static/chunks/app/_not-found/page-e0235061758c69d1.js", "_next/static/chunks/app/layout-afe21bc10bc8fbc9.js", "_next/static/chunks/app/page-61b5927b83aa1f47.js", "_next/static/chunks/framework-5ce682ea41927f33.js", "_next/static/chunks/main-6f7bce00cd01a7ab.js", "_next/static/chunks/main-app-cc941afbf7e6c795.js", "_next/static/chunks/next/dist/client/components/builtin/app-error-aba28f88d5781771.js", "_next/static/chunks/next/dist/client/components/builtin/forbidden-aba28f88d5781771.js", "_next/static/chunks/next/dist/client/components/builtin/global-error-3cc7918cf094615e.js", "_next/static/chunks/next/dist/client/components/builtin/not-found-aba28f88d5781771.js", "_next/static/chunks/next/dist/client/components/builtin/unauthorized-aba28f88d5781771.js", "_next/static/chunks/polyfills-42372ed130431b0a.js", "_next/static/chunks/webpack-910d1aa5fe16bf44.js", "_next/static/css/e96951704ec1747f.css", "_not-found/__next._full.txt", "_not-found/__next._head.txt", "_not-found/__next._index.txt", "_not-found/__next._not-found.__PAGE__.txt", "_not-found/__next._not-found.txt", "_not-found/__next._tree.txt", "_not-found/index.html", "_not-found/index.txt", "apple-touch-icon.png", "favicon.svg", "file.svg", "globe.svg", "icon-192.png", "icon-512.png", "index.html", "index.txt", "manifest.webmanifest", "og.png", "window.svg"];
const HOME = new URL("index.html", BASE).href;
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    FILES.map(path => new Request(new URL(path, BASE).href, {cache: "reload"}))
  )).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (request.mode === "navigate") {
      const cached = await cache.match(HOME);
      if (cached) return cached;
      return fetch(request);
    }
    const cached = await cache.match(request, {ignoreSearch: true});
    return cached || fetch(request);
  }));
});
