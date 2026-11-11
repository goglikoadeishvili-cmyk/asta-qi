import type {Answer} from './model';
export const layoutName='Internal Wall Lay-outs - rev.C1-021126(1).pdf';
export const specificationRef='TIG-RYD-SP-A-1005 P2 (Draft for Information, 15 Apr 2026)';
export const FINISHING_STAGE='Angle & mastic';
export const isFinishingStage=(stage:string)=>stage===FINISHING_STAGE||stage==='Hangers & mastic';
export const stages=['Metal framing','Insulation & first fix','Boarding & sealing','Final inspection',FINISHING_STAGE];
interface WallType{id:string;title:string;colour:string;build:string;detail:string;source:string;issue:string;insulationMm?:number}
export const wallTypes:WallType[]=[
 {id:'IWL-1',insulationMm:75,title:'Independent acoustic lining',colour:'#a6ecec',build:'92 mm I-stud; 75 mm acoustic insulation; 4 x 15 mm plasterboard on lining face.',detail:'Updated project instruction: 92 mm I-studs at 600 mm centres; floor/head channels to the updated project detail; 75 mm acoustic insulation and four 15 mm plasterboard layers.',source:'Company project update supplied 03 Nov 2026; insulation update 10 Nov 2026. Original C1/P2 documents retained as historical references.',issue:'Follow the updated project head/base detail for the revised framing.'},
 {id:'IWL-2',insulationMm:75,title:'Independent acoustic lining',colour:'#ff8f96',build:'92 mm I-stud; 75 mm acoustic insulation; 4 x 15 mm plasterboard on lining face.',detail:'Updated company instruction: 75 mm acoustic insulation. Framing and board layers retain Knauf 94 mm U channels, 92 mm I-studs at 600 mm centres and four 15 mm Soundshield Plus layers.',source:'Company insulation update, 10 Nov 2026; framing and boards: C1 layout legend; P2 PDF pp. 15–17 and 8–9.',issue:'Check the 75 mm insulation is continuous and fitted to the approved arrangement without unapproved gaps or compression.'},
 {id:'IWL-3',title:'Window reveal acoustic lining',colour:'#e58bea',build:'92 mm metal framing with acoustic brackets; 4 x 15 mm plasterboard.',detail:'Updated company instruction: window reveals use 92 mm metal framing on acoustic brackets. Four 15 mm plasterboard layers from the supplied specification. No insulation is specified for this checklist.',source:'Company window reveal update, 03 Nov 2026; plasterboard layers: P2 pp. 19–21.',issue:'Check the specified acoustic brackets and their fixing arrangement before boarding.'},
 {id:'IWS-1',insulationMm:75,title:'Internal acoustic partition',colour:'#8cec36',build:'92 mm C-stud; 75 mm insulation; 2 x 15 mm plasterboard each face.',detail:'92 mm C-stud framing, 75 mm insulation and two 15 mm plasterboard layers each face, installed in accordance with the specification and applicable guidance recommendations.',source:'Company insulation update, 10 Nov 2026; project specification and applicable guidance recommendations.',issue:'Follow the current project detail and manufacturer’s installation guidance.'},
 {id:'IWS-2',insulationMm:25,title:'Shaftwall',colour:'#6865ee',build:'C1: 92 mm I-stud; 25 mm acoustic insulation; 3 x 15 mm plasterboard plus 1 x 30 mm coreboard.',detail:'C1 legend gives a 120 minute fire rating. The supplied P2 specification does not include a complete IWS-2 system section.',source:'C1 layout legend (all three pages).',issue:'Approved shaftwall system and installation details are required before Pass. Do not reuse the IWS-1 specification.'},
 {id:'BLK-1',title:'Dense blockwork',colour:'#a55bed',build:'140 mm dense blockwork; minimum density 1800 kg/m³.',detail:'Check blockwork interfaces and window infills before the lining is concealed.',source:'C1 layout legend / local drawing notes.',issue:'Record substrate handover and outstanding interface issues. Do not sign off hidden work by others without evidence.'}
];
function legacyStageQuestion(wallId:string,stage:string):Answer[]{
 const w=wallTypes.find(x=>x.id===wallId);if(!w)return [];
 let question='',expected='';
 if(wallId==='BLK-1'){
  question='Has the blockwork and its lining interface been completed as shown on the drawing?';
  expected='The blockwork at the marked location has been checked against the drawing: 140 mm dense blockwork with minimum density 1800 kg/m³. Alignment, substrate condition, openings and the adjoining lining interface have been inspected. Any incomplete work or interface defect is recorded with its corrective action and supporting photographs.';
 }else if((stage===stages[0]||stage==='Framing & isolation')){
  question=wallId==='IWS-1'?'Has the 92 mm C-stud framing been installed at 600 mm centres in accordance with the specification and applicable guidance recommendations?':wallId==='IWL-1'?'Has the 92 mm I-stud framing been installed at 600 mm centres in accordance with the specification and applicable guidance recommendations?':'Has the metal framing been installed in accordance with the drawing?';
  const profile=wallId==='IWL-1'?'92 mm I-studs at 600 mm centres, with floor/head channels in accordance with the specification and applicable guidance recommendations':wallId==='IWL-2'?'94 mm U floor/head channels and 92 mm I-studs at 600 mm centres':wallId==='IWL-3'?'92 mm metal framing with the specified acoustic brackets, fixed in accordance with the project reveal detail':wallId==='IWS-1'?'92 mm C-stud framing installed at 600 mm centres, with tracks and fixings in accordance with the specification and applicable guidance recommendations':'the 92 mm I-stud shaftwall framing shown in the C1 legend, with track type and stud centres confirmed by the approved shaftwall detail';
  expected=`${wallId}: ${profile}. Framing is plumb, aligned and securely fixed ${wallId==='IWL-1'?'in accordance with the specification and applicable guidance recommendations':'to the approved drawing'}.`;
 }else if(stage===stages[1]){
  question='Has the insulation and first-fix work been installed in accordance with the drawing?';
  const wool=wallId==='IWL-1'||wallId==='IWL-2'?'the specified 75 mm acoustic insulation':wallId==='IWS-1'?'the 75 mm acoustic insulation required by the updated company instruction and confirmed by the approved IWS-1 design':wallId==='IWS-2'?'the 25 mm acoustic insulation shown in the C1 shaftwall legend and confirmed by the approved system':'the insulation arrangement stated in the approved reveal detail (the supplied IWL-3 specification does not give a thickness)';
  expected=`The ${wallId} insulation and first-fix work at the marked location has been checked against the drawing and system details, including ${wool}. Insulation is fitted continuously to the approved arrangement, without unapproved gaps or compression. Backing, service routes and penetrations have been inspected before closure. The membrane requirement at external masonry interfaces has been checked where applicable. Supporting photographs record the inspected work.`;
 }else if(stage===stages[2]){
  question='Has the plasterboard been installed in accordance with the drawing?';
  expected=`Plasterboard installation for ${wallId} has been inspected at the marked location against the drawing and approved system details. Required build-up: ${w.build} Board identity, installed layer count, joint stagger, screw type, length, spacing and depth have been checked against the approved drawing detail for this assembly. Photographs record the inspected installation.`;
 }else{
  question='Is the completed work satisfactory against the drawing and specification?';
  expected=`The completed ${wallId} work at the marked location has been inspected against the drawing and approved specification. Required build-up: ${w.build} The visible finish, taped joints, board condition and adjacent interfaces have been checked. Inspection photographs and the drawing pin identify the work assessed. Any defect or outstanding work is recorded separately with its corrective action.`;
 }
 return [{id:'stage-summary',question,expected,source:w.source,answer:'',result:'Pending',comment:''}];
}
export function questions(wallId:string,stage:string,profile:'neos'|'generic'='neos',customSpec=''):Answer[]{
 const make=(id:string,question:string,expected:string,source:string,extra:Partial<Answer>={}):Answer=>({id,question,section:stage,expected,source,answer:'',result:'Pending',comment:'',...extra});
 const metal=stage===stages[0]||stage==='Framing & isolation';const boarding=stage===stages[2];
 const genericInsulation=customSpec.match(/\b(\d+(?:\.\d+)?)\s*mm\s+(?:acoustic\s+)?insulation\b/i);
 const insulationMm=profile==='neos'?wallTypes.find(w=>w.id===wallId)?.insulationMm:genericInsulation?Number(genericInsulation[1]):undefined;
 const preBoardQuestion=insulationMm?`Before boarding, is the top flat plate securely fixed and is the specified ${insulationMm} mm acoustic insulation installed?`:'Is the flat plate securely fixed at the top of the metal framing before boarding?';
 const preBoardAnswer=insulationMm?`Yes. The top flat plate is securely fixed to the metal framing and ${insulationMm} mm acoustic insulation is installed, in accordance with the drawing and applicable guidance recommendations.`:'The flat plate is securely fixed at the top of the metal framing in accordance with the drawing and applicable guidance recommendations.';
 if(isFinishingStage(stage)){
  const w=profile==='neos'?wallTypes.find(w=>w.id===wallId):undefined;
  if(profile==='neos'&&!w)return [];
  const source=profile==='generic'?'Selected project drawing / approved specification: '+customSpec:'NEOS site-specific finishing detail: top angle 25 x 50 mm; plasterboard floor gap 5-7 mm and FR acoustic mastic.';
  const mastic=make('floor-mastic',profile==='neos'&&wallId!=='IWS-2'&&wallId!=='BLK-1'?'After all plasterboard layers are completed, is the 5-7 mm floor gap fully filled with FR acoustic mastic?':'After all plasterboard layers are completed, is the specified floor gap fully filled with FR acoustic mastic?',
   profile==='neos'&&wallId!=='IWS-2'&&wallId!=='BLK-1'?'Yes. After all plasterboard layers are completed, the 5-7 mm gap between the bottom of the plasterboard and floor slab is fully filled with FR acoustic mastic. The seal is continuous, without gaps, to the approved drawing and manufacturer’s guidance.':'Yes. After all plasterboard layers are fully installed, the specified floor-level gap is continuously filled with the specified compatible FR acoustic mastic. The completed seal follows the approved wall system detail and manufacturer’s guidance, without unsealed gaps along the inspected base.',source);
  if(wallId==='BLK-1')return [make('interface-mastic','Is the specified acoustic/fire mastic at the adjoining plasterboard interface complete?', 'Yes. The adjoining plasterboard interface has been sealed with the specified compatible acoustic/fire mastic to the approved interface detail.',source)];
  return [make('top-hanger',profile==='neos'?'After all plasterboard layers are installed, is the 25 x 50 mm top angle securely fixed over the final layer at the head-track detail, and is at least two-thirds (⅔) of the cavity filled with insulation?':'After all plasterboard layers are installed, is the specified top angle securely fixed over the final layer at the head-track detail, and is at least two-thirds (⅔) of the cavity filled with insulation?',
   profile==='neos'?'Yes. After all plasterboard layers are installed, the 25 x 50 mm top angle is securely fixed over the final plasterboard layer at the head-track detail, with its position and fixings in accordance with the approved drawing and manufacturer’s guidance. Yes, at least two-thirds (⅔) of the cavity is filled with insulation.':'Yes. After all plasterboard layers are installed, the specified top angle is securely fixed over the final plasterboard layer at the head-track detail, in accordance with the approved drawing and manufacturer’s guidance. Yes, at least two-thirds (⅔) of the cavity is filled with insulation.',source),mastic];
 }
 if(profile==='generic'){
  const source='Selected project drawing / approved specification: '+customSpec;
  if(metal)return [make('tracks','Have the head and base tracks and their specified interfaces been installed correctly?',`The head and base tracks at the marked location have been checked against this project's approved drawing and specification: ${customSpec}. Track type, fixings, any specified isolation layers and head detail have been verified. Actual products and dimensions are recorded in the notes.`,source),make('metal-frame','Has the metal framing been installed in accordance with this project drawing?',`The metal framing at the marked location has been checked against this project's approved drawing and specification: ${customSpec}. Stud and track types, stud centres, alignment and fixings have been verified. The actual measured centres are recorded in the notes.`,source)];
  if(boarding)return [make('pre-board-plate',insulationMm?preBoardQuestion:'Is the specified backing / flat plate installed before boarding?',insulationMm?preBoardAnswer:`The backing / flat plate locations have been checked against the approved project detail: ${customSpec}. Product, joint support and any head offset have been verified before concealment.`,source),make('boarding','Are the plasterboard joint stagger and screw fixings installed in accordance with the manufacturer’s guidance, with screws at maximum 300 mm centres?',`Yes. The plasterboard layers, joint stagger and screw fixings are installed in accordance with the manufacturer’s guidance and recommendations, with screws at maximum 300 mm centres.`,source),make('final-plate','Is the flat plate correctly installed at the plasterboard joints in accordance with the manufacturer’s guidance?',`Yes. The flat plate is correctly positioned and securely fixed at the plasterboard joints, in accordance with the manufacturer’s guidance and recommendations.`,source)];
  return [make('stage-'+stage.replace(/\W+/g,'-'),'Has this work stage been completed to the approved project detail?',`The ${stage.toLowerCase()} work at the marked pin has been checked against the approved project drawing and specification: ${customSpec}. The result, observed measurements and site photographs are recorded below.`,source)];
 }
 const w=wallTypes.find(w=>w.id===wallId);if(!w)return [];
 if(wallId==='BLK-1')return legacyStageQuestion(wallId,stage).map(q=>({...q,id:'block-'+stage.replace(/\W+/g,'-'),section:stage}));
 if(wallId==='IWL-3'&&metal)return [
 make('tracks','Is the 92 mm window reveal metal framing correctly positioned and securely fixed?','Yes. The 92 mm window reveal metal framing is aligned and securely fixed in accordance with the project detail and applicable guidance. ',w.source),
 make('metal-frame','Are the correct acoustic brackets installed and securely fixed to the window reveal framing?','Yes. The specified acoustic brackets are correctly positioned and securely fixed to the 92 mm window reveal framing, in accordance with the project detail and manufacturer’s guidance.',w.source)
 ];
 if(wallId==='IWS-2'&&metal){const frame=legacyStageQuestion(wallId,stages[0])[0];return [
 make('tracks','Are the top and bottom tracks installed to the approved wall system detail?',`Yes. Top track: the specified head track, fire strips, isolation and deflection arrangement are installed to the approved IWS-2 detail. Bottom track: the specified base track, isolation and fixings are installed to the same approved system detail.`,w.source),
 {...frame,id:'metal-frame',section:stage}
 ];}
 const siteSource='NEOS site-specific head/base detail; company FireLine strip instruction.';
 if(metal){const frame=legacyStageQuestion(wallId,stages[0])[0];return [
 make('tracks','Is the top track fitted with black isolation, two FireLine layers, acoustic washers and sealant?',
 'Yes. Top track: 1 x 12.5 mm black CineWALL PRO, 2 FireLine fire-strip layers, acoustic washers at all head fixings and 2 rows of acoustic sealant, as shown on the drawing.',siteSource),
 make('base-tracks','Is the bottom track fitted with two blue isolation layers and acoustic washers?',
 'Yes. Bottom track: 2 x 12.5 mm blue CineWALL LITE (25 mm total), securely fixed with acoustic washers at all base fixings, as shown on the drawing.',siteSource),
 {...frame,id:'metal-frame',section:stage}
 ];}
 const shaft=wallId==='IWS-2';
 const layers=wallId==='IWS-1'?'2 x 15 mm plasterboard layers on each face':shaft?'3 x 15 mm plasterboard layers and 1 x 30 mm coreboard layer':'all 4 x 15 mm plasterboard layers';
 if(boarding)return [
 make('pre-board-plate',wallId==='IWL-3'?'Before boarding, are the acoustic brackets and required backing securely fixed?':preBoardQuestion,wallId==='IWL-3'?'Yes. The acoustic brackets and required backing are securely fixed to the 92 mm window reveal framing in accordance with the project detail and manufacturer’s guidance.':preBoardAnswer,w.source),
 make('boarding',shaft?'Are the plasterboard layers, stagger and screw fixings installed to the manufacturer’s guidance, with screws at maximum 300 mm centres?':`Are ${wallId==='IWS-1'?'both plasterboard layers on each face':'all four plasterboard layers'} 5-7 mm above the floor, with staggered joints and screws at maximum 300 mm centres to manufacturer’s guidance?`,
 shaft?'Yes. Three 15 mm plasterboard layers and one 30 mm coreboard layer are installed to the approved shaftwall system. Joint stagger and screw fixings follow manufacturer’s guidance, with screws at maximum 300 mm centres or closer where required.':`Yes. ${layers[0].toUpperCase()+layers.slice(1)} are 5-7 mm above the floor slab, as shown on the drawing. The floor gap is checked at this boarding stage. Joints are staggered and screws are at maximum 300 mm centres, or closer where required by manufacturer’s guidance.`,shaft?w.source:siteSource),
 make('final-plate','Is the flat plate correctly installed at the plasterboard joints in accordance with the manufacturer’s guidance?',
 'Yes. The flat plate is correctly positioned and securely fixed at the plasterboard joints, in accordance with the manufacturer’s guidance and recommendations.',w.source)
 ];
 return legacyStageQuestion(wallId,stage).map(q=>({...q,id:stage===stages[1]?'insulation':'final-check',section:stage}));
}
export const answerOptions=(q:Answer)=>[
 {label:'Yes',text:q.expected,result:'Pass' as const},
 {label:'Defect / incomplete work',text:'Work does not match the drawing. Defect and corrective action recorded below.',result:'Fail' as const},
 {label:'Not inspected yet',text:'Not yet inspected.',result:'Pending' as const},
 {label:'Skip this question',text:'Skipped by inspector — outside this inspection scope.',result:'Pending' as const}
];
