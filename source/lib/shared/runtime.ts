import type {SupabaseClient} from '@supabase/supabase-js';
import type {WorkspaceConfig} from './config';
import {workspaceTransport,claimWorkspaceEmail} from './client';
import {syncWorkspace} from './sync';
import {fingerprint,type Checkpoint,type SharedTransport} from './protocol';
import type {Batch} from '../model';
export interface SharedRuntime{client:SupabaseClient;config:WorkspaceConfig;userId:string;name:string;role:string;transport:SharedTransport;pending:Promise<void>|null;checkpoints:Record<string,Checkpoint>}
export interface SharedStatus{busy:boolean;message:string;lastSync?:string;usage?:{used:number;limit:number};error?:string}
let active:SharedRuntime|null=null;let status:SharedStatus={busy:false,message:'Shared storage is not configured.'};
export const sharedRuntime=()=>active;
export const sharedStatus=()=>status;
const emit=()=>window.dispatchEvent(new Event('asta-shared-status'));
const checkpointKey=(r:SharedRuntime)=>'asta-shared-checkpoints:'+r.config.workspaceId+':'+r.userId;
export function activateWorkspace(client:SupabaseClient,config:WorkspaceConfig,userId:string,name:string,role:string){active={client,config,userId,name,role,transport:workspaceTransport(client,config.workspaceId),pending:null,checkpoints:{}};status={busy:false,message:navigator.onLine?'Shared workspace connected. Checking records…':'Offline · showing this device’s cached shared records.'};emit();}
export function deactivateWorkspace(){active=null;status={busy:false,message:'Signed out. Cached records remain private on this device.'};emit();}
export function ensureRuntime(r:SharedRuntime){if(active!==r)throw new Error('Workspace changed. Sync was stopped safely.');}
export async function syncShared(){
 const r=active;if(!r)throw new Error('Sign in to the shared workspace first.');if(!navigator.onLine){status={...status,busy:false,error:'Connect to the internet to upload pending work.',message:'Offline · changes are saved on this device.'};emit();throw new Error(status.error);}if(r.pending)return r.pending;
 const execute=async()=>{ensureRuntime(r);try{r.checkpoints=JSON.parse(localStorage.getItem(checkpointKey(r))||'{}')}catch{r.checkpoints={}}
 status={...status,busy:true,error:undefined,message:'Checking shared records…'};emit();
 try{const result=await syncWorkspace(r.transport,r.checkpoints,message=>{ensureRuntime(r);status={...status,message};emit();},()=>ensureRuntime(r));ensureRuntime(r);r.checkpoints=result.checkpoints;localStorage.setItem(checkpointKey(r),JSON.stringify(r.checkpoints));status={busy:false,message:result.conflicts?'Synced · concurrent edits preserved as REVIEW copies.':'All shared records synced.',lastSync:result.syncedAt,usage:result.usage};window.dispatchEvent(new Event('asta-shared-imported'));}
 catch(e:any){if(active===r)status={...status,error:e.message,message:navigator.onLine?'Sync incomplete. Local work is retained.':'Offline · changes saved on this device, awaiting upload.'};throw e;}
 finally{if(active===r){status={...status,busy:false};emit();}}
 };
 r.pending=Promise.resolve(navigator.locks?navigator.locks.request('asta-shared-sync:'+r.config.workspaceId+':'+r.userId,execute):execute()).then(()=>{}).finally(()=>{r.pending=null;});return r.pending;
}
export async function claimSharedEmail(batch:Batch){const r=active;if(!r)return;await syncShared();ensureRuntime(r);const row=await claimWorkspaceEmail(r.client,r.config.workspaceId,batch);ensureRuntime(r);r.checkpoints[row.id]={hash:fingerprint(row.payload),revision:row.revision};localStorage.setItem(checkpointKey(r),JSON.stringify(r.checkpoints));}
