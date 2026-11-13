import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import type {Inspection,WeeklyReport,Project,Settings} from './model';
import {shiftDate,weeklyDays,weeklyWorkEntries,labourText} from './weekly';
export async function makeWeeklyReport(report:WeeklyReport,items:Inspection[],project:Project,settings:Settings,logoBytes?:ArrayBuffer){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 doc.setTitle('ACL Weekly Report - '+project.name+' - '+report.weekStart);doc.setAuthor(settings.inspector||'ACL');
 if(!logoBytes){const r=await fetch(import.meta.env.BASE_URL+'branding/acl-logo-v2.png');if(!r.ok)throw new Error('ACL logo is unavailable. Open the app online before downloading.');logoBytes=await r.arrayBuffer();}
 const logo=await doc.embedPng(logoBytes),W=595.28,H=841.89,L=38,CW=W-2*L,ink=rgb(.07,.16,.25),blue=rgb(0,.33,.65),muted=rgb(.4,.48,.58);
 const clean=(v:string)=>String(v||'').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"');
 function width(t:string,size:number,b=false){try{return (b?bold:font).widthOfTextAtSize(t,size)}catch{const ctx=document.createElement('canvas').getContext('2d')!;ctx.font=(b?'bold ':'')+size+'px Arial';return ctx.measureText(t).width;}}
 function wrap(t:string,size:number,b=false){const lines:string[]=[];for(const paragraph of clean(t).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;if(width((line?line+' ':'')+word,size,b)<=CW){line+=(line?' ':'')+word;continue;}if(line){lines.push(line);line='';}for(const ch of word){if(line&&width(line+ch,size,b)>CW){lines.push(line);line='';}line+=ch;}}lines.push(line);}return lines;}
 const date=(s:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
 const heading=(s:string)=>(new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'))+' - '+date(s)).toUpperCase();
 type Row={text:string;bold?:boolean;heading?:boolean;gap?:number};const rows:Row[]=[];
 let n=0;const entries=weeklyWorkEntries(items),byId=new Map(entries.map(e=>[e.inspection.id,e.text]));
 for(const day of weeklyDays(report,items)){
  const note=day.note;const active=day.inspections.length||note&&[note.work,note.deliveries,note.labour,note.issues,note.safety].some(Boolean);
  if(day.date>shiftDate(report.weekStart,4)&&!active)continue;
  rows.push({text:heading(day.date),bold:true,heading:true,gap:6},{text:'Site team: '+labourText(note)+'.'});
  if(note?.work.trim())rows.push({text:note.work});
  for(const i of day.inspections){const text=byId.get(i.id);if(text)rows.push({text:(++n)+'. '+text});}
  if(note?.deliveries.trim())rows.push({text:'Delivery received: '+note.deliveries});
  if(note?.issues.trim())rows.push({text:'Delays / outstanding items: '+note.issues});
  if(note?.safety.trim())rows.push({text:'Health and safety: '+note.safety});
 }
 const drawings=[];for(const image of report.nextWeekDrawings||[]){if(!/^data:image\/(png|jpeg);base64,/.test(image.dataUrl))throw new Error('Use PNG/JPEG next-week drawings.');drawings.push(await (image.dataUrl.startsWith('data:image/png;')?doc.embedPng(image.dataUrl):doc.embedJpg(image.dataUrl)));}
 if(report.nextWeek.trim()||drawings.length){rows.push({text:'NEXT WEEK - MONDAY, '+date(shiftDate(report.weekStart,7)).toUpperCase(),heading:true,bold:true,gap:8});rows.push({text:report.nextWeek.trim()||'Continue works in the areas shown in the drawing excerpts below.'});}
 let size=8.5;const available=H-170-48-(drawings.length?150:0);
 const height=(s:number)=>rows.reduce((sum,r)=>sum+(r.gap||0)+wrap(r.text,r.heading?s+1:s,r.bold).length*(r.heading?s+4:s+3),0);
 while(size>7&&height(size)>available)size-=.25;
 if(height(size)>available)throw new Error('This week has too much text for one readable A4 page. Shorten additional notes or export smaller drawing excerpts; no work entries have been removed.');
 const page=doc.addPage([W,H]);page.drawRectangle({x:0,y:H-62,width:W,height:62,color:ink});page.drawRectangle({x:32,y:H-47,width:88,height:38,color:rgb(.93,0,0)});page.drawImage(logo,{x:32,y:H-47,width:88,height:88*logo.height/logo.width});
 page.drawText('WEEKLY SITE REPORT',{x:136,y:H-27,size:15,font:bold,color:rgb(1,1,1)});page.drawText('ACL | DRYLINING WORKS',{x:136,y:H-43,size:8,font,color:rgb(1,1,1)});
 async function draw(t:string,x:number,y:number,s:number,b=false,color=ink){try{page.drawText(clean(t),{x,y,size:s,font:b?bold:font,color});}catch{const c=document.createElement('canvas');c.width=Math.ceil(width(t,s,b)*3+12);c.height=Math.ceil(s*4.5);const ctx=c.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#14253b';ctx.font=(b?'bold ':'')+s*3+'px Arial';ctx.fillText(t,0,s*3);const image=await doc.embedPng(c.toDataURL());page.drawImage(image,{x,y:y-s*.22,width:c.width/3,height:c.height/3});}}
 const titleSize=Math.min(18,18*CW/Math.max(CW,width(project.name,18,true)));await draw(project.name,(W-width(project.name,titleSize,true))/2,H-102,titleSize,true);
 await draw('Prepared for: '+project.name,L,H-121,8.5);
 await draw('Reporting period: '+date(report.weekStart)+' - '+date(shiftDate(report.weekStart,6))+' '+report.weekStart.slice(0,4)+' | Friday: '+date(shiftDate(report.weekStart,4))+' '+report.weekStart.slice(0,4),L,H-138,8.5);
 const inspector=settings.inspector==='Goga'?'Goga Adeishvili':settings.inspector;
 await draw('Prepared by: '+inspector+' | ASTA Construction Ltd (ACL)',L,H-155,8.5);
 let y=H-172;for(const r of rows){y-=r.gap||0;const s=r.heading?size+1:size;for(const line of wrap(r.text,s,r.bold)){await draw(line,L,y,s,r.bold,r.heading?blue:ink);y-=r.heading?size+4:size+3;}}
 if(drawings.length){const gap=12,bw=(CW-gap*(drawings.length-1))/drawings.length,bh=Math.min(150,y-55);if(bh<90)throw new Error('Not enough space for next-week drawings. Shorten additional notes.');for(const [n,image] of drawings.entries()){const scale=Math.min(bw/image.width,bh/image.height),w=image.width*scale,h=image.height*scale,x=L+n*(bw+gap);page.drawRectangle({x,y:y-bh-6,width:bw,height:bh,borderWidth:.5,borderColor:rgb(.85,.9,.93)});page.drawImage(image,{x:x+(bw-w)/2,y:y-6-(bh+h)/2,width:w,height:h});}}
 await draw('ASTA Construction Ltd | Week commencing '+date(report.weekStart)+' '+report.weekStart.slice(0,4),32,22,7,false,muted);await draw('1',559,22,7,false,muted);
 return new Blob([await doc.save() as BlobPart],{type:'application/pdf'});
}
