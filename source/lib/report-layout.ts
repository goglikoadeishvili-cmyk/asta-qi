/** Three photos per evidence row. Preserve every image's full aspect ratio. */
export const PHOTOS_PER_ROW=3;
export const photoRowCount=(numberOfPhotos:number)=>Math.ceil(Math.max(0,numberOfPhotos)/PHOTOS_PER_ROW);
export function proportionalFit(width:number,height:number,maxWidth:number,maxHeight:number){
 if(![width,height,maxWidth,maxHeight].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid image dimensions');
 const scale=Math.min(maxWidth/width,maxHeight/height);
 return {width:width*scale,height:height*scale};
}
/** Size up to three evidence rows to the actual remaining A4 space.
 * Longer reports continue rather than hiding content or shrinking it indefinitely.
 */
export function evidencePhotoHeight(contentStartY:number,textHeight:number,rows:number,extraHeight=0){
 if(rows<1)return 150;
 if(rows>3)return 140;
 const room=contentStartY-38-textHeight-rows*21-extraHeight-10;
 return Math.max(96,Math.min(160,Math.floor(room/rows)));
}
