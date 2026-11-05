import {createInspectionAt} from '../source/lib/new-inspection';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {questions,stages,wallTypes,answerOptions} from '../source/lib/catalogue';import {inspectionsForProject,validateInspection,assertProjectInspection,projectOf,DEFAULT_PROJECT_ID,allInspectionAnswers,reportInspectionAnswers} from '../source/lib/model';
import {migrateProjects} from '../source/lib/projects';
import {pinScale} from '../source/lib/pin-size';
import {locationForPin} from '../source/lib/drawing-location';
import {validateZip,handle} from '../email-gateway/worker';import JSZip from 'jszip';
const id='d250df5b-42c7-45f0-a452-4ea18841d856';
function sample(){return {id,kind:'inspection',reference:'QA-TEST',floor:'OB1',drawingId:'d',pin:{x:.5,y:.5,page:1},wallType:'IWL-1',location:'Grid C8',description:'Checked frame',photos:[{id:'p'}],status:'Pass',answers:questions('IWL-1',stages[0]).map(a=>({...a,answer:'Verified on site',result:'Pass'})),approvalRef:'',approvedBuildUp:'',defects:'',corrective:''} as any;}
test('wall catalogue uses project wall codes and requires an explicit answer',()=>{assert.deepEqual(wallTypes.map(w=>w.id),['IWL-1','IWL-2','IWL-3','IWS-1','IWS-2','BLK-1']);for(const w of wallTypes)for(const s of stages){const list=questions(w.id,s);assert.ok(list.length>=1);assert.ok(list.every(a=>a.result==='Pending'&&a.answer===''&&a.source));}});
test('Pass cannot conceal pending answers, missing photos or unapproved IWS conflict',()=>{const i=sample();validateInspection(i);assert.throws(()=>validateInspection({...i,photos:[]}));assert.throws(()=>validateInspection({...i,answers:[{answer:'',result:'Pending'}]}));validateInspection({...i,wallType:'IWS-1'});assert.throws(()=>validateInspection({...i,wallType:'IWS-2'}));validateInspection({...i,wallType:'IWS-1',approvalRef:'RFI 001 approved',approvedBuildUp:'Confirmed build-up'});assert.throws(()=>validateInspection({...i,status:'Fail'}));assert.throws(()=>validateInspection({...i,pin:{x:1.1,y:.2,page:1}}));});
function database(){const rows=new Map<string,any>();return {rows,prepare(sql:string){return {bind(...a:any[]){return {async first(){return rows.get(a[0])||null},async run(){if(sql.startsWith('INSERT')){if(rows.has(a[0]))throw new Error('unique');rows.set(a[0],{id:a[0],payload_hash:a[1],recipient:a[2],subject:a[3],created_at:a[4],status:'pending',size:a[5]});return {meta:{changes:1}};}if(sql.includes("status='accepted'")){Object.assign(rows.get(a[2]),{status:'accepted',provider_id:a[0],accepted_at:a[1]});return {meta:{changes:1}};}if(sql.includes("status='pending'")){const row=rows.get(a[0]);if(row.status!=='failed')return {meta:{changes:0}};row.status='pending';return {meta:{changes:1}};}if(sql.includes("status='unknown'")){Object.assign(rows.get(a[1]),{status:'unknown',error:a[0]});return {meta:{changes:1}};}Object.assign(rows.get(a[2]),{status:a[0],error:a[1]});return {meta:{changes:1}};}}}}}};}
async function zip(){const z=new JSZip();z.file('QA-001-v1.pdf','%PDF-1.7\nOne report');z.file('QA-002-v1.pdf','%PDF-1.7\nSecond report');return z.generateAsync({type:'uint8array',compression:'STORE'});}
async function req(bytes:Uint8Array,link=false){const f=new FormData();f.set('zip',new File([bytes as BlobPart],'reports.zip',{type:'application/zip'}));f.set('id',id);f.set('to','recipient@example.test');f.set('subject','QA reports');f.set('message','Please review.');f.set('linkInstead',String(link));return new Request('https://gateway.example.test/send',{method:'POST',headers:{Authorization:'Bearer '+'a'.repeat(40)},body:f});}
function env(){return {DB:database(),REPORTS:{async put(...args:any[]){return args}},PERSONAL_TOKEN:'a'.repeat(40),RESEND_API_KEY:'test-only',EMAIL_FROM:'QA <qa@example.test>',APP_ORIGIN:'https://app.example.test'};}
test('one provider request sends exactly one ZIP containing two PDFs; retry is idempotent',async()=>{const e=env(),bytes=await zip();assert.equal(validateZip(bytes),2);const original=globalThis.fetch;let count=0;globalThis.fetch=async(_url,options)=>{count++;const payload=JSON.parse(String(options?.body));assert.equal(payload.to.length,1);assert.equal(payload.attachments.length,1);const content=Buffer.from(payload.attachments[0].content,'base64');assert.equal(validateZip(new Uint8Array(content)),2);return Response.json({id:'provider-confirmed'});};try{assert.equal((await handle(await req(bytes),e)).status,200);assert.equal((await handle(await req(bytes),e)).status,200);assert.equal(count,1);assert.equal(e.DB.rows.get(id).status,'accepted');}finally{globalThis.fetch=original;}});
test('provider rejection stays failed; network uncertainty cannot mark sent or blindly retry',async()=>{const bytes=await zip(),e=env(),original=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({message:'Rejected'},{status:422});await handle(await req(bytes),e);assert.equal(e.DB.rows.get(id).status,'failed');let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('network lost')};await handle(await req(bytes),e);assert.equal(e.DB.rows.get(id).status,'unknown');await handle(await req(bytes),e);assert.equal(calls,1);assert.notEqual(e.DB.rows.get(id).status,'accepted');}finally{globalThis.fetch=original;}});
test('oversize attachment offers link; secure link mode uses no attachment',async()=>{const e={...env(),ATTACHMENT_LIMIT_MB:'0.0001'},bytes=await zip(),original=globalThis.fetch;assert.equal((await handle(await req(bytes),e)).status,413);let calls=0;globalThis.fetch=async(_url,options)=>{calls++;const payload=JSON.parse(String(options?.body));assert.equal(payload.attachments.length,0);assert.match(payload.text,/\/download\/[a-f0-9]{64}/);return Response.json({id:'accepted-link'});};try{assert.equal((await handle(await req(bytes,true),e)).status,200);assert.equal(calls,1);}finally{globalThis.fetch=original;}});
test('gateway blocks unauthorised requests and non-PDF ZIP contents',async()=>{const e=env();assert.equal((await handle(new Request('https://gateway.example.test/send',{method:'POST'}),e)).status,401);const z=new JSZip();z.file('malware.html','hello');const bytes=await z.generateAsync({type:'uint8array'});assert.throws(()=>validateZip(bytes));});

