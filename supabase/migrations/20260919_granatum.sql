begin;
create table public.travelpro_granatum(
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 secret_id uuid not null, token_fingerprint text not null, enabled boolean not null default true,
 progress jsonb not null default '{}', stats jsonb not null default '{}', last_sync timestamptz,
 last_error text not null default '', lease uuid, locked_until timestamptz, next_sync timestamptz not null default now()
);
create table public.travelpro_granatum_raw(
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 kind text not null,id text not null,data jsonb not null,run_id uuid not null,
 primary key(workspace_id,kind,id)
);
alter table public.travelpro_granatum enable row level security;
alter table public.travelpro_granatum_raw enable row level security;
revoke all on public.travelpro_granatum,public.travelpro_granatum_raw from public,anon,authenticated;
grant all on public.travelpro_granatum,public.travelpro_granatum_raw to service_role;

create function public.travelpro_granatum_connect(p_workspace uuid,p_token text) returns void
language plpgsql security definer set search_path=public as $$
declare secret uuid; fingerprint text:=md5(p_token); existing text;
begin
 if length(p_token)<20 or length(p_token)>500 then raise sqlstate 'PT422' using message='invalid_token'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,0));
 select token_fingerprint into existing from travelpro_granatum where workspace_id=p_workspace;
 if found then
  if existing<>fingerprint then raise sqlstate 'PT409' using message='connection_already_bound'; end if;
  return;
 end if;
 if not exists(select 1 from workspaces where id=p_workspace and type='operations') then raise sqlstate 'PT404' using message='workspace_not_found'; end if;
 select vault.create_secret(p_token,'travelpro-granatum-'||p_workspace::text,'Granatum integration token') into secret;
 insert into travelpro_granatum(workspace_id,secret_id,token_fingerprint) values(p_workspace,secret,fingerprint);
end $$;

create function public.travelpro_granatum_claim(p_workspace uuid,p_lease uuid,p_force boolean default false) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c travelpro_granatum; token text;
begin
 select * into c from travelpro_granatum where workspace_id=p_workspace for update;
 if not found or not c.enabled or c.locked_until>now() or (not p_force and c.next_sync>now()) then return null; end if;
 if c.progress->>'phase' is null or c.progress->>'phase'='done' then
  c.progress:=jsonb_build_object('phase','catalogs','index',0,'runId',gen_random_uuid(),'startedAt',now(),'loaded',0);
 end if;
 update travelpro_granatum set lease=p_lease,locked_until=now()+interval '120 seconds',progress=c.progress,last_error='' where workspace_id=p_workspace;
 select decrypted_secret into token from vault.decrypted_secrets where id=c.secret_id;
 return jsonb_build_object('token',token,'progress',c.progress,'last_sync',c.last_sync);
end $$;

