create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  area text,
  action text,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists activity_logs_workspace_created_at_idx
on public.activity_logs (workspace_id, created_at desc);

create index if not exists activity_logs_user_id_idx
on public.activity_logs (user_id);

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_select_workspace" on public.activity_logs;
create policy "activity_logs_select_workspace"
on public.activity_logs
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "activity_logs_insert_workspace" on public.activity_logs;
create policy "activity_logs_insert_workspace"
on public.activity_logs
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));
