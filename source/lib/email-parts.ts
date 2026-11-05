import JSZip from 'jszip';
import {GMAIL_ZIP_LIMIT} from './gmail';
import type {Batch} from './model';
import {isSent} from './delivery';
export interface EmailPart{batch:Batch;blob:Blob}
/** Keep complete PDFs together; no inspection is omitted or split between emails. */
export async function partitionReports(pdfs:{name:string;blob:Blob}[],limit=GMAIL_ZIP_LIMIT){
 const parts:{indexes:number[];blob:Blob}[]=[];let indexes:number[]=[],bytes=22;
 const overhead=(name:string)=>94+new TextEncoder().encode(name).length*4;
 async function flush(){if(!indexes.length)return;const zip=new JSZip();for(const n of indexes)zip.file(pdfs[n].name,await pdfs[n].blob.arrayBuffer());const blob=await zip.generateAsync({type:'blob',compression:'STORE'});if(blob.size>limit)throw new Error('One inspection PDF exceeds the email limit. Download that PDF or use Share ZIP.');parts.push({indexes,blob});indexes=[];bytes=22;}
 for(let n=0;n<pdfs.length;n++){const next=pdfs[n].blob.size+overhead(pdfs[n].name);if(next+22>limit)throw new Error('One inspection PDF exceeds the email limit. Download that PDF or use Share ZIP.');if(indexes.length&&bytes+next>limit)await flush();indexes.push(n);bytes+=next;}
 await flush();return parts;
}
/** Never repeat confirmed parts, and stop on an uncertain result before sending further mail. */
export async function sendPreparedParts(parts:EmailPart[],send:(part:EmailPart,index:number)=>Promise<Batch>,update:(batch:Batch)=>Promise<void>){
 for(let n=0;n<parts.length;n++){
  const part=parts[n];if(isSent(part.batch))continue;
  if(part.batch.status==='unknown')throw new Error('Check Gmail Sent for part '+(n+1)+' before continuing. No uncertain email was retried.');
  const result=await send(part,n);part.batch=result;await update(result);
  if(!isSent(result))throw new Error(result.error||'Email part was not confirmed.');
 }
}
