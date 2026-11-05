import React,{useEffect,useState} from 'react';
import {Download,Mail} from 'lucide-react';
import {connectGmail,gmailSession,gmailRaw,sendGmail,GmailSendError,loadGoogleIdentity} from '../lib/gmail';
import {isSent,emailState} from '../lib/delivery';
import {sendPreparedParts,type EmailPart} from '../lib/email-parts';
import {download} from '../lib/archive';
import {now,type Batch} from '../lib/model';
export default function MultipartEmail({initial,blob,settings,busy,save,claim,run,notify}:any){
 const [parts,P]=useState<EmailPart[]>(initial),[recipient,R]=useState(initial[0].batch.recipient),[email,E]=useState(gmailSession()?.email||''),[ready,Ready]=useState(false);
 const from=settings.senderEmail||'goglikoadeishvili@gmail.com',sent=parts.filter(p=>isSent(p.batch)).length,uncertain=parts.some(p=>p.batch.status==='unknown'),started=parts.some(p=>!!p.batch.provider);
 useEffect(()=>{loadGoogleIdentity().then(()=>Ready(true)).catch(e=>notify(e.message));},[]);
 const display=(batch:Batch)=>P(ps=>ps.map(p=>p.batch.id===batch.id?{...p,batch}:p));
 async function connect(){try{E(await connectGmail(settings.gmailClientId,from));notify('Gmail connected. No email has been sent.');}catch(e:any){notify(e.message);}}
 async function send(){await run('Sending report emails',async()=>{
  await sendPreparedParts(parts.map(p=>({...p})),async(part)=>{
   const session=gmailSession();if(!session||session.email.toLowerCase()!==from.toLowerCase())throw new Error('Reconnect Gmail to continue. Confirmed parts will not be repeated.');
   const batch={...part.batch,recipient},raw=await gmailRaw({from:session.email,to:recipient,subject:batch.subject,message:batch.message,zip:part.blob,batchId:batch.id});
   const pending={...batch,provider:'gmail' as const,sender:session.email,status:'unknown' as const,error:'Sending started. Check Gmail Sent if confirmation is lost.'};
   await claim(pending);display(pending);
   let providerId:string;try{providerId=await sendGmail(raw,session.token);}catch(e:any){const failed={...pending,status:e instanceof GmailSendError&&e.uncertain?'unknown' as const:'failed' as const,error:e.message};display(failed);await save(failed);throw e;}
   return {...pending,status:'accepted',providerId,sentAt:now(),error:''};
  },async batch=>{display(batch);await save(batch);});
  notify('Gmail confirmed all '+parts.length+' emails sent. Open them in the recipient inbox before deleting any inspections.');
 });}
 async function resolve(part:EmailPart,wasSent:boolean){await run('Recording checked Gmail status',async()=>{const batch={...part.batch,status:wasSent?'manual-sent' as const:'failed' as const,...(wasSent?{provider:'manual' as const,sentAt:now()}:{}),error:wasSent?'':'You checked Gmail Sent and confirmed this part was not sent.'};await save(batch);display(batch);});}
 return <form onSubmit={e=>{e.preventDefault();if(!uncertain)send();}}>
  <h3>{parts.reduce((sum,p)=>sum+p.batch.inspectionIds.length,0)} inspection PDFs · {parts.length} emails</h3>
  <p className="hint">The complete PDFs are automatically grouped to fit each email. Send all parts with one button; confirmed parts are skipped if you continue after a failure.</p>
  <p className="hint">From: {from}</p><label>To<input type="email" required value={recipient} disabled={busy||started} onChange={e=>R(e.target.value)}/></label>
  <p role="status">{sent} / {parts.length} emails confirmed sent</p>
  <div className="list">{parts.map((part,n)=><div className="simple-info" key={part.batch.id}><strong>Part {n+1} / {parts.length} · {part.batch.inspectionIds.length} PDFs · {(part.blob.size/1024/1024).toFixed(1)} MB · {emailState(part.batch)}</strong>{part.batch.error&&<p>{part.batch.error}</p>}{part.batch.status==='unknown'&&<><p>Check this part in Gmail Sent before continuing.</p><a className="text-button" href="https://mail.google.com/mail/u/0/#sent" target="_blank" rel="noreferrer">Open Gmail Sent</a><button type="button" className="secondary full" disabled={busy} onClick={()=>resolve(part,true)}>I checked: this part was sent</button><button type="button" className="secondary full bottom-action" disabled={busy} onClick={()=>resolve(part,false)}>I checked: this part was NOT sent · allow retry</button></>}</div>)}</div>
  {sent<parts.length&&<><button type="button" className="secondary full bottom-action" disabled={busy||!ready} onClick={connect}>{email?'Reconnect Gmail':'Connect Gmail'}</button><button type="submit" className="primary full bottom-action" disabled={busy||!email||uncertain}><Mail size={18}/>{sent?'Send remaining '+(parts.length-sent)+' emails':'Send all '+parts.length+' emails'}</button></>}
  <button type="button" className="secondary full bottom-action" disabled={busy} onClick={()=>download(blob,'ASTA-QI-all-reports.zip')}><Download size={18}/>Download all PDFs · one ZIP</button>
  <p className="hint">Original inspections and photos stay in the app. This does not automatically delete or back up original photos.</p>
 </form>;
}
