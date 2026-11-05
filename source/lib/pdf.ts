import {FINISHING_STAGE,stages} from './catalogue';
import {reportPhoto} from './report-photo';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import type {Inspection,Drawing,Settings,Project} from './model';
import {reportReference,inspectionTitle} from './report-names';
import {excerptGeometry} from './report-geometry';
import {floors,reportInspectionAnswers} from './model';
import {PHOTOS_PER_ROW,photoRowCount,proportionalFit,evidencePhotoHeight,packPhotoRows} from './report-layout';
export async function pdfjs(){const p=await import('pdfjs-dist');p.GlobalWorkerOptions.workerSrc=import.meta.env.BASE_URL+'pdf.worker.min.mjs';return p;}
export async function inspectPdf(file:Blob){const p=await pdfjs();const doc=await p.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const count=doc.numPages;await doc.destroy();return count;}
export async function renderDrawing(url:string,page=1){if(!url)throw new Error('Drawing file is missing. Import its project pack or restore your backup.');const p=await pdfjs();const doc=await p.getDocument(url).promise;try{const pg=await doc.getPage(page);const unscaled=pg.getViewport({scale:1});const scale=Math.min(2,2600/Math.max(unscaled.width,unscaled.height));const vp=pg.getViewport({scale});const c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await pg.render({canvasContext:c.getContext('2d')!,viewport:vp}).promise;return {canvas:c,count:doc.numPages};}finally{await doc.destroy();}}
export async function makeReport(i:Inspection,drawing:Drawing,settings:Settings,urlFor:(id:string)=>string,project?:Project,render=renderDrawing){
 if(i.drawingSnapshot.reference!==drawing.reference||i.drawingSnapshot.revision!==drawing.revision||i.pin.page!==drawing.page||i.pin.page!==i.drawingSnapshot.page)throw new Error('Inspection drawing reference/revision does not match its saved drawing.');
 const reference=reportReference(i.reference),title=inspectionTitle(i.stage);
 const doc=await PDFDocument.create();
 doc.setTitle(title+' - '+reference);doc.setAuthor('ACL');doc.setCreator('ASTA Quality Inspection');
 const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.07,.16,.28),muted=rgb(.40,.46,.54),blue=rgb(.10,.32,.58),pale=rgb(.94,.97,.99),rule=rgb(.83,.88,.92);
 const W=595.28,H=841.89,L=32,CW=W-2*L,BOTTOM=38;
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
  const first=doc.getPageCount()===0;page=doc.addPage([W,H]);
  if(first){
   page.drawRectangle({x:0,y:802,width:W,height:H-802,color:ink});
   if(logo){const lw=65;page.drawImage(logo,{x:L,y:810,width:lw,height:lw*logo.height/logo.width});}
   page.drawText('QUALITY INSPECTION',{x:logo?110:L,y:825,size:10.5,font:bold,color:rgb(1,1,1)});
   page.drawText('DRYLINING / SITE RECORD',{x:logo?110:L,y:811,size:7.2,font,color:rgb(.69,.80,.92)});y=785;
  }else{
   page.drawText(reference+' / '+title+' / CONTINUED',{x:L,y:817,size:8,font,color:muted});
   page.drawLine({start:{x:L,y:807},end:{x:W-L,y:807},thickness:.6,color:rule});y=791;
  }
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
 await drawText(title,L,782,16,true);
 await drawText(reference,L,765,8.5,true,muted);
 await drawText((i.status==='Pass'?'PASS':'PENDING')+'  /  '+i.wallType+'  /  '+(i.stage===stages[2]?'Plasterboard':i.stage),L,749,8.5,true,blue);
 const floor=project?.floors?.find(f=>f.id===i.floor)?.name||drawing.floorName||floors.find(f=>f.id===i.floor)?.name||i.floor;
 await drawCompactLabel('Project',project?.name||'Project',L,733,390);
 await drawCompactLabel('Inspected by','ACL',245,717,170);
 await drawCompactLabel('Floor',floor,L,717,200);
 await drawCompactLabel('Date',i.date,245,701,170);
 await drawCompactLabel('Location',i.location,L,701,210);
 // One shared drawing pin identifies the location of every photo in this inspection.
 const {canvas:source}=await render(urlFor(drawing.fileId),i.pin.page);
 const g=excerptGeometry(source.width,source.height,i.pin),crop=document.createElement('canvas');
 crop.width=g.targetWidth;crop.height=g.targetHeight;
 const ctx=crop.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,crop.width,crop.height);
 ctx.drawImage(source,g.sx,g.sy,g.sw,g.sh,g.padding,g.padding,crop.width-2*g.padding,crop.height-2*g.padding);
 ctx.fillStyle='#db2948';ctx.beginPath();ctx.arc(g.px,g.py,19,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='white';ctx.lineWidth=5;ctx.stroke();
 ctx.beginPath();ctx.arc(g.px,g.py,5,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
 const excerpt=await doc.embedPng(crop.toDataURL());
 // Compact drawing beside the report heading; the red pin remains visible.
 const drawingWidth=110,drawingHeight=drawingWidth*excerpt.height/excerpt.width,top=790,drawingX=W-L-drawingWidth;
 page.drawImage(excerpt,{x:drawingX,y:top-drawingHeight,width:drawingWidth,height:drawingHeight});
 page.drawRectangle({x:drawingX,y:top-drawingHeight,width:drawingWidth,height:drawingHeight,borderWidth:.6,borderColor:rule});
 const refs=wrap(i.drawingSnapshot.reference,6.2,drawingWidth);let refY=top-drawingHeight-10;
 for(const line of refs){await drawText(line,drawingX,refY,6.2,true);refY-=8;}
 await drawText('REV '+i.drawingSnapshot.revision+' / PAGE '+i.pin.page,drawingX,refY,6.2,false,muted);
 y=Math.min(684,refY-12);
 page.drawLine({start:{x:L,y:y+6},end:{x:W-L,y:y+6},thickness:.8,color:rule});
 const checks=reportInspectionAnswers(i);
 const photosFor=(questionId:string)=>i.photos.filter(p=>p.questionId===questionId);
 type Picture={photo:Inspection['photos'][number];image:any};
 const images=new Map<string,Picture>(),embedded=new Map<string,any>();
 for(const p of i.photos){
  const url=urlFor(p.reportId||p.id)||urlFor(p.id);
  if(!url)throw new Error('Photo evidence is missing. Restore the original evidence backup.');
  if(embedded.has(url)){images.set(p.id,{photo:p,image:embedded.get(url)});continue;}
  const response=await fetch(url);if(!response.ok)throw new Error('Photo evidence could not be loaded.');
  const bytes=await response.arrayBuffer();
  const signature=new Uint8Array(bytes),jpeg=signature[0]===0xff&&signature[1]===0xd8,png=signature[0]===0x89&&signature[1]===0x50&&signature[2]===0x4e&&signature[3]===0x47;
  if(!jpeg&&!png)throw new Error('Unsupported photo format; use JPEG or PNG evidence.');
  const optimized=await reportPhoto(bytes,jpeg);
  const image:any=optimized.jpeg?await doc.embedJpg(optimized.bytes):await doc.embedPng(optimized.bytes);embedded.set(url,image);
  images.set(p.id,{photo:p,image});
 }
 const extra=i.photos.filter(p=>!p.questionId||!checks.some(a=>a.id===p.questionId));
 const groups=checks.map(a=>({answer:a,photos:photosFor(a.id)}));
 if(extra.length)groups.push({answer:null as any,photos:extra});
 const qSize=8.8,qLeading=10.5,aSize=8,aLeading=9.5,noteSize=7.6,noteLeading=9;
 const groupLines=(answer:any,index:number)=>({
  question:wrap((index+1)+'. '+answer.question,qSize,CW-6,true),
  answer:wrap(shortenBoilerplate(answer.answer||'Not inspected.'),aSize,CW-6),
  note:answer.comment?wrap('Note: '+answer.comment,noteSize,CW-6):[]
 });
 const tails=[['Comments',i.comments],['Defects / actions',[i.defects,i.corrective].filter(Boolean).join(' / ')],['Design approval',i.approvalRef]].filter(([,v])=>v).map(([label,value])=>wrap(label!.toUpperCase()+': '+value,8,CW));
 const tailHeight=tails.reduce((sum,lines)=>sum+lines.length*10+8,0);
 const textHeight=groups.reduce((sum,g,n)=>{if(!g.answer)return sum+15;const lines=groupLines(g.answer,n);return sum+12+lines.question.length*qLeading+lines.answer.length*aLeading+lines.note.length*noteLeading;},0);
 const totalRows=groups.reduce((sum,g)=>sum+photoRowCount(g.photos.length),0);
 const caption=(p:Inspection['photos'][number],number:number,maxWidth=(CW-4*(PHOTOS_PER_ROW-1))/PHOTOS_PER_ROW)=>{const value=(p.caption||'').trim();return wrap('PHOTO '+number+(value&&value!==p.name?' / '+value:''),6.8,maxWidth);};
 let plannedSerial=0,captionExtra=0;
 for(const group of groups)for(let start=0;start<group.photos.length;start+=PHOTOS_PER_ROW){const cells=group.photos.slice(start,start+PHOTOS_PER_ROW);const maxLines=Math.max(...cells.map(p=>caption(p,++plannedSerial).length));captionExtra+=(maxLines-1)*8;}
 const photoHeight=evidencePhotoHeight(691-180*excerpt.height/excerpt.width-11,textHeight,totalRows,tailHeight+captionExtra);
 let serial=0;
 const fitPhoto=(photo:Inspection['photos'][number])=>{const image=images.get(photo.id)!.image;return proportionalFit(image.width,image.height,(CW-16)/3-4,photoHeight);};
 const photoRows=(photos:Inspection['photos'])=>packPhotoRows(photos,p=>fitPhoto(p).width,CW);
 function rowGeometry(photos:Inspection['photos']){
  const gap=4,sizes=photos.map(fitPhoto),spare=(CW-gap*(photos.length-1)-sizes.reduce((sum,size)=>sum+size.width,0))/photos.length;
  const cells=sizes.map(size=>size.width+spare);
  const items=photos.map((photo,n)=>({photo,image:images.get(photo.id)!.image,caption:caption(photo,serial+n+1,cells[n])}));
  const tallest=Math.max(...sizes.map(s=>s.height)),captionHeight=Math.max(...items.map(item=>item.caption.length))*8;
  return {gap,cells,items,sizes,tallest,captionHeight,height:tallest+captionHeight+(i.stage===FINISHING_STAGE?4:13)};
 }
 async function printPhotoRow(photos:Inspection['photos'],checkNumber:number){
  const row=rowGeometry(photos);
  if(y-row.height<BOTTOM){startPage();if(checkNumber>0){await drawText('CHECK '+checkNumber+' / PHOTO EVIDENCE (CONTINUED)',L,y,7.5,true,blue);y-=14;}}
  const imageTop=y-row.captionHeight-(i.stage===FINISHING_STAGE?2:5);
  for(let n=0;n<row.items.length;n++){
   const item=row.items[n],fit=row.sizes[n],cellX=L+row.cells.slice(0,n).reduce((sum,width)=>sum+width,0)+n*row.gap,x=cellX+(row.cells[n]-fit.width)/2;
   for(let line=0;line<item.caption.length;line++)await drawText(item.caption[line],cellX,y-6-line*8,6.8,true,muted);
   const imageY=imageTop-fit.height;page.drawImage(item.image,{x,y:imageY,width:fit.width,height:fit.height});
   page.drawRectangle({x,y:imageY,width:fit.width,height:fit.height,borderColor:rule,borderWidth:.5});serial++;
  }
  y-=row.height;
 }
 for(let n=0;n<groups.length;n++){
  const group=groups[n],a=group.answer,groupPhotos=group.photos;
  if(a){
   const lines=groupLines(a,n),headingHeight=12+lines.question.length*qLeading+lines.answer.length*aLeading+lines.note.length*noteLeading;
   const firstRow=groupPhotos.length?rowGeometry(photoRows(groupPhotos)[0]).height:0;
   // Keep the question, answer and its first evidence row together when they fit.
   await ensureSpace(headingHeight+firstRow);
   page.drawLine({start:{x:L,y:y-2},end:{x:W-L,y:y-2},thickness:.6,color:rule});y-=9;
   for(const line of lines.question){await ensureSpace(qLeading);await drawText(line,L+2,y,qSize,true,ink);y-=qLeading;}
   for(const line of lines.answer){await ensureSpace(aLeading);await drawText(line,L+2,y,aSize,false,ink);y-=aLeading;}
   for(const line of lines.note){await ensureSpace(noteLeading);await drawText(line,L+2,y,noteSize,false,muted);y-=noteLeading;}
   y-=3;
  }else{await ensureSpace(15+(groupPhotos.length?rowGeometry(photoRows(groupPhotos)[0]).height:0));await drawText('ADDITIONAL SITE PHOTOS',L,y,8,true,blue);y-=15;}
  for(const row of photoRows(groupPhotos))await printPhotoRow(row,a?n+1:0);
 }
 for(const lines of tails){for(const line of lines){await ensureSpace(10);await drawText(line,L,y,8,false,ink);y-=10;}y-=8;}
 // Only the continuation gets numbering; no repeated inspector/date/footer blocks.
 if(doc.getPageCount()>1)doc.getPages().forEach((p,n)=>p.drawText((n+1)+' / '+doc.getPageCount(),{x:W-L-24,y:26,size:7,font,color:muted}));
 return new Blob([await doc.save() as BlobPart],{type:'application/pdf'});
}
