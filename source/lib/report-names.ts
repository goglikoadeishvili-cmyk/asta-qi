import type {Inspection} from './model';
export const reportReference=(reference:string)=>reference.replace(/^(QA|QN)-/,'QI-');
export const inspectionTitle=(stage:string)=>/(?:hangers|angle).*mastic/i.test(stage)?'Angle and mastic inspection':/plaster|board/i.test(stage)?'Plasterboard inspection':'Metal inspection';
export function reportFilename(i:Inspection){return (inspectionTitle(i.stage)+' - '+i.floor+' - '+reportReference(i.reference)+' - v'+i.version+'.pdf').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-');}
