import type {Answer} from './model';
export const layoutName='Internal Wall Lay-outs - rev.C1-021126(1).pdf';
export const specificationRef='TIG-RYD-SP-A-1005 P2 (Draft for Information, 15 Apr 2026)';
export const stages=['Metal framing','Insulation & first fix','Boarding & sealing','Final inspection'];
export const wallTypes=[
 {id:'IWL-1',title:'Independent acoustic lining',colour:'#a6ecec',build:'146 mm I-stud; 100 mm acoustic insulation; 4 x 15 mm plasterboard on lining face.',detail:'P2 specifies Knauf 148 mm U channels and 146 mm I-studs at 600 mm centres, Rocksilk RS60 100 mm and four 15 mm Soundshield Plus layers.',source:'C1 layout legend; P2 PDF pp. 11–13 and 8–9.',issue:'Use the accepted manufacturer system and approved head/base detail. ALPHA double-layer guidance is not approval for this four-layer assembly.'},
 {id:'IWL-2',title:'Independent acoustic lining',colour:'#ff8f96',build:'92 mm I-stud; 100 mm acoustic insulation; 4 x 15 mm plasterboard on lining face.',detail:'P2 specifies Knauf 94 mm U channels and 92 mm I-studs at 600 mm centres, Rocksilk RS60 100 mm and four 15 mm Soundshield Plus layers.',source:'C1 layout legend; P2 PDF pp. 15–17 and 8–9.',issue:'Check how the 100 mm insulation is accommodated. Record the approved arrangement; do not assume compression is acceptable.'},
 {id:'IWL-3',title:'Reveal / local acoustic lining',colour:'#e58bea',build:'4 x 15 mm plasterboard; local acoustic lining to window/door reveals.',detail:'P2 describes Stravilink furring channels and QCR acoustic isolation for reveals. It lists four 15 mm Soundshield Plus layers. P2 leaves the insulation entry blank.',source:'C1 layout legend; P2 PDF pp. 19–21; typical details 80-0001 / 80-0003 P02.',issue:'Some escape-door reveals require site review before installation. Do not invent an insulation thickness for IWL-3.'},
 {id:'IWS-1',title:'Internal acoustic partition',colour:'#8cec36',build:'C1: 92 mm I-stud; 100 mm insulation; 2 x 15 mm board each face.',detail:'C1 legend differs from P2: P2 describes 92 mm C-studs with one 15 mm layer each side. These are different constructions.',source:'C1 layout legend versus P2 PDF pp. 5–6.',issue:'DESIGN CLARIFICATION: confirm stud type, board layers, insulation and required fire performance. A dated approved design/RFI reference is required before Pass.'},
 {id:'IWS-2',title:'Shaftwall',colour:'#6865ee',build:'C1: 92 mm I-stud; 25 mm acoustic insulation; 3 x 15 mm plasterboard plus 1 x 30 mm coreboard.',detail:'C1 legend gives a 120 minute fire rating. The supplied P2 specification does not include a complete IWS-2 system section.',source:'C1 layout legend (all three pages).',issue:'Approved shaftwall system and installation details are required before Pass. Do not reuse the IWS-1 specification.'},
 {id:'BLK-1',title:'Dense blockwork',colour:'#a55bed',build:'140 mm dense blockwork; minimum density 1800 kg/m³.',detail:'Check blockwork interfaces and window infills before the lining is concealed.',source:'C1 layout legend / local drawing notes.',issue:'Record substrate handover and outstanding interface issues. Do not sign off hidden work by others without evidence.'}
];
function legacyStageQuestion(wallId:string,stage:string):Answer[]{
 const w=wallTypes.find(x=>x.id===wallId);if(!w)return [];
 let question='',expected='';
 if(wallId==='BLK-1'){
  question='Has the blockwork and its lining interface been completed as shown on the drawing?';
  expected='The blockwork at the marked location has been checked against the drawing: 140 mm dense blockwork with minimum density 1800 kg/m³. Alignment, substrate condition, openings and the adjoining lining interface have been inspected. Any incomplete work or interface defect is recorded with its corrective action and supporting photographs.';
 }else if((stage===stages[0]||stage==='Framing & isolation')){
  question='Has the metal framing been installed in accordance with the drawing?';
  const profile=wallId==='IWL-1'?'148 mm U floor/head channels and 146 mm I-studs at 600 mm centres':wallId==='IWL-2'?'94 mm U floor/head channels and 92 mm I-studs at 600 mm centres':wallId==='IWL-3'?'the specified Stravilink furring channels and QCR acoustic reveal isolation, with fixing positions to the approved local detail':wallId==='IWS-1'?'the 92 mm I-stud framing shown in the C1 legend, with track type and stud centres confirmed by the approved design reference':'the 92 mm I-stud shaftwall framing shown in the C1 legend, with track type and stud centres confirmed by the approved shaftwall detail';
  expected=`${wallId}: ${profile}. Framing is plumb, aligned and securely fixed to the approved drawing.`;
 }else if(stage===stages[1]){
  question='Has the insulation and first-fix work been installed in accordance with the drawing?';
  const wool=wallId==='IWL-1'||wallId==='IWL-2'?'the specified 100 mm acoustic insulation':wallId==='IWS-1'?'the 100 mm acoustic insulation shown in the C1 legend and confirmed by the approved IWS-1 design':wallId==='IWS-2'?'the 25 mm acoustic insulation shown in the C1 shaftwall legend and confirmed by the approved system':'the insulation arrangement stated in the approved reveal detail (the supplied IWL-3 specification does not give a thickness)';
  expected=`The ${wallId} insulation and first-fix work at the marked location has been checked against the drawing and system details, including ${wool}. Insulation is fitted continuously to the approved arrangement, without unapproved gaps or compression. Backing, service routes and penetrations have been inspected before closure. The membrane requirement at external masonry interfaces has been checked where applicable. Supporting photographs record the inspected work.`;
 }else if(stage===stages[2]){
  question='Has the boarding and sealing been installed in accordance with the drawing?';
  expected=`Boarding and sealing for ${wallId} has been inspected at the marked location against the drawing and approved system details. Required build-up: ${w.build} Board identity, installed layer count, joint stagger, screw type, length, spacing and depth have been checked against the approved drawing detail for this assembly. Perimeter, abutment and penetration seals have been checked for continuity using the specified compatible acoustic/fire sealing system. Photographs record the inspected installation.`;
 }else{
  question='Is the completed work satisfactory against the drawing and specification?';
  expected=`The completed ${wallId} work at the marked location has been inspected against the drawing and approved specification. Required build-up: ${w.build} The visible finish, taped joints, board condition, perimeter sealing and adjacent interfaces have been checked. Inspection photographs and the drawing pin identify the work assessed. Any defect or outstanding work is recorded separately with its corrective action.`;
 }
 return [{id:'stage-summary',question,expected,source:w.source,answer:'',result:'Pending',comment:''}];
}
export function questions(wallId:string,stage:string,profile:'neos'|'generic'='neos',customSpec=''):Answer[]{
 const make=(id:string,question:string,expected:string,source:string,extra:Partial<Answer>={}):Answer=>({id,question,section:stage,expected,source,answer:'',result:'Pending',comment:'',...extra});
 const metal=stage===stages[0]||stage==='Framing & isolation';const boarding=stage===stages[2];
 if(profile==='generic'){
  const source='Selected project drawing / approved specification: '+customSpec;
  if(metal)return [make('tracks','Have the head and base tracks and their specified interfaces been installed correctly?',`The head and base tracks at the marked location have been checked against this project's approved drawing and specification: ${customSpec}. Track type, fixings, any specified isolation layers and head detail have been verified. Actual products and dimensions are recorded in the notes.`,source),make('metal-frame','Has the metal framing been installed in accordance with this project drawing?',`The metal framing at the marked location has been checked against this project's approved drawing and specification: ${customSpec}. Stud and track types, stud centres, alignment and fixings have been verified. The actual measured centres are recorded in the notes.`,source)];
  if(boarding)return [make('pre-board-plate','Is the specified backing / flat plate installed before boarding?',`The backing / flat plate locations have been checked against the approved project detail: ${customSpec}. Product, joint support and any head offset have been verified before concealment.`,source),make('boarding','Are the plasterboard joint stagger and screw fixings installed in accordance with the manufacturer’s guidance, with screws at maximum 300 mm centres?',`Yes. The plasterboard layers, joint stagger, seals and screw fixings are installed in accordance with the manufacturer’s guidance and recommendations, with screws at maximum 300 mm centres.`,source),make('final-plate','Is the required backing to the final board layer in place?',`The final layer's joint support and any specified backing plates have been inspected and photographed before concealment, in accordance with the approved project detail: ${customSpec}.`,source)];
  return [make('stage-'+stage.replace(/\W+/g,'-'),'Has this work stage been completed to the approved project detail?',`The ${stage.toLowerCase()} work at the marked pin has been checked against the approved project drawing and specification: ${customSpec}. The result, observed measurements and site photographs are recorded below.`,source)];
 }
 const w=wallTypes.find(w=>w.id===wallId);if(!w)return [];
 if(wallId==='BLK-1')return legacyStageQuestion(wallId,stage).map(q=>({...q,id:'block-'+stage.replace(/\W+/g,'-'),section:stage}));
 if(metal){const frame=legacyStageQuestion(wallId,stages[0])[0];return [make('tracks','Are the top and bottom tracks installed correctly?',`Top track: 1 × 12.5 mm black CineWALL PRO isolation strip, with 2 layers of FireLine plasterboard fire strips fixed to the top track. Bottom track: 2 × 12.5 mm blue CineWALL LITE isolation strips (25 mm total). Both tracks are securely fixed; alignment and isolation are checked.`, 'Current project drawing.'),{...frame,id:'metal-frame',section:stage}];}
 if(boarding)return [
 make('pre-board-plate','Is the flat plate securely fixed to the metal framing before boarding?',`The flat plate is securely fixed to the metal framing in accordance with the drawing and applicable guidance recommendations.`, 'Current project drawing and approved details.'),
 make('boarding','Are the plasterboard joint stagger and screw fixings installed in accordance with the manufacturer’s guidance, with screws at maximum 300 mm centres?',`Yes. The plasterboard layers, joint stagger, seals and screw fixings are installed in accordance with the manufacturer’s guidance and recommendations, with screws at maximum 300 mm centres.`, 'Current project drawing and approved details.'),
 make('final-plate','Is the required flat plate / backing for the final plasterboard layer securely fixed?',`The required backing / flat plate for the final board layer is securely fixed in accordance with the drawing and applicable guidance recommendations.`, 'Current project drawing and approved details.')
 ];
 return legacyStageQuestion(wallId,stage).map(q=>({...q,id:stage===stages[1]?'insulation':'final-check',section:stage}));
}
export const answerOptions=(q:Answer)=>[
 {label:'Yes',text:q.expected,result:'Pass' as const},
 {label:'Defect / incomplete work',text:'Work does not match the drawing. Defect and corrective action recorded below.',result:'Fail' as const},
 {label:'Not inspected yet',text:'Not yet inspected.',result:'Pending' as const}
];
