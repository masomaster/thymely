-- Thymely — Phase 5 sharing
-- Read-only shared schedules + temporary caretaker access via opaque tokens.

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  kind text not null default 'read_only' check (kind in ('read_only', 'caretaker')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_shares_token on public.shares(token);
create index if not exists idx_shares_owner on public.shares(owner_id);

alter table public.shares enable row level security;

-- Phase 1: permissive (replaced by strict owner policy in 0004).
drop policy if exists phase1_all on public.shares;
create policy phase1_all on public.shares for all using (true) with check (true);

-- Resolve a share token to its owner's read-only schedule. SECURITY DEFINER so
-- an unauthenticated visitor can read exactly the shared tasks (and nothing
-- else) even after strict RLS is enabled in Phase 2.
create or replace function public.get_shared_schedule(share_token text)
returns table (
  id uuid,
  title text,
  frequency text,
  "interval" integer,
  repeat_from text,
  next_due_date date,
  active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.title, t.frequency, t.interval, t.repeat_from, t.next_due_date, t.active
  from public.tasks t
  join public.shares s on s.owner_id = t.owner_id
  where s.token = share_token
    and (s.expires_at is null or s.expires_at > now())
    and t.active = true
  order by t.next_due_date asc;
$$;

grant execute on function public.get_shared_schedule(text) to anon, authenticated;
