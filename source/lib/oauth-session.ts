// A short-lived access token may survive a reload in this tab only.
// Never store refresh tokens/client secrets or include sessions in app backups/sync.
export interface GoogleSession{token:string;email:string;expires:number;clientId:string}
export type GoogleService='gmail'|'cloud';
const key=(service:GoogleService)=>'asta-oauth-tab-v1:'+service;
function tabStorage():Storage|undefined{try{return globalThis.sessionStorage}catch{return undefined}}
export function forgetSession(service:GoogleService){try{tabStorage()?.removeItem(key(service))}catch{}}
export function saveSession(service:GoogleService,value:GoogleSession){try{tabStorage()?.setItem(key(service),JSON.stringify(value))}catch{}}
export function restoreSession(service:GoogleService,clientId?:string,email?:string,time=Date.now()):GoogleSession|null{
 try{const value=JSON.parse(tabStorage()?.getItem(key(service))||'null');
 if(!value)return null;
 if(typeof value.token!=='string'||!value.token||typeof value.email!=='string'||typeof value.clientId!=='string'||!Number.isFinite(value.expires)||value.expires<=time||value.expires>time+3600_000){forgetSession(service);return null;}
 if(clientId&&value.clientId!==clientId||email&&value.email.toLowerCase()!==email.toLowerCase())return null;
 return value;
 }catch{forgetSession(service);return null;}
}
export function sessionMatches(value:GoogleSession|null,clientId?:string,email?:string){return !!value&&value.expires>Date.now()&&(!clientId||value.clientId===clientId)&&(!email||value.email.toLowerCase()===email.toLowerCase());}
