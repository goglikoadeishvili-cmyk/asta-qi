import React,{useEffect,useState} from 'react';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import {loadWorkspaceConfig,type WorkspaceConfig} from '../lib/shared/config';
import {createWorkspaceClient,workspaceMembership} from '../lib/shared/client';
import {activateWorkspace,deactivateWorkspace} from '../lib/shared/runtime';
import {selectWorkspaceStore} from '../lib/store';
import App from './page';
export default function SharedGate(){
 const [config,C]=useState<WorkspaceConfig|null|undefined>(),[client,Client]=useState<SupabaseClient|null>(null),[session,S]=useState<Session|null>(null),[loaded,L]=useState(false),[member,M]=useState(''),[error,E]=useState(''),[busy,B]=useState(false),[email,Email]=useState('goglikoadeishvili@gmail.com'),[password,Password]=useState('');
 useEffect(()=>{let alive=true;let unsubscribe:(()=>void)|undefined;loadWorkspaceConfig().then(async value=>{if(!alive)return;C(value);if(!value){selectWorkspaceStore();L(true);return;}const sdk=createWorkspaceClient(value);Client(sdk);const {data}=sdk.auth.onAuthStateChange((_event,next)=>{if(alive){S(next);L(true)}});unsubscribe=()=>data.subscription.unsubscribe();const result=await sdk.auth.getSession();if(result.error)throw result.error;if(alive){S(result.data.session);L(true)}}).catch(e=>{if(alive)E(e.message)});return()=>{alive=false;unsubscribe?.()};},[]);
 useEffect(()=>{M('');if(!config||!client||!session){deactivateWorkspace();return;}let alive=true;E('');const key='asta-membership:'+config.workspaceId+':'+session.user.id;
 const open=(membership:any)=>{if(!alive)return;selectWorkspaceStore(config.workspaceId,session.user.id);activateWorkspace(client,config,session.user.id,membership.qa_workspaces?.name||'ASTA Construction Ltd',membership.role);M(session.user.id);};
 if(!navigator.onLine){try{const cached=JSON.parse(localStorage.getItem(key)||'null');if(cached)open(cached);else E('Connect to the internet for the first sign-in on this device.');}catch{E('Connect to the internet to verify workspace access.');}return;}
 workspaceMembership(client,config.workspaceId,session.user.id).then(value=>{localStorage.setItem(key,JSON.stringify(value));open(value)}).catch(e=>{if(alive)E('Workspace access could not be confirmed. '+e.message)});return()=>{alive=false;deactivateWorkspace()};
 },[config,client,session?.user.id]);
 if(config===null&&loaded)return <App/>;
 if(member&&member===session?.user.id)return <App key={config!.workspaceId+':'+member} shared/>;
 async function login(e:React.FormEvent){e.preventDefault();if(!client)return;B(true);E('');try{const result=await client.auth.signInWithPassword({email:email.trim(),password});if(result.error)throw result.error;Password('');S(result.data.session);}catch(e:any){E(e.message)}finally{B(false)}}
 return <main className="workspace-login"><img src={import.meta.env.BASE_URL+'branding/acl-logo-v2.png'} alt="ACL"/><h1>ASTA Construction Ltd</h1><p>Goga quality inspection</p>{error&&<p className="notice" role="alert">{error}</p>}{config&&client&&loaded&&!session?<form onSubmit={login}><h2>Sign in to shared workspace</h2><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>Email(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>Password(e.target.value)}/></label><button className="primary full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><p>Your sign-in stays saved on this device. Only authorised workspace members can access inspections.</p></form>:<p role="status">{error?'Shared workspace is unavailable. Your existing device records have not been deleted.':session?'Opening your shared workspace…':'Loading workspace configuration…'}</p>}{error&&<button className="secondary full" onClick={()=>location.reload()}>Retry</button>}{session&&<button className="text-button" onClick={()=>client?.auth.signOut({scope:'local'})}>Sign out on this device</button>}</main>;
}
