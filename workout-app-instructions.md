# Personal Workout App — Build Instructions

**Owner:** Jeff
**Purpose:** A mobile-first web app used on an Android phone, in the gym, to (1) see/build the day's workout and (2) log sets/reps/weight during the workout and (3) review progress over time. Modeled loosely on Ladder — a curated workout experience built around the equipment Jeff actually owns (kettlebells, dumbbells, barbells, bench, etc.), not a generic exercise database.

Last updated: 2026-08-28 (rev. 22)

---

## 0. Build Sequencing — v1 Launch vs. Phase 2

**v1 launch (build and ship first):** everything in this document *except* Section 3.9 (Programs) — Exercise Library, Daily Workouts, Copy, Edit, Workout Logging (Straight Sets and AMRAP), Progress Tracking, Body Weight Tracking, Home Screen/Day Records, and the login/hosting setup in Section 5. This is a complete, usable app on its own: Jeff can define, edit, copy, and log workouts and track progress without Programs.

**Phase 2 (fast-follow, after v1 is live and in real use):** Section 3.9, Programs. Deliberately deferred — not because it's unclear or risky, but because it's a nice-to-have layered on top of the core loop, and getting the core loop into production and actually used sooner is more valuable than building a scheduling feature before the day-by-day workflow has been lived with. Programs was specifically designed as a bolt-on (it only generates/pre-fills the same `WorkoutSession`/`PlannedExercise` rows the core model already uses) *so that* this deferral costs nothing architecturally — no rework needed on the v1 build when Programs gets added. The full spec and its Claude Design prompt are ready whenever Jeff wants to build it; this section just documents that it's sequenced second, not that it's unresolved.

---

## 1. Core Use Cases

1. **Define a workout for a specific day** — build that day's exercise list directly (today, or any date). Still the primary, always-available way workouts get created — Programs (below) are an optional layer on top, not a replacement.
2. **Copy a day's workout to other days** — repeat structure without manually rebuilding it (a single day, or a full previous week at once), for anyone not using a Program, or for one-off deviations from an active Program.
3. **Edit a day's workout** — add, remove, or reorder exercises, or adjust target sets/reps, for one specific day. Edits apply only to that day.
4. **Log a workout in real time** — for each exercise, log weight/reps per set, with a rest timer between sets, using one hand on a phone screen.
5. **Track progress over time** — charts of weight/reps/volume per exercise over time, and personal records (PRs).
6. **Optionally, define a recurring Program** — a day-of-week rotation of reusable template workouts, so upcoming dates auto-populate without manually building or copying each one. Fully optional; everything above still works standalone. See Section 3.9.

Auto-progression (the app suggesting weight/rep increases automatically) is explicitly **out of scope for v1** — Jeff will decide progression manually.

**Programs are back in scope** — see Section 3.9. An earlier draft deferred a full recurring Program/Template/rotation system because Jeff wasn't ready to formalize a structure yet; day-by-day + Copy shipped first as the simpler foundation, and Programs now sit as an optional scheduling layer on top of that same foundation rather than a separate system. **Programs vs. a single day's workout — worth being explicit about:** a named single-day workout with multiple exercises (e.g. a CrossFit benchmark like "Cindy": pull-ups, push-ups, air squats) is just a Daily Workout (Section 3.2) like any other, Program or not — Programs are about *scheduling which* daily workout happens on which recurring day, not about how many exercises are in one.

## 2. Users & Environment

- Single user (Jeff), protected by a simple password login (see Section 5) — the app is not intended to be shared or publicly discoverable, but the login adds real protection beyond "no one knows the URL."
- Primary device: Android phone, used one-handed, in a gym (variable signal — see Offline below).
- Secondary: may occasionally view progress from a desktop browser; app should be responsive but is optimized for phone first.

## 3. Core Features (v1 scope)

