-- ============================================
-- ServicePlanner database setup
-- ============================================

-- The app stores its state as a JSON document (same model as the prototype).
create table if not exists public.app_state (
  id int primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: only signed-in users can read/write.
alter table public.app_state enable row level security;

drop policy if exists "authenticated can read" on public.app_state;
create policy "authenticated can read"
  on public.app_state for select
  to authenticated
  using (true);

drop policy if exists "authenticated can insert" on public.app_state;
create policy "authenticated can insert"
  on public.app_state for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated can update" on public.app_state;
create policy "authenticated can update"
  on public.app_state for update
  to authenticated
  using (true);

-- Seed the single state row.
insert into public.app_state (id, data)
values (1, '{"users":{},"services":{},"notifs":{}}'::jsonb)
on conflict (id) do nothing;

-- Enable realtime so everyone's app updates live.
alter publication supabase_realtime add table public.app_state;
