import {useEffect,useRef,useState} from 'react';
export function useAppUpdates(){
 const [available,A]=useState(false);const registration=useRef<ServiceWorkerRegistration|null>(null);
 useEffect(()=>{if(!('serviceWorker' in navigator))return;let alive=true;let hadController=!!navigator.serviceWorker.controller;
 const changed=()=>{if(hadController&&alive)A(true);hadController=true;};
 const check=()=>{if(document.visibilityState==='visible')registration.current?.update().catch(()=>{});};
 navigator.serviceWorker.addEventListener('controllerchange',changed);
 navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{updateViaCache:'none'}).then(r=>{if(!alive)return;registration.current=r;r.update().catch(()=>{});}).catch(()=>{});
 window.addEventListener('online',check);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
 return()=>{alive=false;navigator.serviceWorker.removeEventListener('controllerchange',changed);window.removeEventListener('online',check);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};},[]);
 return {updateAvailable:available,checkForUpdates:async()=>{await registration.current?.update();}};
}
