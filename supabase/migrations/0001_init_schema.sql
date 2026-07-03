-- Thymely — Phase 0 initial schema
-- Tables: profiles, plant_catalog, plants, products, tasks, task_plants, completions
-- RLS is PERMISSIVE in Phase 1 (single implicit profile, anon access). Phase 2
-- (migration 0004) flips owner-scoped tables to strict per-user RLS.

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  created_at timestamptz not null default now()
);

-- Phase 1 implicit profile. Every owner-scoped row references this until auth is on.
insert into public.profiles (id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'My Garden')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- plant_catalog (global, shared, read-only to clients)
-- ---------------------------------------------------------------------------
create table if not exists public.plant_catalog (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  scientific_name text,
  category text
);

-- ---------------------------------------------------------------------------
-- plants (owner-scoped garden instances; auto-created via the task wizard)
-- ---------------------------------------------------------------------------
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  catalog_id uuid references public.plant_catalog(id) on delete set null,
  name text not null,
  location text,
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products (fertilizers, sprays, or plain actions)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null default 'other'
    check (type in ('fertilizer','insecticide','fungicide','herbicide','amendment','action','other')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks (the recurring schedule)
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  product_id uuid references public.products(id) on delete set null,
  frequency text not null check (frequency in ('day','week','month')),
  interval integer not null default 1 check (interval >= 1),
  repeat_from text not null default 'completion' check (repeat_from in ('completion','due_date')),
  anchor_date date not null default current_date,
  next_due_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- task_plants (many-to-many: which plants a task targets)
-- ---------------------------------------------------------------------------
create table if not exists public.task_plants (
  task_id uuid not null references public.tasks(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  primary key (task_id, plant_id)
);

-- ---------------------------------------------------------------------------
-- completions (log of check-offs; plant_id nullable = whole-task completion)
-- ---------------------------------------------------------------------------
create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  completed_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_plants_owner on public.plants(owner_id);
create index if not exists idx_products_owner on public.products(owner_id);
create index if not exists idx_tasks_owner on public.tasks(owner_id);
create index if not exists idx_tasks_next_due on public.tasks(next_due_date);
create index if not exists idx_task_plants_plant on public.task_plants(plant_id);
create index if not exists idx_completions_task on public.completions(task_id);
create index if not exists idx_completions_completed_on on public.completions(completed_on);

-- ---------------------------------------------------------------------------
-- Row Level Security — PERMISSIVE for Phase 1
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.plant_catalog  enable row level security;
alter table public.plants         enable row level security;
alter table public.products       enable row level security;
alter table public.tasks          enable row level security;
alter table public.task_plants    enable row level security;
alter table public.completions    enable row level security;

-- Catalog is publicly readable, never client-writable.
drop policy if exists catalog_read on public.plant_catalog;
create policy catalog_read on public.plant_catalog for select using (true);

-- Phase 1: allow all access to owner-scoped tables (single implicit profile).
-- These get replaced by strict owner_id policies in 0004_strict_rls.sql.
do $$
declare t text;
begin
  foreach t in array array['profiles','plants','products','tasks','task_plants','completions']
  loop
    execute format('drop policy if exists phase1_all on public.%I;', t);
    execute format(
      'create policy phase1_all on public.%I for all using (true) with check (true);', t
    );
  end loop;
end $$;
