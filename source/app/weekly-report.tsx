import React,{useEffect,useState,useRef} from 'react';
import {Download,ChevronLeft,ChevronRight,Save} from 'lucide-react';
import type {RecordItem,Project,Settings,WeeklyReport,WeeklyDay} from '../lib/model';
import {dateKey,monday,shiftDate,newWeekly,weeklyInspections,weeklyDays,weeklyStage,weeklyStatus} from '../lib/weekly';
import {download} from '../lib/archive';
import {makeWeeklyReport} from '../lib/weekly-pdf';
export default function WeeklyReports({records,project,settings,busy,run,ensure,save,onInspection,onDirty}: {records:RecordItem[];project:Project;settings:Settings;busy:boolean;run:(label:string,fn:()=>Promise<any>)=>Promise<void>;ensure:(r:WeeklyReport)=>Promise<void>;save:(r:WeeklyReport,expected:number)=>Promise<void>;onInspection:(id:string)=>void;onDirty:(dirty:boolean)=>void}){
 const current=monday(dateKey()),previousCurrent=useRef(current);
 const [week,Week]=useState(current),[dirty,Dirty]=useState(false);
 useEffect(()=>{if(current!==previousCurrent.current){const previous=previousCurrent.current;if(!dirty)Week(w=>w===previous?current:w);previousCurrent.current=current;}},[current,dirty]);
 const changeWeek=(value:string)=>{if(dirty&&!confirm('Discard unsaved weekly notes? Save notes first to keep them.'))return;Week(value);};
 const record=records.find((r):r is WeeklyReport=>r.kind==='weekly'&&r.projectId===project.id&&r.weekStart===week);
 useEffect(()=>{if(!record)ensure(newWeekly(project.id,week)).catch(()=>{});},[project.id,week,!!record]);
 const weeks=Array.from(new Set([monday(dateKey()),week,...records.filter((r):r is WeeklyReport=>r.kind==='weekly'&&r.projectId===project.id).map(r=>r.weekStart),...records.filter(r=>r.kind==='inspection'&&r.projectId===project.id).map(r=>monday((r as any).workDate||(r as any).date))])).sort().reverse();
 return <section className="weekly-report"><div className="weekly-toolbar"><button className="secondary" aria-label="Previous week" disabled={busy} onClick={()=>changeWeek(shiftDate(week,-7))}><ChevronLeft size={18}/></button><label>Week commencing Monday<select value={week} onChange={e=>changeWeek(e.target.value)}>{weeks.map(w=><option key={w} value={w}>{w}</option>)}</select></label><button className="secondary" aria-label="Next week" disabled={busy||week>=monday(dateKey())} onClick={()=>changeWeek(shiftDate(week,7))}><ChevronRight size={18}/></button></div><p className="hint">A new week starts each Monday when the app is open. Inspection summaries update automatically. Save your daily notes, review on Friday, then download one ACL PDF. PDFs are not stored as duplicate files.</p>{record?<WeeklyEditor key={record.id} report={record} {...{records,project,settings,busy,run,save,onInspection}} onDirty={(value:boolean)=>{Dirty(value);onDirty(value);}}/>:<p role="status">Opening this week's record…</p>}</section>;
}
function WeeklyEditor({report,records,project,settings,busy,run,save,onInspection,onDirty}:any){
 const [draft,D]=useState<WeeklyReport>(report),[dirty,Dirty]=useState(false),[day,Day]=useState(dateKey()>=report.weekStart&&dateKey()<=shiftDate(report.weekStart,6)?dateKey():report.weekStart);
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty]);
 useEffect(()=>{if(!dirty)D(report);},[report,dirty]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const items=weeklyInspections(records,project.id,draft.weekStart),days=weeklyDays(draft,items),note=draft.days.find(d=>d.date===day)||{date:day,work:'',deliveries:'',labour:'',issues:'',safety:''};
 const set=(key:keyof WeeklyReport,value:any)=>{D(x=>({...x,[key]:value}));Dirty(true);};
 function editDay(key:keyof WeeklyDay,value:string){set('days',[...draft.days.filter(d=>d.date!==day),{...note,[key]:value}].sort((a,b)=>a.date.localeCompare(b.date)));}
 async function persist(){const next={...draft,updatedAt:new Date().toISOString(),version:draft.version+1};await save(next,draft.version);D(next);Dirty(false);return next;}
 return <><div className="attachment"><div><strong>ACL · Weekly Report</strong><small>{draft.weekStart} – {shiftDate(draft.weekStart,6)} · {items.length} inspections · {dirty?'Unsaved notes':'Saved notes'}</small></div></div><label>Prepared for / client<input value={draft.preparedFor||''} placeholder={project.preparedFor||settings.preparedFor||'Client company name'} onChange={e=>set('preparedFor',e.target.value)}/></label>
 <div className="weekly-days">{days.map(d=><button key={d.date} className={day===d.date?'active':''} onClick={()=>Day(d.date)}><strong>{new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'UTC'}).format(new Date(d.date+'T12:00:00Z'))}</strong><small>{d.inspections.length} checks</small></button>)}</div>
 <h3>{day} · Daily record</h3><p className="hint">Dates stay factual. To record earlier work, open its inspection and set “Work performed date”. No inspection does not mean no work was done.</p>
 {days.find(d=>d.date===day)!.inspections.map(i=><button key={i.id} className="list-row" disabled={dirty||busy} onClick={()=>onInspection(i.id)}><span className="row-copy"><strong>{weeklyStage(i)} · {i.wallType} · {i.location}</strong><small>{i.reference} · {i.floor} · {weeklyStatus(i)}{i.workDate?' · Work date recorded':' · Inspection date'}</small></span><ChevronRight size={17}/></button>)}
 {!days.find(d=>d.date===day)!.inspections.length&&<p className="hint">No inspection recorded for this day.</p>}
 <label>Work done / progress<textarea value={note.work} placeholder="Briefly record actual work, area and any measured quantity." onChange={e=>editDay('work',e.target.value)}/></label>
 <label>Deliveries received<textarea value={note.deliveries} placeholder="Material, quantity, supplier; or record no delivery if confirmed." onChange={e=>editDay('deliveries',e.target.value)}/></label>
 <details className="specification-details"><summary>Labour, delays & safety (optional)</summary>{([['labour','Labour on site'],['issues','Delays / issues / action owner'],['safety','Health & safety observations']] as const).map(([key,label])=><label key={key}>{label}<textarea value={note[key]} onChange={e=>editDay(key,e.target.value)}/></label>)}</details>
 <label>Planned for next week<textarea value={draft.nextWeek} onChange={e=>set('nextWeek',e.target.value)}/></label>
 <div className="photo-actions"><button className="secondary" disabled={busy||!dirty} onClick={()=>run('Saving weekly notes',persist)}><Save size={18}/>Save notes</button><button className="primary" disabled={busy} onClick={()=>run('Generating ACL weekly PDF',async()=>{const latest=dirty?await persist():draft;const pdf=await makeWeeklyReport(latest,items,project,settings);download(pdf,'ACL Weekly Report - '+project.name.replace(/[^a-zA-Z0-9 -]/g,'')+' - '+latest.weekStart+'.pdf');})}><Download size={18}/>Download weekly PDF</button></div>
 <p className="hint">Review before sending. Pending checks are not reported as completed work. Empty fields remain “Not recorded”.</p>
 </>;
}
