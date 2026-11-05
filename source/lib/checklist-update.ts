import type {Answer,Inspection,Drawing} from './model';
import {allInspectionAnswers} from './model';
import {questions,stages,FINISHING_STAGE,isFinishingStage} from './catalogue';
import {locationForPin} from './drawing-location';
/** Upgrade an editable copy only. New requirements always need a fresh on-site answer. */
export function editableInspection(initial:Inspection,drawing?:Drawing){
 const d=structuredClone(initial);if(d.status==='Draft'||d.status==='Fail')d.status='Pending';
 if(isFinishingStage(d.stage))d.stage=FINISHING_STAGE;
 let changed=false;
 function update(answers:Answer[],stage:string){
  const fresh=questions(d.wallType,stage,d.qaProfile||'neos',d.specification+'; '+d.wallSnapshot);
  if(!fresh.length||d.templateVersion!==2)return answers;
  for(const old of answers)if(!fresh.some(q=>q.id===old.id)){changed=true;if(old.answer)d.legacyAnswers=[...(d.legacyAnswers||[]),{...old}];}
  return fresh.map(q=>{
   const old=answers.find(a=>a.id===q.id);
   if(!old){changed=true;return q;}
   const newRequirement=q.question!==old.question||q.expected!==old.expected;
   if(newRequirement){changed=true;if(old.answer)d.legacyAnswers=[...(d.legacyAnswers||[]),{...old}];return {...q,comment:old.comment||'',answer:'',result:'Pending' as const};}
   return {...old,source:q.source,requiresHeadMeasurement:false,referenceIds:undefined};
  });
 }
 const description=d.answers.filter(a=>a.answer).map(a=>a.answer).join('\n\n');
 d.answers=update(d.answers,d.stage);
 d.sections=Object.fromEntries(Object.entries(d.sections||{}).map(([stage,answers])=>[stage,update(answers,stage)]));
 if(d.description===description)d.description=d.answers.filter(a=>a.answer).map(a=>a.answer).join('\n\n');
 if(changed)d.status='Pending';
 if(d.stage==='Framing & isolation')d.stage=stages[0];
 if(!d.location&&drawing){d.location=locationForPin(drawing,d.pin);d.locationSource='pin';}
 return d;
}
