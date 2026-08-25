# Personal Workout App — Design Brief

**Purpose of this doc:** translate the visual style of the reference screenshots (Ladder app — `ladder-ref-1-home.png`, `ladder-ref-2-logging.png`, `ladder-ref-3-progress.png`, saved alongside this file) into concrete rules Claude Design can apply to our specific screens. Read this together with `workout-app-instructions.md`, which defines *what* the app does — this doc defines *how it should look and feel*.

Last updated: 2026-08-25

---

## 1. Overall Direction

Borrow Ladder's dark, bold, data-forward gym aesthetic — but with our own accent color rather than copying its palette outright. The feel should be: premium, high-contrast, confident, built for glanceable use in a dim gym with sweaty hands, not a soft/friendly wellness-app look.

## 2. Color Palette

| Role | Value | Notes |
|---|---|---|
| Background | Near-black, e.g. `#0A0A0C` | Matches reference — not pure `#000`, slightly warm/cool per final pick |
| Surface / card | Dark elevated gray, e.g. `#18181B` | Cards sit one step lighter than background |
| Primary accent | **Electric blue**, e.g. `#2E7DFF` | Used for CTAs, active states, primary data series, "priority" badges, checkmarks |
| Secondary accent | Violet, e.g. `#8B5CF6` | Used only when a second series/category needs to be distinguished from blue (e.g. equipment filter chips, secondary chart line) |
| Text — primary | Off-white, e.g. `#F5F5F5` | Headlines, key numbers |
| Text — secondary | Mid gray, e.g. `#9CA3AF` | Labels, timestamps, supporting text |
| Effort/intensity scale | Red → Orange → Yellow → Green | Kept from reference (screenshot 2) — universal low-to-high intensity convention, not Ladder-specific branding. Used on the set-by-set effort column during logging. |

Exact hex values are a starting point — Claude Design can refine within this direction.

## 3. Typography

- **Headlines / workout & exercise names:** Bold, condensed, all-caps or near-caps sans-serif (echoing "STRENGTH X PILATES" in screenshot 1). High visual weight — this is what gets read from arm's length.
- **Body / labels:** Clean, regular-weight sans-serif, generous letter spacing on small caption text (e.g. "PRESS & CURL" section headers).
- **Numeric data (weights, reps, stats):** Slightly larger and bolder than surrounding body text — numbers should be the most scannable thing on any given screen, per screenshot 3's "165 lbs" treatment.

## 4. Layout & Component Patterns (borrowed from references)

- **Card-based composition:** Rounded-corner cards as the primary content unit, often with a full-bleed photo/background and gradient overlay for headline content (used for the featured workout card).
- **Weekly calendar strip:** Horizontal Mon–Sun strip with a checkmark or progress indicator per completed day, current day highlighted. Sits at the top of the home screen.
- **Chip/pill filters:** Rounded pill-shaped toggle buttons for filtering (e.g. "All / Barbell / Dumbbells" in screenshot 3) — active state filled with accent color, inactive state outlined/muted.
- **Set-by-set data table:** Compact row-based table during logging — columns for set #, rest time, effort %, reps, previous performance — dense but legible, effort column color-coded per the intensity scale above.
- **Bottom-sheet / overlay detail panel:** Tapping a movement brings up a detail view (screenshot 2) with quick-action buttons (History, Notes, Start Here) rather than a full page navigation — keeps context of the workout list underneath.
- **Bar charts with a bold headline stat:** Progress screens lead with one large number (e.g. estimated 1RM) above a bar chart of recent history, not the chart first.
- **Percentile / progress bars:** Thin horizontal bars comparing a stat to a benchmark (screenshot 3's "team percentile" rows) — reusable pattern for showing PR proximity or volume trends.

## 5. Screen-by-Screen Mapping

### 5.1 Home / "Today's Workout" (→ Section 3.4 of instructions, extended)
- Weekly calendar strip at top with completion checkmarks/streak indicator (new addition to scope — a lightweight gamification layer, no points/rewards system needed, just visual streak tracking).
- Below it, a large featured card for today's workout: photo/illustration background, workout name in bold headline type, duration + workout type subtitle, a "Start" affordance.
- If no template is scheduled, this card becomes the entry point to "build a workout" (on-the-fly flow).

### 5.2 Workout Logging Screen (→ Section 3.4 — the highest-stakes screen)
- Header shows total workout time / active time.
- Exercises grouped into labeled sections (e.g. "Press & Curl," "Cool Down") matching workout structure.
- Each exercise row shows name, equipment tag, target reps scheme, and rest interval at a glance.
- Tapping an exercise opens the detail overlay: set-by-set table (set #, rest, effort %, reps, previous weight/reps), plus History/Notes/Start Here actions.
- Effort % color coding applied per the intensity scale.

### 5.3 Progress / Exercise History Screen (→ Section 3.5)
- Equipment filter chips at top (relevant if an exercise can be done with multiple equipment variants).
- Large headline stat (e.g. estimated 1RM or current PR) above a bar chart of recent sessions.
- Below the chart, a compact data table of recent sets (date, equipment, rest, effort).
- Secondary accent (violet) available if a second data series needs distinguishing from the primary blue.

### 5.4 Program / Overview Stats (optional stretch, not in v1 scope per instructions)
- Percentile-bar pattern (screenshot 3) reserved as a future option if we ever add benchmark/comparison stats — not required for v1 but worth Claude Design being aware the pattern exists in case it's a natural extension.

## 6. What We're Intentionally NOT Copying

- Ladder's specific neon yellow-green + purple palette — we're using electric blue as our primary identity color instead.
- The social/community layer implied by "completions" counts and team percentiles tied to other users — our app is single-user; any percentile/benchmark bar (if used later) would compare against the user's own past performance, not other people.
- The points/rewards badge system in the top nav (Rewards, 20+ points) — out of scope per the build instructions.

---

*Hand this file to Claude Design together with the three reference screenshots saved alongside it. This brief defines the visual system; `workout-app-instructions.md` defines the feature scope — Claude Design should treat both as inputs.*