test('head and base tracks have separate washer checks before framing',()=>{for(const id of ['IWL-1','IWL-2','IWS-1']){const list=questions(id,stages[0]);assert.deepEqual(list.map(q=>q.id),['tracks','base-tracks','metal-frame']);assert.match(list[0].expected,/2 FireLine/);assert.match(list[0].expected,/1 x 12.5 mm black/);assert.match(list[0].expected,/washers at all head fixings/);assert.match(list[0].expected,/2 rows of acoustic sealant/);assert.match(list[1].expected,/2 x 12.5 mm blue.*25 mm/);assert.match(list[1].expected,/washers at all base fixings/);}assert.doesNotMatch(questions('IWS-2',stages[0])[1].expected,/600 mm centres/);});
test('boarding asks about fixed plates without mandatory measurements or manufacturer wording',()=>{const q=questions('IWL-2',stages[2]);assert.deepEqual(q.map(q=>q.id),['pre-board-plate','boarding','final-plate']);assert.ok(!q[0].requiresHeadMeasurement);assert.match(q[0].expected,/securely fixed/);assert.doesNotMatch(q.map(x=>x.expected).join(' '),/Knauf|ALPHA|head offset|150 mm|70 mm/);});
test('Pending reopens and can become Pass with existing inspection photos, without a photo quota per question',()=>{const i={...sample(),templateVersion:2,stage:stages[2],answers:questions('IWL-2',stages[2]).map(q=>({...q,answer:q.expected,result:'Pass'})),photos:[{id:'one',questionId:'pre-board-plate'},{id:'two',questionId:'boarding'}],status:'Pending'} as any;validateInspection(i);i.status='Pass';validateInspection(i);validateInspection({...i,photos:[i.photos[0]]});assert.throws(()=>validateInspection({...i,photos:[]}),/evidence photo/);validateInspection({...i,status:'Pending',photos:[],answers:[],description:''});});
test('boarding refers to manufacturer guidance instead of claiming its installation detail is on the drawing',()=>{const q=questions('IWL-2',stages[2])[1];assert.match(q.question,/manufacturer/);assert.match(q.expected,/manufacturer/);assert.doesNotMatch(q.expected,/Knauf|ALPHA/);assert.match(q.expected,/5-7 mm/);assert.doesNotMatch(q.expected,/mastic|sealant|sealed gaps/i);});
test('project inspection list retains framing and boarding across different floors and statuses',()=>{const metal={...sample(),id:'metal',projectId:'p',floor:'MO1',stage:stages[0],status:'Pass'};const board={...sample(),id:'board',projectId:'p',floor:'GF',stage:stages[2],status:'Pending'};const other={...board,id:'other',projectId:'elsewhere'};const records=[metal,board,other] as any;assert.deepEqual(inspectionsForProject(records,'p').map(i=>i.id),['metal','board']);board.status='Pass';assert.deepEqual(inspectionsForProject(records,'p').map(i=>i.id),['metal','board']);assert.equal(metal.status,'Pass');});
test('legacy project migration preserves original inspection / pin data and project scope blocks cross-project records',()=>{const old={...sample(),version:3,projectId:undefined};const updates=migrateProjects([old]);const migrated=updates.find(r=>r.id===old.id) as any;assert.equal(migrated.projectId,DEFAULT_PROJECT_ID);assert.deepEqual(migrated.pin,old.pin);assert.equal(migrated.version,3);const d={id:'d',kind:'drawing',floor:'OB1',page:1,projectId:'project-a'} as any;assert.throws(()=>assertProjectInspection({...old,projectId:'project-b'},[d],'project-a'));assertProjectInspection({...old,projectId:'project-a'},[d],'project-a');const generic=questions('Wall X',stages[0],'generic','Own project specification, measured centres to drawing');assert.doesNotMatch(generic.map(q=>q.expected).join(' '),/NEOS|CineWALL|600 mm/);});
test('touch marker counter-scale keeps a small visible pin when the browser is pinch-zoomed; desktop stays unchanged',()=>{for(const zoom of [1,2,5,10])assert.equal(18*zoom*pinScale(zoom,true),18);assert.equal(pinScale(5,false),1);assert.equal(pinScale(NaN,true),1);});
test('pin location uses the correct floor grid and avoids invented room names / uncalibrated grids',()=>{const drawing={floor:'MO1',reference:'TIG-RYD-00-00-DDR-A-10-0103',revision:'C1',fileId:'809d54646a8c4de3ebb267f1ce3debb3673d45cab345dcdf0fc12e898cc236cd'} as any;assert.equal(locationForPin(drawing,{x:.4,y:.42,page:3}),'Mezzanine MO1 · Grid E–F / 9–10');assert.match(locationForPin(drawing,{x:.5,y:.5,page:3}),/Grid F–G \/ 10–11/);assert.match(locationForPin({...drawing,revision:'C2'},{x:.4,y:.42,page:3}),/Drawing position X 40.0% \/ Y 42.0%/);assert.match(locationForPin(drawing,{x:.9,y:.5,page:3}),/Drawing position/);});

test('moving into boarding retains the earlier framing checks and requires their evidence too',()=>{const earlier=questions('IWL-2',stages[0]).map(q=>({...q,answer:q.expected,result:'Pass'}));const active=questions('IWL-2',stages[2]).map(q=>({...q,answer:q.expected,result:'Pass',headOffsetMm:'250',detailReference:'TEST DETAIL'}));const i={...sample(),templateVersion:2,stage:stages[2],sections:{[stages[0]]:earlier},answers:active,photos:[...earlier,...active].map(q=>({id:q.id,questionId:q.id}))} as any;assert.equal(allInspectionAnswers(i).length,6);assert.deepEqual(reportInspectionAnswers(i).map(a=>a.id),active.map(a=>a.id));validateInspection(i);i.photos=i.photos.filter((p:any)=>p.questionId!=='tracks');validateInspection(i);});

