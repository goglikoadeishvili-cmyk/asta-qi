export type FloorId=string;
export const DEFAULT_PROJECT_ID='neos-haymarket';
export interface ProjectFloor{id:string;name:string;detail:string}
export interface Project{id:string;kind:'project';name:string;address:string;floors:ProjectFloor[];qaProfile:'neos'|'generic';preparedFor?:string;createdAt:string}
export const projectOf=(r:{projectId?:string})=>r.projectId||DEFAULT_PROJECT_ID;
export type Result='Draft'|'Pending'|'Pass'|'Fail';
export type CheckResult='Pass'|'Fail'|'Pending'|'N/A';
export interface Pin{x:number;y:number;page:number}
export interface Drawing{id:string;kind:'drawing';projectId?:string;floorName?:string;floor:FloorId;name:string;reference:string;revision:string;fileId:string;page:number;active:boolean;createdAt:string}
export interface Answer{id:string;question:string;section?:string;checkedAt?:string;expected:string;source:string;answer:string;result:CheckResult;comment:string;referenceIds?:string[];headOffsetMm?:string;detailReference?:string;requiresHeadMeasurement?:boolean}
export interface Photo{id:string;name:string;caption:string;createdAt:string;reportId?:string;questionId?:string}
export interface Inspection{workDate?:string;id:string;kind:'inspection';projectId?:string;qaProfile?:'neos'|'generic';templateVersion?:2;reference:string;floor:FloorId;drawingId:string;drawingSnapshot:{name:string;reference:string;revision:string;page:number};pin:Pin;wallType:string;wallSnapshot:string;stage:string;location:string;locationSource?:'pin'|'manual';legacyAnswers?:Answer[];sections?:Record<string,Answer[]>;date:string;specification:string;description:string;answers:Answer[];photos:Photo[];status:Result;comments:string;defects:string;corrective:string;approvalRef:string;approvedBuildUp:string;createdAt:string;updatedAt:string;version:number;deletedAt?:string;retentionHold?:boolean;archiveReason?:string;archivedByBatch?:string;evidencePurgedAt?:string;localClearedAt?:string}
export interface Batch{temporaryReports?:boolean;id:string;kind:'batch';projectId?:string;createdAt:string;inspectionIds:string[];references?:string[];versions:number[];reportIds:string[];reportNames?:string[];zipId:string;recipient:string;subject:string;message:string;status:'prepared'|'shared'|'accepted'|'failed'|'unknown'|'manual-sent';providerId?:string;provider?:'gmail'|'gateway'|'manual';sender?:string;sentAt?:string;includesOriginals?:boolean;originalCount?:number;deliveredAt?:string;deliveryEvidence?:string;deliverySource?:'recipient-confirmation';archiveAt?:string;backupConfirmedAt?:string;downloadedAt?:string;purgedAt?:string;error?:string;size:number}
export interface Settings{id:'settings';kind:'settings';name:string;inspector:string;recipient:string;emailEndpoint:string;emailToken:string;gmailClientId?:string;senderEmail?:string;reportingCompany?:string;preparedFor?:string}
export interface WeeklyDay{date:string;work:string;deliveries:string;labour:string;issues:string;safety:string}
export interface WeeklyReport{id:string;kind:'weekly';projectId:string;weekStart:string;days:WeeklyDay[];nextWeek:string;preparedFor:string;createdAt:string;updatedAt:string;version:number}
export type RecordItem=Drawing|Inspection|Batch|Settings|Project|WeeklyReport;
export const floors=[{id:'OB1',name:'Oxendon Basement',detail:'OB1',page:1,reference:'TIG-RYD-00-00-DDR-A-10-0099'},{id:'GF',name:'Ground Floor',detail:'GF1 / GF3',page:2,reference:'TIG-RYD-00-00-DDR-A-10-0102'},{id:'MO1',name:'Mezzanine',detail:'MO1',page:3,reference:'TIG-RYD-00-00-DDR-A-10-0103'}] as const;
export const initialSettings:Settings={id:'settings',kind:'settings',name:'ASTA CONSTUCTION',inspector:'Goga',recipient:'',emailEndpoint:'',emailToken:'',gmailClientId:'454681087002-nd38egluu2gq8io2rfkc80gr1uf95af2.apps.googleusercontent.com',senderEmail:'goglikoadeishvili@gmail.com',reportingCompany:'ACL',preparedFor:''};
export const uid=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export const today=()=>new Date().toLocaleDateString('en-CA');
export const formatDate=(s:string)=>new Date(s).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function allInspectionAnswers(i:Pick<Inspection,'answers'|'sections'|'stage'>){return [...Object.entries(i.sections||{}).filter(([stage])=>stage!==i.stage).flatMap(([,answers])=>answers),...i.answers];}
// A report documents the selected inspection stage, not earlier-stage history.
export function reportInspectionAnswers(i:Pick<Inspection,'answers'|'sections'|'stage'>){return i.answers.length?i.answers:allInspectionAnswers(i);}
export function validateInspection(i:Inspection,draft=false){
 if(!i.floor?.trim()||!i.drawingId||!Number.isInteger(i.pin?.page)||i.pin.page<1||![i.pin?.x,i.pin?.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new Error('Choose a floor, drawing and valid pin location.');
 if(!i.wallType)throw new Error('Choose a wall type.');
 if(draft||i.status==='Pending')return;
 if(!i.location.trim()||!i.description.trim())throw new Error('Enter the location and work description.');
 if(!i.photos.length)throw new Error('Add at least one evidence photo, or save a draft.');
 const checks=allInspectionAnswers(i);
 if(i.status==='Pass'&&(!checks.length||checks.some(a=>a.result!=='Pass'||!a.answer.trim())))throw new Error('Choose the prepared answer or enter your inspection answer before saving as Pass.');
 if(i.status==='Pass'&&i.qaProfile!=='generic'&&i.wallType==='IWS-2'&&(!i.approvalRef.trim()||!i.approvedBuildUp.trim()))throw new Error('Record the approved design/RFI reference and confirmed build-up for this wall type.');
 if(i.status==='Pass'&&checks.some(a=>a.result==='Fail'))throw new Error('Resolve failed checks before passing.');
 if(i.status==='Fail'&&(!i.defects.trim()||!i.corrective.trim()))throw new Error('Describe the defect and corrective action.');
}

export function assertProjectInspection(i:Inspection,drawings:Drawing[],projectId:string){const d=drawings.find(d=>d.id===i.drawingId);if(!d||projectOf(i)!==projectId||projectOf(d)!==projectId||i.floor!==d.floor||(i.templateVersion===2&&i.pin.page!==d.page))throw new Error('Inspection and drawing must belong to the selected project and floor.');}

export function inspectionsForProject(records:RecordItem[],projectId:string|null){return records.filter((r):r is Inspection=>r.kind==='inspection'&&!r.deletedAt&&projectOf(r)===projectId);}
