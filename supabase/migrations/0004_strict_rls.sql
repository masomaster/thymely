-- Thymely — Phase 2 strict Row Level Security
-- Run this AFTER enabling Supabase Auth. It flips owner-scoped tables from the
-- permissive Phase 1 policies to strict per-user policies keyed on auth.uid().
--
-- BACKFILL NOTE:
--   Phase 1 data is owned by the implicit profile
--   '00000000-0000-0000-0000-000000000001'. After the first real user signs in,
--   reassign that data to them (run once, replacing <NEW_USER_UUID>):
--
--     update public.profiles set id = '<NEW_USER_UUID>'
--       where id = '00000000-0000-0000-0000-000000000001';
--     -- (owner_id FKs cascade via ON UPDATE if desired, or update each table)
--
--   Simpler alternative: update each owner_id column directly:
--     update public.plants   set owner_id = '<NEW_USER_UUID>' where owner_id = '00000000-0000-0000-0000-000000000001';
--     update public.products set owner_id = '<NEW_USER_UUID>' where owner_id = '00000000-0000-0000-0000-000000000001';
--     update public.tasks    set owner_id = '<NEW_USER_UUID>' where owner_id = '00000000-0000-0000-0000-000000000001';
--     update public.shares   set owner_id = '<NEW_USER_UUID>' where owner_id = '00000000-0000-0000-0000-000000000001';

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Replace permissive policies with strict owner policies.
drop policy if exists phase1_all on public.profiles;
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['plants','products','tasks','shares']
  loop
    execute format('drop policy if exists phase1_all on public.%I;', t);
    execute format(
      'create policy owner_all on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());',
      t
    );
  end loop;
end $$;

-- task_plants / completions are scoped through their parent task's owner.
drop policy if exists phase1_all on public.task_plants;
create policy task_plants_owner on public.task_plants
  for all
  using (exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()));

drop policy if exists phase1_all on public.completions;
create policy completions_owner on public.completions
  for all
  using (exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()));

-- plant_catalog stays publicly readable (catalog_read policy from 0001).
