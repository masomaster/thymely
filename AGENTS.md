# AGENTS.md — Thymely

Guidance for AI agents and contributors working in this repository.

## Branching policy (required)

Any **significant change** must be done on its own branch, not committed directly to `main`. "Significant" includes:

- **Bug fixes** — branch prefix `fix/` (e.g. `fix/next-due-off-by-one`)
- **Features** — branch prefix `feat/` (e.g. `feat/task-wizard`)
- **Phases** — branch prefix `phase/` (e.g. `phase/2-auth-multiuser`)

Workflow:

1. Create a branch off the latest `main`: `git checkout -b feat/<short-name>`.
2. Make focused commits on that branch (Conventional Commits style: `feat:`, `fix:`, `chore:`, `docs:`, etc.).
3. Open a pull request into `main` for review; do not merge straight to `main` for significant work.
4. Keep `main` deployable at all times.

Trivial, low-risk edits (typos, comments, small doc tweaks) may go directly to `main`.

## Project context

Thymely is a cross-platform gardening task scheduler (Expo + React Native Web, Supabase, Vercel). See the project plan and README for architecture and the phased rollout. Prioritize free/low-cost, serverless approaches.

## Cursor Cloud specific instructions

Standard commands live in `package.json` and the `README.md`; use those. Notes below are the non-obvious bits for running/testing in this environment.

- **Web dev server:** `npm run web` starts Expo/Metro on port `8081` (serves React Native Web). Env vars are inlined at bundle time, so **after editing `.env` you must restart `npm run web`** (hot reload does not pick up `EXPO_PUBLIC_*` changes).
- **Checks:** `npm test` (vitest, recurrence engine), `npm run typecheck` (tsc), `npm run lint` (`expo lint`). The lint config (`eslint.config.js` + `eslint`/`eslint-config-expo` devDeps) is generated on first `expo lint` run and is committed.
- **Supabase (local, no account needed):** the app runs without a backend (shows a "Connect Supabase" banner) but any read/write needs Supabase. For local data, run the Supabase CLI stack: `supabase start` (needs Docker running). It reads `supabase/config.toml` and applies everything in `supabase/migrations/`. Point the app at it via a `.env` (gitignored) with `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the anon key printed by `supabase start` (or `supabase status`).
- **RLS / migration gotcha (important):** `supabase start`/`supabase db reset` apply *all* migrations, including `0004_strict_rls.sql`, which flips owner-scoped tables to strict `owner_id = auth.uid()` RLS. That breaks the default **Phase 1 (no-login)** flow, which writes with the implicit profile `00000000-0000-0000-0000-000000000001` and needs the permissive policies from `0001`–`0003`. For a no-login local demo, apply only `0001`–`0003` (e.g. temporarily move `0004`/`0005` out of `supabase/migrations/` before `supabase db reset`, then move them back). Applying `0004` requires signing in (local magic-link emails land in Mailpit at `http://127.0.0.1:54324`).
- **anon table grants:** the migrations only `grant execute` on functions and rely on Supabase's legacy auto-expose of new `public` tables to `anon`/`authenticated`. The current CLI default revokes this, so `supabase/config.toml` sets `auto_expose_new_tables = true` — without it, anon REST calls fail with `permission denied for table ...`.
