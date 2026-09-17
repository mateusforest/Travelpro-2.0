-- Additive finance module. Existing financial data is preserved.
begin;
create table if not exists public.travelpro_finance_entries(
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 id text not null, data jsonb not null, version integer not null default 1,
 updated_at timestamptz not null default now(), primary key(workspace_id,id)
);
create index if not exists tp_finance_due on public.travelpro_finance_entries(workspace_id,(data->>'dueDate'),id);
create index if not exists tp_finance_competence on public.travelpro_finance_entries(workspace_id,(data->>'competenceDate'),id);
create unique index if not exists tp_finance_external on public.travelpro_finance_entries(workspace_id,(data->>'source'),(data->>'externalId')) where coalesce(data->>'externalId','')<>'';
create table if not exists public.travelpro_finance_catalogs(
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 id text not null, data jsonb not null, version integer not null default 1,
 primary key(workspace_id,id)
);
create table if not exists public.travelpro_finance_migrations(
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 created_at timestamptz not null default now(), imported integer not null default 0
);
create table if not exists public.travelpro_finance_events(
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 entry_id text not null, user_id uuid, action text not null, reason text,
 previous jsonb, next jsonb, created_at timestamptz not null default now()
);
create index if not exists tp_finance_events on public.travelpro_finance_events(workspace_id,entry_id,id desc);
create table if not exists public.travelpro_finance_requests(
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 id text not null, fingerprint text not null, result jsonb not null, primary key(workspace_id,id)
);
alter table public.travelpro_finance_entries enable row level security;
alter table public.travelpro_finance_catalogs enable row level security;
alter table public.travelpro_finance_migrations enable row level security;
alter table public.travelpro_finance_events enable row level security;
alter table public.travelpro_finance_requests enable row level security;
revoke all on public.travelpro_finance_entries,public.travelpro_finance_catalogs,public.travelpro_finance_migrations,public.travelpro_finance_events,public.travelpro_finance_requests from anon,authenticated;
grant all on public.travelpro_finance_entries,public.travelpro_finance_catalogs,public.travelpro_finance_migrations,public.travelpro_finance_events,public.travelpro_finance_requests to service_role;
grant usage,select on sequence public.travelpro_finance_events_id_seq to service_role;

create or replace function public.travelpro_finance_paid(d jsonb) returns bigint
language sql immutable set search_path=public as $$
 select case when coalesce((d->>'legacyPaid')::boolean,false) then (d->>'amountCents')::bigint else coalesce((select sum((p->>'amountCents')::bigint) from jsonb_array_elements(coalesce(d->'payments','[]')) p),0)::bigint end;
$$;
create or replace function public.travelpro_finance_matches(d jsonb,f jsonb,dates boolean default true) returns boolean
language sql immutable set search_path=public as $$
 select (not dates or ((d->>(f->>'basis')) between f->>'from' and f->>'to'))
 and (coalesce(f->>'type','')='' or d->>'type'=f->>'type')
 and (coalesce(f->>'accountId','')='' or d->>'accountId'=f->>'accountId' or d->>'toAccountId'=f->>'accountId')
 and (coalesce(f->>'categoryId','')='' or d->>'categoryId'=f->>'categoryId')
 and (coalesce(f->>'personId','')='' or d->>'personId'=f->>'personId')
 and (coalesce(f->>'source','')='' or d->>'source'=f->>'source')
 and (coalesce(f->>'q','')='' or strpos(lower(concat_ws(' ',d->>'title',d->>'document',d->>'notes')),lower(f->>'q'))>0)
 and case coalesce(f->>'status','')
 when 'canceled' then coalesce((d->>'canceled')::boolean,false)
 when 'paid' then not coalesce((d->>'canceled')::boolean,false) and public.travelpro_finance_paid(d)>=(d->>'amountCents')::bigint
 when 'partial' then not coalesce((d->>'canceled')::boolean,false) and public.travelpro_finance_paid(d)>0 and public.travelpro_finance_paid(d)<(d->>'amountCents')::bigint
 when 'open' then not coalesce((d->>'canceled')::boolean,false) and public.travelpro_finance_paid(d)<(d->>'amountCents')::bigint
 when 'overdue' then not coalesce((d->>'canceled')::boolean,false) and public.travelpro_finance_paid(d)<(d->>'amountCents')::bigint and d->>'dueDate'<f->>'today'
 else not coalesce((d->>'canceled')::boolean,false) end;
$$;

