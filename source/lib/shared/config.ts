export interface WorkspaceConfig{url:string;publishableKey:string;workspaceId:string}
export function parseWorkspaceConfig(value:any):WorkspaceConfig|null{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid shared-storage configuration.');
 if(!value?.url&&!value?.publishableKey&&!value?.workspaceId)return null;
 const url=new URL(value.url);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Invalid shared-storage URL.');
 const key=String(value.publishableKey||'');
 if(key.startsWith('sb_secret_'))throw new Error('A secret key must never be used in the app.');
 if(key.startsWith('eyJ')){try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon')throw new Error();}catch{throw new Error('Use a publishable / anon key, never a service-role key.');}}
 else if(!/^sb_publishable_[\w-]+$/.test(key))throw new Error('Set the public Supabase publishable key.');
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.workspaceId))throw new Error('Set the shared workspace ID.');
 return {url:url.origin,publishableKey:key,workspaceId:value.workspaceId.toLowerCase()};
}
export async function loadWorkspaceConfig(){
 const built={url:import.meta.env.VITE_SUPABASE_URL,publishableKey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,workspaceId:import.meta.env.VITE_SHARED_WORKSPACE_ID};
 if(built.url||built.publishableKey||built.workspaceId)return parseWorkspaceConfig(built);
 const key='asta-workspace-public-config';let value:any;try{const response=await fetch(import.meta.env.BASE_URL+'workspace-config.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Configuration unavailable');value=await response.json();}catch{const saved=localStorage.getItem(key);if(saved===null)throw new Error('Connect to the internet to load the workspace configuration. Existing records are unchanged.');return parseWorkspaceConfig(JSON.parse(saved));}
 const parsed=parseWorkspaceConfig(value);localStorage.setItem(key,JSON.stringify(value));return parsed;
}
