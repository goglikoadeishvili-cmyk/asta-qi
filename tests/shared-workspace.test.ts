import {test} from 'node:test';import assert from 'node:assert/strict';
import {getRecords,getFiles,putRecord,storeFile,selectWorkspaceStore} from '../source/lib/store';
import {syncWorkspace} from '../source/lib/shared/sync';
import {fingerprint,migrationCopies,type SharedTransport,type RemoteRecord,type RemoteFile,type Checkpoint} from '../source/lib/shared/protocol';
import {parseWorkspaceConfig} from '../source/lib/shared/config';
const databases=new Map<string,{records:Map<string,any>;files:Map<string,any>}>();
(globalThis as any).indexedDB={open(name:string){const req:any={};queueMicrotask(()=>{let state=databases.get(name);if(!state){state={records:new Map(),files:new Map()};databases.set(name,state)}req.result={transaction(){const tx:any={};let pending=0;const op=(fn:()=>any)=>{pending++;const r:any={};queueMicrotask(()=>{try{r.result=fn();r.onsuccess?.()}catch(e){r.error=e;tx.onerror?.()}finally{pending--;queueMicrotask(()=>{if(pending===0)tx.oncomplete?.()})}});return r;};tx.objectStore=(key:'records'|'files')=>({getAll:()=>op(()=>[...state![key].values()]),get:(id:string)=>op(()=>state![key].get(id)),put:(r:any)=>op(()=>state![key].set(r.id,structuredClone(r))),delete:(id:string)=>op(()=>state![key].delete(id))});return tx;}};req.onsuccess?.()});return req;}};
const project={id:'p',kind:'project',name:'Project',floors:[],createdAt:'2026-11-03'} as any;
function server(){const records=new Map<string,RemoteRecord>(),files=new Map<string,{meta:RemoteFile;blob:Blob}>();let uploads=0;const transport:SharedTransport={
 async records(){return structuredClone([...records.values()])},async files(){return [...files.values()].map(x=>x.meta)},
 async write(payload,expected){const old=records.get(payload.id);if(old&&fingerprint(old.payload)===fingerprint(payload))return {conflict:false,record:structuredClone(old)};if(old&&old.revision!==expected)return {conflict:true,record:structuredClone(old)};const row={id:payload.id,payload:structuredClone(payload),revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};records.set(row.id,row);return {conflict:false,record:structuredClone(row)}},
 async upload(f){uploads++;files.set(f.id,{blob:f.blob,meta:{id:f.id,size:f.size,type:f.type,name:f.name,created_at:f.createdAt}})},async download(f){return files.get(f.id)!.blob},async usage(){return {used:[...files.values()].reduce((n,f)=>n+f.blob.size,0),limit:1024**3}}
 };return {transport,records,files,uploads:()=>uploads};}
