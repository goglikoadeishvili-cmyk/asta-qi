import {FINISHING_STAGE,isFinishingStage} from './catalogue';
import type {Inspection,WeeklyReport,RecordItem} from './model';
import {projectOf,reportInspectionAnswers} from './model';
import {scopeLabel} from './report-names';
export function dateKey(date=new Date(),zone='Europe/London'){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function shiftDate(key:string,days:number){const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function monday(key:string){const d=new Date(key+'T12:00:00Z');return shiftDate(key,-((d.getUTCDay()+6)%7));}
export function weekDates(start:string){return Array.from({length:7},(_,n)=>shiftDate(start,n));}
export function newWeekly(projectId:string,date=dateKey()):WeeklyReport{const weekStart=monday(date);return {id:'weekly:'+projectId+':'+weekStart,kind:'weekly',projectId,weekStart,days:[],nextWeek:'',preparedFor:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),version:1};}
export function weeklyInspections(records:RecordItem[],projectId:string,start:string){return records.filter((r):r is Inspection=>r.kind==='inspection'&&(!r.deletedAt||!!r.localClearedAt)&&projectOf(r)===projectId&&(r.workDate||r.date)>=start&&(r.workDate||r.date)<shiftDate(start,7)).sort((a,b)=>(a.workDate||a.date).localeCompare(b.workDate||b.date)||a.reference.localeCompare(b.reference));}
export function weeklyDays(report:WeeklyReport,inspections:Inspection[]){return weekDates(report.weekStart).map(date=>({date,note:report.days.find(d=>d.date===date),inspections:inspections.filter(i=>(i.workDate||i.date)===date)}));}
export function weeklyStatus(i:Inspection){return i.status==='Pass'?'Pass':'Pending';}
export function weeklyStage(i:Inspection){return isFinishingStage(i.stage)?FINISHING_STAGE:i.stage==='Metal framing'||i.stage==='Framing & isolation'?'Metal framing':i.stage==='Boarding & sealing'?'Plasterboard':i.stage;}
export function weeklyLocation(i:Inspection){
 const floor=({OB1:'Oxendon Basement',GF:'Ground Floor',MO1:'Mezzanine'} as Record<string,string>)[i.floor]||i.floor;
 return i.location?(i.location.toLowerCase().includes(floor.toLowerCase())?i.location:floor+' - '+i.location):floor;
}
export function weeklyInspectionText(i:Inspection){
 const active=reportInspectionAnswers(i).filter(a=>!a.skipped);if(!active.length)return '';
 const labels=[...new Set(active.map(a=>scopeLabel(a,i)||weeklyStage(i)))];
 const work=labels.map((label,n)=>n?label[0].toLowerCase()+label.slice(1):label).join(', ');
 return `${weeklyLocation(i)}: ${work} ${i.status==='Pass'?'installation completed.':'work recorded; completion not confirmed.'}`;
}
export function weeklyWorkEntries(items:Inspection[]){
 const groups=new Map<string,Inspection[]>();
 const key=(i:Inspection)=>[i.floor,i.location,i.drawingId,i.drawingSnapshot.reference,i.drawingSnapshot.revision,i.pin.page].join('|');
 const pin=(i:Inspection)=>i.pin.x.toFixed(6)+','+i.pin.y.toFixed(6);
 for(const i of items){const k=key(i);groups.set(k,[...(groups.get(k)||[]),i]);}
 return items.map(i=>{const text=weeklyInspectionText(i);if(!text)return {inspection:i,text};
  const positions=[...new Set(groups.get(key(i))!.map(pin))].sort();
  const suffix=positions.length>1?' - Wall section '+(positions.indexOf(pin(i))+1):'';
  return {inspection:i,text:text.replace(weeklyLocation(i)+':',weeklyLocation(i)+suffix+':')};
 });
}

export function labourComplete(report:WeeklyReport){return weekDates(report.weekStart).slice(0,5).every(date=>{const d=report.days.find(d=>d.date===date);return [d?.dryliners,d?.labourers].every(v=>typeof v==='string'&&/^\d+$/.test(v));});}
export function labourText(day?:import('./model').WeeklyDay){return 'Site Manager / Supervisor | '+(day?.dryliners??'Not recorded')+' Dryliners | '+(day?.labourers??'Not recorded')+' Labourers';}
export function reportInspections(records:RecordItem[],report:WeeklyReport){return weeklyInspections(records,report.projectId,report.weekStart).filter(i=>!report.excludedInspectionIds?.includes(i.id));}
