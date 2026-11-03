import {readdir,readFile,writeFile,cp,rm,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const build=resolve(root,'site-build');
const html=await readFile(resolve(build,'index.html'),'utf8');
const present=await readdir(resolve(build,'assets'));
const needed=new Set(Array.from(html.matchAll(/assets\/([\w.-]+\.(?:js|css))/g),m=>m[1]));
for(const asset of needed){const source=await readFile(resolve(build,'assets',asset),'utf8');for(const match of source.matchAll(/[\"'\x60](?:\.\/)?([\w.-]+\.(?:js|css))[\"'\x60]/g))if(present.includes(match[1]))needed.add(match[1]);}
// Copy only referenced release files; ignore transient and private build files.
await rm(resolve(root,'assets'),{recursive:true,force:true});
for(const asset of needed)await cp(resolve(build,'assets',asset),resolve(root,'assets',asset));
await writeFile(resolve(root,'index.html'),html);
const assets=[...needed];
const version=(html.match(/index-([\w-]+)\.js/)||[])[1]||Date.now();
const staticFiles=['manifest.webmanifest','gmail-setup.html','favicon.svg','icon-192.png','icon-512.png','pdf.worker.min.mjs','branding/acl-logo-v2.png','acl-icon-192-v2.png','acl-icon-512-v2.png','drawings/neos-wall-layouts-c1.pdf'];
for(const file of staticFiles)await cp(resolve(build,file),resolve(root,file));
const files=['./','index.html','manifest.webmanifest','gmail-setup.html','favicon.svg','icon-192.png','icon-512.png','pdf.worker.min.mjs','branding/acl-logo-v2.png','acl-icon-192-v2.png','acl-icon-512-v2.png','drawings/neos-wall-layouts-c1.pdf',...assets.map(a=>'assets/'+a)];
const sw=`const CACHE='asta-qa-${version}';const FILES=${JSON.stringify(files)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('asta-qa-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname.includes('/references/')){e.respondWith(Promise.resolve(new Response('Removed',{status:410})));return;}if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(e.request.mode==='navigate')e.respondWith(fetch(e.request).catch(()=>caches.match(new URL('./index.html',self.registration.scope)).then(r=>r||Response.error())));else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});`;
await writeFile(resolve(root,'sw.js'),sw);
console.log('Published static app shell and offline assets:',assets.length);
