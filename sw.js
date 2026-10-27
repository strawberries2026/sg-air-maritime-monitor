// Scoped offline shell for SG Air & Maritime Monitor only.
// Never delete or overwrite caches belonging to other GitHub Pages apps.
const PREFIX='sg-air-maritime-shell-';
const CACHE=PREFIX+'v3';
const SHELL=['./','./index.html','./style.css','./app.js','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  const scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.pathname.includes('/data/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match('./index.html')));
    return;
  }
  if(SHELL.some(path=>url.pathname===new URL(path,scope).pathname)){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
      return response;
    }).catch(()=>caches.match(request)));
  }
});
