import {importAtomic,getFiles,getRecords,putRecord,storeFile} from './store';
import {DEFAULT_PROJECT_ID,projectOf} from './model';
import {ensureProjects} from './projects';
import {drawingRecords} from './archive';
export const includedDrawingId='809d54646a8c4de3ebb267f1ce3debb3673d45cab345dcdf0fc12e898cc236cd';
export const includedDrawingUrl=()=>import.meta.env.BASE_URL+'drawings/neos-wall-layouts-c1.pdf';
export async function ensureIncludedDrawings(){
 await ensureProjects();
 const files=await getFiles();
 if(!files.some(f=>f.id===includedDrawingId)){
  const response=await fetch(includedDrawingUrl(),{cache:'force-cache'});
  if(!response.ok)throw new Error('The included drawing could not be loaded. Reconnect and reopen the app.');
  const file=await storeFile(new Blob([await response.arrayBuffer()],{type:'application/pdf'}),'Internal Wall Lay-outs - rev.C1-021126(2).pdf');
  if(file.id!==includedDrawingId)throw new Error('Drawing integrity check failed. Reopen after the website update completes.');
 }
 const existing=await getRecords();
 for(const drawing of drawingRecords(includedDrawingId)){
  if(existing.some(r=>r.id===drawing.id))continue;
  // Never replace an existing revision or change inspection drawing references.
  const active=!existing.some(r=>r.kind==='drawing'&&projectOf(r)===DEFAULT_PROJECT_ID&&r.floor===drawing.floor&&r.active);
  await putRecord({...drawing,active});
 }
 const project = {"id": "assembly-hotel-roof-conversion", "kind": "project", "name": "Assembly Hotel Roof Conversion", "address": "", "floors": [{"id": "level-10", "name": "Level 10", "detail": ""}], "qaProfile": "generic", "createdAt": "2026-11-23T17:28:36.240514+00:00"} as const;
 const assemblyDrawing = {"id": "assembly-hotel-roof-conversion-a-24001", "kind": "drawing", "projectId": "assembly-hotel-roof-conversion", "floor": "level-10", "floorName": "Level 10", "name": "Partitions Scope Level 10", "reference": "A-24001", "revision": "T2", "fileId": "bab4d529a003e4158ec1df4979813dadc890cd81143c7c7ddd6f5094e7d740cf", "page": 1, "active": true, "createdAt": "2026-11-23T17:28:36.240514+00:00"} as const;
 if (!files.some(f=>f.id===assemblyDrawing.fileId)) {
   const response=await fetch(import.meta.env.BASE_URL+'drawings/assembly-level-10-t2.pdf',{cache:'force-cache'});
   if(!response.ok)throw new Error('Reconnect to download the Assembly Hotel floor plan.');
   const saved=await storeFile(await response.blob(),'assembly-level-10-t2.pdf');
   if(saved.id!==assemblyDrawing.fileId)throw new Error('Assembly Hotel drawing integrity check failed.');
 }
 const additions: import('./model').RecordItem[]=[];
 if(!existing.some(r=>r.id===project.id))additions.push({...project,floors:[...project.floors]});
 if(!existing.some(r=>r.id===assemblyDrawing.id)){
   const active=!existing.some(r=>r.kind==='drawing'&&r.projectId===project.id&&r.reference===assemblyDrawing.reference&&r.active);
   additions.push({...assemblyDrawing,active});
 }
 if(additions.length)await importAtomic(additions,[]);
}
