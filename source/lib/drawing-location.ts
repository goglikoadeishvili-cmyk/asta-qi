import {floors,type Drawing,type Pin} from './model';
// Normalised axis centres transcribed from the text layer of the unchanged C1 PDF.
// The omitted letter I is intentional: the drawing axis sequence is H, J, K, L.
const grids:Record<number,{x:number[];y:number[]}>= {
 1:{x:[.248371,.309739,.370297,.438414,.518294,.620620,.684529],y:[.064660,.134418,.204177,.247095,.360878,.446722,.527030,.607568,.695618,.773347,.875521]},
 2:{x:[.245265,.306633,.367190,.435308,.515188,.617513,.681422],y:[.074539,.144298,.214057,.256974,.370758,.456602,.536909,.617447,.705497,.783226,.885401]},
 3:{x:[.195602,.256970,.317528,.385645,.465525,.567851,.631759],y:[.084808,.154567,.224325,.267243,.381027,.466871,.547178,.627716,.715766,.793495,.895669]}
};
function span(value:number,axes:number[],labels:string[]){const nearest=axes.findIndex(v=>Math.abs(v-value)<.0025);if(nearest>=0)return labels[nearest];for(let n=0;n<axes.length-1;n++)if(value>axes[n]&&value<axes[n+1])return labels[n]+'–'+labels[n+1];return '';}
export function locationForPin(drawing:Pick<Drawing,'floor'|'reference'|'revision'|'fileId'>,pin:Pin){
 const floor=floors.find(f=>f.id===drawing.floor);const prefix=floor?floor.name+' '+floor.detail:String(drawing.floor);
 const calibrated=drawing.fileId==='809d54646a8c4de3ebb267f1ce3debb3673d45cab345dcdf0fc12e898cc236cd'&&drawing.revision==='C1'&&pin.page===floor?.page;
 const grid=calibrated?grids[pin.page]:undefined;
 if(grid){const x=span(pin.x,grid.x,['6','7','8','9','10','11','12']),y=span(pin.y,grid.y,['A','B','C','D','E','F','G','H','J','K','L']);if(x&&y)return `${prefix} · Grid ${y} / ${x}`;}
 return `${prefix} · PDF page ${pin.page} · Drawing position X ${(pin.x*100).toFixed(1)}% / Y ${(pin.y*100).toFixed(1)}%`;
}
