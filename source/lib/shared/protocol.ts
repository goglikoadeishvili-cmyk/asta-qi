import type {RecordItem,Inspection} from '../model';
import type {StoredFile} from '../store';
import {canonical,cloudRecord,sha} from '../cloud-sync';
export interface RemoteRecord{id:string;payload:RecordItem;revision:number;updated_at:string}
export interface RemoteFile{id:string;name:string;type:string;size:number;created_at:string}
export interface Checkpoint{hash:string;revision:number}
export interface SharedTransport{
 records():Promise<RemoteRecord[]>;files():Promise<RemoteFile[]>;
 write(record:RecordItem,expected:number):Promise<{conflict:boolean;record:RemoteRecord}>;
 upload(file:StoredFile):Promise<void>;download(file:RemoteFile):Promise<Blob>;
 usage():Promise<{used:number;limit:number}>;
}
export const fingerprint=(r:RecordItem)=>canonical(cloudRecord(r));
export async function reviewCopy(i:Inspection){const hash=await sha(fingerprint(i));return {...i,id:i.id+'-review-'+hash.slice(0,12),reference:i.reference.replace(/^(QA|QN)-/,'QI-')+'-REVIEW-'+hash.slice(0,6).toUpperCase(),status:'Pending',version:1,deletedAt:undefined,comments:'Concurrent edit preserved for review. '+(i.comments||'')} as Inspection;}
/** Classify before uploading: a clean cached record must never overwrite a newer cloud record. */
export function planRecord(local:RecordItem,remote:RemoteRecord|undefined,checkpoint:Checkpoint|undefined){
 const hash=fingerprint(local);
 if(remote&&hash===fingerprint(remote.payload))return 'same';
 if(checkpoint&&hash===checkpoint.hash)return 'pull';
 if(!remote)return 'push';
 if(!checkpoint&&['project','drawing','settings'].includes(local.kind))return 'pull';
 return checkpoint?.revision===remote.revision?'push':'conflict';
}
export async function migrationCopies(local:RecordItem[],remote:RemoteRecord[]){
 const existing=new Map(remote.map(r=>[r.id,r.payload])),ids=new Map<string,string>();
 for(const r of local){const old=existing.get(r.id);if(!['settings','project'].includes(r.kind)&&old&&fingerprint(old)!==fingerprint(r)&&!(r.kind==='drawing'&&old.kind==='drawing'&&r.fileId===old.fileId&&r.reference===old.reference&&r.revision===old.revision&&r.page===old.page&&r.projectId===old.projectId))ids.set(r.id,r.id+'-import-'+(await sha(fingerprint(r))).slice(0,12));}
 // Carry ID changes through dependent drawings, inspections and sent batches.
 for(let pass=0;pass<3;pass++)for(const r of local){if(r.kind==='settings'||r.kind==='project'||ids.has(r.id))continue;const x=r as any;if(x.projectId&&ids.has(x.projectId)||x.drawingId&&ids.has(x.drawingId)||r.kind==='batch'&&r.inspectionIds.some(id=>ids.has(id)))ids.set(r.id,r.id+'-import-'+(await sha(fingerprint(r))).slice(0,12));}
 return local.filter(r=>r.kind!=='settings'||!existing.has(r.id)).map(r=>{
  const old=existing.get(r.id);
  if(r.kind==='project'&&old?.kind==='project')return {...old,floors:[...new Map([...old.floors,...r.floors].map(f=>[f.id,f])).values()]};
  if(r.kind==='drawing'&&old?.kind==='drawing'&&!ids.has(r.id))return old;
  const copyId=ids.get(r.id)||r.id;if(ids.has(r.id)&&existing.has(copyId))return existing.get(copyId)!;
  const copy:any={...cloudRecord(r),id:copyId};
  if(copy.projectId)copy.projectId=ids.get(copy.projectId)||copy.projectId;
  if(r.kind==='drawing'&&ids.has(r.id))copy.active=false;
  if(r.kind==='project'&&ids.has(r.id))copy.name+=' (imported alternative)';
  if(r.kind==='inspection'){copy.drawingId=ids.get(r.drawingId)||r.drawingId;if(ids.has(r.id)){copy.reference=r.reference.replace(/^(QA|QN)-/,'QI-')+'-IMPORT';copy.status='Pending';copy.comments='Imported alternative retained; review alongside the existing record. '+r.comments;}}
  if(r.kind==='batch')copy.inspectionIds=r.inspectionIds.map(id=>ids.get(id)||id);
  return copy as RecordItem;
 });
}
