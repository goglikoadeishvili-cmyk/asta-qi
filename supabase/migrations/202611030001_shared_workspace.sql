-- Shared company data. No anonymous data access; invite users through Supabase Auth.
create table public.qa_workspaces (
 id uuid primary key default gen_random_uuid(), name text not null,
 storage_limit bigint not null default 1073741824 check(storage_limit>0),
 created_at timestamptz not null default now()
);
create table public.qa_members (
 workspace_id uuid not null references public.qa_workspaces(id),
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('admin','editor')),
 primary key(workspace_id,user_id)
);
create table public.qa_records (
 workspace_id uuid not null references public.qa_workspaces(id),id text not null,
 payload jsonb not null,revision bigint not null default 1,
 updated_at timestamptz not null default now(),updated_by uuid not null references auth.users(id),
 primary key(workspace_id,id),check(payload->>'id'=id),
 check(payload->>'kind' in ('project','drawing','inspection','batch','settings','weekly')),
 check(octet_length(payload::text)<=2097152)
);
create table public.qa_record_history (
 workspace_id uuid not null,record_id text not null,revision bigint not null,
 payload jsonb not null,changed_at timestamptz not null default now(),changed_by uuid not null,
 primary key(workspace_id,record_id,revision)
);
create table public.qa_files (
 workspace_id uuid not null references public.qa_workspaces(id),id text not null,
 name text not null,type text not null,size bigint not null check(size>0 and size<=52428800),
 ready boolean not null default false,created_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),primary key(workspace_id,id),check(id ~ '^[a-f0-9]{64}$')
);
create function public.qa_member(p_workspace uuid,p_write boolean default false) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.qa_members where workspace_id=p_workspace and user_id=auth.uid() and (not p_write or role in ('admin','editor')))
$$;
alter table public.qa_workspaces enable row level security;
alter table public.qa_members enable row level security;
alter table public.qa_records enable row level security;
alter table public.qa_record_history enable row level security;
alter table public.qa_files enable row level security;
create policy workspace_read on public.qa_workspaces for select to authenticated using(public.qa_member(id));
create policy member_read on public.qa_members for select to authenticated using(public.qa_member(workspace_id));
create policy records_read on public.qa_records for select to authenticated using(public.qa_member(workspace_id));
create policy history_read on public.qa_record_history for select to authenticated using(public.qa_member(workspace_id));
create policy files_read on public.qa_files for select to authenticated using(public.qa_member(workspace_id));
-- Writes happen only through checked, versioned functions. No raw insert/update/delete grants.
revoke all on public.qa_workspaces,public.qa_members,public.qa_records,public.qa_record_history,public.qa_files from anon,authenticated;
grant select on public.qa_workspaces,public.qa_members,public.qa_records,public.qa_record_history,public.qa_files to authenticated;
create function public.qa_write_record(p_workspace uuid,p_id text,p_expected bigint,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare old public.qa_records; saved public.qa_records;
begin
 if not public.qa_member(p_workspace,true) then raise exception 'Workspace access denied' using errcode='42501';end if;
 if length(p_id)>250 or p_payload->>'id' is distinct from p_id or coalesce(p_payload->>'kind','') not in ('project','drawing','inspection','batch','settings','weekly') or octet_length(p_payload::text)>2097152 then raise exception 'Invalid record';end if;
 if p_payload->>'kind'='settings' and coalesce(p_payload->>'emailToken','')<>'' then raise exception 'Secrets cannot be shared';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text||':'||p_id,0));
 select * into old from public.qa_records where workspace_id=p_workspace and id=p_id;
 if found then
  if old.payload=p_payload then return jsonb_build_object('conflict',false,'record',to_jsonb(old));end if;
  if old.revision<>p_expected then return jsonb_build_object('conflict',true,'record',to_jsonb(old));end if;
  if old.payload->>'kind' is distinct from p_payload->>'kind' then raise exception 'Record kind cannot change';end if;
  if old.payload->>'kind'='batch' and old.payload->>'status' in ('accepted','manual-sent') and p_payload->>'status' not in ('accepted','manual-sent') then raise exception 'Sent history cannot be downgraded';end if;
  update public.qa_records set payload=p_payload,revision=revision+1,updated_at=now(),updated_by=auth.uid() where workspace_id=p_workspace and id=p_id returning * into saved;
 else
  if p_expected<>0 then raise exception 'Record no longer exists';end if;
  insert into public.qa_records(workspace_id,id,payload,updated_by) values(p_workspace,p_id,p_payload,auth.uid()) returning * into saved;
 end if;
 insert into public.qa_record_history(workspace_id,record_id,revision,payload,changed_by) values(p_workspace,p_id,saved.revision,p_payload,auth.uid());
 return jsonb_build_object('conflict',false,'record',to_jsonb(saved));
