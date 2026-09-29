begin;
-- Service-only activity tracking. Rows stay revoked after idle expiry.
create table if not exists public.travelpro_session_activity (
 session_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 last_activity timestamptz not null default now(),
 revoked boolean not null default false
);
alter table public.travelpro_session_activity enable row level security;
revoke all on public.travelpro_session_activity from anon,authenticated;
grant all on public.travelpro_session_activity to service_role;
create or replace function public.travelpro_touch_session(p_session uuid,p_user uuid,p_workspace uuid,p_minutes integer,p_active boolean)
returns boolean language plpgsql security invoker set search_path=public as $$
declare r public.travelpro_session_activity%rowtype;
begin
 insert into travelpro_session_activity(session_id,user_id,workspace_id) values(p_session,p_user,p_workspace) on conflict do nothing;
 select * into r from travelpro_session_activity where session_id=p_session for update;
 if r.user_id<>p_user or r.workspace_id<>p_workspace then return false; end if;
 if r.revoked or r.last_activity < now()-make_interval(mins=>greatest(15,least(60,p_minutes))) then
  update travelpro_session_activity set revoked=true where session_id=p_session;
  return false;
 end if;
 if p_active then update travelpro_session_activity set last_activity=now() where session_id=p_session; end if;
 return true;
end; $$;
revoke all on function public.travelpro_touch_session(uuid,uuid,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.travelpro_touch_session(uuid,uuid,uuid,integer,boolean) to service_role;
commit;
