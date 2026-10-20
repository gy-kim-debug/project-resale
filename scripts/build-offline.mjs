import console from 'node:console';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const html = await readFile('dist/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
  (m) => m[1],
);
const name =
  'resale-' + createHash('sha256').update(html).digest('hex').slice(0, 12);
const files = ['/', '/index.html', '/favicon.svg', ...assets];
await writeFile(
  'dist/sw.js',
  `const CACHE=${JSON.stringify(name)};const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async cache=>{for(const url of FILES){const response=await fetch(url,{cache:'reload',credentials:'same-origin'});if(!response.ok)throw Error('Offline cache failed');await cache.put(url,response);}}));});
self.addEventListener('message',e=>{if(e.data==='ACTIVATE')self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('resale-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html'))));}else if(FILES.includes(url.pathname)){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname,{ignoreVary:true}))||fetch(request)));}});
`,
);
console.log('Offline shell packaged:', assets.length, 'assets');
