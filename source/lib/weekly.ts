import {FINISHING_STAGE,isFinishingStage} from './catalogue';
import type {Inspection,WeeklyReport,RecordItem} from './model';
import {projectOf} from './model';
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
 const stage=weeklyStage(i);
 const work=i.wallType==='IWL-3'&&['Metal framing','Plasterboard'].includes(stage)?(stage==='Metal framing'?'Window reveal framing':'Window reveal plasterboard'):stage;
 const checked=i.workDate&&i.workDate!==i.date?' Checked on '+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(i.date+'T12:00:00Z'))+'.':'';
 return `${weeklyLocation(i)}: ${weeklyStatus(i)==='Pass'?work+' installed and passed quality inspection.':work+' activity recorded; quality inspection still pending.'}${checked}${i.comments?' '+i.comments:''}`;
}
