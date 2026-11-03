import {projectOf,type Drawing,type Inspection} from './model';
/** Historical records stay available, but never appear while placing a new pin. */
export function drawingPins(items:Inspection[],drawing:Drawing,page:number,showExisting:boolean){
 if(!showExisting)return [];
 return items.filter(i=>!i.deletedAt&&i.drawingId===drawing.id&&projectOf(i)===projectOf(drawing)&&i.pin?.page===page&&[i.pin.x,i.pin.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1));
}
