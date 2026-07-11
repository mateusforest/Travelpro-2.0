create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  area text not null check (char_length(trim(area)) > 0),
  title text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint ai_conversations_workspace_user_area_key unique (workspace_id, user_id, area)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text,
  provider text,
  model text,
  intent text,
  source text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists ai_conversations_workspace_user_area_idx
on public.ai_conversations (workspace_id, user_id, area);

create index if not exists ai_conversations_workspace_created_at_idx
on public.ai_conversations (workspace_id, created_at desc);

create index if not exists ai_messages_conversation_created_at_idx
on public.ai_messages (conversation_id, created_at desc);

create index if not exists ai_usage_logs_workspace_created_at_idx
on public.ai_usage_logs (workspace_id, created_at desc);

create index if not exists ai_usage_logs_user_created_at_idx
on public.ai_usage_logs (user_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_logs enable row level security;

drop policy if exists "ai_conversations_select_workspace" on public.ai_conversations;
create policy "ai_conversations_select_workspace"
on public.ai_conversations
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "ai_conversations_insert_workspace" on public.ai_conversations;
create policy "ai_conversations_insert_workspace"
on public.ai_conversations
for insert
to authenticated
with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

drop policy if exists "ai_messages_select_workspace" on public.ai_messages;
create policy "ai_messages_select_workspace"
on public.ai_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations conversation
    where conversation.id = ai_messages.conversation_id
      and public.is_workspace_member(conversation.workspace_id)
  )
);

drop policy if exists "ai_messages_insert_workspace" on public.ai_messages;
create policy "ai_messages_insert_workspace"
on public.ai_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ai_conversations conversation
    where conversation.id = ai_messages.conversation_id
      and conversation.user_id = auth.uid()
      and public.is_workspace_member(conversation.workspace_id)
  )
);

drop policy if exists "ai_usage_logs_select_workspace" on public.ai_usage_logs;
create policy "ai_usage_logs_select_workspace"
on public.ai_usage_logs
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "ai_usage_logs_insert_workspace" on public.ai_usage_logs;
create policy "ai_usage_logs_insert_workspace"
on public.ai_usage_logs
for insert
to authenticated
with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());
