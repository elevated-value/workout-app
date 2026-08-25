# Personal Workout App — Build Instructions

**Owner:** Jeff
**Purpose:** A mobile-first web app used on an Android phone, in the gym, to (1) see/build the day's workout and (2) log sets/reps/weight during the workout and (3) review progress over time. Modeled loosely on Ladder — a curated workout experience built around the equipment Jeff actually owns (kettlebells, dumbbells, barbells, bench, etc.), not a generic exercise database.

Last updated: 2026-08-25 (rev. 2)

---

## 1. Core Use Cases

1. **Plan a program in advance** — build a multi-week/day training plan (e.g. a 4-day split) made up of workout templates.
2. **Build a workout on the fly** — in the gym, assemble a one-off workout from the exercise library, filtered by available equipment.
3. **Log a workout in real time** — for each exercise, log weight/reps per set, with a rest timer between sets, using one hand on a phone screen.
4. **Track progress over time** — charts of weight/reps/volume per exercise over time, and personal records (PRs).

Auto-progression (the app suggesting weight/rep increases automatically) is explicitly **out of scope for v1** — Jeff will decide progression manually.

## 2. Users & Environment

- Single user (Jeff), protected by a simple password login (see Section 5) — the app is not intended to be shared or publicly discoverable, but the login adds real protection beyond "no one knows the URL."
- Primary device: Android phone, used one-handed, in a gym (variable signal — see Offline below).
- Secondary: may occasionally view progress from a desktop browser; app should be responsive but is optimized for phone first.

## 3. Core Features (v1 scope)

### 3.1 Exercise Library
- Pre-seeded with a starter set of common kettlebell, dumbbell, barbell, bench, and bodyweight exercises.
- Each exercise tagged with: equipment required, primary muscle group(s), and exercise type (strength, mobility, cardio, etc.).
- Jeff can add, edit, and delete his own exercises on top of the seed list.
- Library is filterable/searchable by equipment and muscle group.

### 3.2 Programs & Templates
- Jeff can create a **Program** (e.g. "Upper/Lower Split") containing multiple **Workout Templates** (e.g. "Upper Day A").
- Each Workout Template is a list of exercises with target sets/reps (and optionally target weight or "same as last time").
- Programs can be scheduled loosely (e.g. assigned to days of a rotation) — full calendar scheduling is a nice-to-have, not required for v1.

### 3.3 On-the-Fly Workouts
- From the gym, Jeff can start a blank workout and add exercises directly from the library (filtered by equipment on hand) without a pre-built template.

### 3.4 Workout Logging (in-gym experience)
- "Today's Workout" view shows either the scheduled template or lets Jeff start on-the-fly.
- For each exercise: log weight, reps, and optionally RPE/notes, per set.
- Auto-fill previous performance for that exercise as a reference ("last time: 45 lb x 10").
- Built-in rest timer between sets (start automatically after logging a set, or manually).
- Large tap targets, minimal typing — optimized for one-handed use mid-workout, gloves/sweaty hands considered.
- Mark a workout complete; completed workouts become historical records.

### 3.5 Progress Tracking
- Per-exercise history view: chart of weight/reps/volume (weight × reps × sets) over time.
- Personal record (PR) tracking per exercise (heaviest weight, best reps at a given weight, best estimated 1RM).
- Overall workout history log (list of past completed workouts, viewable/expandable).

## 4. Data Model (high-level)

- **Exercise**: id, name, equipment[], muscle_group[], type, notes, is_custom (bool)
- **Equipment**: id, name (kettlebell, dumbbell, barbell, bench, bodyweight, etc.)
- **Program**: id, name, description
- **WorkoutTemplate**: id, program_id (nullable), name, ordered list of {exercise_id, target_sets, target_reps, target_weight (optional)}
- **WorkoutSession**: id, date, template_id (nullable, null = on-the-fly), status (in-progress/completed)
- **LoggedSet**: id, workout_session_id, exercise_id, set_number, weight, reps, rpe (optional), notes, timestamp
- **PersonalRecord**: derived/computed from LoggedSet history (not necessarily its own table — can be a query), per exercise

Units: **pounds (lbs)** throughout.

## 5. Tech Stack & Architecture

Constraint: **must run entirely on free tiers, no ongoing cost.**

- **Frontend:** React + Vite, built and packaged as a **PWA** (installable to Android home screen via "Add to Home Screen", app-like full-screen experience, app icon).
- **Backend / Database:** Supabase (free tier) — Postgres database for all data above, accessed via Supabase's JS client directly from the frontend (no separate backend server needed).
- **Auth:** Basic login via Supabase Auth, with a single hardcoded account (Jeff's email/password) — no public sign-up, no multi-user support, just a real login screen gating the app. Supabase Row Level Security (RLS) policies restrict all tables to that one authenticated user, so the anon key alone is no longer enough to read/write data the way it would be with no auth. This is intentionally lightweight (no password reset flows, no email verification requirements needed for a single self-managed account) but is a meaningful step up from an unlisted URL — a stranger who found the link would hit a login wall, not the data.
- **Hosting:** Vercel (free tier) — auto-deploys from a Git repo, gives an HTTPS URL that can be installed to the Android home screen.
- **Offline support:** Not required for v1 launch ("nice to have"). Design the data layer so offline caching (via service worker + local queue synced to Supabase on reconnect) can be added later without a rearchitecture — but don't build it now.
- **Charts:** A lightweight charting library (e.g. Recharts) for the progress views.

## 6. Non-Functional Requirements

- Mobile-first responsive design; primary breakpoint is a single Android phone screen, portrait orientation.
- Fast load and snappy interaction — this is used mid-workout, not browsed leisurely.
- Minimal data entry friction: numeric keypads for weight/reps, large touch targets, avoid unnecessary confirmation dialogs.
- Installable as a PWA (manifest.json, app icon, theme color, standalone display mode).

## 7. Out of Scope for v1 (future enhancements)

- Auto-progression / suggested weight increases.
- Full offline-first support with conflict resolution.
- Multi-user support, public sign-up, password reset flows, or other full-auth features (v1 auth is a single hardcoded account).
- Social features, sharing, or community programs.
- Video/GIF demonstrations per exercise.
- Calendar-based scheduling/reminders.

## 8. Open Items to Carry Into UI/UX Design Phase

These are intentionally left open here and should be worked out in the next planning step (working with Claude Design):

- Visual style/tone (minimal & data-forward vs. bold & motivational, color palette, typography).
- Primary navigation pattern (bottom tab bar vs. hamburger, given one-handed phone use).
- Exact layout of the in-workout logging screen (this is the highest-stakes screen — used live, sweaty, one-handed).
- How "Today's Workout" is surfaced on app open (home screen vs. requiring navigation).
- Chart style/density for progress views.
- Simple login screen styling (should be minimal — a single email/password form, not a full auth flow).

---

*This document is the source of truth for what Claude should build. Update it as decisions change; the UI/UX design conversation should reference this doc rather than duplicate it.*
