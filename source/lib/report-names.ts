import {reportInspectionAnswers,type Inspection,type Answer} from './model';
export const reportReference=(reference:string)=>reference.replace(/^(QA|QN)-/,'QI-');
const stageTitle=(stage:string)=>/(?:hangers|angle).*mastic/i.test(stage)?'Angle and mastic inspection':/plaster|board/i.test(stage)?'Plasterboard inspection':'Metal inspection';
export function scopeLabel(q:Answer,i:Inspection):string|undefined{
 switch(q.id){
  case 'top-hanger':return 'Top angle';
  case 'floor-mastic':case 'interface-mastic':return 'Mastic';
  case 'head-insulation':return 'Deflection-head insulation';
  case 'pre-board-plate':return /insulation/i.test(q.question)?'Insulation and flat plate':/bracket/i.test(q.question)?'Acoustic brackets and backing':'Pre-boarding flat plate';
  case 'boarding':return 'Plasterboard';
  case 'final-plate':return 'Joint flat plates';
  case 'tracks':return i.wallType==='IWL-3'?'Window reveal framing':/top and bottom|head and base/i.test(q.question)?'Head and base tracks':'Head track';
  case 'base-tracks':return 'Base track';
  case 'metal-frame':return /bracket/i.test(q.question)?'Acoustic brackets':'Metal framing';
  case 'insulation':return 'Insulation and first fix';
  default:return undefined;
 }
}
export function inspectionTitle(input:string|Inspection){
 if(typeof input==='string')return stageTitle(input);
 const checks=reportInspectionAnswers(input),active=checks.filter(q=>!q.skipped);
 if(!active.length)return 'Quality inspection';
 const labels=active.map(q=>scopeLabel(q,input));
 if(labels.some(x=>!x))return stageTitle(input.stage);
 const finishing=/(?:hangers|angle).*mastic/i.test(input.stage);
 // Complete framing/boarding scopes retain their familiar concise category names.
 if(!finishing&&active.length===checks.length&&active.length>1)return stageTitle(input.stage);
 const unique=[...new Set(labels as string[])];
 return unique.map((label,n)=>n?label[0].toLowerCase()+label.slice(1):label).join(' and ')+' inspection';
}
export function reportFilename(i:Inspection){return (inspectionTitle(i)+' - '+i.floor+' - '+reportReference(i.reference)+' - v'+i.version+'.pdf').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-');}
