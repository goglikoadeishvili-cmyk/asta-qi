import {getRecords,getFiles,importSynced,importAtomic,readLegacyWorkspace,type StoredFile} from '../store';
import type {RecordItem,Batch} from '../model';
import {neededCloudFiles} from '../delivery';
import {sha,cloudRecord} from '../cloud-sync';
import {fingerprint,planRecord,reviewCopy,migrationCopies,type SharedTransport,type RemoteRecord,type Checkpoint} from './protocol';
export async function syncWorkspace(transport:SharedTransport,checkpoints:Record<string,Checkpoint>,progress:(message:string)=>void=()=>{},guard:()=>void=()=>{}){
 const local=await getRecords(),files=await getFiles(),referenced=neededCloudFiles(local);
 progress('Checking shared workspace…');const remote=new Map((await transport.records()).map(r=>[r.id,r])),remoteFiles=new Map((await transport.files()).map(f=>[f.id,f]));
 for(const f of files)if(referenced.has(f.id)&&!remoteFiles.has(f.id)){progress('Uploading '+f.name+'…');if(await sha(await f.blob.arrayBuffer())!==f.id)throw new Error('Local file integrity check failed.');guard();await transport.upload(f);remoteFiles.set(f.id,{id:f.id,name:f.name,type:f.type,size:f.size,created_at:f.createdAt});}
 let conflicts=0;const resolved=new Map<string,RecordItem>(),next={...checkpoints};
 const remember=(row:RemoteRecord)=>{remote.set(row.id,row);next[row.id]={hash:fingerprint(row.payload),revision:row.revision};resolved.set(row.id,row.payload);};
 for(const r of local){const record=cloudRecord(r),known=remote.get(r.id),action=planRecord(record,known,checkpoints[r.id]);
  if(action==='same'||action==='pull'){if(known)remember(known);continue;}
  if(action==='push'){progress('Saving '+record.kind+'…');guard();const reply=await transport.write(record,checkpoints[r.id]?.revision||0);if(!reply.conflict){remember(reply.record);continue;}remote.set(r.id,reply.record);}
  const latest=remote.get(r.id)!;
  if(r.kind!=='inspection')throw new Error('Concurrent '+r.kind+' edit retained on this device. Download a full backup and review it before retrying.');
  const copy=await reviewCopy(r);guard();const saved=await transport.write(copy,0);if(saved.conflict)throw new Error('Review copy could not be confirmed. Local records are retained.');remember(saved.record);remember(latest);conflicts++;
 }
 for(const row of remote.values())if(!resolved.has(row.id))remember(row);
 const merged=[...resolved.values()],needed=neededCloudFiles(merged),localIds=new Set(files.map(f=>f.id)),downloads:StoredFile[]=[];
 for(const id of needed){if(localIds.has(id))continue;const meta=remoteFiles.get(id);if(!meta)throw new Error('Shared sync is incomplete: a referenced file is missing.');progress('Downloading '+meta.name+'…');const blob=await transport.download(meta);if(blob.size!==Number(meta.size)||await sha(await blob.arrayBuffer())!==id)throw new Error('Shared file integrity check failed.');downloads.push({id,blob:new Blob([blob],{type:meta.type}),name:meta.name,type:meta.type,size:blob.size,createdAt:meta.created_at});}
 guard();const combined=await importSynced(merged,downloads,local,fingerprint);
 // Checkpoint the cloud version, never a later unsent local edit protected by importSynced.
 for(const row of remote.values())next[row.id]={hash:fingerprint(row.payload),revision:row.revision};
 const usage=await transport.usage();return {checkpoints:next,conflicts,usage,records:combined,syncedAt:new Date().toISOString()};
}
export async function migrateLegacy(transport:SharedTransport,guard:()=>void=()=>{}){
 const legacy=await readLegacyWorkspace(),remote=await transport.records();const records=await migrationCopies(legacy.records,remote);
 const needed=neededCloudFiles(records),files=legacy.files.filter(f=>needed.has(f.id));const available=new Set(files.map(f=>f.id));for(const id of needed)if(!available.has(id))throw new Error('The old device copy is missing evidence. Restore its full backup before migration.');
 // Keep the entire old database unchanged. The new workspace has a separate cache.
 guard();await importAtomic(records,files);return {records:records.length,inspections:records.filter(r=>r.kind==='inspection'&&!r.deletedAt).length,files:files.length};
}
