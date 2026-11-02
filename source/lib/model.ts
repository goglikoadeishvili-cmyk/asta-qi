export type FloorId='OB1'|'GF'|'MO1';
export type Result='Draft'|'Pending'|'Pass'|'Fail';
export type CheckResult='Pass'|'Fail'|'Pending'|'N/A';
export interface Pin{x:number;y:number;page:number}
export interface Drawing{id:string;kind:'drawing';floor:FloorId;name:string;reference:string;revision:string;fileId:string;page:number;active:boolean;createdAt:string}
export interface Answer{id:string;question:string;expected:string;source:string;answer:string;result:CheckResult;comment:string}
export interface Photo{id:string;name:string;caption:string;createdAt:string;reportId?:string}
export interface Inspection{id:string;kind:'inspection';reference:string;floor:FloorId;drawingId:string;drawingSnapshot:{name:string;reference:string;revision:string;page:number};pin:Pin;wallType:string;wallSnapshot:string;stage:string;location:string;date:string;specification:string;description:string;answers:Answer[];photos:Photo[];status:Result;comments:string;defects:string;corrective:string;approvalRef:string;approvedBuildUp:string;createdAt:string;updatedAt:string;version:number;deletedAt?:string}
export interface Batch{id:string;kind:'batch';createdAt:string;inspectionIds:string[];references?:string[];versions:number[];reportIds:string[];zipId:string;recipient:string;subject:string;message:string;status:'prepared'|'shared'|'accepted'|'failed'|'unknown';providerId?:string;error?:string;size:number}
export interface Settings{id:'settings';kind:'settings';name:string;inspector:string;recipient:string;emailEndpoint:string;emailToken:string}
export type RecordItem=Drawing|Inspection|Batch|Settings;
export const floors=[{id:'OB1',name:'Oxendon Basement',detail:'OB1',page:1,reference:'TIG-RYD-00-00-DDR-A-10-0099'},{id:'GF',name:'Ground Floor',detail:'GF1 / GF3',page:2,reference:'TIG-RYD-00-00-DDR-A-10-0102'},{id:'MO1',name:'Mezzanine',detail:'MO1',page:3,reference:'TIG-RYD-00-00-DDR-A-10-0103'}] as const;
export const initialSettings:Settings={id:'settings',kind:'settings',name:'ASTA CONSTUCTION',inspector:'Goga',recipient:'',emailEndpoint:'',emailToken:''};
export const uid=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export const today=()=>new Date().toLocaleDateString('en-CA');
export const formatDate=(s:string)=>new Date(s).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function validateInspection(i:Inspection,draft=false){
 if(!floors.some(f=>f.id===i.floor)||!i.drawingId||!Number.isInteger(i.pin?.page)||i.pin.page<1||![i.pin?.x,i.pin?.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new Error('Choose a floor, drawing and valid pin location.');
 if(!i.wallType)throw new Error('Choose a wall type.');
 if(draft)return;
 if(!i.location.trim()||!i.description.trim())throw new Error('Enter the location and work description.');
 if(!i.photos.length)throw new Error('Add at least one evidence photo, or save a draft.');
 if(i.status==='Pass'&&i.answers.some(a=>!['Pass','N/A'].includes(a.result)||!a.answer.trim()||(a.result==='N/A'&&!a.comment.trim())))throw new Error('Complete every checklist item. Explain any N/A answer before passing.');
 if(i.status==='Pass'&&['IWS-1','IWS-2'].includes(i.wallType)&&(!i.approvalRef.trim()||!i.approvedBuildUp.trim()))throw new Error('Record the approved design/RFI reference and confirmed build-up for this wall type.');
 if(i.status==='Pass'&&i.answers.some(a=>a.result==='Fail'))throw new Error('Resolve failed checks before passing.');
 if(i.status==='Fail'&&(!i.defects.trim()||!i.corrective.trim()))throw new Error('Describe the defect and corrective action.');
}
