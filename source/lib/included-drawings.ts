import {getFiles,getRecords,putRecord,storeFile} from './store';
import {drawingRecords} from './archive';
export const includedDrawingId='809d54646a8c4de3ebb267f1ce3debb3673d45cab345dcdf0fc12e898cc236cd';
export const includedDrawingUrl=()=>import.meta.env.BASE_URL+'drawings/neos-wall-layouts-c1.pdf';
export async function ensureIncludedDrawings(){
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
  const active=!existing.some(r=>r.kind==='drawing'&&r.floor===drawing.floor&&r.active);
  await putRecord({...drawing,active});
 }
}
