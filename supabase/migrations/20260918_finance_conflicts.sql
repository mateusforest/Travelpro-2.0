-- Business conflicts must not use serialization_failure: PostgREST retries that SQLSTATE.
-- https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b
begin;
create or replace function public.travelpro_finance_write(p_workspace uuid,p_user uuid,p_action text,p_id text,p_version integer,p_data jsonb,p_reason text default '') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare old_data jsonb; new_version integer; item jsonb; result jsonb; existing record; n integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,0));
 if p_action='bootstrap' then
  if exists(select 1 from travelpro_finance_migrations where workspace_id=p_workspace) then return '{}'::jsonb; end if;
  if not exists(select 1 from travelpro_state where workspace_id=p_workspace and version=p_version) then raise exception 'workspace_changed' using errcode='PT409'; end if;
  for item in select value from jsonb_array_elements(p_data) loop
   insert into travelpro_finance_entries(workspace_id,id,data) values(p_workspace,item->>'id',item);n:=n+1;
  end loop;
  insert into travelpro_finance_migrations(workspace_id,imported) values(p_workspace,n);
  insert into travelpro_finance_events(workspace_id,entry_id,user_id,action,reason) values(p_workspace,'migration',p_user,'migration','Importados '||n||' lançamentos anteriores.');
  return jsonb_build_object('imported',n);
 elsif p_action='create' then
  select * into existing from travelpro_finance_requests where workspace_id=p_workspace and id=p_id;
  if found then
   if existing.fingerprint<>md5(p_data::text) then raise exception 'request_reused' using errcode='23505'; end if;
   return existing.result;
  end if;
  for item in select value from jsonb_array_elements(p_data) loop
   insert into travelpro_finance_entries(workspace_id,id,data) values(p_workspace,item->>'id',item);
   insert into travelpro_finance_events(workspace_id,entry_id,user_id,action,next) values(p_workspace,item->>'id',p_user,'created',item);
  end loop;
  result:=jsonb_build_object('count',jsonb_array_length(p_data));
  insert into travelpro_finance_requests values(p_workspace,p_id,md5(p_data::text),result);return result;
 elsif p_action='catalog' then
  select data into old_data from travelpro_finance_catalogs where workspace_id=p_workspace and id=p_id;
  if p_version=0 then insert into travelpro_finance_catalogs(workspace_id,id,data) values(p_workspace,p_id,p_data);new_version:=1;
  else update travelpro_finance_catalogs set data=p_data,version=version+1 where workspace_id=p_workspace and id=p_id and version=p_version returning version into new_version;
  end if;
 else
  select data into old_data from travelpro_finance_entries where workspace_id=p_workspace and id=p_id;
  update travelpro_finance_entries set data=p_data,version=version+1,updated_at=now() where workspace_id=p_workspace and id=p_id and version=p_version returning version into new_version;
 end if;
 if new_version is null then raise exception 'finance_changed' using errcode='PT409'; end if;
 insert into travelpro_finance_events(workspace_id,entry_id,user_id,action,reason,previous,next) values(p_workspace,p_id,p_user,p_action,p_reason,old_data,p_data);
 return jsonb_build_object('version',new_version);
end $$;

-- Keep old tabs from overwriting the preserved pre-migration finance snapshot.
create or replace function public.travelpro_save_state(p_workspace uuid,p_version integer,p_data jsonb,p_user uuid)
returns integer language plpgsql security invoker set search_path=public as $$
declare result integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,0));
 if exists(select 1 from travelpro_finance_migrations where workspace_id=p_workspace) and exists(select 1 from travelpro_state where workspace_id=p_workspace and data->'transactions' is distinct from p_data->'transactions') then
  raise exception 'finance_migrated_reload' using errcode='PT409';
 end if;
 update travelpro_state set data=p_data,version=version+1,updated_at=now() where workspace_id=p_workspace and version=p_version returning version into result;
 if result is null then raise exception 'travelpro_conflict' using errcode='PT409'; end if;
 insert into travelpro_audit(workspace_id,user_id,action) values(p_workspace,p_user,'workspace.saved');return result;
end $$;
notify pgrst,'reload schema';
commit;
