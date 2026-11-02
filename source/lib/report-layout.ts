/** Two photos per horizontal evidence row; never crop, stretch or rotate the image. */
export const PHOTOS_PER_ROW=2;
export const photoRowCount=(numberOfPhotos:number)=>Math.ceil(Math.max(0,numberOfPhotos)/PHOTOS_PER_ROW);
export function proportionalFit(width:number,height:number,maxWidth:number,maxHeight:number){
 if(![width,height,maxWidth,maxHeight].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid image dimensions');
 const scale=Math.min(maxWidth/width,maxHeight/height);
 return {width:width*scale,height:height*scale};
}
/** Keep ordinary two-check reports on one A4 when their real content fits.
 * Additional photo rows retain legible size and flow onto another page.
 */
export function evidencePhotoHeight(contentStartY:number,textHeight:number,rows:number){
 if(rows<1)return 155;
 if(rows>2)return 157;
 const room=contentStartY-56-textHeight-rows*19-7;
 return Math.max(110,Math.min(170,Math.floor(room/rows)));
}
