-- SISD-IN V3 Supabase schema
-- Run this in Supabase SQL Editor. Use only the browser publishable/anon key.
create table if not exists public.sisd_app_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_key text not null check (dataset_key in (
    'sisd_in_documents',
    'sisd_company_information',
    'sisd_to_ddg_documents',
    'sisd_document_subjects'
  )),
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, dataset_key)
);

alter table public.sisd_app_data enable row level security;

-- Each signed-in user can only read/write their own data.
drop policy if exists "Users read own SISD data" on public.sisd_app_data;
create policy "Users read own SISD data"
  on public.sisd_app_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own SISD data" on public.sisd_app_data;
create policy "Users insert own SISD data"
  on public.sisd_app_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own SISD data" on public.sisd_app_data;
create policy "Users update own SISD data"
  on public.sisd_app_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own SISD data" on public.sisd_app_data;
create policy "Users delete own SISD data"
  on public.sisd_app_data for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.sisd_app_data to authenticated;
