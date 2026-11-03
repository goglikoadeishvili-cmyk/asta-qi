-- Run after the schema migration, as the project administrator in SQL Editor.
-- First create your app login in Authentication > Users. Choose its password privately.
-- This script creates no sample inspections and never changes evidence.
do $$
declare owner_id uuid;workspace uuid;
begin
 select id into owner_id from auth.users where lower(email)='goglikoadeishvili@gmail.com';
 if owner_id is null then raise exception 'Create the owner app login in Authentication > Users first';end if;
 select workspace_id into workspace from public.qa_members where user_id=owner_id and role='admin' limit 1;
 if workspace is null then
  insert into public.qa_workspaces(name) values('ASTA CONSTUCTION') returning id into workspace;
  insert into public.qa_members(workspace_id,user_id,role) values(workspace,owner_id,'admin');
 end if;
end $$;
select w.id as workspace_id,w.name,w.storage_limit from public.qa_workspaces w join public.qa_members m on w.id=m.workspace_id join auth.users u on u.id=m.user_id where lower(u.email)='goglikoadeishvili@gmail.com' and m.role='admin';
