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
