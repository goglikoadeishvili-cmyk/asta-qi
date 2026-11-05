/** Export-only image copy. Original files and saved inspection evidence are never modified. */
export async function reportPhoto(bytes:ArrayBuffer,jpeg:boolean){
 if(typeof createImageBitmap!=='function')return {bytes:new Uint8Array(bytes),jpeg};
 let image:ImageBitmap|undefined;
 try{
  image=await createImageBitmap(new Blob([bytes],{type:jpeg?'image/jpeg':'image/png'}),{imageOrientation:'from-image'});
  const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(image.width,image.height));
  canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No image context');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const encoded=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),'image/jpeg',.88));
  if(jpeg&&encoded.size>=bytes.byteLength)return {bytes:new Uint8Array(bytes),jpeg};
  return {bytes:new Uint8Array(await encoded.arrayBuffer()),jpeg:true};
 }catch{return {bytes:new Uint8Array(bytes),jpeg};}finally{image?.close();}
}
