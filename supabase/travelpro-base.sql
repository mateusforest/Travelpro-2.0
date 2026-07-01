create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and (
        w.owner_id = auth.uid()
        or exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = w.id
            and wm.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.is_workspace_manager(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and (
        w.owner_id = auth.uid()
        or exists (
          select 1
          from public.workspace_members wm
          where wm.workspace_id = w.id
            and wm.user_id = auth.uid()
            and wm.role in ('owner', 'admin')
        )
      )
  );
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  document_number text,
  birth_date date,
  notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  destination text,
  start_date date,
  end_date date,
  traveler_count integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled', 'archived')),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  trip_id uuid references public.trips (id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected', 'expired', 'archived')),
  currency char(3) not null default 'BRL',
  total_amount numeric(14,2) not null default 0,
  valid_until date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  trip_id uuid references public.trips (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'cancelled', 'archived')),
  signed_at timestamptz,
  file_url text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  category text not null default 'other' check (category in ('hotel', 'airline', 'operator', 'dmc', 'insurance', 'transfer', 'other')),
  contact_name text,
  email text,
  phone text,
  website text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  booking_type text not null default 'other' check (booking_type in ('flight', 'hotel', 'tour', 'transfer', 'insurance', 'other')),
  reference_code text,
  status text not null default 'draft' check (status in ('draft', 'requested', 'confirmed', 'ticketed', 'cancelled', 'completed')),
  start_date date,
  end_date date,
  amount numeric(14,2) not null default 0,
  currency char(3) not null default 'BRL',
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  trip_id uuid references public.trips (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  contract_id uuid references public.contracts (id) on delete set null,
  title text not null,
  type text not null default 'outro',
  file_url text,
  content text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  trip_id uuid references public.trips (id) on delete set null,
  assigned_to uuid references auth.users (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_number integer not null default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  item_type text not null default 'other' check (item_type in ('flight', 'hotel', 'activity', 'transfer', 'note', 'other')),
  title text not null,
  location text,
  notes text,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  trip_id uuid references public.trips (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  contract_id uuid references public.contracts (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  title text not null,
  amount numeric(14,2) not null,
  currency char(3) not null default 'BRL',
  category text,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists clients_workspace_id_idx on public.clients (workspace_id);
create index if not exists clients_status_idx on public.clients (status);
create index if not exists trips_workspace_id_idx on public.trips (workspace_id);
create index if not exists trips_client_id_idx on public.trips (client_id);
create index if not exists trips_status_idx on public.trips (status);
create index if not exists quotes_workspace_id_idx on public.quotes (workspace_id);
create index if not exists quotes_client_id_idx on public.quotes (client_id);
create index if not exists quotes_trip_id_idx on public.quotes (trip_id);
create index if not exists contracts_workspace_id_idx on public.contracts (workspace_id);
create index if not exists contracts_client_id_idx on public.contracts (client_id);
create index if not exists contracts_trip_id_idx on public.contracts (trip_id);
create index if not exists suppliers_workspace_id_idx on public.suppliers (workspace_id);
create index if not exists suppliers_category_idx on public.suppliers (category);
create index if not exists bookings_workspace_id_idx on public.bookings (workspace_id);
create index if not exists bookings_trip_id_idx on public.bookings (trip_id);
create index if not exists bookings_supplier_id_idx on public.bookings (supplier_id);
create index if not exists documents_workspace_id_idx on public.documents (workspace_id);
create index if not exists documents_trip_id_idx on public.documents (trip_id);
create index if not exists documents_contract_id_idx on public.documents (contract_id);
create index if not exists tasks_workspace_id_idx on public.tasks (workspace_id);
create index if not exists tasks_trip_id_idx on public.tasks (trip_id);
create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists itinerary_items_workspace_id_idx on public.itinerary_items (workspace_id);
create index if not exists itinerary_items_trip_id_idx on public.itinerary_items (trip_id);
create index if not exists itinerary_items_day_number_idx on public.itinerary_items (trip_id, day_number, sort_order);
create index if not exists financial_entries_workspace_id_idx on public.financial_entries (workspace_id);
create index if not exists financial_entries_trip_id_idx on public.financial_entries (trip_id);
create index if not exists financial_entries_type_idx on public.financial_entries (type);
create index if not exists financial_entries_due_date_idx on public.financial_entries (due_date);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_trips_updated_at on public.trips;
create trigger set_trips_updated_at
before update on public.trips
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
before update on public.quotes
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at
before update on public.contracts
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_itinerary_items_updated_at on public.itinerary_items;
create trigger set_itinerary_items_updated_at
before update on public.itinerary_items
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_financial_entries_updated_at on public.financial_entries;
create trigger set_financial_entries_updated_at
before update on public.financial_entries
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.clients enable row level security;
alter table public.trips enable row level security;
alter table public.quotes enable row level security;
alter table public.contracts enable row level security;
alter table public.suppliers enable row level security;
alter table public.bookings enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.financial_entries enable row level security;

drop policy if exists "clients_select_workspace" on public.clients;
create policy "clients_select_workspace"
on public.clients
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "clients_insert_workspace" on public.clients;
create policy "clients_insert_workspace"
on public.clients
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "clients_update_workspace" on public.clients;
create policy "clients_update_workspace"
on public.clients
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "clients_delete_workspace" on public.clients;
create policy "clients_delete_workspace"
on public.clients
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "trips_select_workspace" on public.trips;
create policy "trips_select_workspace"
on public.trips
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "trips_insert_workspace" on public.trips;
create policy "trips_insert_workspace"
on public.trips
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "trips_update_workspace" on public.trips;
create policy "trips_update_workspace"
on public.trips
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "trips_delete_workspace" on public.trips;
create policy "trips_delete_workspace"
on public.trips
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "quotes_select_workspace" on public.quotes;
create policy "quotes_select_workspace"
on public.quotes
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "quotes_insert_workspace" on public.quotes;
create policy "quotes_insert_workspace"
on public.quotes
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "quotes_update_workspace" on public.quotes;
create policy "quotes_update_workspace"
on public.quotes
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "quotes_delete_workspace" on public.quotes;
create policy "quotes_delete_workspace"
on public.quotes
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "contracts_select_workspace" on public.contracts;
create policy "contracts_select_workspace"
on public.contracts
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "contracts_insert_workspace" on public.contracts;
create policy "contracts_insert_workspace"
on public.contracts
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "contracts_update_workspace" on public.contracts;
create policy "contracts_update_workspace"
on public.contracts
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "contracts_delete_workspace" on public.contracts;
create policy "contracts_delete_workspace"
on public.contracts
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "suppliers_select_workspace" on public.suppliers;
create policy "suppliers_select_workspace"
on public.suppliers
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "suppliers_insert_workspace" on public.suppliers;
create policy "suppliers_insert_workspace"
on public.suppliers
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "suppliers_update_workspace" on public.suppliers;
create policy "suppliers_update_workspace"
on public.suppliers
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "suppliers_delete_workspace" on public.suppliers;
create policy "suppliers_delete_workspace"
on public.suppliers
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "bookings_select_workspace" on public.bookings;
create policy "bookings_select_workspace"
on public.bookings
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "bookings_insert_workspace" on public.bookings;
create policy "bookings_insert_workspace"
on public.bookings
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "bookings_update_workspace" on public.bookings;
create policy "bookings_update_workspace"
on public.bookings
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "bookings_delete_workspace" on public.bookings;
create policy "bookings_delete_workspace"
on public.bookings
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "documents_select_workspace" on public.documents;
create policy "documents_select_workspace"
on public.documents
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "documents_insert_workspace" on public.documents;
create policy "documents_insert_workspace"
on public.documents
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "documents_update_workspace" on public.documents;
create policy "documents_update_workspace"
on public.documents
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "documents_delete_workspace" on public.documents;
create policy "documents_delete_workspace"
on public.documents
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "tasks_select_workspace" on public.tasks;
create policy "tasks_select_workspace"
on public.tasks
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "tasks_insert_workspace" on public.tasks;
create policy "tasks_insert_workspace"
on public.tasks
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "tasks_update_workspace" on public.tasks;
create policy "tasks_update_workspace"
on public.tasks
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "tasks_delete_workspace" on public.tasks;
create policy "tasks_delete_workspace"
on public.tasks
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "itinerary_items_select_workspace" on public.itinerary_items;
create policy "itinerary_items_select_workspace"
on public.itinerary_items
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "itinerary_items_insert_workspace" on public.itinerary_items;
create policy "itinerary_items_insert_workspace"
on public.itinerary_items
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "itinerary_items_update_workspace" on public.itinerary_items;
create policy "itinerary_items_update_workspace"
on public.itinerary_items
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "itinerary_items_delete_workspace" on public.itinerary_items;
create policy "itinerary_items_delete_workspace"
on public.itinerary_items
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));

drop policy if exists "financial_entries_select_workspace" on public.financial_entries;
create policy "financial_entries_select_workspace"
on public.financial_entries
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "financial_entries_insert_workspace" on public.financial_entries;
create policy "financial_entries_insert_workspace"
on public.financial_entries
for insert
to authenticated
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "financial_entries_update_workspace" on public.financial_entries;
create policy "financial_entries_update_workspace"
on public.financial_entries
for update
to authenticated
using (public.is_workspace_manager(workspace_id))
with check (public.is_workspace_manager(workspace_id));

drop policy if exists "financial_entries_delete_workspace" on public.financial_entries;
create policy "financial_entries_delete_workspace"
on public.financial_entries
for delete
to authenticated
using (public.is_workspace_manager(workspace_id));
