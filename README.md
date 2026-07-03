# Thymely 🌿

**Garden care on schedule.**

A cross-platform recurring-care scheduler for plants. Define tasks (e.g. _"Neem oil on tomatoes, every 2 weeks"_ or _"Water the ferns, every 3 days"_), check them off, and the next due date advances automatically. One [Expo](https://expo.dev) codebase targets **web now** and **iOS/Mac later**.

- **Frontend:** Expo Router + React Native Web + TypeScript
- **Styling:** NativeWind v4 (Tailwind for React Native) — garden-themed UI
- **Data:** Supabase (Postgres + Auth + Edge Functions) via `@supabase/supabase-js` + TanStack Query
- **Hosting:** Vercel (web) + Supabase (data); native builds via EAS

---

## Quick start (local, no backend required)

```bash
npm install
npm run web          # open the app in your browser
```

The app runs immediately with a friendly "Connect Supabase" banner. Reading/writing
data requires a Supabase project (see below), but the UI, navigation, recurrence
engine, and web build all work without one.

Useful scripts:

```bash
npm run typecheck    # tsc --noEmit
npm test             # vitest — recurrence engine unit tests (39 tests)
npm run export:web   # static web export to ./dist (what Vercel builds)
npm run ios          # run on iOS simulator (requires Xcode)
```

---

## Connect Supabase (one-time setup)

1. **Create a project** at [supabase.com](https://supabase.com) (Free tier is enough).
2. **Copy your credentials** from _Project Settings → API_ into a `.env` file:

   ```bash
   cp .env.example .env
   ```

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```

3. **Run the migrations** (in order). Either paste each file into the Supabase
   SQL Editor, or use the Supabase CLI:

   ```bash
   # Option A — Supabase CLI (recommended)
   npm i -g supabase
   supabase link --project-ref <your-ref>
   supabase db push        # applies everything in supabase/migrations/

   # Option B — SQL Editor
   # Run these files in order in the dashboard SQL editor:
   #   supabase/migrations/0001_init_schema.sql
   #   supabase/migrations/0002_seed_plant_catalog.sql   (253 curated plants + search RPC)
   #   supabase/migrations/0003_sharing.sql
   #   (0004 and 0005 are for later phases — see below)
   ```

   > The catalog seed is generated from a curated list. Regenerate it any time with
   > `node scripts/generate-catalog-seed.mjs`. Rare species not in the seed are
   > handled at runtime by the optional [GBIF suggest](https://api.gbif.org/v1/species/suggest) fallback.

4. **Restart** `npm run web`. The banner disappears and data persists.

Phase 1 runs **without login** using a single implicit profile
(`00000000-0000-0000-0000-000000000001`) and permissive RLS.

---

## The recurrence engine (`src/lib/recurrence.ts`)

The heart of the app, implemented as pure, timezone-safe, fully unit-tested functions.

A task recurs on: **`frequency`** (`day | week | month`) × **`interval`** (N) with a
**`repeat_from`** strategy:

- **`completion`** (default) — the next due date is measured from the day you _actually_
  did it. Best for treatments (fertilizer/insecticide re-applied every N days).
- **`due_date`** — the schedule stays calendar-anchored. Completing early keeps the
  cadence; completing very late rolls forward to the next _future_ slot (missed
  occurrences are skipped, alignment preserved).

On check-off, a `completions` row is written and `tasks.next_due_date` advances. The
**Today** view lists active tasks where `next_due_date <= today`.

```bash
npm test   # 39 tests covering month clamping, leap years, early/late completion, etc.
```

---

## Deploy the web app to Vercel

`vercel.json` is preconfigured to build the Expo web export.

1. Push this repo to GitHub (the owner adds the remote — no remote is configured yet).
2. In Vercel: **New Project → Import** the repo.
3. Vercel reads `vercel.json` automatically:
   - Build command: `npx expo export --platform web`
   - Output directory: `dist`
4. Add the two env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
   in **Project Settings → Environment Variables** (Production + Preview).
5. Deploy. SPA rewrites route all paths to the app shell.

Local dry-run of the exact build:

```bash
npm run export:web && npx serve dist
```

---

## Phase 2 — Auth + native

**Auth (magic link + OAuth):** UI scaffolding lives in `src/features/auth/` and the
Settings tab. To turn it on:

1. Enable **Email** (magic link) and any OAuth providers (Apple/Google) in
   _Supabase → Authentication → Providers_.
2. Run `supabase/migrations/0004_strict_rls.sql`. This:
   - adds a trigger to auto-create a `profiles` row per new user,
   - flips owner-scoped tables to strict `owner_id = auth.uid()` RLS,
   - keeps `plant_catalog` publicly readable.
3. **Backfill** your Phase 1 data to your new account (one-time). The migration
   header documents the exact `UPDATE` statements (reassign `owner_id` from the
   implicit profile to your user id).

**Native iOS / Mac:** `app.json` sets bundle id `app.thymely` and scheme `thymely://`;
`eas.json` has build profiles.

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview   # simulator build
# App Store / TestFlight needs an Apple Developer account ($99/yr).
```

Run on **Apple Silicon Macs** for free via **"Designed for iPad"** (the iOS build runs
natively on macOS) — the cheapest Mac path. Mac Catalyst / `react-native-macos` are
heavier alternatives if you need a dedicated Mac build.

---

## Phase 3 — Notifications

- **Local (native):** `src/features/notifications/hooks.ts` schedules an 8am reminder
  for due tasks via `expo-notifications`. Trigger it from the Settings tab
  ("Schedule due reminders"). No-ops on web.
- **Email daily digest:** `supabase/functions/daily-digest/index.ts` (Deno Edge
  Function) emails each user their tasks due today via [Resend](https://resend.com)
  (free tier: 100/day).

  ```bash
  supabase functions deploy daily-digest
  supabase secrets set RESEND_API_KEY=... FROM_EMAIL="Thymely <care@yourdomain.com>"
  # Schedule it daily (pg_cron + pg_net):
  #   run supabase/migrations/0005_daily_digest_cron.sql
  #   store project URL + service role key in Supabase Vault (see the file header)
  ```

---

## Phase 4 — Calendar

The **Calendar** tab renders a month grid marking upcoming due dates (amber) and
completed history (green). Tap any day to see and act on that day's tasks. Projection
uses the same recurrence engine (`upcomingOccurrences` / `addInterval`).

## Phase 5 — Sharing

The **Settings** tab creates:

- **Read-only links** — anyone with the URL sees a live, read-only schedule
  (`/share/<token>`), resolved by the `get_shared_schedule` security-definer RPC.
- **Caretaker links** — time-boxed (e.g. 7-day) shares for when you're away.

Requires `supabase/migrations/0003_sharing.sql`.

---

## Project structure

```
app/                       Expo Router routes
  _layout.tsx              providers (Query, SafeArea) + root Stack
  (tabs)/                  Today, Calendar, Garden, Products, Settings
  tasks/new.tsx            multi-step task creation wizard
  tasks/[id].tsx           task detail + completion history
  share/[token].tsx        public read-only shared schedule
src/
  lib/
    recurrence.ts          recurrence engine (unit-tested)
    recurrence.test.ts     39 tests
    supabase.ts            client + implicit-profile helper
    types.ts               Database types
    queryClient.ts         TanStack Query config + keys
  features/
    today/                 due list, check-off, snooze/skip/backdate, history
    tasks/                 task CRUD + wizard hooks
    plants/                catalog search + debounced combobox + get-or-create
    products/              products CRUD
    auth/                  Phase 2 sign-in scaffolding
    notifications/         Phase 3 local reminders
    sharing/               Phase 5 share links
  components/ui/           Button, Card, TextField, Screen, Badge, EmptyState…
supabase/
  migrations/              0001 schema · 0002 seed · 0003 sharing · 0004 rls · 0005 cron
  functions/daily-digest/  email digest Edge Function
scripts/generate-catalog-seed.mjs
```

---

## Manual activation checklist (things requiring your accounts)

| # | Task | Where |
|---|------|-------|
| 1 | Create Supabase project; copy URL + anon key into `.env` | supabase.com |
| 2 | Run migrations `0001`–`0003` | Supabase SQL editor / CLI |
| 3 | Add GitHub remote and push (no remote is set yet) | GitHub |
| 4 | Import repo to Vercel; add the 2 `EXPO_PUBLIC_*` env vars; deploy | vercel.com |
| 5 | _(Phase 2)_ Enable Auth providers; run `0004`; backfill `owner_id` | Supabase |
| 6 | _(Phase 2)_ `eas build` for iOS; Apple Developer acct for TestFlight | EAS / Apple |
| 7 | _(Phase 3)_ Deploy `daily-digest`; set Resend secrets; run `0005` | Supabase / Resend |

---

**Thymely** · garden care on schedule.