create or replace function public.travelpro_finance_report(p_workspace uuid,p_filters jsonb) returns jsonb
language sql stable security invoker set search_path=public as $$
 with scoped as (select data d,version from travelpro_finance_entries where workspace_id=p_workspace),
 filtered as (select *,travelpro_finance_paid(d) settled,(d->>'amountCents')::bigint amount from scoped where travelpro_finance_matches(d,p_filters)),
 page as (select d||jsonb_build_object('version',version) item from filtered order by d->>(p_filters->>'basis'),d->>'id' limit least(coalesce((p_filters->>'pageSize')::integer,50),500) offset ((p_filters->>'page')::integer-1)*least(coalesce((p_filters->>'pageSize')::integer,50),500)),
 totals as (select jsonb_build_object(
 'receivable',coalesce(sum(amount-settled) filter(where d->>'type' in ('income','commission') and not (d->>'canceled')::boolean),0),
 'payable',coalesce(sum(amount-settled) filter(where d->>'type'='expense' and not (d->>'canceled')::boolean),0),
 'received',coalesce(sum(settled) filter(where d->>'type' in ('income','commission') and not (d->>'canceled')::boolean),0),
 'paid',coalesce(sum(settled) filter(where d->>'type'='expense' and not (d->>'canceled')::boolean),0),
 'overdue',coalesce(sum(amount-settled) filter(where d->>'type'<>'transfer' and not (d->>'canceled')::boolean and d->>'dueDate'<p_filters->>'today'),0),
 'legacyUndated',count(*) filter(where (d->>'legacyPaid')::boolean and not (d->>'canceled')::boolean)) value from filtered),
 flow_entries as (select d from scoped where travelpro_finance_matches(d,p_filters,false) and not (d->>'canceled')::boolean and d->>'type'<>'transfer'),
 movements as (
 select left(p->>'date',7) "month",case when d->>'type'='expense' then 'paid' else 'received' end kind,(p->>'amountCents')::bigint value from flow_entries cross join lateral jsonb_array_elements(d->'payments') p where p->>'date' between p_filters->>'from' and p_filters->>'to'
 union all select left(d->>'dueDate',7),case when d->>'type'='expense' then 'payable' else 'receivable' end,(d->>'amountCents')::bigint-travelpro_finance_paid(d) from flow_entries where d->>'dueDate' between p_filters->>'from' and p_filters->>'to'),
 months as (select "month",coalesce(sum(value) filter(where kind='received'),0) received,coalesce(sum(value) filter(where kind='paid'),0) paid,coalesce(sum(value) filter(where kind='receivable'),0) receivable,coalesce(sum(value) filter(where kind='payable'),0) payable from movements group by "month" order by "month"),
 balances as (select c.id,coalesce((c.data->>'openingCents')::bigint,0)+coalesce((select sum((p->>'amountCents')::bigint * case when d->>'type'='transfer' and d->>'toAccountId'=c.id then 1 when d->>'type' in ('expense','transfer') then -1 else 1 end) from scoped cross join lateral jsonb_array_elements(d->'payments') p where not (d->>'canceled')::boolean and (d->>'accountId'=c.id or d->>'toAccountId'=c.id) and p->>'date' between c.data->>'openingDate' and p_filters->>'today'),0) as "balanceCents" from travelpro_finance_catalogs c where c.workspace_id=p_workspace and c.data->>'kind'='account')
 select jsonb_build_object('items',coalesce((select jsonb_agg(item) from page),'[]'),'total',(select count(*) from filtered),'summary',(select value from totals),'monthly',coalesce((select jsonb_agg(to_jsonb(months)) from months),'[]'),'balances',coalesce((select jsonb_agg(to_jsonb(balances)) from balances),'[]'));
$$;

create or replace function public.travelpro_finance_write(p_workspace uuid,p_user uuid,p_action text,p_id text,p_version integer,p_data jsonb,p_reason text default '') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare old_data jsonb; new_version integer; item jsonb; result jsonb; existing record; n integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text,0));
 if p_action='bootstrap' then
  if exists(select 1 from travelpro_finance_migrations where workspace_id=p_workspace) then return '{}'::jsonb; end if;
  if not exists(select 1 from travelpro_state where workspace_id=p_workspace and version=p_version) then raise exception 'workspace_changed' using errcode='40001'; end if;
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
 if new_version is null then raise exception 'finance_changed' using errcode='40001'; end if;
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
  raise exception 'finance_migrated_reload' using errcode='40001';
 end if;
 update travelpro_state set data=p_data,version=version+1,updated_at=now() where workspace_id=p_workspace and version=p_version returning version into result;
 if result is null then raise exception 'travelpro_conflict' using errcode='40001'; end if;
 insert into travelpro_audit(workspace_id,user_id,action) values(p_workspace,p_user,'workspace.saved');return result;
end $$;
revoke all on function public.travelpro_finance_paid(jsonb),public.travelpro_finance_matches(jsonb,jsonb,boolean),public.travelpro_finance_report(uuid,jsonb),public.travelpro_finance_write(uuid,uuid,text,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.travelpro_finance_paid(jsonb),public.travelpro_finance_matches(jsonb,jsonb,boolean),public.travelpro_finance_report(uuid,jsonb),public.travelpro_finance_write(uuid,uuid,text,text,integer,jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
