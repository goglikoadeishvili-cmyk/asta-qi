import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {WorkspaceConfig} from './config';
import type {SharedTransport,RemoteRecord,RemoteFile} from './protocol';
import type {RecordItem,Batch} from '../model';
import type {StoredFile} from '../store';
export function createWorkspaceClient(config:WorkspaceConfig){return createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'asta-shared-auth:'+config.url},global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal||AbortSignal.timeout(60000)})}});}
function check<T>(result:{data:T|null;error:any}):T{if(result.error)throw new Error(result.error.message||'Shared storage request failed.');return result.data as T;}
async function pages<T>(query:(start:number,end:number)=>any){const result:T[]=[];for(let start=0;;start+=500){const rows=check<T[]>(await query(start,start+499));result.push(...rows);if(rows.length<500)return result;}}
export function workspaceTransport(client:SupabaseClient,workspaceId:string):SharedTransport{
 const rpc=async(name:string,args:any)=>check<any>(await client.rpc(name,{p_workspace:workspaceId,...args}));
 return {
  records:()=>pages<RemoteRecord>((a,b)=>client.from('qa_records').select('id,payload,revision,updated_at').eq('workspace_id',workspaceId).order('id').range(a,b)),
  files:()=>pages<RemoteFile>((a,b)=>client.from('qa_files').select('id,name,type,size,created_at').eq('workspace_id',workspaceId).eq('ready',true).order('id').range(a,b)),
  write:async(record:RecordItem,expected:number)=>rpc('qa_write_record',{p_id:record.id,p_expected:expected,p_payload:record}),
  async upload(file:StoredFile){const reservation=await rpc('qa_reserve_file',{p_id:file.id,p_name:file.name,p_type:file.type||'application/octet-stream',p_size:file.size});if(reservation.ready)return;
   const result=await client.storage.from('qa-evidence').upload(workspaceId+'/'+file.id,file.blob,{contentType:file.type||'application/octet-stream',upsert:false});
   if(result.error&&String((result.error as any).statusCode)!=='409'&&!/already exists|duplicate/i.test(result.error.message))throw new Error(result.error.message);
   await rpc('qa_commit_file',{p_id:file.id});
  },
  async download(file){return check<Blob>(await client.storage.from('qa-evidence').download(workspaceId+'/'+file.id));},
  usage:async()=>{const value=await rpc('qa_storage_usage',{});return {used:Number(value.used),limit:Number(value.limit)};}
 };
}
export async function workspaceMembership(client:SupabaseClient,workspaceId:string,userId:string){return check<any>(await client.from('qa_members').select('role,workspace_id,qa_workspaces(name)').eq('workspace_id',workspaceId).eq('user_id',userId).single());}
export async function claimWorkspaceEmail(client:SupabaseClient,workspaceId:string,batch:Batch){return check<any>(await client.rpc('qa_claim_email',{p_workspace:workspaceId,p_id:batch.id,p_payload:batch}));}
