import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import type {Inspection,WeeklyReport,Project,Settings} from './model';
import {shiftDate,weeklyDays,weeklyInspectionText,weeklyStatus} from './weekly';
export async function makeWeeklyReport(report:WeeklyReport,items:Inspection[],project:Project,settings:Settings,logoBytes?:ArrayBuffer){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 doc.setTitle('ACL Weekly Report - '+project.name+' - '+report.weekStart);doc.setAuthor('ACL');doc.setCreator('ASTA QI');
 if(!logoBytes){const response=await fetch(import.meta.env.BASE_URL+'branding/acl-logo-v2.png');if(!response.ok)throw new Error('ACL logo is unavailable. Open the app online once before downloading the weekly PDF.');logoBytes=await response.arrayBuffer();}
 const logo=await doc.embedPng(logoBytes),W=595.28,H=841.89,L=36,CW=W-L*2,ink=rgb(.07,.16,.28),blue=rgb(.12,.32,.53),muted=rgb(.38,.45,.52),rule=rgb(.83,.88,.92);
 let page=doc.addPage([W,H]),y=0;
 function start(first=false){if(!first)page=doc.addPage([W,H]);if(first){page.drawRectangle({x:0,y:765,width:W,height:77,color:ink});const width=88;page.drawImage(logo,{x:L,y:789,width,height:width*logo.height/logo.width});page.drawText('WEEKLY SITE REPORT',{x:145,y:811,size:17,font:bold,color:rgb(1,1,1)});page.drawText('ACL | DRYLINING WORKS',{x:145,y:790,size:9,font,color:rgb(.75,.84,.94)});y=744;}else{page.drawText('ACL | WEEKLY REPORT | '+report.weekStart+' | CONTINUED',{x:L,y:811,size:8,font:bold,color:muted});page.drawLine({start:{x:L,y:801},end:{x:W-L,y:801},thickness:.6,color:rule});y=782;}}
 const clean=(v:string)=>String(v||'').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"');
 function width(text:string,size:number,b=false){try{return (b?bold:font).widthOfTextAtSize(text,size)}catch{const ctx=document.createElement('canvas').getContext('2d')!;ctx.font=(b?'bold ':'')+size+'px Arial';return ctx.measureText(text).width;}}
 function wrap(text:string,size:number,b=false){const lines:string[]=[];for(const p of clean(text).split('\n')){let line='';for(const word of p.split(/\s+/)){if(!word)continue;if(width((line?line+' ':'')+word,size,b)<=CW){line+=(line?' ':'')+word;continue;}if(line){lines.push(line);line='';}for(const c of word){if(line&&width(line+c,size,b)>CW){lines.push(line);line='';}line+=c;}}lines.push(line);}return lines;}
 async function line(text:string,size:number,b=false,color=ink){if(y-size<44)start();try{page.drawText(text,{x:L,y,size,font:b?bold:font,color})}catch{const canvas=document.createElement('canvas');canvas.width=Math.ceil(width(text,size,b)*3+12);canvas.height=Math.ceil(size*4.5);const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#14253b';ctx.font=(b?'bold ':'')+size*3+'px Arial, sans-serif';ctx.textBaseline='alphabetic';ctx.fillText(text,0,size*3);const image=await doc.embedPng(canvas.toDataURL());page.drawImage(image,{x:L,y:y-size*.22,width:canvas.width/3,height:canvas.height/3});}y-=size*1.45;}
 async function text(value:string,size=9,b=false,color=ink){for(const valueLine of wrap(value,size,b))await line(valueLine,size,b,color);}
 async function heading(label:string){if(y<100)start();y-=12;await text(label,11,true,blue);y-=4;}
 start(true);
 await text(project.name,14,true);await text('Prepared for: '+(report.preparedFor||project.preparedFor||settings.preparedFor||'Not recorded'),9);await text('Reporting period: '+report.weekStart+' to '+shiftDate(report.weekStart,6)+' | Friday: '+shiftDate(report.weekStart,4),9);
 await text('Prepared by: '+settings.inspector+' | Company: ACL | Generated: '+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium'}).format(new Date()),9);
 y-=8;const passed=items.filter(i=>weeklyStatus(i)==='Pass').length;await text(items.length+' inspection records | '+passed+' Pass | '+(items.length-passed)+' Pending',9,true);
 await text('Inspection records show the work checked at each location. Pass does not certify completion of an entire area. Blank days mean no entry recorded.',8,false,muted);
 await heading('1  DAILY WORK AND INSPECTIONS');
 for(const day of weeklyDays(report,items)){
  const active=day.inspections.length||day.note&&Object.entries(day.note).some(([k,v])=>k!=='date'&&v.trim());
  if(day.date>shiftDate(report.weekStart,4)&&!active)continue;
  if(y<115)start();y-=7;
  await text(new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(new Date(day.date+'T12:00:00Z'))+' - '+day.date,10,true);
  if(day.note?.work)await text('Work recorded: '+day.note.work);
  if(!day.inspections.length&&!day.note?.work)await text('No work or inspection entry recorded.',8,false,muted);
  for(const i of day.inspections)await text(weeklyInspectionText(i),8.5);
  if(day.note?.deliveries)await text('Deliveries: '+day.note.deliveries);
  if(day.note?.labour)await text('Labour: '+day.note.labour);
 }
 await heading('2  DELAYS AND OUTSTANDING ITEMS');
 const delays=report.days.filter(d=>d.issues.trim());for(const day of delays)await text(day.date+' - '+day.issues);
 const defects=items.filter(i=>i.defects||weeklyStatus(i)==='Pending');for(const i of defects)await text(i.reference+' / '+i.location+': '+(i.defects||'Inspection pending; completion not confirmed.')+(i.corrective?' Action: '+i.corrective:''));
 if(!delays.length&&!defects.length)await text('No delay or outstanding-item entry recorded.',9,false,muted);
 await heading('3  HEALTH AND SAFETY');const safety=report.days.filter(d=>d.safety.trim());for(const day of safety)await text(day.date+' - '+day.safety);if(!safety.length)await text('No health and safety entry recorded.',9,false,muted);
 await heading('4  PLANNED FOR NEXT WEEK');await text(report.nextWeek||'Not recorded.');
 for(const [index,p] of doc.getPages().entries()){p.drawLine({start:{x:L,y:34},end:{x:W-L,y:34},thickness:.5,color:rule});p.drawText('ACL | '+report.weekStart+' | '+(index+1)+' / '+doc.getPageCount(),{x:L,y:21,size:8,font,color:muted});}
 return new Blob([await doc.save() as BlobPart],{type:'application/pdf'});
}