function inspection(id:string,fileId:string){return {id,kind:'inspection',projectId:'p',drawingId:'d',reference:'QI-'+id,version:1,pin:{page:1,x:.4,y:.6},comments:'Original',photos:[{id:fileId,name:'site.jpg'}],status:'Pass'} as any;}
test('shared workspace reconciles three desktop and four phone records, with original bytes and concurrent edits retained',async()=>{
 const backend=server();selectWorkspaceStore('test','desktop');const f=await storeFile(new Blob(['original-photo'],{type:'image/jpeg'}),'site.jpg');await putRecord(project);await putRecord({id:'d',kind:'drawing',projectId:'p',fileId:f.id,page:1} as any);for(const id of ['one','two','three'])await putRecord(inspection(id,f.id));let desktop=(await syncWorkspace(backend.transport,{})).checkpoints;
 selectWorkspaceStore('test','phone');let phone=(await syncWorkspace(backend.transport,{})).checkpoints;assert.equal((await getRecords()).filter(r=>r.kind==='inspection').length,3);assert.equal(await(await getFiles())[0].blob.text(),'original-photo');await putRecord(inspection('four',f.id));phone=(await syncWorkspace(backend.transport,phone)).checkpoints;
 selectWorkspaceStore('test','desktop');desktop=(await syncWorkspace(backend.transport,desktop)).checkpoints;assert.equal((await getRecords()).filter(r=>r.kind==='inspection').length,4);assert.equal(backend.uploads(),1,'one stored copy of shared evidence');
 await putRecord({...inspection('one',f.id),version:2,comments:'Desktop edit'});
 selectWorkspaceStore('test','phone');await putRecord({...inspection('one',f.id),version:2,comments:'Phone edit'});phone=(await syncWorkspace(backend.transport,phone)).checkpoints;
 selectWorkspaceStore('test','desktop');const result=await syncWorkspace(backend.transport,desktop);assert.equal(result.conflicts,1);const records=await getRecords();assert.equal((records.find(r=>r.id==='one') as any).comments,'Phone edit');assert.ok(records.some(r=>r.kind==='inspection'&&r.reference.includes('REVIEW')&&r.comments.includes('Desktop edit')));
 selectWorkspaceStore('other-workspace','desktop');assert.equal((await getRecords()).length,0,'workspace caches cannot mix');
});
test('failed uploads retain local evidence and pending work for retry',async()=>{
 selectWorkspaceStore('retry','user');const backend=server(),f=await storeFile(new Blob(['pending-photo'],{type:'image/jpeg'}),'site.jpg');await putRecord(inspection('pending',f.id));const failed={...backend.transport,upload:async()=>{throw new Error('Offline')}};await assert.rejects(()=>syncWorkspace(failed,{}),/Offline/);assert.equal((await getRecords()).length,1);assert.equal((await getFiles()).length,1);await syncWorkspace(backend.transport,{});assert.ok(backend.records.has('pending'));
});
test('migration keeps the same project together, preserves conflicting inspections and strips credentials',async()=>{
 const local=[project,{id:'d',kind:'drawing',projectId:'p',fileId:'photo',page:1},inspection('one','photo'),{id:'settings',kind:'settings',emailToken:'SECRET'}] as any;
 const remote=[{id:'p',revision:1,payload:{...project,name:'Existing shared name'},updated_at:''},{id:'one',revision:2,payload:{...inspection('one','photo'),comments:'Already shared'},updated_at:''}] as any;
 const copied=await migrationCopies(local,remote);const p=copied.find(r=>r.kind==='project')!,d=copied.find(r=>r.kind==='drawing') as any,i=copied.find(r=>r.kind==='inspection') as any;assert.equal(p.id,'p','the same project stays together across devices');assert.equal(d.projectId,p.id);assert.equal(d.id,'d');assert.equal(i.projectId,p.id);assert.equal(i.drawingId,d.id);assert.equal(i.status,'Pending');assert.equal((copied.find(r=>r.kind==='settings') as any).emailToken,'');assert.equal(local[1].id,'d','old records remain unchanged');
});
test('workspace change stops an in-flight import and missing cloud bytes cannot claim success',async()=>{
 selectWorkspaceStore('guard','user');const backend=server();backend.records.set('i',{id:'i',payload:inspection('i','a'.repeat(64)),revision:1,updated_at:''});await assert.rejects(()=>syncWorkspace(backend.transport,{}),/referenced file is missing/);assert.equal((await getRecords()).length,0);
 backend.records.clear();backend.records.set('p',{id:'p',payload:project,revision:1,updated_at:''});await assert.rejects(()=>syncWorkspace(backend.transport,{},()=>{},()=>{throw new Error('Workspace changed')}),/Workspace changed/);assert.equal((await getRecords()).length,0);
});
test('configuration rejects secret keys and non-HTTPS endpoints',()=>{
 assert.equal(parseWorkspaceConfig({url:'',publishableKey:'',workspaceId:''}),null);const config={url:'https://example.supabase.co',publishableKey:'sb_publishable_example',workspaceId:'11111111-1111-1111-1111-111111111111'};assert.equal(parseWorkspaceConfig(config)?.workspaceId,config.workspaceId);assert.throws(()=>parseWorkspaceConfig({...config,publishableKey:'sb_secret_do-not-publish'}),/secret/i);assert.throws(()=>parseWorkspaceConfig({...config,url:'http://example.test'}),/Invalid/);
});

test('repeating migration never overwrites an imported alternative edited in the shared workspace',async()=>{
 const original=inspection('existing','photo'),remote=[{id:'existing',payload:{...original,comments:'Already shared'},revision:1,updated_at:''}] as any;const first=await migrationCopies([original],remote);const edited={...first[0],comments:'Reviewed and corrected in shared workspace'} as any;const again=await migrationCopies([original],[...remote,{id:edited.id,payload:edited,revision:2,updated_at:''}]);assert.equal((again[0] as any).comments,edited.comments);
});
