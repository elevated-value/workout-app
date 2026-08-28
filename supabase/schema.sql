-- ============================================================================
-- Ledger — Personal Workout App : database schema (v1)
-- Run this once in the Supabase SQL editor (SQL → New query → paste → Run).
-- Safe to re-run: every object uses "if not exists" / "or replace" / drop-first.
--
-- Data model follows workout-app-instructions.md §4. Programs (§3.9) tables are
-- deliberately NOT here — that's Phase 2.
--
-- Auth model (§5): single self-managed account. RLS below allows any
-- authenticated user; the security boundary is that public sign-up is DISABLED
-- in the Supabase dashboard (Authentication → Providers → Email → "Allow new
-- users to sign up" OFF), so the only account that can exist is the one you
-- create by hand. A stranger with the anon key still hits the login wall.
-- ============================================================================

-- ── extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ── equipment ───────────────────────────────────────────────────────────────
-- A plain user-extensible list (§4). New tags are inserted from the Add/Edit
-- Exercise form on the fly.
create table if not exists public.equipment (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- ── exercises ───────────────────────────────────────────────────────────────
create table if not exists public.exercises (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  equipment              text[] not null default '{}',   -- equipment.name values
  muscle_groups          text[] not null default '{}',
  type                   text,                             -- strength | cardio | mobility | ...
  metric_type            text not null default 'weight'
                           check (metric_type in ('weight','bodyweight','time')),
  format                 text not null default 'straight_sets'
                           check (format in ('straight_sets','amrap')),
  default_rest_seconds   integer,
  default_sets           integer,   -- Straight Sets only; null for AMRAP (§3.1)
  default_reps           integer,   -- sets' reps (Straight Sets) or reps-per-round (AMRAP)
  default_weight         numeric,   -- target weight (Weight) or added/assisted modifier (Bodyweight)
  default_duration       integer,   -- seconds; Time metric
  default_time_cap_seconds integer, -- AMRAP only
  notes                  text,
  is_custom              boolean not null default true,
  is_archived            boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists exercises_active_idx on public.exercises (is_archived, name);

-- ── workout_sessions ────────────────────────────────────────────────────────
-- One row per calendar date that has a defined and/or logged workout. The Day
-- Record for a date is resolved purely by looking for a session on that date.
create table if not exists public.workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  date         date not null unique,
  status       text not null default 'planned'
                 check (status in ('planned','in_progress','completed')),
  name         text,
  notes        text,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists workout_sessions_date_idx on public.workout_sessions (date);

-- ── planned_exercises ───────────────────────────────────────────────────────
-- A session's structure/plan, independent of logged performance. This is what a
-- Copy operation duplicates (with zero logged_sets).
create table if not exists public.planned_exercises (
  id                 uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id        uuid not null references public.exercises (id) on delete restrict,
  position           integer not null default 0,   -- "order" (§4); reorder via Move Up/Down
  format             text not null default 'straight_sets'
                       check (format in ('straight_sets','amrap')),
  target_sets        integer,   -- null/unused when format = 'amrap' (§3.1/§3.4)
  target_reps        integer,
  target_weight      numeric,
  target_duration    integer,
  time_cap_seconds   integer,   -- AMRAP
  rest_seconds       integer,
  created_at         timestamptz not null default now()
);
create index if not exists planned_exercises_session_idx
  on public.planned_exercises (workout_session_id, position);

-- ── logged_sets ─────────────────────────────────────────────────────────────
-- One row per set (Straight Sets) or per completed round (AMRAP — set_number
-- doubles as round number). NOT linked to planned_exercises: removing an
-- exercise from a day never touches already-logged data (§3.4).
create table if not exists public.logged_sets (
  id                 uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id        uuid not null references public.exercises (id) on delete restrict,
  set_number         integer not null,
  reps               integer,
  weight             numeric,   -- Weight: lbs. Bodyweight: added(+)/assisted(-) modifier, null = plain BW
  duration           integer,   -- seconds; Time metric
  effort             text check (effort in ('easy','mod','hard','max')),
  notes              text,
  is_partial         boolean not null default false,  -- AMRAP trailing partial round
  performed_at       timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create index if not exists logged_sets_exercise_idx on public.logged_sets (exercise_id, performed_at);
create index if not exists logged_sets_session_idx on public.logged_sets (workout_session_id);

-- ── body_weight_entries ─────────────────────────────────────────────────────
-- Independent of workouts (§3.8). Multiple entries per day allowed.
create table if not exists public.body_weight_entries (
  id         uuid primary key default gen_random_uuid(),
  weight     numeric not null,
  logged_at  timestamptz not null default now(),
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists body_weight_entries_logged_idx on public.body_weight_entries (logged_at);

-- ── user_settings ───────────────────────────────────────────────────────────
-- Single-row settings (§3.8). goal_weight for now; weight_step is the logging
-- stepper increment.
create table if not exists public.user_settings (
  id           integer primary key default 1 check (id = 1),
  goal_weight  numeric,
  weight_step  numeric not null default 5,
  updated_at   timestamptz not null default now()
);
insert into public.user_settings (id) values (1) on conflict (id) do nothing;

-- ── updated_at triggers ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists exercises_touch on public.exercises;
create trigger exercises_touch before update on public.exercises
  for each row execute function public.touch_updated_at();

drop trigger if exists workout_sessions_touch on public.workout_sessions;
create trigger workout_sessions_touch before update on public.workout_sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ── row level security ──────────────────────────────────────────────────────
-- Allow any authenticated user (see auth-model note at top of file).
do $$
declare t text;
begin
  foreach t in array array[
    'equipment','exercises','workout_sessions','planned_exercises',
    'logged_sets','body_weight_entries','user_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_auth_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_auth_all', t);
  end loop;
end $$;
