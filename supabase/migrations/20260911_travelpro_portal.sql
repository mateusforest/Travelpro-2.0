-- Additive migration. Run once in the SQL editor of the EXISTING Supabase project.
-- Existing profiles, workspaces, clients and other operational tables are untouched.
begin;
create table if not exists public.travelpro_state (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  data jsonb not null,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.travelpro_integrations (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  service text not null,
  config jsonb not null default '{}',
  secret text not null default '',
  primary key (workspace_id, service)
);
create unique index if not exists travelpro_unique_whatsapp_phone
  on public.travelpro_integrations ((config->>'phoneId'))
  where service = 'whatsapp' and coalesce(config->>'phoneId', '') <> '';
create table if not exists public.travelpro_audit (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.travelpro_outbox (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  status text not null default 'sending',
  remote_id text,
  created_at timestamptz not null default now(),
  primary key (workspace_id,id)
);
create table if not exists public.travelpro_rate_limits (
  key text primary key,
  count integer not null default 1,
  expires_at timestamptz not null
);
-- Private API tables. Only the server role can use them, after membership checks.
alter table public.travelpro_state enable row level security;
alter table public.travelpro_integrations enable row level security;
alter table public.travelpro_audit enable row level security;
alter table public.travelpro_outbox enable row level security;
alter table public.travelpro_rate_limits enable row level security;
revoke all on public.travelpro_state, public.travelpro_integrations, public.travelpro_audit,
  public.travelpro_outbox, public.travelpro_rate_limits from anon, authenticated;
grant all on public.travelpro_state, public.travelpro_integrations, public.travelpro_audit,
  public.travelpro_outbox, public.travelpro_rate_limits to service_role;
grant usage, select on sequence public.travelpro_audit_id_seq to service_role;

create or replace function public.travelpro_save_state(p_workspace uuid,p_version integer,p_data jsonb,p_user uuid)
returns integer language plpgsql security invoker set search_path = public as $$
declare result integer;
begin
  update public.travelpro_state set data=p_data,version=version+1,updated_at=now()
    where workspace_id=p_workspace and version=p_version returning version into result;
  if result is null then raise exception 'travelpro_conflict' using errcode='40001'; end if;
  insert into public.travelpro_audit(workspace_id,user_id,action) values(p_workspace,p_user,'workspace.saved');
  return result;
end $$;
revoke all on function public.travelpro_save_state(uuid,integer,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.travelpro_save_state(uuid,integer,jsonb,uuid) to service_role;

create or replace function public.travelpro_rate_limit(p_key text,p_limit integer)
returns boolean language plpgsql security invoker set search_path = public as $$
declare hits integer;
begin
  delete from public.travelpro_rate_limits where expires_at < now() - interval '5 minutes';
  insert into public.travelpro_rate_limits(key,count,expires_at) values(p_key,1,now()+interval '1 minute')
  on conflict(key) do update set count=case when travelpro_rate_limits.expires_at<now() then 1 else travelpro_rate_limits.count+1 end,
    expires_at=case when travelpro_rate_limits.expires_at<now() then now()+interval '1 minute' else travelpro_rate_limits.expires_at end
  returning count into hits;
  return hits<=p_limit;
end $$;
revoke all on function public.travelpro_rate_limit(text,integer) from public, anon, authenticated;
grant execute on function public.travelpro_rate_limit(text,integer) to service_role;

insert into storage.buckets(id,name,public,file_size_limit)
values('travelpro-private','travelpro-private',false,3145728) on conflict(id) do nothing;
commit;
