design the "Programs" tab for a mobile workout tracking app (Android PWA, dark theme) — a new fourth item in the bottom navigation, alongside Home, Library, and Progress. This tab lets Jeff build reusable workout templates and schedule them into a day-of-week rotation. It's entirely optional — everything else in the app already works without it — so it should feel like a helpful layer, not a requirement.

**Style:** Match the established system — near-black background (~#0A0A0C), elevated dark gray cards (~#18181B), electric blue (~#2E7DFF) primary accent, off-white primary text, mid-gray secondary text, bold condensed headline type, rounded-corner cards with pill-shaped tags — consistent with the workout, home, library, and progress screens already designed.

Design this as three views: **(A) Programs landing list**, **(B) the WorkoutTemplate builder**, and **(C) the Program editor (rotation view)**.

---

**(A) Programs Landing List**

1. Header: "Programs" title, a "+ New Program" action.
2. If a Program is active, show it clearly at the top — its name, a visible "Active" indicator (electric blue), and its 7-day rotation at a glance (e.g. a compact Mon–Sun row showing each day's assigned template name or "Rest").
3. Below that, a list of any other (inactive) Programs Jeff has created, each with a name and a way to activate it (tapping activate on one automatically deactivates the current active Program — consider whether that warrants a small confirmation, given it changes future scheduling, or if it's low-stakes enough to just do immediately).
4. A separate section (or a tab/toggle within this screen) for **WorkoutTemplates** — the reusable building blocks, independent of any Program: a list of templates Jeff has created (e.g. "Upper Day A," "Lower Day B," "Rest Day"), with a "+ New Template" action, since templates can be created outside of building a Program too.

---

**(B) WorkoutTemplate Builder**

This should closely mirror the existing day-workout-building experience (the "Upper Day A" logging/preview screen already designed) — same exercise list style, same Add Exercise flow (equipment-filtered library picker), same per-exercise target sets/reps/weight/rest and Format (Straight Sets/AMRAP) controls from the Edit Workout interaction already designed. The key difference: a **Name** field at the top (required, e.g. "Upper Day A"), and no date/calendar association anywhere on this screen — it's explicitly not tied to a day. Reuse as much of the existing exercise-list-with-edit-controls visual pattern as possible rather than inventing a new layout.

---

**(C) Program Editor (Rotation View)**

1. Header: Program name (editable), with the "Active"/"Inactive" state visible and a way to toggle it.
2. A clear Mon–Sun weekday layout — each day is a row or card showing its currently assigned WorkoutTemplate (or "Rest Day" if none). Tapping a day opens a picker to assign a different WorkoutTemplate (or set it to Rest) from the list built in view (B).
3. This should read as a simple weekly grid at a glance — the whole point is Jeff can look at this screen and immediately understand "what happens on which day," so favor clarity and scannability over density here.

---

Design for a single Android phone screen, portrait orientation. This tab is used deliberately and unhurried (planning/setup, not mid-workout), so it can afford more information density than the in-gym logging screens, but should still feel like the same app as everything else.
