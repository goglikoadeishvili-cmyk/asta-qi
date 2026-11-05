import {type Batch,type Inspection,type RecordItem} from './model';
export const RETENTION_MS=7*24*60*60*1000;
export function isSent(b:Batch){return b.status==='manual-sent'||b.status==='accepted'&&!!b.providerId;}
export function sentDue(b:Batch){if(!isSent(b)||!b.sentAt)return null;const at=Date.parse(b.sentAt);return Number.isFinite(at)?at+RETENTION_MS:null;}
export const deliveryDue=sentDue;
export function emailState(b:Batch){return isSent(b)?'Sent':b.status==='unknown'?'Unconfirmed':'Not sent';}
export function markManualSent(b:Batch,backup:boolean,time=new Date().toISOString()):Batch{if(!backup||!b.downloadedAt)throw new Error('Download the ZIP and confirm you kept it outside this app first.');if(b.status==='unknown')throw new Error('Check the unconfirmed Gmail send before marking this batch.');return {...b,status:'manual-sent',provider:'manual',sentAt:time,backupConfirmedAt:b.includesOriginals?time:undefined,error:''};}
export function retentionText(b:Batch,time=Date.now()){if(b.purgedAt)return 'Local cleanup processed '+new Date(b.purgedAt).toLocaleString('en-GB')+' · PDFs and pin records retained';const at=sentDue(b);if(at===null)return 'Seven-day cleanup starts after you mark this ZIP as sent.';if(!b.includesOriginals)return 'Original photos retained: this PDF-only ZIP is not an original-photo backup.';if(!b.backupConfirmedAt)return 'Cleanup paused: keep the downloaded original-photo ZIP and confirm your backup.';const hours=Math.max(0,Math.ceil((at-time)/3600000));return `Local photo/ZIP cleanup in ${Math.floor(hours/24)}d ${hours%24}h · ${new Date(at).toLocaleString('en-GB')}`;}
interface FileInfo{id:string;size:number;type:string}
export function planCleanup(records:RecordItem[],files:FileInfo[],time=Date.now(),forceBatchId?:string){
 const due=records.filter((r):r is Batch=>r.kind==='batch'&&sentDue(r)!==null&&(sentDue(r)!<=time||r.id===forceBatchId)&&!!r.backupConfirmedAt&&!!r.includesOriginals&&r.reportIds.length===r.inspectionIds.length&&r.reportIds.every(id=>files.some(f=>f.id===id&&f.type==='application/pdf')));const targets=new Map<string,Inspection>();const changes:RecordItem[]=[];
 for(const b of due){for(const r of records){if(r.kind!=='inspection'||r.retentionHold)continue;const n=b.inspectionIds.indexOf(r.id);if(n<0||r.version!==b.versions[n]&&!(r.archivedByBatch===b.id&&r.evidencePurgedAt))continue;targets.set(r.id,r);if(!r.evidencePurgedAt)changes.push({...r,evidencePurgedAt:new Date(time).toISOString(),deletedAt:new Date(time).toISOString(),archiveReason:'Sent report: seven-day local evidence cleanup; downloaded ZIP is the original-photo backup',archivedByBatch:b.id,updatedAt:new Date(time).toISOString(),version:r.version+1});}if(!b.purgedAt)changes.push({...b,purgedAt:new Date(time).toISOString()});}
 const candidates=new Set<string>(),protectedIds=new Set<string>();for(const i of targets.values())for(const p of i.photos){candidates.add(p.id);if(p.reportId)candidates.add(p.reportId);}for(const b of due)candidates.add(b.zipId);
 for(const r of records){if(r.kind==='drawing')protectedIds.add(r.fileId);if(r.kind==='inspection'&&!targets.has(r.id)&&!r.evidencePurgedAt)for(const p of r.photos){protectedIds.add(p.id);if(p.reportId)protectedIds.add(p.reportId);}if(r.kind==='batch'){r.reportIds.forEach(id=>protectedIds.add(id));if(!due.some(b=>b.id===r.id))protectedIds.add(r.zipId);}}
 const remove=files.filter(f=>candidates.has(f.id)&&!protectedIds.has(f.id));return {records:changes,fileIds:remove.map(f=>f.id),bytes:remove.reduce((n,f)=>n+f.size,0)};
}
export function neededCloudFiles(records:RecordItem[]){const ids=new Set<string>();for(const r of records){if(r.kind==='drawing')ids.add(r.fileId);if(r.kind==='inspection'&&!r.evidencePurgedAt)for(const p of r.photos){ids.add(p.id);if(p.reportId)ids.add(p.reportId);}if(r.kind==='batch'){r.reportIds.forEach(id=>ids.add(id));if(!r.purgedAt&&r.zipId)ids.add(r.zipId);}}return ids;}

// Remove generated duplicates only; source evidence and uncertain sends are never candidates.
export function planReportCleanup(records:RecordItem[],files:FileInfo[]){
 const sent=records.filter((r):r is Batch=>r.kind==='batch'&&isSent(r));
 const candidates=new Set(sent.flatMap(b=>[...b.reportIds,b.zipId]).filter(Boolean));
 const protectedIds=new Set<string>();
 for(const r of records){
  if(r.kind==='drawing')protectedIds.add(r.fileId);
  if(r.kind==='inspection')for(const p of r.photos){protectedIds.add(p.id);if(p.reportId)protectedIds.add(p.reportId);}
  if(r.kind==='batch'&&(!isSent(r)||records.some(i=>i.kind==='inspection'&&i.evidencePurgedAt&&i.archivedByBatch===r.id))){r.reportIds.forEach(id=>protectedIds.add(id));if(r.zipId)protectedIds.add(r.zipId);}
 }
 const remove=files.filter(f=>candidates.has(f.id)&&!protectedIds.has(f.id));
 return {fileIds:remove.map(f=>f.id),bytes:remove.reduce((sum,f)=>sum+f.size,0),records:sent.filter(b=>b.reportIds.some(id=>remove.some(f=>f.id===id))||remove.some(f=>f.id===b.zipId)).map(b=>({...b,reportIds:b.reportIds.filter(id=>!remove.some(f=>f.id===id)),zipId:remove.some(f=>f.id===b.zipId)?'':b.zipId,size:0,temporaryReports:true}))};
}

export function unconfirmedInspections(inspections:Inspection[],batches:Batch[]){return inspections.filter(i=>!batches.some(b=>isSent(b)&&b.inspectionIds.some((id,n)=>id===i.id&&b.versions[n]===i.version)));}
