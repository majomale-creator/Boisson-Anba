const CACHE="anba-boissons-github-v1";
const BASE=self.registration.scope;
const url=(name)=>new URL(name,BASE).toString();
const SHELL=[url("./"),url("manifest.webmanifest"),url("favicon.svg"),url("DejaVuSans-Bold.ttf")];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>{
    const network=fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;});
    if(event.request.mode==="navigate")return network.catch(()=>cached||caches.match(url("./")));
    return cached||network.catch(()=>caches.match(url("./")));
  }));
});
