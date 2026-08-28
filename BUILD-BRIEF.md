# Personal Workout App — Build Brief for Claude Code

This is the consolidated handoff package. Everything needed to build the v1 app lives in this folder. Read this file first — it explains what each other file is, what's finished vs. still pending design, and what order to build in.

## What this app is

A personal workout-tracking Android PWA for a single user (Jeff). React + Vite frontend, Supabase (Postgres + Auth) backend, hosted on Vercel, all on free tiers. Full functional and data-model spec is in `workout-app-instructions.md` — that file is the source of truth for *behavior*: what every screen does, how the data model works, what's in scope for v1 vs. deferred to Phase 2.

## File manifest

- **`workout-app-instructions.md`** — the full functional spec. Read this in full before writing any code. Section 0 defines the build order (v1 launch vs. Phase 2/Programs). Section 4 is the data model. Section 5 is the tech stack, auth approach, and the deliberate "no forgot-password flow" decision.
- **`design-brief.md`** — the *original* visual-direction doc written before any screens were designed in Claude Design (Ladder-inspired dark theme, placeholder electric-blue palette). **This has been superseded on specific colors — see "Visual system" below.** Still useful for the general tone/intent (dark, bold, equipment-based) and the "what we're NOT copying from Ladder" notes, but do not pull hex values from it.
- **`screens/`** — the actual designed screens, exported from Claude Design as `.dc.html` files, plus the design system bundle they depend on (`_ds/`) and `android-frame.jsx`. These are real, styled HTML/CSS — pull markup, classes, and design tokens directly from them rather than re-guessing the visuals from prose.
- **`design-prompts-pending/`** — text prompts for the screens that have **not** been designed in Claude Design yet (see "Screen status" below). Build these from the prompt text + the relevant section of `workout-app-instructions.md`, reusing the design system in `screens/_ds/` (same tokens, same component classes) so they land visually consistent with the finished screens even though there's no exported reference for them yet.

## Visual system — important correction

`design-brief.md` specified a placeholder palette (near-black `#0A0A0C` background, electric blue `#2E7DFF` accent). **That is not what got built.** The actual screens use a different, deliberately-chosen design system called **Nocturne**:

- Background `#161826` (a near-neutral blue-grey, not near-black)
- Text `#e9e9ed`
- Single accent `#9184d9` (a blurple/violet — not electric blue), used as an outline/line/glow, never as a flood fill
- Inter typeface, 8px radii, outlined (not filled) primary buttons, Phosphor icons

The full token set, component classes, and usage rules are documented in `screens/_ds/.../readme.md` and `styles.css` — **treat that as the real design system**, and treat `design-brief.md`'s color values as superseded. Everything you build — including the not-yet-designed screens in `design-prompts-pending/` — should pull from the Nocturne tokens/components, not the original brief's palette, so the whole app reads as one consistent system.

## Screen status

| Screen | Status | Source |
|---|---|---|
| Login | ✅ Designed | `screens/Login.dc.html` |
| Home | ✅ Designed | `screens/Workout Home.dc.html` |
| Day Record | ✅ Designed | `screens/Day Record.dc.html` |
| Workout Logging (Straight Sets + AMRAP + Edit) | ✅ Designed | `screens/Workout Logging.dc.html`, `screens/Workout App.dc.html` |
| Manage Library | ✅ Built from prompt (no Claude Design export) | `design-prompts-pending/design-prompt-manage-library.md` + instructions.md §3.1 |
| Progress tab | ⏳ Not yet designed | `design-prompts-pending/design-prompt-progress-tab.md` + instructions.md §3.6 |
| Body Weight tracking | ⏳ Not yet designed | `design-prompts-pending/design-prompt-body-weight.md` + instructions.md §3.8 |
| Programs (Phase 2) | ⏳ Not yet designed | `design-prompts-pending/design-prompt-programs-tab.md` + instructions.md §3.9 |

For the four ⏳ screens, build the UI from the prompt file's description and the linked spec section, using the Nocturne design system's existing components (cards, buttons, tags, forms, nav) rather than inventing new patterns — the goal is that these screens feel indistinguishable from the ones that came out of Claude Design.

## Build order

Follow `workout-app-instructions.md` §0 exactly:

1. **v1 launch** — everything except Programs: Exercise Library (Manage Library), Daily Workouts, Copy & Duplicate, Edit a Day's Workout, Workout Logging (Straight Sets + AMRAP), Progress Tracking, Body Weight Tracking, Home Screen/Day Records, Login/auth, Supabase + Vercel setup.
2. **Phase 2** — Programs (§3.9) only, once v1 is live and in daily use.

Within v1, a sensible build sequence given what's already designed: set up the Supabase schema and auth first (§4, §5) → Login → Manage Library (needed before any workout can reference an exercise) → Home + Day Record → Workout Logging (Straight Sets + AMRAP, Edit) → Copy/Duplicate → Progress + Body Weight. Adjust as needed, but data model and auth should come before any screen that depends on them.

## A few things to keep front-of-mind while building

- **Persistent bottom nav on every screen (instructions.md §6, rev. 23)** — Today / Library / Progress stays fixed and visible on *every* screen with no exceptions (Day Record, day builder, in-workout logging, workout-complete summary, Copy flows, everything). Only bottom sheets and confirm dialogs may temporarily cover it. A back arrow is never a screen's only way out. Login is the one exception (pre-auth, no destinations).
- **AMRAP never has a Sets concept** — not a field, not a default, not in the data model for that format. See instructions.md §3.1, §3.4, and §4 (all three were explicitly corrected on this).
- **No timer auto-starts on screen entry** — every timer (rest, AMRAP) requires an explicit Start action and has a visible Pause/Resume control. See §3.5.
- **Soft-delete/archive**, not hard-delete, for exercises — see §3.1.
- **Forgotten password has no in-app recovery flow** — manual reset via the Supabase dashboard is the intended fallback. See §5.
- Copy operations (Copy Previous Week, Copy To) are **structure-only** — no logged/target weights carried forward — and **overwrite with confirmation** if the destination already has a workout. See §3.3.

---

*This brief was assembled from the full design/planning conversation. If anything here conflicts with `workout-app-instructions.md`, the instructions file wins — this document is a map to the other files, not a replacement for reading them.*
