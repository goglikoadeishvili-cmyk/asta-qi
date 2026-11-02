import {readdir,readFile,writeFile,cp,rm,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
await rm(resolve(root,'assets'),{recursive:true,force:true});
await cp(resolve(root,'site-build'),root,{recursive:true});
const html=await readFile(resolve(root,'index.html'),'utf8');
const present=await readdir(resolve(root,'assets'));
const needed=new Set(Array.from(html.matchAll(/assets\/([\w.-]+\.(?:js|css))/g),m=>m[1]));
for(const asset of needed){const source=await readFile(resolve(root,'assets',asset),'utf8');for(const match of source.matchAll(/[\"'\x60](?:\.\/)?([\w.-]+\.(?:js|css))[\"'\x60]/g))if(present.includes(match[1]))needed.add(match[1]);}
for(const asset of present)if(!needed.has(asset))await unlink(resolve(root,'assets',asset));
const assets=[...needed];
const version=(html.match(/index-([\w-]+)\.js/)||[])[1]||Date.now();
const files=['./','index.html','manifest.webmanifest','favicon.svg','icon-192.png','icon-512.png','pdf.worker.min.mjs','branding/acl-logo-v2.png','acl-icon-192-v2.png','acl-icon-512-v2.png','drawings/neos-wall-layouts-c1.pdf',...assets.map(a=>'assets/'+a)];
const sw=`const CACHE='asta-qa-${version}';const FILES=${JSON.stringify(files)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('asta-qa-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname.includes('/references/')){e.respondWith(Promise.resolve(new Response('Removed',{status:410})));return;}if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(e.request.mode==='navigate')e.respondWith(fetch(e.request).catch(()=>caches.match(new URL('./index.html',self.registration.scope)).then(r=>r||Response.error())));else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});`;
await writeFile(resolve(root,'sw.js'),sw);
console.log('Published static app shell and offline assets:',assets.length);