end $$;
create function public.qa_reserve_file(p_workspace uuid,p_id text,p_name text,p_type text,p_size bigint) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare existing public.qa_files;used_bytes bigint;max_bytes bigint;
begin
 if not public.qa_member(p_workspace,true) then raise exception 'Workspace access denied' using errcode='42501';end if;
 if p_id !~ '^[a-f0-9]{64}$' or p_size<=0 or p_size>52428800 or length(p_name)>500 or p_type not in ('application/pdf','application/zip','application/octet-stream','image/jpeg','image/png','image/webp','image/heic','image/heif') then raise exception 'Invalid file';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,0));
 select * into existing from public.qa_files where workspace_id=p_workspace and id=p_id;
 if found then if existing.size<>p_size then raise exception 'File hash/size mismatch';end if;return to_jsonb(existing);end if;
 select storage_limit into max_bytes from public.qa_workspaces where id=p_workspace;
 select coalesce(sum(size),0) into used_bytes from public.qa_files where workspace_id=p_workspace;
 if used_bytes+p_size>max_bytes then raise exception 'Workspace storage limit reached. Original evidence was retained.';end if;
 insert into public.qa_files(workspace_id,id,name,type,size,created_by) values(p_workspace,p_id,p_name,p_type,p_size,auth.uid()) returning * into existing;
 return to_jsonb(existing);
end $$;
create function public.qa_storage_path(p_name text,p_write boolean default false) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.qa_files f where p_name=f.workspace_id::text||'/'||f.id and public.qa_member(f.workspace_id,p_write))
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('qa-evidence','qa-evidence',false,52428800,array['application/pdf','application/zip','application/octet-stream','image/jpeg','image/png','image/webp','image/heic','image/heif']);
create policy qa_evidence_read on storage.objects for select to authenticated using(bucket_id='qa-evidence' and public.qa_storage_path(name));
create policy qa_evidence_insert on storage.objects for insert to authenticated with check(bucket_id='qa-evidence' and public.qa_storage_path(name,true));
-- No update/delete policy: evidence is immutable and is not purged automatically.
create function public.qa_commit_file(p_workspace uuid,p_id text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare expected bigint;actual bigint;
begin
 if not public.qa_member(p_workspace,true) then raise exception 'Workspace access denied' using errcode='42501';end if;
 select size into expected from public.qa_files where workspace_id=p_workspace and id=p_id;
 select (metadata->>'size')::bigint into actual from storage.objects where bucket_id='qa-evidence' and name=p_workspace::text||'/'||p_id;
 if expected is null or actual is null or expected<>actual then raise exception 'Upload is incomplete or size does not match';end if;
 update public.qa_files set ready=true where workspace_id=p_workspace and id=p_id;
end $$;
create function public.qa_storage_usage(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.qa_member(p_workspace) then raise exception 'Workspace access denied' using errcode='42501';end if;
 return (select jsonb_build_object('used',(select coalesce(sum(size),0) from public.qa_files where workspace_id=p_workspace),'limit',storage_limit) from public.qa_workspaces where id=p_workspace);
end $$;
create function public.qa_claim_email(p_workspace uuid,p_id text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare current public.qa_records;result jsonb;
begin
 if not public.qa_member(p_workspace,true) then raise exception 'Workspace access denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text||':'||p_id,0));
 select * into current from public.qa_records where workspace_id=p_workspace and id=p_id;
 if not found or current.payload->>'kind'<>'batch' then raise exception 'Sync this report batch before sending';end if;
 if current.payload->>'status' in ('accepted','manual-sent','unknown') then raise exception 'This email is sent or sending is uncertain. Check Gmail Sent before retrying.';end if;
 if p_payload->>'zipId' is distinct from current.payload->>'zipId' or p_payload->'inspectionIds' is distinct from current.payload->'inspectionIds' then raise exception 'Email attachments changed. Reopen this batch.';end if;
 result:=public.qa_write_record(p_workspace,p_id,current.revision,jsonb_set(p_payload,'{status}','"unknown"'));
 return result->'record';
end $$;
-- PostgreSQL defaults to PUBLIC execute: explicitly close every privileged function.
revoke all on function public.qa_member(uuid,boolean),public.qa_storage_path(text,boolean),public.qa_write_record(uuid,text,bigint,jsonb),public.qa_reserve_file(uuid,text,text,text,bigint),public.qa_commit_file(uuid,text),public.qa_storage_usage(uuid),public.qa_claim_email(uuid,text,jsonb) from public,anon;
grant execute on function public.qa_member(uuid,boolean),public.qa_storage_path(text,boolean),public.qa_write_record(uuid,text,bigint,jsonb),public.qa_reserve_file(uuid,text,text,text,bigint),public.qa_commit_file(uuid,text),public.qa_storage_usage(uuid),public.qa_claim_email(uuid,text,jsonb) to authenticated;
