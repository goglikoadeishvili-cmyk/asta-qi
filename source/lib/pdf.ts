import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import type {Inspection,Drawing,Settings,Project} from './model';
import {reportReference,inspectionTitle} from './report-names';
import {excerptGeometry} from './report-geometry';
import {floors,reportInspectionAnswers} from './model';
import {photoRowCount,proportionalFit,evidencePhotoHeight} from './report-layout';
export async function pdfjs(){const p=await import('pdfjs-dist');p.GlobalWorkerOptions.workerSrc=import.meta.env.BASE_URL+'pdf.worker.min.mjs';return p;}
export async function inspectPdf(file:Blob){const p=await pdfjs();const doc=await p.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const count=doc.numPages;await doc.destroy();return count;}
export async function renderDrawing(url:string,page=1){if(!url)throw new Error('Drawing file is missing. Import its project pack or restore your backup.');const p=await pdfjs();const doc=await p.getDocument(url).promise;try{const pg=await doc.getPage(page);const unscaled=pg.getViewport({scale:1});const scale=Math.min(2,2600/Math.max(unscaled.width,unscaled.height));const vp=pg.getViewport({scale});const c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await pg.render({canvasContext:c.getContext('2d')!,viewport:vp}).promise;return {canvas:c,count:doc.numPages};}finally{await doc.destroy();}}
export async function makeReport(i:Inspection,drawing:Drawing,settings:Settings,urlFor:(id:string)=>string,project?:Project,render=renderDrawing){
 if(i.drawingSnapshot.reference!==drawing.reference||i.drawingSnapshot.revision!==drawing.revision||i.pin.page!==drawing.page||i.pin.page!==i.drawingSnapshot.page)throw new Error('Inspection drawing reference/revision does not match its saved drawing.');
 const reference=reportReference(i.reference),title=inspectionTitle(i.stage);
 const doc=await PDFDocument.create();
 doc.setTitle(title+' - '+reference);doc.setAuthor('ACL');doc.setCreator('ASTA QI');
 const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.07,.16,.28),muted=rgb(.40,.46,.54),blue=rgb(.10,.32,.58),pale=rgb(.94,.97,.99),rule=rgb(.83,.88,.92);
 const W=595.28,H=841.89,L=35,CW=W-2*L,BOTTOM=55;
 let page:any,y=0,logo:any=null;
 try{const response=await fetch(import.meta.env.BASE_URL+'branding/acl-logo-v2.png');if(response.ok)logo=await doc.embedPng(await response.arrayBuffer())}catch{}
 const normal=(v:any)=>String(v??'').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
 const measure=(s:string,size:number,isBold=false)=>{
  try{return (isBold?bold:font).widthOfTextAtSize(s,size)}catch{
   const c=document.createElement('canvas'),ctx=c.getContext('2d')!;ctx.font=(isBold?'bold ':'')+size+'px Arial';return ctx.measureText(s).width;
  }
 };
 const wrap=(value:any,size:number,maxWidth=CW,isBold=false)=>{
  const source=String(value??'').replace(/\r/g,'').split('\n'),out:string[]=[];
  for(const paragraph of source){
   if(!paragraph.trim()){out.push('');continue;}
   let current='';
   for(const word of normal(paragraph).split(' ')){
    if(!word)continue;
    const candidate=current?current+' '+word:word;
    if(measure(candidate,size,isBold)<=maxWidth){current=candidate;continue;}
    if(current){out.push(current);current='';}
    for(const letter of word){
     if(current&&measure(current+letter,size,isBold)>maxWidth){out.push(current);current='';}
     current+=letter;
    }
   }
   if(current)out.push(current);
  }
  return out.length?out:[''];
 };
 async function drawText(s:string,x:number,baseline:number,size:number,isBold=false,color=ink){
  if(!s)return;
  try{page.drawText(s,{x,y:baseline,size,font:isBold?bold:font,color})}
  catch{
   const c=document.createElement('canvas');c.width=Math.ceil(Math.max(12,measure(s,size,isBold)*3+12));c.height=Math.ceil(size*4.3+6);
   const ctx=c.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.font=(isBold?'bold ':'')+(size*3)+'px Arial, sans-serif';
   ctx.fillStyle='#14253b';ctx.textBaseline='alphabetic';ctx.fillText(s,0,size*3);
   const png=await doc.embedPng(c.toDataURL());page.drawImage(png,{x,y:baseline-size*.22,width:c.width/3,height:c.height/3});
  }
 }
 function startPage(){
  page=doc.addPage([W,H]);
  page.drawRectangle({x:0,y:785,width:W,height:H-785,color:ink});
  if(logo){const lw=80;page.drawImage(logo,{x:L,y:798,width:lw,height:lw*logo.height/logo.width});}
  page.drawText('QUALITY INSPECTION',{x:logo?129:L,y:817,size:11.3,font:bold,color:rgb(1,1,1)});
  page.drawText('DRYLINING / SITE RECORD',{x:logo?129:L,y:802,size:8,font,color:rgb(.69,.80,.92)});
  y=768;
 }
 async function ensureSpace(height:number){if(y-height<BOTTOM)startPage();}
 async function printLines(lines:string[],size:number,leading:number,isBold=false,color=ink){
  for(const line of lines){await ensureSpace(leading);await drawText(line,L,y,size,isBold,color);y-=leading;}
 }
 function shortenBoilerplate(value:string){
  return normal(value)
   .replace(/(?:installed and )?securely fixed in accordance with the drawing and applicable guidance recommendations\.?/gi,'Securely fixed to approved details.')
   .replace(/in accordance with the drawing and applicable guidance recommendations/gi,'to approved details')
   .replace(/\s{2,}/g,' ');
 }
 async function drawCompactLabel(label:string,value:string,x:number,yy:number,maxWidth:number){
  const prefix=label.toUpperCase()+'  ';
  await drawText(prefix,x,yy,7.3,true,muted);
  const px=measure(prefix,7.3,true);
  const lines=wrap(value,8,Math.max(60,maxWidth-px));
  await drawText(lines[0],x+px,yy,8,false,ink);
 }
 startPage();
 await drawText(title,L,759,18,true);
 await drawText(reference,L,738,9,true,muted);
 await drawText((i.status==='Pass'?'PASS':'PENDING')+'  /  '+i.wallType+'  /  '+i.stage,250,738,9,true,blue);
 const floor=project?.floors?.find(f=>f.id===i.floor)?.name||drawing.floorName||floors.find(f=>f.id===i.floor)?.name||i.floor;
 await drawCompactLabel('Project',project?.name||'Project',L,718,326);
 await drawCompactLabel('Inspected by','ACL',378,718,176);
 await drawCompactLabel('Floor',floor,L,701,320);
 await drawCompactLabel('Date',i.date,378,701,176);
 await drawCompactLabel('Location',i.location,L,683,520);
 // A compact marked drawing comes before every question, without any full-sheet drawing.
 const {canvas:source}=await render(urlFor(drawing.fileId),i.pin.page);
 const g=excerptGeometry(source.width,source.height,i.pin),crop=document.createElement('canvas');
 crop.width=g.targetWidth;crop.height=g.targetHeight;
 const ctx=crop.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,crop.width,crop.height);
 ctx.drawImage(source,g.sx,g.sy,g.sw,g.sh,g.padding,g.padding,crop.width-2*g.padding,crop.height-2*g.padding);
 ctx.fillStyle='#db2948';ctx.beginPath();ctx.arc(g.px,g.py,19,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='white';ctx.lineWidth=5;ctx.stroke();
 ctx.beginPath();ctx.arc(g.px,g.py,5,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
 const excerpt=await doc.embedPng(crop.toDataURL());
 await drawText('DRAWING - MARKED INSPECTION POSITION',L,665,9,true,blue);
 const drawingWidth=218,drawingHeight=drawingWidth*excerpt.height/excerpt.width,top=653;
 page.drawImage(excerpt,{x:L,y:top-drawingHeight,width:drawingWidth,height:drawingHeight});
 page.drawRectangle({x:L,y:top-drawingHeight,width:drawingWidth,height:drawingHeight,borderWidth:.6,borderColor:rule});
 const right=L+drawingWidth+16;
 await drawText('DRAWING REFERENCE',right,642,7.1,true,muted);
 const refs=wrap(i.drawingSnapshot.reference,8,W-right-L);let refY=625;
 for(const line of refs.slice(0,3)){await drawText(line,right,refY,8,true);refY-=13;}
 await drawText('REV '+i.drawingSnapshot.revision+'  /  PAGE '+i.pin.page,right,refY-3,8,false,ink);
 await drawText('Red pin: inspection location',right,refY-20,7.5,false,muted);
 y=top-drawingHeight-15;
 page.drawLine({start:{x:L,y:y+6},end:{x:W-L,y:y+6},thickness:.8,color:rule});
 const checks=reportInspectionAnswers(i);
 const photosFor=(questionId:string)=>i.photos.filter(p=>p.questionId===questionId);
 type Picture={photo:Inspection['photos'][number];image:any};
 const images=new Map<string,Picture>();
 for(const p of i.photos){console.log('PDF trace: start photo',p.id);
  const url=urlFor(p.reportId||p.id)||urlFor(p.id);
  if(!url)throw new Error('Photo evidence is missing. Restore the original evidence backup.');
  const response=await fetch(url);if(!response.ok)throw new Error('Photo evidence could not be loaded.');
  const bytes=await response.arrayBuffer();console.log('PDF trace: bytes',bytes.byteLength);
  const signature=new Uint8Array(bytes),jpeg=signature[0]===0xff&&signature[1]===0xd8,png=signature[0]===0x89&&signature[1]===0x50&&signature[2]===0x4e&&signature[3]===0x47;
  if(!jpeg&&!png)throw new Error('Unsupported photo format; use JPEG or PNG evidence.');
  console.log('PDF trace: embed format',jpeg?'jpg':'png');
  const image:any=jpeg?await doc.embedJpg(bytes):await doc.embedPng(bytes);
  console.log('PDF trace: embedded photo',p.id);
  images.set(p.id,{photo:p,image});
 }
 const extra=i.photos.filter(p=>!p.questionId||!checks.some(a=>a.id===p.questionId));
 const groups=checks.map(a=>({answer:a,photos:photosFor(a.id)}));
 if(extra.length)groups.push({answer:null as any,photos:extra});
 const textHeight=groups.reduce((sum,g)=>{
  if(!g.answer)return sum+16;
  const questionLines=wrap(g.answer.question,9,CW-8,true),answerLines=wrap(shortenBoilerplate(g.answer.answer||'Not inspected'),8.1,CW-8);
  const noteLines=g.answer.comment?wrap(g.answer.comment,7.8,CW-8):[];
  return sum+13+questionLines.length*11.5+answerLines.length*10.4+noteLines.length*10+8;
 },0);
 const totalRows=groups.reduce((sum,g)=>sum+photoRowCount(g.photos.length),0);
 const photoHeight=evidencePhotoHeight(y,textHeight,totalRows);
 let serial=0;
 async function printPhotoRow(photos:Inspection['photos'],checkNumber:number){
  const gap=13,cell=(CW-gap)/2,rows=photos.map(p=>images.get(p.id)!);
  const sizes=rows.map(({image})=>proportionalFit(image.width,image.height,cell-5,photoHeight));
  const tallest=Math.max(...sizes.map(s=>s.height));
  const before=y;
  await ensureSpace(tallest+20);
  if(before!==y&&checkNumber>0){await drawText('PHOTO EVIDENCE / CHECK '+checkNumber,L,y,8,true,blue);y-=16;}
  const photoTop=y-13;
  for(let n=0;n<rows.length;n++){
   const item=rows[n],fit=sizes[n],cellX=L+n*(cell+gap);
   const x=cellX+(cell-fit.width)/2;
   serial++;
   const caption=(item.photo.caption||'').trim();
   const display=caption&&caption!==item.photo.name?'PHOTO '+serial+' / '+caption:'PHOTO '+serial;
   let cap=display;while(cap.length>10&&measure(cap,7,true)>cell-6)cap=cap.slice(0,-2)+'…';
   await drawText(cap,cellX,photoTop+4,7,true,muted);
   const imageY=photoTop-5-fit.height;
   page.drawImage(item.image,{x,y:imageY,width:fit.width,height:fit.height});
   page.drawRectangle({x,y:imageY,width:fit.width,height:fit.height,borderColor:rule,borderWidth:.6});
  }
  y=photoTop-5-tallest-9;
 }
 for(let n=0;n<groups.length;n++){
  const group=groups[n],a=group.answer,groupPhotos=group.photos;
  if(a){
   const qLines=wrap((n+1)+'. '+a.question,9,CW-9,true),aLines=wrap(shortenBoilerplate(a.answer||'Not inspected.'),8.1,CW-9);
   const noteLines=a.comment?wrap('Note: '+a.comment,7.8,CW-9):[];
   const headingHeight=qLines.length*11.5+aLines.length*10.4+noteLines.length*10+14;
   await ensureSpace(headingHeight+(groupPhotos.length?45:0));
   page.drawRectangle({x:L,y:y-3,width:CW,height:1,color:pale});y-=12;
   for(const line of qLines){await drawText(line,L+3,y,9,true,ink);y-=11.5;}
   for(const line of aLines){await drawText(line,L+3,y,8.1,false,ink);y-=10.4;}
   for(const line of noteLines){await drawText(line,L+3,y,7.8,false,muted);y-=10;}
   y-=2;
  }else{
   await ensureSpace(30);await drawText('ADDITIONAL SITE PHOTOS',L,y,9,true,blue);y-=15;
  }
  for(let start=0;start<groupPhotos.length;start+=2){
   await printPhotoRow(groupPhotos.slice(start,start+2),a?n+1:0);
  }
 }
 for(const [label,value] of [['Comments',i.comments],['Defects / actions',[i.defects,i.corrective].filter(Boolean).join(' / ')],['Design approval',i.approvalRef]]){
  if(!value)continue;
  const lines=wrap(label.toUpperCase()+': '+value,8,CW);await ensureSpace(lines.length*11+8);
  for(const line of lines){await drawText(line,L,y,8,false,ink);y-=11;}y-=8;
 }
 // Only the continuation gets numbering; no repeated inspector/date/footer blocks.
 if(doc.getPageCount()>1)doc.getPages().forEach((p,n)=>p.drawText((n+1)+' / '+doc.getPageCount(),{x:W-L-24,y:26,size:7,font,color:muted}));
 return new Blob([await doc.save() as BlobPart],{type:'application/pdf'});
}
