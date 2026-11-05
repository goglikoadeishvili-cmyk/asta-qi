import {planLocalInspectionCleanup} from './local-cleanup';
import type {RecordItem} from './model';
let pending:Promise<IDBDatabase>|null=null;
let databaseName='asta-personal-qa';
export const isSharedStore=()=>databaseName!=='asta-personal-qa';
export function selectWorkspaceStore(workspaceId?:string,userId?:string){const name=workspaceId&&userId?'asta-shared-qa:'+workspaceId+':'+userId:'asta-personal-qa';if(name!==databaseName){pending=null;databaseName=name;}}
export async function readLegacyWorkspace(){const req=indexedDB.open('asta-personal-qa',2);return new Promise<{records:RecordItem[];files:StoredFile[]}>((resolve,reject)=>{req.onupgradeneeded=()=>{for(const name of ['records','files','drafts'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'id'});};req.onerror=()=>reject(req.error);req.onsuccess=()=>{const d=req.result,t=d.transaction(['records','files'],'readonly'),a=t.objectStore('records').getAll(),b=t.objectStore('files').getAll();t.oncomplete=()=>{resolve({records:a.result,files:b.result});d.close()};t.onerror=()=>reject(t.error);};});}

function db(){return pending||=new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open(databaseName,2);req.onupgradeneeded=()=>{for(const name of ['records','files','drafts'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>{pending=null;reject(req.error)};req.onblocked=()=>reject(new Error('Close other ASTA tabs and reopen.'));});}
async function request<T>(store:string,mode:IDBTransactionMode,fn:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,mode);const r=fn(t.objectStore(store));let result:T;r.onsuccess=()=>{result=r.result};t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error||r.error);t.onabort=()=>reject(t.error||new Error('Storage was not saved.'));});}
export const getRecords=()=>request<RecordItem[]>('records','readonly',s=>s.getAll());
export const putRecord=(v:RecordItem)=>request('records','readwrite',s=>s.put(v));
export const getFiles=()=>request<StoredFile[]>('files','readonly',s=>s.getAll());
export interface StoredFile{id:string;blob:Blob;name:string;size:number;type:string;createdAt:string}
export async function storeFile(blob:Blob,name:string){const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');const existing=await request<StoredFile|undefined>('files','readonly',s=>s.get(id));if(!existing)await request('files','readwrite',s=>s.put({id,blob,name,size:blob.size,type:blob.type,createdAt:new Date().toISOString()}));return {id,name,size:blob.size,type:blob.type};}
export async function importAtomic(records:RecordItem[],files:StoredFile[]){const d=await db();await new Promise<void>((resolve,reject)=>{const tx=d.transaction(['records','files'],'readwrite');for(const r of records)tx.objectStore('records').put(r);for(const f of files)tx.objectStore('files').put(f);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
// A read/write transaction serialises Gmail send claims across tabs on this device.
export async function claimGmailBatch(batch:import('./model').Batch){if(isSharedStore()){const {claimSharedEmail}=await import('./shared/runtime');await claimSharedEmail(batch);}const d=await db();await new Promise<void>((resolve,reject)=>{const tx=d.transaction('records','readwrite');let blocked='';const records=tx.objectStore('records'),req=records.get(batch.id);req.onsuccess=()=>{const old=req.result;if(!old||old.kind!=='batch')blocked='Generate the report batch before sending.';else if(['accepted','unknown','manual-sent'].includes(old.status))blocked='This batch was sent or has an uncertain sending status. Check Gmail Sent before retrying.';else records.put({...batch,status:'unknown',provider:'gmail'});};tx.oncomplete=()=>blocked?reject(new Error(blocked)):resolve();tx.onerror=()=>reject(tx.error||new Error('Could not lock the email batch. No email sent.'));tx.onabort=()=>reject(tx.error||new Error('Email batch was not locked. No email sent.'));});}
export async function cleanupSentFiles(time=Date.now(),forceBatchId?:string){if(isSharedStore())return 0;const {planReportCleanup}=await import('./delivery');const d=await db();return new Promise<number>((resolve,reject)=>{const tx=d.transaction(['records','files'],'readwrite');let records:RecordItem[]|null=null,files:StoredFile[]|null=null,freed=0;const rs=tx.objectStore('records'),fs=tx.objectStore('files');function clean(){if(!records||!files)return;const plan=planReportCleanup(records,files);for(const r of plan.records)rs.put(r);for(const id of plan.fileIds)fs.delete(id);freed=plan.bytes;}const a=rs.getAll(),b=fs.getAll();a.onsuccess=()=>{records=a.result;clean()};b.onsuccess=()=>{files=b.result;clean()};tx.oncomplete=()=>resolve(freed);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
// Read the current records and apply the merge in the same write transaction.
// A save in another tab cannot slip between our last comparison and the import.
export async function importSynced(records:RecordItem[],files:StoredFile[],baseline:RecordItem[],fingerprint:(r:RecordItem)=>string){
 const d=await db();return new Promise<RecordItem[]>((resolve,reject)=>{
  const tx=d.transaction(['records','files'],'readwrite'),rs=tx.objectStore('records');let combined:RecordItem[]=[];
  const before=new Map(baseline.map(r=>[r.id,fingerprint(r)])),read=rs.getAll();
  read.onsuccess=()=>{const changed=new Map((read.result as RecordItem[]).filter(r=>fingerprint(r)!==before.get(r.id)).map(r=>[r.id,r]));combined=records.map(r=>changed.get(r.id)||r);for(const r of changed.values())if(!combined.some(x=>x.id===r.id))combined.push(r);for(const r of combined)rs.put(r);for(const f of files)tx.objectStore('files').put(f);};
  tx.oncomplete=()=>resolve(combined);tx.onerror=()=>reject(tx.error||new Error('Cloud records were not saved.'));tx.onabort=()=>reject(tx.error||new Error('Cloud import was cancelled.'));
 });
}

export async function ensureWeeklyRecord(record:import('./model').WeeklyReport){
 const d=await db();return new Promise<void>((resolve,reject)=>{const tx=d.transaction('records','readwrite'),rs=tx.objectStore('records'),req=rs.get(record.id);req.onsuccess=()=>{if(!req.result)rs.put(record)};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
export async function saveWeeklyRecord(record:import('./model').WeeklyReport,expectedVersion:number){
 const d=await db();return new Promise<void>((resolve,reject)=>{const tx=d.transaction('records','readwrite'),rs=tx.objectStore('records'),req=rs.get(record.id);let conflict=false;req.onsuccess=()=>{if(req.result?.version!==expectedVersion){conflict=true;return;}rs.put(record)};tx.oncomplete=()=>conflict?reject(new Error('This weekly report changed in another tab or device. Copy your edits, then reopen the report before saving.')):resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}

// A separate device-local draft store protects unfinished work without changing a saved Pass.
const draftPrefix=()=> 'asta-form-draft:'+databaseName+':';
function backupDraft(value:import('./inspection-drafts').InspectionDraft){try{localStorage.setItem(draftPrefix()+value.id,JSON.stringify(value));}catch{/* IndexedDB remains the primary draft store. */}}
export async function saveInspectionDraft(i:import('./model').Inspection){const value={id:i.id,inspection:structuredClone(i),savedAt:new Date().toISOString()};backupDraft(value);await request('drafts','readwrite',s=>s.put(value));}
export async function clearInspectionDraft(id:string){await request('drafts','readwrite',s=>s.delete(id));try{localStorage.removeItem(draftPrefix()+id)}catch{}}
export async function recoverInspectionDrafts(){
 const {recoverInspection}=await import('./inspection-drafts');
 const values=new Map((await request<import('./inspection-drafts').InspectionDraft[]>('drafts','readonly',s=>s.getAll())).map(d=>[d.id,d]));
 try{for(let n=0;n<localStorage.length;n++){const key=localStorage.key(n);if(!key?.startsWith(draftPrefix()))continue;const d=JSON.parse(localStorage.getItem(key)||'null');if(d?.id&&d.inspection?.id===d.id&&d.inspection.kind==='inspection'&&d.inspection.pin&&d.savedAt&&(!values.has(d.id)||values.get(d.id)!.savedAt<d.savedAt))values.set(d.id,d);}}catch{}
 if(!values.size)return 0;
 const d=await db();await new Promise<void>((resolve,reject)=>{const tx=d.transaction(['records','drafts'],'readwrite'),rs=tx.objectStore('records');for(const value of values.values()){const req=rs.get(value.id);req.onsuccess=()=>{if(!req.result?.localClearedAt||req.result.localClearedAt<value.savedAt)rs.put(recoverInspection(value,req.result));tx.objectStore('drafts').delete(value.id)};}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
 for(const value of values.values())try{localStorage.removeItem(draftPrefix()+value.id)}catch{}
 return values.size;
}

// Snapshot versions and file references are checked inside the same atomic write transaction.
export async function deleteLocalInspectionEvidence(projectId:string,selection:{id:string;version:number}[]){
 if(isSharedStore())throw new Error('Local evidence deletion is available in the device-only workspace.');
 const fallbackDrafts:import('./inspection-drafts').InspectionDraft[]=[];
 try{for(let n=0;n<localStorage.length;n++){const key=localStorage.key(n);if(key?.startsWith(draftPrefix())){const value=JSON.parse(localStorage.getItem(key)||'null');if(value?.inspection?.photos)fallbackDrafts.push(value);}}}catch{}
 const d=await db();const plan=await new Promise<ReturnType<typeof planLocalInspectionCleanup>>((resolve,reject)=>{
  const tx=d.transaction(['records','files','drafts'],'readwrite'),rs=tx.objectStore('records'),fs=tx.objectStore('files'),ds=tx.objectStore('drafts');
  const a=rs.getAll(),b=fs.getAll(),c=ds.getAll();let result:ReturnType<typeof planLocalInspectionCleanup>,error:unknown;
  let loaded=0;const apply=()=>{if(++loaded!==3)return;try{result=planLocalInspectionCleanup(a.result,b.result,[...c.result,...fallbackDrafts],projectId,selection);for(const r of result.records)rs.put(r);for(const id of result.fileIds)fs.delete(id);for(const id of result.inspectionIds)ds.delete(id);}catch(e){error=e;tx.abort();}};
  a.onsuccess=apply;b.onsuccess=apply;c.onsuccess=apply;
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error||new Error('Deletion was cancelled.'));
 });
 for(const id of plan.inspectionIds)try{localStorage.removeItem(draftPrefix()+id)}catch{}
 return plan;
}