### 3.1 Exercise Library
- Pre-seeded with a starter set of common kettlebell, dumbbell, barbell, bench, and bodyweight exercises.
- Each exercise tagged with: equipment required, primary muscle group(s) (optional — not every exercise fits neatly, e.g. running), and exercise type (strength, mobility, cardio, etc.).
- Library is filterable/searchable by equipment and muscle group.
- **Managed on its own dedicated "Manage Library" screen** — adding, editing, and deleting exercises happens there, not inline from the Add Exercise picker while building a day's workout. Keeps workout-building fast and uncluttered; library curation is a separate, less-frequent task.
- **Add/Edit Exercise form fields:** name (required), equipment (multi-select, see extensibility below), muscle group(s) (multi-select, optional), type (optional categorization for filtering — strength/cardio/mobility/etc.), **metric type** (see below), **format** (Straight Sets / AMRAP — see below), **default target values** (default sets, default reps, plus a default primary-metric value labeled per metric type: "Default Weight" for Weight-type, "Default Added Weight" for Bodyweight-type, "Default Time" for Time-type; which of these apply and what they mean varies by format — see below), **default rest period** (optional, e.g. "2 min" — pre-fills the rest timer whenever this exercise is added to a day's workout; see 3.4/3.5), notes (optional free text). All default fields are optional.
- **Equipment is extensible, not fixed:** beyond the pre-seeded list, Jeff can add new equipment tags on the fly while adding an exercise (e.g. "Rower," "Sled," "Track") — not limited to updating the app later to support a new piece of equipment.
- **Metric type — one consistent logging UI, three modes:** every exercise logs as sets of reps plus one "primary metric" value, but which kind of value the primary slot represents is set per exercise (its **metric type**), keeping a single two-stepper input pattern across the whole app rather than branching input forms:
  - **Weight** — the primary slot is a numeric weight in lbs (e.g. Barbell Bench Press). Standard lift logging.
  - **Bodyweight** — the primary slot shows "BW" and adjusts an added/assisted weight modifier via the same +/− stepper, defaulting to plain BW (e.g. "BW +25" for a weighted pull-up, "BW −20" for an assisted one). Used for exercises like Pull-Up or Wall Walk.
  - **Time** — the primary slot is a duration (e.g. mm:ss) instead of weight. Used for distance-based cardio, where the distance itself is baked into the exercise's identity rather than logged per set — e.g. "200m Run," "400m Run," and "Mile Run" are three separate library items, each metric-type Time. The Reps stepper still shows alongside Time for these (consistent with every other exercise), even though for most time-based exercises each set is simply one attempt at that distance.
  - Reps is always present regardless of metric type — it's the one constant across every exercise, only the primary metric slot's meaning changes.
- **Format — how an exercise's work is structured and scored**, independent of (and combinable with) metric type. Applies **per individual exercise**, not to a group of exercises sharing one clock — a true multi-exercise circuit that shares a single timer across several movements (the way a real "Cindy" is one shared 20-minute AMRAP across three moves) is **not** built in v1; see the note in 3.2. Two formats:
  - **Straight Sets** (default) — the existing model: a set number of sets, each logged individually with its own reps/weight/effort. Default Sets and Default Reps both apply here as the starting point for a day's targets.
  - **AMRAP** — as many rounds as possible within a time cap. Configured with a **time cap** (e.g. 20 min) and **Default Reps** repurposed as "reps per round" (e.g. 5 reps). **Sets do not apply to AMRAP at all** — not defaulted to 1, not shown as an editable field anywhere, just entirely absent from the UI, in the library form and on a day's plan alike. It's continuous work against one clock, not a series of separate sets; rounds are the *result* of that effort, discovered during logging (Section 3.5), not something set as a target beforehand.
  - **EMOM and For Time were considered but are intentionally not built** — Jeff can represent both manually within Straight Sets (e.g. logging each EMOM interval as its own set, or logging a single set to capture a For Time result), so they don't need dedicated format support.
- **Default target weight/time, sets, and reps:** so Jeff isn't nudging values up or down from zero every time he adds a familiar exercise to a day. Set once per exercise in the library (e.g. Barbell Bench Press = 3 sets × 135 lbs × 8 reps as a starting point for a Straight Sets exercise), these pre-fill the corresponding `PlannedExercise` fields when the exercise is added to a day (Section 3.4), and remain freely editable for that specific day afterward — the library default never changes as a side effect of adjusting one day's plan. Which fields are meaningful depends on the exercise's format, per the breakdown above.
- **Deleting a custom exercise:** to avoid silently breaking historical data, deletion is a soft delete/archive rather than a hard delete — an archived exercise disappears from the Add Exercise picker and Manage Library's active list, but stays intact wherever it's already referenced (past logged workouts, progress charts), consistent with how removing an exercise from a single day preserves its logged history (Section 3.4).

### 3.2 Daily Workouts
- Jeff defines a workout directly on a specific calendar date — no recurring program or template sits behind it. Each day's workout is its own independent, self-contained thing unless explicitly copied from another day (see 3.3).
- Building a day's workout means adding exercises from the library (filterable by equipment on hand) and setting target sets/reps for each, in whatever order Jeff wants.
- This works the same whether Jeff is planning ahead (building out a future date before he gets to the gym) or building on the fly (standing in the gym, deciding right then).
- **Circuit/AMRAP workouts (e.g. CrossFit benchmarks like "Cindy"):** each exercise added to a day can independently carry a Format (Straight Sets/AMRAP, Section 3.1), so a single movement done as an AMRAP (e.g. "AMRAP 12 min: max Burpees") is first-class — logged and scored properly, not just noted. What's still **not** built is a shared multi-exercise circuit: for a true "Cindy," Jeff would add Pull-Up, Push-Up, and Air Squat to the day and set each one's Format to AMRAP with a matching 20-minute time cap individually — the app doesn't link them under one shared clock, so it won't produce a single unified "14 rounds" figure across all three; each exercise tracks and scores its own rounds independently (Section 3.6). Naming the day "Cindy" (Section 4's `WorkoutSession.name`) and using the notes field for the overall combined score remains the practical way to capture the true circuit result. A real shared-circuit concept remains deferred (Section 7). EMOM- and For Time-style workouts are handled manually via Straight Sets (Section 3.1) rather than as dedicated formats.

### 3.3 Copy & Duplicate Workouts
Since there's no recurring program in v1, copying is the primary way Jeff avoids manually rebuilding the same workout day after day.

- **Copy Previous Week:** From the Home screen or calendar view, an action copies the immediately preceding Monday–Sunday week's workout structure (which exercises, what order, target sets/reps — no logged or target weights carried forward) into the following Monday–Sunday week, one day at a time (rest days copy as rest days). If the destination week already has anything defined or logged, the copy **overwrites it** — existing content for that week is replaced.
- **Copy a Specific Workout to a Date:** From any day with a defined workout — logged, in-progress, or just planned; not restricted to completed workouts — a "Copy to" action lets Jeff pick a destination date. The exercise structure (exercises, order, target sets/reps) copies to that date with no logged or target weights carried forward, giving a fresh, blank version of that workout to perform and log. Same overwrite behavior as above.
- Because Section 3.5 already auto-fills "last time" performance per exercise from history regardless of which day it's being viewed from, neither copy action needs to carry weights forward itself — that reference will surface naturally once the copied workout is logged.
- **Overwrite confirmation:** Both copy actions require a confirmation step before an overwrite actually happens whenever the destination (a day, or any day within the destination week) already has defined or logged content. The confirmation should clearly state what's about to be replaced (e.g. "This will replace your existing workout for Thursday, Sep 3 — logged data will be lost") so Jeff can back out before losing data. No confirmation is needed when the destination is empty, since there's nothing to lose. Exact visual treatment (modal vs. inline) is left to UI design.

### 3.4 Edit a Day's Workout
- Applies uniformly to **today's workout and any future defined day** — same actions, same UI, whether the day hasn't started yet or is in progress. (A fully completed past workout is not covered by this feature — that's a different, not-yet-planned concept of editing history.)
- Edits apply **only to that specific day's workout.** There's no template underneath to accidentally change, and no other day is affected by editing this one (this is a much simpler guarantee than it would be under a Program system, and part of why Programs are deferred for now).
- **Entry point:** a persistent Edit affordance (button/icon), always visible on the workout view — the Day Record preview for a future day, or the active logging screen for today — whenever that day isn't fully completed. No separate "edit mode" to enter/exit; editing is just always available in place.
- **Actions in v1:**
  - **Add exercise** — pick from the Exercise Library (filterable by equipment), appended to the day's list. Its target weight/time, reps, and rest period all pre-fill from that exercise's library defaults (if set) — so a familiar exercise shows up ready to go instead of starting blank/zero — but every value is just a starting point for this day, not locked to the library.
  - **Remove exercise** — removes it from that day's plan.
  - **Adjust target sets/reps/weight (or time)/rest** — edit any of the target values for an exercise already on the day. All are fully overridable per day even when they started from a library default — e.g. dropping the weight on a lighter day, or shortening rest when Jeff's short on time — without touching the library default for next time. **For an AMRAP exercise, the Sets control does not appear at all** — only reps-per-round, time cap, and rest are adjustable — consistent with Sets not applying to AMRAP anywhere in the app (Section 3.1).
  - **Reorder exercises** — using **"Move Up" / "Move Down" controls** on each exercise row, rather than drag-and-drop. Chosen deliberately over drag-and-drop for this app: drag gestures are unreliable on a phone in a gym (sweaty/gloved hands, one-handed use, easy to mis-trigger while a list is scrollable), whereas a tap-to-move-up/down control is precise, thumb-friendly, and impossible to fumble. This uses the `order` field already defined on `PlannedExercise` (Section 4) — no data model change needed, just exposing it via UI.
  - A dedicated "swap in place" action is **not in v1** — remove-then-add accomplishes the same thing in two steps.
- **Mid-workout removal behavior:** if Jeff removes an exercise today after already logging sets for it, those logged sets are **not deleted** — they're kept as-is in that workout session's history and still count toward progress tracking/PRs, even though the exercise no longer appears in the day's active plan going forward. This falls out of the data model naturally: `LoggedSet` rows aren't dependent on the `PlannedExercise` row still existing (see Section 4), so removing the plan entry doesn't touch already-logged data.

### 3.5 Workout Logging (in-gym experience)
- "Today's Workout" view shows that day's defined workout, or lets Jeff build one on the spot if nothing's been defined yet.
- For each exercise: log its primary metric (weight, BW ± modifier, or time — per the exercise's metric type, Section 3.1) and reps, plus an optional effort rating (Easy/Mod/Hard/Max) and notes, per set.
- Auto-fill previous performance for that exercise as a reference ("last time: 45 lb x 10," or "last time: BW x 7" for bodyweight, or "last time: 1:42" for a timed run).
- Built-in rest timer between sets (start automatically after logging a set, or manually), pre-set to that exercise's rest period for the day (Section 3.4) — defaulted from the library, adjustable per day.
- Large tap targets, minimal typing — optimized for one-handed use mid-workout, gloves/sweaty hands considered.
- Mark a workout complete; completed workouts become historical records.
- **Timer principle (applies to every timer in the app):** a timer never starts just because a screen was opened or navigated to — it only starts from an explicit action. That action can be a deliberate button tap (AMRAP's Start), or a direct consequence of something Jeff just did (the rest timer auto-starting right after he logs a set is fine — that's a result of his action, not a surprise on arrival). Every running timer, whatever triggered it, has a visible Pause/Resume control.
- **Logging adapts by Format (Section 3.1):**
  - **Straight Sets** — the behavior described above: log each set individually against its target. The rest timer's auto-start-after-logging-a-set behavior satisfies the timer principle above — it's triggered by Jeff's own action, not by opening the screen.
  - **AMRAP** — the countdown against the exercise's time cap does **not** start automatically when Jeff opens the exercise — it waits on an explicit **Start** action, and once running, offers **Pause/Resume**, per the timer principle above. Once started, Jeff logs one entry per completed round (reps defaults to the "reps per round" target, editable if a round comes up short); when time expires, he logs the partial reps actually completed in that final round, if any. The count of full-target entries plus the trailing partial becomes the round/rep score (Section 3.6).

### 3.6 Progress Tracking
- No separate chronological workout-history list here; date-based browsing of past workouts is already handled by the Day Record calendar (Section 3.7), and duplicating that as a second history view was deliberately avoided.
- **Two sections within this tab:** "Exercises" (per-exercise charts/PRs, described below) and "Body Weight" (Section 3.8) — kept as clearly separated sections (e.g. a toggle/segmented control) rather than mixed together, since body weight isn't an exercise and isn't tied to a workout session.
- **Exercises landing view:** a searchable/filterable list of exercises Jeff has logged (reusing the same equipment/muscle-group filter pattern as the Library) — tapping one drills into that exercise's detail view. No dashboard-first overview in v1.
- **Per-exercise detail view**, adapted to that exercise's metric type (Section 3.1):
  - **Weight** exercises: chart of weight lifted over time (or volume — weight × reps × sets), PR = heaviest weight lifted (best estimated 1RM as a secondary stat, time permitting).
  - **Bodyweight** exercises: chart of reps over time (or added/assisted weight modifier, if that's what's being progressed), PR = most reps at bodyweight, or heaviest added weight if weighted variations are being used.
  - **Time** exercises: chart of time over sessions for that specific exercise (e.g. fastest 400m Run trend) — framed so "lower/faster is better" reads clearly (e.g. a downward trend visually read as improvement, not decline).
  - Below the chart, a compact table of recent sets/sessions (date, the metric value, reps, effort) — same underlying pattern across all three metric types, just showing the relevant column.
- **PR/chart adaptation for Format (Section 3.1), layered on top of metric type:**
  - **AMRAP** exercises: chart of rounds (+ partial reps) completed per session, PR = most rounds/reps completed in the time cap.
  - Straight Sets exercises use the metric-type-based charts above unchanged.
- **Chart window:** shows the most recent sessions by default (e.g. last 10–15 data points) for legibility on a phone screen, with a way to expand to full history if Jeff wants to see further back.

### 3.7 Home Screen & Day Records
- **Home screen** is the app's landing view. It shows: a weekly calendar strip (Mon–Sun, current week), a current streak indicator, and a featured card for today — either today's defined workout or a prompt to build one if nothing's been defined yet.
- **Day Record:** every calendar date resolves to a record when tapped, regardless of past/present/future:
  - **Logged day** — a workout was actually completed (or is in progress) that date → tapping shows that session's summary/log.
  - **Defined, not yet logged** (today or future) → tapping shows a preview of that day's planned exercises with a "Start" action.
  - **Nothing defined and nothing logged** → tapping shows an empty state with the option to build a workout for that date.
  - A past date with a defined workout but no logged session (a missed workout) is shown as such, with the option to log it retroactively if desired.
- **Full calendar view:** a month-level calendar (reached from the home screen, e.g. via the streak indicator) uses the same Day Record tap behavior as the weekly strip, so Jeff can browse further back or forward than the current week.
- Tapping any day in either the weekly strip or the full calendar always leads somewhere — never a dead end.
- **Quick weight-log shortcut:** a small, low-emphasis affordance on the Home screen (e.g. near the streak indicator) for logging a body weight entry without navigating away — opens a lightweight quick-entry input (just weight + today's date, defaulting to now), distinct from the fuller Body Weight section in Progress (3.8) where the history/chart/goal actually live.

### 3.8 Body Weight Tracking
- Independent of workouts entirely — body weight can be logged any day, whether or not Jeff worked out, and isn't tied to a `WorkoutSession`.
- **Logging an entry:** weight (lbs) + date/time (defaults to now, editable — e.g. for logging this morning's weigh-in later in the day). One entry per moment logged; multiple entries on the same day are allowed (e.g. morning and evening) rather than restricted to one-per-day.
- **Trend view:** a chart of logged weight over time, in the Body Weight section of the Progress tab (3.6), following the same "recent window by default, expandable to full history" pattern used for exercise charts.
- **Goal weight:** Jeff can set a target weight; progress is shown relative to it (e.g. "8 lbs to go"), displayed alongside the trend chart. Editable any time — not locked in once set.
- **Entry points:** the fuller logging/chart/goal experience lives in Progress → Body Weight; the Home screen quick-log shortcut (3.7) is a fast path for the log-a-number moment, both writing to the same underlying data.

### 3.9 Programs
An optional scheduling layer over Daily Workouts (3.2) — not a replacement, not required. Everything about building, editing, copying, and logging a day's workout stays exactly as already specified; a Program just auto-populates upcoming dates so Jeff doesn't have to build or copy each one by hand. Its own bottom-nav tab, alongside Home / Library / Progress.

- **WorkoutTemplate:** a reusable workout definition, built with the *exact same exercise-picking experience* as building any single day's workout (Section 3.2) — same library picker, same Format options, same target sets/reps/weight/rest — just not tied to a calendar date. Named (e.g. "Upper Day A"), editable and deletable independent of any Program.
- **Program:** a named day-of-week rotation — each weekday (Mon–Sun) is assigned either a `WorkoutTemplate` or left as a rest day. Only **one Program can be active at a time**; activating a Program automatically deactivates whichever one was previously active. Jeff can still create/keep multiple Programs, just not run more than one simultaneously.
- **How an active Program populates the calendar:** rather than computing a schedule live on every screen view, the app **materializes real `WorkoutSession` + `PlannedExercise` rows** (copied from the day's assigned `WorkoutTemplate`, structure only — same "blank slate" mechanism Copy already uses) for a rolling window of upcoming dates (e.g. the next 14 days), refreshing that window forward as time passes. This matters for two reasons: (1) it means a Program-generated day is just a normal day the instant it exists — the Day Record, Edit, Copy, and logging all work on it exactly as already specified, no special-casing; and (2) it's what makes rotation edits behave predictably (next bullet).
- **Editing a Program's rotation:** changes take effect only for dates materialized **after** the edit — already-materialized future dates (already real `WorkoutSession` rows, per above) keep whatever they were given, consistent with how this app never silently rewrites existing data elsewhere (Copy's overwrite confirmation, archiving instead of deleting, etc.). To change an already-materialized date, Jeff edits or copies over that specific day directly, same as any other day.
- **Pausing/switching/ending a Program:** stops future materialization going forward, but never deletes or touches dates already materialized — those remain as real, independent days. Switching to a different Program does not retroactively clear or overwrite dates the previous Program already generated; Jeff can manually Edit or Copy over them if he wants the new Program's structure to take over sooner.
- **A Program is not required.** Every workflow already specified (Daily Workouts, Copy, Edit, logging, Progress) works identically whether a Program is active or not — a day with no Program and no manual definition simply shows the existing empty state (Section 3.7).

## 4. Data Model (high-level)

- **Exercise**: id, name, equipment[], muscle_group[] (optional), type (optional), **metric_type** (weight | bodyweight | time — see 3.1), **format** (straight_sets | amrap, default straight_sets — see 3.1), **default_rest_seconds** (optional), **default_sets** (optional — Straight Sets only; does not apply to AMRAP at all, not even as a default of 1 — omitted from the form entirely when Format is AMRAP), **default_reps** (optional — meaning varies by format: sets' reps for Straight Sets, or reps-per-round for AMRAP), **default_weight** (optional — default target weight for Weight-type, or default added/assisted modifier for Bodyweight-type), **default_duration** (optional — default target time in seconds, for Time-type), **default_time_cap_seconds** (optional — AMRAP only), notes, is_custom (bool), is_archived (bool) — archiving (Section 3.1) instead of hard-deleting keeps historical `PlannedExercise`/`LoggedSet` rows intact and readable even after Jeff removes an exercise from active use.
- **Equipment**: id, name — a plain user-extensible list, not a fixed enum; Jeff can insert a new row any time while adding/editing an exercise (kettlebell, dumbbell, barbell, bench, bodyweight, etc. are just the pre-seeded starting rows, not a hard limit).
- **WorkoutSession**: id, date, status (in-progress/completed), **name** (optional — e.g. "Cindy," or "Upper Day A"; lets a day's workout be identified/remembered as a named thing, not just a list of exercises), **notes** (optional free text at the whole-workout level — where a true multi-exercise circuit's combined score, per 3.2, gets captured). One `WorkoutSession` per calendar date that has a defined and/or logged workout. The Day Record for a given date is resolved by checking for a WorkoutSession on that date; no other date has any bearing on it.
- **PlannedExercise**: id, workout_session_id, exercise_id, order, **format** (pre-filled from the `Exercise`'s format, editable per day — e.g. running a normally-Straight-Sets exercise as a one-off AMRAP), **target_sets** (Straight Sets only — null/unused when format is AMRAP, consistent with Sets not applying to AMRAP anywhere in the app; see 3.1/3.4), target_reps, target_weight (optional), target_duration (optional), **time_cap_seconds** (optional — AMRAP), **rest_seconds**. All target/default-sourced fields are pre-filled from the corresponding `Exercise` defaults when the exercise is added to a day (Section 3.4), and are each freely editable per day afterward without changing the library default. Holds a session's exercise structure/plan — the list of exercises, their order, and targets — independent of any logged performance. This is what gets created when Jeff defines a day's workout, what gets edited per 3.4, and what a copy operation duplicates into a new session (with zero `LoggedSet` rows), producing the "same structure, blank values" result.
- **LoggedSet**: id, workout_session_id, exercise_id, set_number, reps, weight (optional), duration (optional), effort (optional — the Easy/Mod/Hard/Max scale shown in the logging UI), notes, timestamp. Reused across formats with different meaning per row: a normal set (Straight Sets) or one completed round (AMRAP — `set_number` doubles as round number).
- **PersonalRecord**: derived/computed from `LoggedSet`/`PlannedExercise` history (not necessarily its own table — can be a query), per exercise — computed relative to whichever metric type and format the exercise uses (heaviest weight, best time, or most rounds, per Section 3.6).
- **BodyWeightEntry** *(new — Section 3.8)*: id, weight, logged_at (date/time — defaults to now, editable), notes (optional). Not linked to `WorkoutSession` — logged independently, any day, any number of times per day.
- **UserSettings** *(new — Section 3.8)*: a small single-row settings concept (fits naturally alongside the single-account auth model in Section 5) holding, for now, just `goal_weight` (optional). Likely where future single-user preferences would live too, without needing a new table per setting.
- **WorkoutTemplate** *(new — Section 3.9)*: id, name, notes (optional). A reusable workout definition, not tied to a date.
- **TemplateExercise** *(new — Section 3.9)*: id, workout_template_id, exercise_id, order, format, target_sets, target_reps, target_weight (optional), target_duration (optional), time_cap_seconds (optional), rest_seconds. Same shape as `PlannedExercise`, minus the link to a specific date — this is intentional: materializing a Program day is just copying a `WorkoutTemplate`'s `TemplateExercise` rows into a new `WorkoutSession`'s `PlannedExercise` rows, the same structure-only duplication Copy (3.3) already does between two dates.
- **Program** *(new — Section 3.9)*: id, name, description (optional), is_active (bool — only one `Program` may be true at a time), start_date (when it was activated, for reference).
- **ProgramDay** *(new — Section 3.9)*: id, program_id, day_of_week (Mon–Sun), workout_template_id (nullable — null means rest day). One row per weekday per Program, defining the rotation.

*(An earlier draft removed Program/WorkoutTemplate entities as out of scope; Section 3.9 brings them back, exactly as an optional layer that generates/pre-fills `WorkoutSession`/`PlannedExercise` rows per the original plan, without requiring any change to the core Daily Workout model above.)*

Units: **pounds (lbs)** throughout.

## 5. Tech Stack & Architecture

Constraint: **must run entirely on free tiers, no ongoing cost.**

- **Frontend:** React + Vite, built and packaged as a **PWA** (installable to Android home screen via "Add to Home Screen", app-like full-screen experience, app icon).
- **Backend / Database:** Supabase (free tier) — Postgres database for all data above, accessed via Supabase's JS client directly from the frontend (no separate backend server needed).
- **Auth:** Basic login via Supabase Auth, with a single hardcoded account (Jeff's email/password) — no public sign-up, no multi-user support, just a real login screen gating the app. Supabase Row Level Security (RLS) policies restrict all tables to that one authenticated user, so the anon key alone is no longer enough to read/write data the way it would be with no auth. This is intentionally lightweight (no password reset flows, no email verification requirements needed for a single self-managed account) but is a meaningful step up from an unlisted URL — a stranger who found the link would hit a login wall, not the data.
- **Forgotten password — decided approach:** no in-app recovery flow. If the password is forgotten, Jeff resets it manually from the Supabase dashboard (Auth panel → update the user's password directly) — a rare, self-service fallback, not a feature to build. The real safety net is keeping the password saved in a password manager so this scenario stays rare in practice. This is a deliberate choice, not an oversight — building a "Forgot password" flow (which would need email/SMTP configured) was judged not worth the setup cost for a single-user app.
- **Hosting:** Vercel (free tier) — auto-deploys from a Git repo, gives an HTTPS URL that can be installed to the Android home screen.
- **Offline support:** Not required for v1 launch ("nice to have"). Design the data layer so offline caching (via service worker + local queue synced to Supabase on reconnect) can be added later without a rearchitecture — but don't build it now.
- **Charts:** A lightweight charting library (e.g. Recharts) for the progress views.

## 6. Non-Functional Requirements

- Mobile-first responsive design; primary breakpoint is a single Android phone screen, portrait orientation.
- Fast load and snappy interaction — this is used mid-workout, not browsed leisurely.
- Minimal data entry friction: numeric keypads for weight/reps, large touch targets, avoid unnecessary confirmation dialogs.
- Installable as a PWA (manifest.json, app icon, theme color, standalone display mode).
- **Persistent bottom navigation (rev. 23) — hard requirement, every screen, no exceptions.** The bottom nav (Today / Library / Progress) stays visible and fixed on *every* screen: Home, Library, Manage Library / Add-Edit Exercise, Progress and its detail views, Body Weight, Day Record, the day builder / edit-a-day screen, in-workout logging (Straight Sets *and* AMRAP), the workout-complete summary, Copy flows — all of them. No full screen may be "back-arrow only." An in-app back action can fail or feel ambiguous depending on how the user navigated in (e.g. a screen reached by *finishing a workout* rather than a normal page load); the bottom nav is the one always-reliable way home. Only true modal overlays — bottom sheets and confirmation dialogs — may temporarily cover the nav while open. A screen may still show its own back arrow / Done / Cancel affordance in addition, but never as the only exit. The one intentional exception is the pre-auth Login screen, which has no navigation destinations. This applies to every screen already built and every screen still to build.

## 7. Out of Scope for v1 (future enhancements)

- **N-day rotation Programs (not anchored to weekday)** — v1 Programs use day-of-week rotation only (Section 3.9); a rotation that ignores weekday (Day 1 → Day 2 → Day 3 → repeat, regardless of calendar day) is a possible future addition, not built now.
- **Multiple simultaneously active Programs** — only one Program can be active at a time in v1 (Section 3.9).
- **Grouped multi-exercise circuits sharing one clock** — AMRAP is supported per individual exercise (Section 3.1), but linking several exercises under one shared timer/score (what a true "Cindy" actually is) is not — see the workaround in 3.2.
- **EMOM and For Time as dedicated formats** — intentionally not built; Jeff can represent both manually using Straight Sets instead (Section 3.1).
- Auto-progression / suggested weight increases.
- Full offline-first support with conflict resolution.
- Multi-user support, public sign-up, password reset flows, or other full-auth features (v1 auth is a single hardcoded account).
- Social features, sharing, or community programs.
- Video/GIF demonstrations per exercise.
- Push notifications / reminders (the calendar in 3.7 is a browsable record, not an alerting system).

## 8. Open Items to Carry Into UI/UX Design Phase

These are intentionally left open here and should be worked out in the next planning step (working with Claude Design):

- Visual style/tone (minimal & data-forward vs. bold & motivational, color palette, typography).
- Primary navigation pattern (bottom tab bar vs. hamburger, given one-handed phone use).
- Exact layout of the in-workout logging screen (this is the highest-stakes screen — used live, sweaty, one-handed).
- Layout of the full month calendar view and the Day Record screen states (logged / defined-preview / missed / empty).
- Chart style/density for progress views.
- Simple login screen styling (should be minimal — a single email/password form, not a full auth flow).
- "Copy previous week" and "Copy to" affordances (where they live on the Home/Calendar/day-record screens) and the visual treatment (modal vs. inline) of the overwrite-confirmation step.
- Visual treatment of the Edit affordance and the add/remove/adjust-target controls (3.4) — the interaction model is decided, the exact look is not yet.
- Layout of the "Manage Library" screen (3.1) — browsing/searching/filtering the library, the Add/Edit Exercise form, and how adding a new equipment tag is exposed inline within that form.
- How the Add/Edit Exercise form's default-value fields change based on the selected Format (3.1) — e.g. showing time cap for AMRAP, hiding Default Sets when it doesn't apply — without the form feeling like it's constantly reshuffling.
- The new AMRAP in-workout logging experience (3.5) — the countdown/round-logging UI — a real departure from the Straight Sets logging screen already designed.
- Layout of the Progress tab (3.6) — the exercise list landing view, and how the per-exercise detail view visually distinguishes its three chart modes (weight / bodyweight / time), especially making a "lower is better" time chart read intuitively.
- Layout of the Body Weight section (3.8) within Progress — the Exercises/Body Weight toggle, the log-entry form, goal weight display, and the Home screen's quick-log shortcut.
- Layout of the new Programs tab (3.9) — the WorkoutTemplate builder (reusing the day-workout-building UI), the day-of-week rotation editor, the Program list/activation UI, and how an active Program's status is surfaced (e.g. on Home) without cluttering it.

---

*This document is the source of truth for what Claude should build. Update it as decisions change; the UI/UX design conversation should reference this doc rather than duplicate it.*