create function public.travelpro_granatum_stage(p_workspace uuid,p_lease uuid,p_progress jsonb,p_rows jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare row jsonb;
begin
 perform 1 from travelpro_granatum where workspace_id=p_workspace and lease=p_lease and locked_until>now() for update;
 if not found then raise sqlstate 'PT409' using message='sync_lease_expired'; end if;
 for row in select value from jsonb_array_elements(p_rows) loop
  insert into travelpro_granatum_raw values(p_workspace,row->>'kind',row->>'id',row->'data',(p_progress->>'runId')::uuid)
  on conflict(workspace_id,kind,id) do update set data=excluded.data,run_id=excluded.run_id;
 end loop;
 update travelpro_granatum set progress=p_progress,locked_until=now()+interval '120 seconds' where workspace_id=p_workspace;
end $$;

create function public.travelpro_granatum_release(p_workspace uuid,p_lease uuid,p_error text) returns void
language sql security invoker set search_path=public as $$
 update travelpro_granatum set lease=null,locked_until=now()+interval '2 seconds',last_error=left(p_error,500),next_sync=now()+case when p_error='' then interval '0 seconds' else interval '5 minutes' end where workspace_id=p_workspace and lease=p_lease;
$$;

create function public.travelpro_granatum_apply(p_workspace uuid,p_lease uuid,p_entries jsonb,p_catalogs jsonb,p_deleted jsonb,p_stats jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare c travelpro_granatum; item jsonb; old_data jsonb; changed integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,0));
 select * into c from travelpro_granatum where workspace_id=p_workspace and lease=p_lease and locked_until>now() for update;
 if not found or c.progress->>'phase'<>'apply' then raise sqlstate 'PT409' using message='sync_lease_expired'; end if;
 if not exists(select 1 from travelpro_finance_migrations where workspace_id=p_workspace) then raise sqlstate 'PT409' using message='finance_not_initialized'; end if;
 for item in select value from jsonb_array_elements(p_catalogs) loop
  if item->>'source'<>'granatum' or item->>'id' not like 'granatum-%' then raise sqlstate 'PT422' using message='invalid_source'; end if;
  insert into travelpro_finance_catalogs(workspace_id,id,data) values(p_workspace,item->>'id',item)
  on conflict(workspace_id,id) do update set data=excluded.data,version=travelpro_finance_catalogs.version+1 where travelpro_finance_catalogs.data is distinct from excluded.data;
 end loop;
 for item in select value from jsonb_array_elements(p_entries) loop
  if item->>'source'<>'granatum' or item->>'id' not like 'granatum-%' then raise sqlstate 'PT422' using message='invalid_source'; end if;
  select data into old_data from travelpro_finance_entries where workspace_id=p_workspace and id=item->>'id';
  if old_data is distinct from item then
   insert into travelpro_finance_entries(workspace_id,id,data) values(p_workspace,item->>'id',item)
   on conflict(workspace_id,id) do update set data=excluded.data,version=travelpro_finance_entries.version+1,updated_at=now();
   insert into travelpro_finance_events(workspace_id,entry_id,action,previous,next) values(p_workspace,item->>'id','granatum_sync',old_data,item);changed:=changed+1;
  end if;
 end loop;
 for item in select data from travelpro_finance_entries where workspace_id=p_workspace and data->>'source'='granatum' and not (data->>'canceled')::boolean and exists(select 1 from jsonb_array_elements_text(p_deleted) d where data->'granatumIds' ? d) loop
  update travelpro_finance_entries set data=jsonb_set(item,'{canceled}','true'),version=version+1,updated_at=now() where workspace_id=p_workspace and id=item->>'id';
  insert into travelpro_finance_events(workspace_id,entry_id,action,reason,previous,next) values(p_workspace,item->>'id','granatum_deleted','Excluído no Granatum',item,jsonb_set(item,'{canceled}','true'));
 end loop;
 update travelpro_granatum set progress=jsonb_set(progress,'{phase}','"done"'),last_sync=(progress->>'startedAt')::timestamptz,stats=p_stats||jsonb_build_object('changed',changed),last_error='',lease=null,locked_until=null,next_sync=now()+interval '1 hour' where workspace_id=p_workspace;
end $$;

create function public.travelpro_granatum_cron_secret() returns text
language sql security definer set search_path=public as $$
 select decrypted_secret from vault.decrypted_secrets where name='travelpro-granatum-cron';
$$;
create function public.travelpro_granatum_restart(p_workspace uuid) returns void
language plpgsql security invoker set search_path=public as $$
begin
 update travelpro_granatum set progress='{}',last_error='',next_sync=now() where workspace_id=p_workspace and (locked_until is null or locked_until<now());
 if not found then raise sqlstate 'PT409' using message='sync_busy'; end if;
end $$;
revoke all on function public.travelpro_granatum_restart(uuid) from public,anon,authenticated;
grant execute on function public.travelpro_granatum_restart(uuid) to service_role;
revoke all on function public.travelpro_granatum_connect(uuid,text),public.travelpro_granatum_claim(uuid,uuid,boolean),public.travelpro_granatum_stage(uuid,uuid,jsonb,jsonb),public.travelpro_granatum_release(uuid,uuid,text),public.travelpro_granatum_apply(uuid,uuid,jsonb,jsonb,jsonb,jsonb),public.travelpro_granatum_cron_secret() from public,anon,authenticated;
grant execute on function public.travelpro_granatum_connect(uuid,text),public.travelpro_granatum_claim(uuid,uuid,boolean),public.travelpro_granatum_stage(uuid,uuid,jsonb,jsonb),public.travelpro_granatum_release(uuid,uuid,text),public.travelpro_granatum_apply(uuid,uuid,jsonb,jsonb,jsonb,jsonb),public.travelpro_granatum_cron_secret() to service_role;
notify pgrst,'reload schema';
commit;