test('framing and boarding at the same pin are independent records with no copied evidence',()=>{const drawing={id:'drawing-a',floor:'MO1',page:3,name:'Current plan',reference:'A-103',revision:'C2',projectId:'project-a'} as any;const project={id:'project-a',qaProfile:'neos'} as any;const pin={x:.4,y:.5,page:3};const frame=createInspectionAt(drawing,project,pin,stages[0]);frame.photos=[{id:'original-site-photo',questionId:'tracks'}] as any;frame.answers=questions('IWL-2',stages[0]).map(q=>({...q,answer:q.expected,result:'Pass'}));const board=createInspectionAt(drawing,project,pin,stages[2]);assert.notEqual(board.id,frame.id);assert.notEqual(board.reference,frame.reference);assert.deepEqual(board.pin,frame.pin);assert.equal(board.drawingId,frame.drawingId);assert.equal(board.stage,stages[2]);assert.equal(board.photos.length,0);assert.equal(board.answers.length,0);assert.equal(board.sections,undefined);assert.equal(frame.answers.length,3);assert.equal(frame.photos.length,1);assert.equal(frame.stage,stages[0]);});

import {prepareBatch} from '../source/lib/archive';
import {gmailRaw,sendGmail,GmailSendError,GMAIL_ZIP_LIMIT,connectGmail} from '../source/lib/gmail';
test('report ZIP contains only clearly named PDFs and no loose originals or JSON',async()=>{const a={...sample(),reference:'QA-ONE',floor:'GF',stage:'Tracks & metal framing',version:1},b={...a,id:'other',reference:'QN-TWO',stage:'Plasterboard'};const result=await prepareBatch([a,b] as any,async i=>new Blob(['%PDF-1.7\n'+i.reference]));const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());assert.deepEqual(Object.keys(zip.files),['Metal inspection - GF - QI-ONE - v1.pdf','Plasterboard inspection - GF - QI-TWO - v1.pdf']);assert.equal(validateZip(new Uint8Array(await result.blob.arrayBuffer())),2);});
test('Gmail MIME sends one recipient and one unchanged ZIP with Unicode subject/message',async()=>{const bytes=await zip();const raw=await gmailRaw({from:'sender@example.test',to:'recipient@example.test',subject:'QI — შემოწმება',message:'გამარჯობა\nPlease review.',zip:new Blob([bytes]),batchId:id});const mime=Buffer.from(raw.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString();assert.equal((mime.match(/Content-Disposition: attachment/g)||[]).length,1);assert.match(mime,/To: recipient@example.test\r\n/);const part=mime.split('Content-Disposition: attachment; filename="ASTA-Quality-Inspection-reports.zip"')[1];const payload=part.split('\r\n\r\n')[1].split('\r\n--')[0];assert.deepEqual(new Uint8Array(Buffer.from(payload,'base64')),bytes);await assert.rejects(()=>gmailRaw({from:'sender@example.test',to:'a@example.test\r\nBcc: b@example.test',subject:'QI',message:'Hello',zip:new Blob([bytes]),batchId:id}),/valid recipient/);await assert.rejects(()=>gmailRaw({from:'sender@example.test',to:'recipient@example.test',subject:'QI',message:'Hello',zip:new Blob([new Uint8Array(GMAIL_ZIP_LIMIT+1)]),batchId:id}),/attachment limit/);});
test('Gmail confirms only a success with message ID, preserving rejected and uncertain outcomes',async()=>{let calls=0;assert.equal(await sendGmail('encoded','test-token',async(url,opts)=>{calls++;assert.equal(url,'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');assert.deepEqual(JSON.parse(String(opts?.body)),{raw:'encoded'});return Response.json({id:'gmail-message-id'})}),'gmail-message-id');assert.equal(calls,1);await assert.rejects(()=>sendGmail('encoded','test-token',async()=>Response.json({error:{message:'Denied'}},{status:403})),(e:any)=>e instanceof GmailSendError&&!e.uncertain);for(const response of [async()=>{throw new Error('connection lost')},async()=>Response.json({error:{message:'Provider unavailable'}},{status:503}),async()=>Response.json({})])await assert.rejects(()=>sendGmail('encoded','test-token',response),(e:any)=>e instanceof GmailSendError&&e.uncertain);});
test('Gmail account connection rejects a different sender and revokes its token',async()=>{const originalFetch=globalThis.fetch;const prior=(globalThis as any).window;let revoked=false;(globalThis as any).window={google:{accounts:{oauth2:{hasGrantedAllScopes:()=>true,revoke:()=>{revoked=true},initTokenClient:(c:any)=>({requestAccessToken:()=>c.callback({access_token:'test-only',expires_in:3600})})}}}};globalThis.fetch=async()=>Response.json({email:'other@example.test',email_verified:true});try{await assert.rejects(()=>connectGmail('test.apps.googleusercontent.com','sender@example.test'),/Choose the sender account/);assert.ok(revoked);}finally{globalThis.fetch=originalFetch;(globalThis as any).window=prior;}});

import {markManualSent,deliveryDue,planCleanup,emailState,RETENTION_MS,retentionText,neededCloudFiles} from '../source/lib/delivery';
import {mergeCloudRecords,cloudRecord} from '../source/lib/cloud-sync';
test('sent cleanup requires an external original-photo backup, waits seven days and preserves PDFs/pins',()=>{const start=Date.parse('2026-11-02T12:00:00Z');const b={id:'b',kind:'batch',status:'prepared',inspectionIds:[id],versions:[3],reportIds:['pdf'],zipId:'zip',includesOriginals:true,downloadedAt:new Date(start).toISOString()} as any;assert.throws(()=>markManualSent({...b,downloadedAt:undefined},true));assert.throws(()=>markManualSent(b,false));const sent=markManualSent(b,true,new Date(start).toISOString());assert.equal(sent.provider,'manual');assert.equal(sent.providerId,undefined);assert.equal(emailState(sent),'Sent');assert.equal(deliveryDue(sent),start+RETENTION_MS);const i={...sample(),version:3};const files=[{id:'p',size:100,type:'image/jpeg'},{id:'pdf',size:50,type:'application/pdf'},{id:'zip',size:200,type:'application/zip'}];assert.equal(planCleanup([i,sent],files,start+RETENTION_MS-1).fileIds.length,0);const plan=planCleanup([i,sent],files,start+RETENTION_MS);assert.deepEqual(plan.fileIds,['p','zip']);assert.equal(plan.bytes,300);const saved=plan.records.find(r=>r.kind==='inspection') as any;assert.deepEqual(saved.pin,i.pin);assert.deepEqual(saved.photos,i.photos);assert.ok(saved.evidencePurgedAt);assert.equal(planCleanup([i,{...sent,backupConfirmedAt:undefined}],files,start+RETENTION_MS).fileIds.length,0);const shared={...i,id:'other',version:1};assert.deepEqual(planCleanup([i,shared,sent],files,start+RETENTION_MS).fileIds,['zip']);assert.equal(planCleanup([{...i,version:4},sent],files,start+RETENTION_MS).records.some(r=>r.kind==='inspection'),false);assert.ok(planCleanup([i,sent],files,start,'b').fileIds.includes('p'));assert.match(retentionText(sent,start),/7d/);assert.ok(!neededCloudFiles([saved,{...sent,purgedAt:'done'}]).has('p'));assert.ok(neededCloudFiles([saved,{...sent,purgedAt:'done'}]).has('pdf'));});
test('cloud merge retains concurrent inspections as Pending REVIEW copies and preserves accepted email history',()=>{const a={...sample(),version:2,comments:'Device A'},b={...a,comments:'Device B'};const snapshots=[{record:a,hash:'a'.repeat(64),serverTime:'2026-11-02T12:00:00Z'},{record:b,hash:'b'.repeat(64),serverTime:'2026-11-02T12:01:00Z'}] as any;const merged=mergeCloudRecords([a],snapshots);assert.equal(merged.conflicts,1);assert.equal(merged.records.filter(r=>r.kind==='inspection').length,2);assert.equal((merged.records.find(r=>r.id===id) as any).comments,'Device B');assert.equal((merged.records.find(r=>r.id!==id) as any).status,'Pending');const accepted={id:'batch',kind:'batch',status:'accepted',providerId:'confirmed'} as any,prepared={...accepted,status:'prepared'};assert.equal((mergeCloudRecords([prepared],[{record:accepted,hash:'x',serverTime:'2026-11-01'},{record:prepared,hash:'y',serverTime:'2026-11-02'}]).records[0] as any).status,'accepted');assert.equal((cloudRecord({id:'settings',kind:'settings',emailToken:'secret',gmailClientId:'public'} as any) as any).emailToken,'');});
test('two automatic archive timestamps for the same delivered batch never resurrect a review copy',()=>{const original={...sample(),version:2,deletedAt:'2026-11-09T12:00:01Z',archivedByBatch:'delivered'};const later={...original,deletedAt:'2026-11-09T12:01:00Z'};const result=mergeCloudRecords([original],[{record:original,hash:'a',serverTime:'2026-11-09T12:00:01Z'},{record:later,hash:'b',serverTime:'2026-11-09T12:01:00Z'}] as any);assert.equal(result.conflicts,0);assert.equal(result.records.length,1);assert.ok((result.records[0] as any).deletedAt);});

import {excerptGeometry} from '../source/lib/report-geometry';
test('drawing excerpt maps the saved normalised pin correctly, including all page edges',()=>{for(const x of [0,.1,.5,.9,1])for(const y of [0,.5,1]){const g=excerptGeometry(2600,1800,{x,y,page:3});assert.ok(g.px>=g.padding&&g.px<=g.targetWidth-g.padding);assert.ok(g.py>=g.padding&&g.py<=g.targetHeight-g.padding);const originalX=g.sx+(g.px-g.padding)*g.sw/(g.targetWidth-2*g.padding),originalY=g.sy+(g.py-g.padding)*g.sh/(g.targetHeight-2*g.padding);assert.ok(Math.abs(originalX/2600-x)<1e-10);assert.ok(Math.abs(originalY/1800-y)<1e-10);}});

test('PDF-only manual send never authorises original-photo cleanup',()=>{const b={kind:'batch',status:'prepared',downloadedAt:'2026-11-02',includesOriginals:false} as any;const sent=markManualSent(b,true);assert.equal(sent.status,'manual-sent');assert.equal(sent.backupConfirmedAt,undefined);assert.match(retentionText(sent),/Original photos retained/);});

import {photoRowCount,proportionalFit,evidencePhotoHeight,packPhotoRows} from '../source/lib/report-layout';
import {makeReport} from '../source/lib/pdf';
import {PDFDocument} from 'pdf-lib';
test('photo evidence is arranged in 4-column rows and proportional fit never crops or skews',()=>{
 assert.equal(photoRowCount(2),1);assert.equal(photoRowCount(3),1);assert.equal(photoRowCount(4),1);assert.equal(photoRowCount(12),3);assert.equal(photoRowCount(5),2);
 const fit=proportionalFit(945,2048,256,165);
 assert.ok(fit.height<=165&&fit.width<=256);
 assert.ok(Math.abs(fit.width/fit.height-945/2048)<.00001);
 const landscape=proportionalFit(2400,1200,256,165);assert.equal(landscape.width,256);assert.equal(landscape.height,128);
 assert.ok(evidencePhotoHeight(522,132,2)>=110);
 assert.deepEqual(packPhotoRows([80,80,80,80],n=>n,531),[[80,80,80,80]]);
 assert.deepEqual(packPhotoRows([160,160,160,160],n=>n,531),[[160,160,160],[160]]);
});
test('real PDF generator fits three checks and twelve photos on one A4 and safely continues extra evidence',{timeout:15000},async()=>{
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABICAIAAACyfKYoAAAAc0lEQVR42u3QMQEAAAgDILV/55liH0Rgkwx9p0C0aESLFo1o0YgWLRrRohEtWjSiRSNatGhEi0a0aNGIFo1o0aIRLRrRokUjWjSiRYtGtGhEixaNaNGIFi0a0aIRLVo0okUjWrRoRItGtGjRiBaNaNGiaXloqgONOLflLQAAAABJRU5ErkJggg==';
 const photograph=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEgAAAB4CAIAAADe9SO9AAAApElEQVR4nO3PAQ3AIADAMMC/EixgAVFX8Tx7WgXb3OeOP1pfB7zFWI2xGmM1xmqM1RirMVZjrMZYjbEaYzXGaozVGKsxVmOsxliNsRpjNcZqjNUYqzFWY6zGWI2xGmM1xmqM1RirMVZjrMZYjbEaYzXGaozVGKsxVmOsxliNsRpjNcZqjNUYqzFWY6zGWI2xGmM1xmqM1RirMVZjrMZYjbEaYzUPB40DIaOfnagAAAAASUVORK5CYII=','base64');
 const oldFetch=globalThis.fetch,oldDocument=(globalThis as any).document;
 const canvas=()=>({width:2400,height:1600,getContext:()=>({
  fillRect(){},drawImage(){},beginPath(){},arc(){},fill(){},stroke(){},measureText(s:string){return {width:s.length*7}},fillText(){},lineWidth:1,fillStyle:'',strokeStyle:'',font:''
 }),toDataURL:()=>png});
 (globalThis as any).document={createElement:(tag:string)=>{assert.equal(tag,'canvas');return canvas();}};
 globalThis.fetch=async(url:any)=>String(url).includes('branding/')?new Response('',{status:404}):new Response(photograph,{status:200,headers:{'content-type':'image/png'}});
 try{
  const drawing={id:'d',reference:'A-103',revision:'C1',page:1,fileId:'drawing',floor:'MO1',floorName:'Mezzanine'} as any;
  const base={...sample(),stage:stages[0],date:'2026-11-02',reference:'QI-SAMPLE',location:'Mezzanine - grid K-L / 11',
   drawingSnapshot:{name:'Mezzanine',reference:'A-103',revision:'C1',page:1},
   answers:questions('IWL-1',stages[0]).map(q=>({...q,answer:q.expected,result:'Pass'})),
   photos:[{id:'a',name:'a.jpg',caption:'',questionId:'tracks'},{id:'b',name:'b.jpg',caption:'',questionId:'metal-frame'}],
   comments:'',specification:'Current drawing',approvalRef:'',createdAt:'2026-11-02T10:00:00Z',updatedAt:'2026-11-02T10:00:00Z',version:1
  } as any;
  const settings={inspector:'Goga',reportingCompany:'ACL',name:'ASTA'} as any,project={name:'NEOS - Haymarket House'} as any;
  const urlFor=(id:string)=>'https://fixture.example.test/'+id;
  const render=async()=>({canvas:canvas() as any,count:1});
  const pdf=await makeReport(base,drawing,settings,urlFor,project,render);
  const first=await PDFDocument.load(await pdf.arrayBuffer());
  assert.equal(first.getPageCount(),1,'one normal inspection must fit one A4');
  const boardAnswers=questions('IWL-2',stages[2]).map(q=>({...q,answer:q.expected,result:'Pass'}));
  const boarding={...base,stage:stages[2],answers:boardAnswers,photos:boardAnswers.flatMap((q,n)=>Array.from({length:4},(_,p)=>({id:'board-'+n+'-'+p,name:'photo.jpg',caption:'',questionId:q.id})))};
  const compact=await PDFDocument.load(await(await makeReport(boarding,drawing,settings,urlFor,project,render)).arrayBuffer());
  assert.equal(compact.getPageCount(),1,'three current boarding questions and four photos each fit one A4');
  const metalNine={...base,answers:questions('IWL-2',stages[0]).map(q=>({...q,answer:q.expected,result:'Pass'}))};
  metalNine.photos=metalNine.answers.flatMap((q:any,n:number)=>Array.from({length:4},(_,p)=>({id:'metal-'+n+'-'+p,name:'photo.jpg',caption:'',questionId:q.id})));
  assert.equal((await PDFDocument.load(await(await makeReport(metalNine,drawing,settings,urlFor,project,render)).arrayBuffer())).getPageCount(),1,'three metal questions with twelve photos fit one A4');
  const finishingAnswers=questions('IWL-2',FINISHING_STAGE).map(q=>({...q,answer:q.expected,result:'Pass'}));
  const finishing={...base,stage:FINISHING_STAGE,wallType:'IWL-2',answers:finishingAnswers,photos:finishingAnswers.flatMap((q,n)=>Array.from({length:4},(_,p)=>({id:'finish-'+n+'-'+p,name:'photo.jpg',caption:'',questionId:q.id})))};
  const finishingPDF=await PDFDocument.load(await(await makeReport(finishing,drawing,settings,urlFor,project,render)).arrayBuffer());
  assert.equal(finishingPDF.getPageCount(),1,'two finishing checks and eight photos fit one A4');assert.match(finishingPDF.getTitle()!,/Angle and mastic inspection/);
  const multiple={...base,photos:Array.from({length:17},(_,n)=>({id:'pic-'+n,name:'original-'+n+'.jpg',caption:'',questionId:n<9?'tracks':'metal-frame'}))};
  const overflowing=await makeReport(multiple,drawing,settings,urlFor,project,render);
  const second=await PDFDocument.load(await overflowing.arrayBuffer());
  assert.ok(second.getPageCount()>=2,'additional evidence must continue to another page');
 }finally{globalThis.fetch=oldFetch;(globalThis as any).document=oldDocument;}
});

import {drawingPins} from '../source/lib/drawing-pins';
import {restoreSession,saveSession,forgetSession} from '../source/lib/oauth-session';
import {driveSession,disconnectCloud,disconnectGmail} from '../source/lib/gmail';
test('new inspection drawing starts without historical pins; history respects project, drawing, page and archive',()=>{
 const drawing={id:'d',projectId:'p',page:3} as any;const saved={...sample(),id:'kept',drawingId:'d',projectId:'p',pin:{x:.4,y:.5,page:3}} as any;
 const items=[saved,{...saved,id:'deleted',deletedAt:'2026-11-03'},{...saved,id:'other-project',projectId:'other'},{...saved,id:'other-drawing',drawingId:'old-revision'},{...saved,id:'other-page',pin:{...saved.pin,page:2}},{...saved,id:'invalid',pin:{...saved.pin,x:NaN}}];
 assert.deepEqual(drawingPins(items,drawing,3,false),[]);
 assert.deepEqual(drawingPins(items,drawing,3,true).map(i=>i.id),['kept']);
 assert.equal(items.length,6,'hiding pins does not delete records');
});
test('short-lived connection survives same-tab reload, stays account-bound and expires without extending permission',()=>{
 const old=(globalThis as any).sessionStorage,values=new Map<string,string>();
 (globalThis as any).sessionStorage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
 try{const time=Date.now(),value={token:'test-token',email:'person@example.test',clientId:'test-client',expires:time+300000};saveSession('cloud',value);
 assert.deepEqual(restoreSession('cloud','test-client','person@example.test',time),value);
 assert.equal(restoreSession('gmail','test-client','person@example.test',time),null,'Gmail and Drive permissions stay separate');
 assert.equal(restoreSession('cloud','wrong-client','person@example.test',time),null);
 assert.equal(restoreSession('cloud','test-client','another@example.test',time),null);
 assert.equal(driveSession('test-client','person@example.test')?.token,'test-token');
 disconnectGmail();assert.ok(restoreSession('cloud','test-client','person@example.test',time),'local Gmail disconnect cannot disconnect cloud');
 disconnectCloud();assert.equal(restoreSession('cloud'),null);
 saveSession('cloud',value);assert.equal(restoreSession('cloud','test-client','person@example.test',time+300001),null);assert.equal(values.size,0);
 }finally{disconnectCloud();forgetSession('gmail');(globalThis as any).sessionStorage=old;}
});

test('pre-boarding combines the top flat plate with the selected wall insulation thickness without guessing',()=>{
 for(const [wall,mm] of [['IWL-1',100],['IWL-2',100],['IWS-1',100],['IWS-2',25]] as const){const q=questions(wall,stages[2])[0];assert.equal(q.id,'pre-board-plate');assert.ok(q.question.includes('top flat plate'));assert.ok(q.question.includes(mm+' mm acoustic insulation'));assert.ok(q.expected.includes(mm+' mm acoustic insulation'));assert.match(q.expected,/securely fixed to the metal framing/);}
 assert.doesNotMatch(questions('IWS-2',stages[2])[0].expected,/100 mm/);
 assert.doesNotMatch(questions('IWL-3',stages[2])[0].expected,/insulation|100 mm/);
 assert.doesNotMatch(questions('BLK-1',stages[2])[0].expected,/100 mm/);
 const custom=questions('CUSTOM',stages[2],'generic','75 mm acoustic insulation')[0];assert.match(custom.expected,/75 mm/);assert.doesNotMatch(custom.expected,/100 mm/);
});

test('IWL-1 uses the company updated 92 mm studs without guessing a replacement track width',()=>{
 const wall=wallTypes.find(w=>w.id==='IWL-1')!;assert.match(wall.build,/92 mm I-stud/);assert.doesNotMatch([wall.build,wall.detail,wall.issue].join(' '),/146 mm|148 mm/);
 const frame=questions('IWL-1',stages[0]).find(q=>q.id==='metal-frame')!;assert.match(frame.question,/92 mm/);assert.match(frame.question,/updated project requirements/);assert.match(frame.expected,/92 mm I-studs at 600 mm centres/);assert.doesNotMatch(frame.expected,/146 mm|148 mm|94 mm/);
});

test('sent duplicate cleanup preserves original evidence, drawings and uncertain exports',async()=>{
 const {planReportCleanup,neededCloudFiles}=await import('../source/lib/delivery');
 const sent={id:'sent',kind:'batch',status:'accepted',providerId:'gmail-id',inspectionIds:['i'],versions:[1],reportIds:['pdf','photo'],zipId:'zip'} as any;
 const unknown={...sent,id:'unknown',status:'unknown',reportIds:['pdf'],zipId:'uncertain'};
 const records=[sent,unknown,{kind:'drawing',fileId:'drawing'},{kind:'inspection',id:'i',photos:[{id:'photo',reportId:'report-photo'}]}] as any;
 const files=['pdf','zip','uncertain','photo','report-photo','drawing'].map(id=>({id,size:10,type:'application/pdf'}));
 const plan=planReportCleanup(records,files);
 assert.deepEqual(plan.fileIds,['zip']);assert.equal(plan.bytes,10);
 assert.ok(!neededCloudFiles([{...sent,reportIds:[],zipId:'',temporaryReports:true}]).has(''));
 assert.equal(planReportCleanup([{...sent,zipId:'zip'}, {kind:'inspection',id:'i',photos:[],evidencePurgedAt:'old',archivedByBatch:'sent'}] as any,files).fileIds.length,0);
});

test('each wall keeps its own insulation, layers, reveal brackets and track system',()=>{
 for(const wall of wallTypes){
  const metal=questions(wall.id,stages[0]),board=questions(wall.id,stages[2]);
  if(wall.insulationMm){assert.match(board[0].expected,new RegExp(wall.insulationMm+' mm acoustic insulation'));}
  else{for(const q of [...metal,...board])assert.doesNotMatch(q.question+' '+q.expected,/\binsulation\b/i);}
  if(wall.id==='IWL-3'){
   assert.match(metal[0].expected,/92 mm/);assert.match(metal[1].question,/acoustic brackets/);
   assert.match(board[1].expected,/4 x 15 mm/);
   assert.doesNotMatch(JSON.stringify([...metal,...board]),/CineWALL|Stravilink|146 mm|100 mm/);
  }
  if(wall.id==='IWS-2')assert.doesNotMatch(metal[0].expected,/CineWALL/);
  if(wall.id==='IWS-2'){assert.match(board[1].expected,/30 mm coreboard/);assert.doesNotMatch(board[0].expected,/100 mm/);}
  if(wall.id==='BLK-1')assert.doesNotMatch(board[0].question,/plasterboard/);
 }
});

import {monday,dateKey,newWeekly,weeklyInspections,weeklyDays,weeklyInspectionText,shiftDate} from '../source/lib/weekly';
test('weekly reporting rolls on London Mondays across DST and year boundaries without redistributing dates',()=>{
 assert.equal(monday('2026-11-03'),'2026-11-02');assert.equal(monday('2027-01-01'),'2026-12-28');
 assert.equal(dateKey(new Date('2026-06-07T23:30:00Z')),'2026-06-08');
 assert.equal(newWeekly('p','2026-11-08').id,newWeekly('p','2026-11-02').id);
 assert.notEqual(newWeekly('p','2026-11-09').id,newWeekly('p','2026-11-02').id);
 const base={...sample(),projectId:'p',date:'2026-11-03',stage:stages[0],drawingSnapshot:{reference:'drawing',revision:'C1'},pin:{x:.5,y:.4,page:1}};
 const rows=[base,{...base,id:'earlier-work',workDate:'2026-11-02'},{...base,id:'deleted',deletedAt:'now'},{...base,id:'other',projectId:'other'},{...base,id:'outside',date:'2026-11-09'}] as any;
 const found=weeklyInspections(rows,'p','2026-11-02');assert.equal(found.length,2);
 const days=weeklyDays(newWeekly('p','2026-11-03'),found);
 assert.equal(days[0].inspections.length,1);assert.equal(days[1].inspections.length,1);assert.equal(days[2].inspections.length,0);
 assert.match(weeklyInspectionText(base),/Metal framing installed and passed quality inspection/);assert.doesNotMatch(weeklyInspectionText(base),/QA-TEST|IWL-1|Drawing|rev |pin |%/);
 assert.match(weeklyInspectionText({...base,workDate:'2026-11-02'}),/Checked on 3 Nov 2026/);
 assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
});

test('weekly activities lead with installed work only when the quality inspection has passed',()=>{
 const i={...sample(),stage:stages[0],date:'2026-11-04',location:'Grid J-K',floor:'GF'};
 assert.match(weeklyInspectionText(i),/Metal framing installed and passed quality inspection/);
 const pending=weeklyInspectionText({...i,status:'Pending'});assert.match(pending,/activity recorded; quality inspection still pending/);assert.doesNotMatch(pending,/installed|passed/);
 assert.match(weeklyInspectionText({...i,stage:stages[2]}),/Plasterboard installed/);
});
import {recoverInspection} from '../source/lib/inspection-drafts';
test('refresh recovery retains partial answers and photos as Pending, preserving newer saved work on conflict',()=>{
 const original={...sample(),version:3,comments:'Unfinished edit',photos:[{id:'original-photo',reportId:'report-photo'}]};
 const draft={id:original.id,inspection:original,savedAt:'2026-11-04T10:00:00Z'};
 const restored=recoverInspection(draft,{...original,comments:'Previously saved'});
 assert.equal(restored.id,original.id);assert.equal(restored.status,'Pending');assert.equal(restored.version,4);assert.deepEqual(restored.photos,original.photos);assert.deepEqual(restored.answers,original.answers);
 const conflict=recoverInspection(draft,{...original,version:5});assert.notEqual(conflict.id,original.id);assert.match(conflict.reference,/RECOVERY/);assert.equal(conflict.status,'Pending');
});

import {editableInspection} from '../source/lib/checklist-update';
test('site detail checklist stays within three checks and applies gaps to the correct layer count',()=>{
 for(const wall of wallTypes){for(const stage of [stages[0],stages[2]])assert.ok(questions(wall.id,stage).length<=3);}
 for(const id of ['IWL-1','IWL-2','IWL-3']){
  const board=questions(id,stages[2]);assert.match(board[1].question,/all four.*5-7 mm/);assert.doesNotMatch(board[1].expected,/mastic|sealant|sealed gaps/i);
  assert.match(board[2].question,/plasterboard joints/);assert.doesNotMatch(board[2].expected,/top angle|hanger|over the final layer/i);
 }
 assert.match(questions('IWS-1',stages[2])[1].question,/both plasterboard layers on each face/);
 assert.doesNotMatch(questions('IWL-3',stages[2]).map(q=>q.expected).join(' '),/insulation|100 mm/);
});
test('expanded checks require fresh answers on an editable copy while preserving saved evidence and old answers',()=>{
 const current=questions('IWL-2',stages[0]),old=current.filter(q=>q.id!=='base-tracks').map(q=>({...q,answer:q.expected,result:'Pass'}));
 old[0]={...old[0],question:'Old tracks question',expected:'Old track answer',answer:'My saved site-specific answer'};
 const saved={...sample(),templateVersion:2,stage:stages[0],wallType:'IWL-2',status:'Pass',answers:old,photos:[{id:'evidence',questionId:'tracks'}],sections:undefined} as any;
 saved.answers.push({id:'old-extra',question:'Earlier check',answer:'Earlier site answer',expected:'Earlier site answer',result:'Pass',comment:''});
 const before=JSON.stringify(saved),edited=editableInspection(saved);
 assert.equal(JSON.stringify(saved),before);assert.equal(edited.status,'Pending');assert.deepEqual(edited.answers.map(q=>q.id),['tracks','base-tracks','metal-frame']);
 assert.equal(edited.answers[0].answer,'');assert.equal(edited.answers[1].result,'Pending');assert.equal(edited.answers[2].answer,current[2].expected);
 assert.ok(edited.legacyAnswers?.some(q=>q.answer==='My saved site-specific answer'));assert.ok(edited.legacyAnswers?.some(q=>q.answer==='Earlier site answer'));assert.deepEqual(edited.photos,saved.photos);
 const verified={...edited,status:'Pass',answers:current.map(q=>({...q,answer:q.expected,result:'Pass'}))} as any;
 assert.equal(editableInspection(verified).status,'Pass');
});

import {planLocalInspectionCleanup} from '../source/lib/local-cleanup';
test('explicit local cleanup frees only selected evidence, protects other projects and drafts, and preserves weekly activity',()=>{
 const selected={...sample(),projectId:'p',version:4,date:'2026-11-05',photos:[{id:'original',reportId:'report'},{id:'shared'},{id:'draft-photo'},{id:'drawing-photo'}]};
 const other={...sample(),id:'other',projectId:'other-project',version:1,photos:[{id:'shared'}]};
 const records=[selected,other,{kind:'drawing',id:'drawing',fileId:'drawing-photo',projectId:'p'}] as any;
 const draft={id:'draft',savedAt:'2026-11-05',inspection:{...sample(),id:'draft',photos:[{id:'draft-photo'}]}};
 const files=['original','report','shared','draft-photo','drawing-photo','unrelated'].map(id=>({id,size:10}));
 const plan=planLocalInspectionCleanup(records,files,[draft],'p',[{id:selected.id,version:4}],'2026-11-05T18:00:00Z');
 assert.deepEqual(plan.fileIds,['original','report']);assert.equal(plan.bytes,20);assert.equal(plan.records[0].photos.length,0);assert.ok(plan.records[0].deletedAt);assert.ok(plan.records[0].localClearedAt);assert.equal(plan.records[0].version,5);
 assert.equal(weeklyInspections(plan.records as any,'p','2026-11-02').length,1,'weekly work remains after explicit space cleanup');
 assert.equal(selected.photos.length,4,'planning never mutates original evidence');
 assert.throws(()=>planLocalInspectionCleanup(records,files,[],'p',[{id:'other',version:1}]),/changed/);
 assert.throws(()=>planLocalInspectionCleanup(records,files,[],'p',[{id:selected.id,version:3}]),/changed/);
 assert.throws(()=>planLocalInspectionCleanup(records,files,[],'p',[]),/changed/);
});

import {partitionReports,sendPreparedParts} from '../source/lib/email-parts';
test('twenty PDFs are automatically grouped under the email limit with no missing or changed reports',async()=>{
 const pdfs=Array.from({length:20},(_,n)=>({name:'Inspection — '+n+'.pdf',blob:new Blob(['%PDF-1.7\n'+String(n).repeat(450)])}));
 const parts=await partitionReports(pdfs,2600);assert.ok(parts.length>1);const seen:number[]=[];
 for(const part of parts){assert.ok(part.blob.size<=2600);const zip=await JSZip.loadAsync(await part.blob.arrayBuffer());for(const n of part.indexes){seen.push(n);assert.deepEqual(await zip.file(pdfs[n].name)!.async('uint8array'),new Uint8Array(await pdfs[n].blob.arrayBuffer()));}}
 assert.deepEqual(seen,Array.from({length:20},(_,n)=>n));
 await assert.rejects(()=>partitionReports([{name:'Too large.pdf',blob:new Blob([new Uint8Array(3000)])}],2600),/One inspection/);
});
test('multipart email never resends confirmed parts and stops before an uncertain part',async()=>{
 const parts=Array.from({length:3},(_,n)=>({batch:{id:'part-'+n,status:'prepared',inspectionIds:['i'+n]} as any,blob:new Blob(['zip'])}));let calls:string[]=[];
 await assert.rejects(()=>sendPreparedParts(parts,async p=>{calls.push(p.batch.id);return p.batch.id==='part-0'?{...p.batch,status:'accepted',providerId:'message-0'}:{...p.batch,status:'unknown',error:'Lost response'};},async()=>{}),/Lost response/);
 assert.deepEqual(calls,['part-0','part-1']);calls=[];
 await assert.rejects(()=>sendPreparedParts(parts,async p=>{calls.push(p.batch.id);return {...p.batch,status:'accepted',providerId:'m'};},async()=>{}),/Check Gmail Sent/);assert.deepEqual(calls,[]);
 parts[1].batch={...parts[1].batch,status:'manual-sent'};
 await sendPreparedParts(parts,async p=>{calls.push(p.batch.id);return {...p.batch,status:'accepted',providerId:'last'};},async()=>{});
 assert.deepEqual(calls,['part-2']);
});

import {FINISHING_STAGE} from '../source/lib/catalogue';
import {inspectionTitle,reportFilename} from '../source/lib/report-names';
test('hangers and floor mastic have independent checks; boarding keeps gaps without signing off finishing work',()=>{
 for(const wall of ['IWL-1','IWL-2','IWL-3','IWS-1','IWS-2']){
  const board=questions(wall,stages[2]),finishing=questions(wall,FINISHING_STAGE);
  assert.equal(board.length,3);assert.deepEqual(finishing.map(q=>q.id),['top-hanger','floor-mastic']);
  assert.doesNotMatch(board.map(q=>q.question+' '+q.expected).join(' '),/mastic|sealant|sealed gaps|top angle|top hanger|over the final layer/i);
  assert.match(finishing[0].expected,/After all plasterboard layers.*over the final plasterboard layer/);
  assert.match(finishing[1].expected,/acoustic.*mastic/i);assert.ok(finishing.every(q=>q.answer===''&&q.result==='Pending'));
  assert.match(finishing[0].expected,/25 x 50 mm/);assert.doesNotMatch(finishing[0].question+' '+finishing[0].expected,/hanger/i);assert.match(finishing[1].expected,/After all plasterboard layers.*FR acoustic mastic/);if(wall!=='IWS-2')assert.match(finishing[1].expected,/5-7 mm/);
 }
 const generic=questions('CUSTOM',stages[2],'generic','75 mm insulation');assert.doesNotMatch(generic.map(q=>q.question+' '+q.expected).join(' '),/mastic|sealant|top angle|top hanger/i);
 assert.match(questions('IWL-2',stages[0])[0].expected,/2 rows of acoustic sealant/,'head-track sealant remains a separate metal requirement');
 assert.equal(inspectionTitle(FINISHING_STAGE),'Angle and mastic inspection');
 assert.match(reportFilename({...sample(),stage:FINISHING_STAGE,version:1}),/^Angle and mastic inspection/);
});
test('new finishing inspections never inherit boarding answers or photos; reopening old boarding retains history and requires fresh answers',()=>{
 const drawing={id:'d',projectId:'p',floor:'GF',name:'Floor',reference:'A-103',revision:'C1',page:1} as any,project={id:'p',qaProfile:'neos'} as any,pin={x:.5,y:.5,page:1};
 const finishing=createInspectionAt(drawing,project,pin,FINISHING_STAGE);assert.equal(finishing.stage,FINISHING_STAGE);assert.deepEqual(finishing.photos,[]);assert.deepEqual(finishing.answers,[]);assert.equal(finishing.status,'Pending');
 const old={...sample(),stage:stages[2],wallType:'IWL-2',templateVersion:2,answers:questions('IWL-2',stages[2]).map(q=>({...q,answer:q.expected,result:'Pass'})),photos:[{id:'board-photo',questionId:'boarding'}]} as any;
 old.answers[1].expected='The floor gap is filled with FR acoustic sealant.';old.answers[1].answer=old.answers[1].expected;
 old.answers[2].expected='The top angle is fixed over the final layer.';old.answers[2].answer=old.answers[2].expected;
 const copy=editableInspection(old);assert.equal(copy.status,'Pending');assert.equal(copy.answers[1].answer,'');assert.equal(copy.answers[2].answer,'');assert.deepEqual(copy.photos,old.photos);assert.equal(copy.legacyAnswers.length,2);assert.equal(old.status,'Pass');
 assert.match(weeklyInspectionText({...sample(),wallType:'IWL-3',stage:FINISHING_STAGE}),/Angle & mastic installed/);
});

test('legacy finishing stage opens with Angle wording while retaining its photo associations',()=>{
 const old={...sample(),templateVersion:2,stage:'Hangers & mastic',wallType:'IWL-2',answers:questions('IWL-2',FINISHING_STAGE).map(q=>({...q,answer:q.expected,result:'Pass'})),photos:[{id:'original-angle',questionId:'top-hanger'}]} as any;
 const copy=editableInspection(old);assert.equal(copy.stage,'Angle & mastic');assert.deepEqual(copy.photos,old.photos);assert.equal(old.stage,'Hangers & mastic');assert.equal(inspectionTitle(old.stage),'Angle and mastic inspection');assert.match(weeklyInspectionText(old),/Angle & mastic/);
});
