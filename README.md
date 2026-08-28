# Ledger — Personal Workout App

This is a personal workout application I built for myself.

A mobile-first React PWA for building, logging, and reviewing workouts, backed by
Supabase (Postgres + Auth) and hosted on Vercel — all on free tiers. Single user,
password-gated.

The Vite app lives in [`app/`](app); the repo root holds planning docs, the
designed screens, and the database SQL.

- **Spec / source of truth:** [`workout-app-instructions.md`](workout-app-instructions.md) (behaviour), [`BUILD-BRIEF.md`](BUILD-BRIEF.md) (handoff map)
- **Design system:** Nocturne — [`screens/_ds/nocturne-*/readme.md`](screens/_ds)
- **Stack:** React 18 + Vite, `@supabase/supabase-js`, Recharts, `vite-plugin-pwa`

## Build status (v1)

| Area | State |
| --- | --- |
| Project scaffold, PWA shell, Nocturne design tokens | ✅ |
| Supabase schema + starter seed (`supabase/`) | ✅ (run manually — see below) |
| Auth + Login screen | ✅ |
| Manage Library (list, filters, Add/Edit, archive) | ⏳ |
| Home + weekly strip + month calendar + Day Record | ⏳ |
| Day builder / Edit a day (add, reorder, targets, format) | ⏳ |
| Workout Logging — Straight Sets (rest timer, effort) | ⏳ |
| Workout Logging — AMRAP (start, countdown, rounds) | ⏳ |
| Copy previous week / Copy to date (+ overwrite confirm) | ⏳ |
| Progress (exercise list + weight/bodyweight/time/AMRAP detail) | ⏳ |
| Body Weight tracking + Home quick-log | ⏳ |
| Programs (§3.9) | Phase 2 — not in v1 |

## First-time setup

### 1. Supabase database

In the [Supabase SQL editor](https://supabase.com/dashboard/project/cwfyqssxebnugthprrci/sql):

1. Run [`supabase/schema.sql`](supabase/schema.sql) — tables, indexes, RLS.
2. Run [`supabase/seed.sql`](supabase/seed.sql) — starter equipment + exercise library.

### 2. Auth account (single user)

- **Authentication → Providers → Email:** turn **off** "Allow new users to sign up".
  This is the security boundary — RLS allows any authenticated user, and this
  setting ensures only the one account you create can exist.
- **Authentication → Users → Add user:** email `jgruettert@valueelevated.com`,
  set a password, tick "Auto Confirm User".
- Forgot the password later? Reset it right here in the dashboard — there is no
  in-app recovery flow by design (spec §5). Keep it in a password manager.

### 3. Local dev

```bash
cd app
cp .env.example .env      # already filled with the project URL + anon key
npm install
npm run dev               # http://localhost:5173
```

The anon key in `app/.env.example` is safe to commit/ship — RLS restricts every
table to the authenticated user. Never add the `service_role` key.

### 4. Deploy (Vercel)

- Import the repo, framework preset **Vite**, **root directory `app`**.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  (values from `app/.env.example`).
- `app/vercel.json` already handles SPA rewrites.
- After deploy, open the URL on Android → browser menu → **Add to Home screen**.

## Project layout

```
app/                       the Vite app (Vercel root directory)
  index.html, vite.config.js, vercel.json
  src/
    main.jsx, App.jsx      app entry + routes
    state/AuthProvider.jsx Supabase session context
    lib/                   supabase client, date/format helpers, hooks
    components/            AppShell (bottom nav), shared UI kit
    screens/              one file per screen
    styles/               nocturne.css (vendored tokens) + app.css (patterns)
  scripts/gen-icons.mjs   regenerates public/ PWA icons
supabase/                  schema.sql, seed.sql — run by hand in the dashboard
screens/, design-prompts-pending/, *.md   planning + design handoff
```

## Scripts

Run from `app/`:

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `app/dist/` |
| `npm run preview` | Serve the built `dist/` |
| `node scripts/gen-icons.mjs` | Regenerate PWA icons |
