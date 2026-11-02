import {DEFAULT_PROJECT_ID,floors,now,projectOf,type Project,type RecordItem} from './model';
import {getRecords,importAtomic} from './store';
export const defaultProject:Project={id:DEFAULT_PROJECT_ID,kind:'project',name:'NEOS · Haymarket House',address:'28–29 Haymarket, London',floors:[...floors].map(f=>({id:f.id,name:f.name,detail:f.detail})),qaProfile:'neos',createdAt:'2026-11-02T00:00:00.000Z'};
export function migrateProjects(records:RecordItem[]){const changes:RecordItem[]=[];if(!records.some(r=>r.kind==='project'&&r.id===DEFAULT_PROJECT_ID))changes.push(defaultProject);for(const r of records)if(['drawing','inspection','batch'].includes(r.kind)&&!(r as any).projectId)changes.push({...r,projectId:DEFAULT_PROJECT_ID} as RecordItem);return changes;}
export async function ensureProjects(){const changes=migrateProjects(await getRecords());if(changes.length)await importAtomic(changes,[]);}
