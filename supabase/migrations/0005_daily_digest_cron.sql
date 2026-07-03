-- Thymely — Phase 3 email daily digest scheduling
-- Uses pg_cron to invoke the `daily-digest` Edge Function once a day via pg_net.
--
-- PREREQUISITES (do these in the Supabase dashboard / CLI first):
--   1. Deploy the Edge Function:  supabase functions deploy daily-digest
--   2. Set its secrets:           supabase secrets set RESEND_API_KEY=...  FROM_EMAIL=...
--   3. Enable extensions below (pg_cron + pg_net are available on Supabase).
--   4. Store the project URL + service role key so cron can authenticate. The
--      safest place is Supabase Vault; below we read them from Vault by name.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store these once via Vault (Dashboard -> Project Settings -> Vault), or replace
-- the vault reads below with literal values (NOT recommended for the key):
--   select vault.create_secret('https://<PROJECT_REF>.functions.supabase.co', 'project_functions_url');
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

-- Helper that fires the Edge Function. Kept as a function so the cron entry is tidy.
create or replace function public.trigger_daily_digest()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  base_url text;
  service_key text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_functions_url';
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'service_role_key';

  if base_url is null or service_key is null then
    raise notice 'Vault secrets not set; skipping digest.';
    return;
  end if;

  perform net.http_post(
    url := base_url || '/daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
end;
$$;

-- Schedule at 13:00 UTC daily (~8-9am US Eastern). Adjust as needed.
-- Unschedule any prior entry with the same name to keep this idempotent.
do $$
begin
  perform cron.unschedule('thymely-daily-digest')
  where exists (select 1 from cron.job where jobname = 'thymely-daily-digest');
exception when others then
  null;
end $$;

select cron.schedule('thymely-daily-digest', '0 13 * * *', $$select public.trigger_daily_digest();$$);
