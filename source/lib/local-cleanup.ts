import {projectOf,type RecordItem,type Inspection} from './model';
import type {InspectionDraft} from './inspection-drafts';
/** Only selected inspection evidence is eligible; shared files remain while any record or draft uses them. */
export function planLocalInspectionCleanup(records:RecordItem[],files:{id:string;size:number}[],drafts:InspectionDraft[],projectId:string,selection:{id:string;version:number}[],time=new Date().toISOString()){
 const chosen=new Map(selection.map(i=>[i.id,i.version]));
 const targets=records.filter((r):r is Inspection=>r.kind==='inspection'&&chosen.has(r.id)&&projectOf(r)===projectId&&!r.deletedAt);
 if(!chosen.size||targets.length!==chosen.size||targets.some(i=>i.version!==chosen.get(i.id)))throw new Error('Selected inspections changed. Refresh the list and select them again.');
 const ids=new Set(targets.map(i=>i.id)),candidates=new Set(targets.flatMap(i=>i.photos.flatMap(p=>[p.id,p.reportId].filter(Boolean) as string[])));
 const changed=targets.map(i=>({...i,photos:[],deletedAt:time,evidencePurgedAt:time,localClearedAt:time,archiveReason:'Local photos deleted after external report confirmation',updatedAt:time,version:i.version+1}));
 const protectedIds=new Set<string>();
 const visit=(value:unknown)=>{if(typeof value==='string'){if(candidates.has(value))protectedIds.add(value);}else if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')Object.values(value).forEach(visit);};
 for(const r of records)visit(ids.has(r.id)?changed.find(i=>i.id===r.id):r);
 for(const draft of drafts)if(!ids.has(draft.id))visit(draft);
 const remove=files.filter(f=>candidates.has(f.id)&&!protectedIds.has(f.id));
 return {records:changed,inspectionIds:[...ids],fileIds:remove.map(f=>f.id),bytes:remove.reduce((sum,f)=>sum+f.size,0)};
}
