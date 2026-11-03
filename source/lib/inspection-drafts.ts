import type {Inspection} from './model';
export interface InspectionDraft{id:string;inspection:Inspection;savedAt:string}
export function draftInspection(i:Inspection):Inspection{return {...structuredClone(i),status:'Pending'};}
export function recoverInspection(draft:InspectionDraft,current?:Inspection):Inspection{
 const i=draftInspection(draft.inspection);
 if(!current||current.version===i.version)return {...i,version:(current?.version??i.version)+1,updatedAt:draft.savedAt};
 return {...i,id:i.id+'-recovery-'+crypto.randomUUID().slice(0,8),reference:i.reference+'-RECOVERY',version:1,updatedAt:draft.savedAt,comments:'Recovered unsaved edits; the newer saved inspection is retained. '+i.comments};
}
