design the "Manage Library" screen for a mobile workout tracking app (Android PWA, dark theme) — the dedicated screen where exercises are browsed, searched, added, edited, and archived. This is separate from workout-building; it's a curation screen visited less frequently than the daily workout screens.

**Style:** Match the established system — near-black background (~#0A0A0C), elevated dark gray cards (~#18181B), electric blue (~#2E7DFF) primary accent, off-white primary text, mid-gray secondary text, bold condensed headline type, rounded-corner cards with pill-shaped tags — consistent with the workout screen, home screen, and progress screen already designed.

Design this as two views: **(A) the Library list view**, and **(B) the Add/Edit Exercise form**, since editing opens the same form pre-filled.

---

**(A) Library List View**

1. Header: "Exercise Library" title, a "+ Add Exercise" button (prominent, top-right or as a floating action button).

2. Search bar: filters the list by exercise name as Jeff types.

3. Filter chips: pill-shaped, horizontally scrollable, filtering by equipment (reuse the exact chip pattern from the progress screen's "All / Barbell / Dumbbells" filter) and, ideally, a way to also filter by muscle group — consider a secondary row of chips or a filter icon that opens a filter sheet if both won't fit cleanly.

4. Exercise list: each row shows the exercise name (bold), its equipment tag(s) as small pills, and a subtle metric-type indicator (e.g. a small icon or label distinguishing Weight / Bodyweight / Time exercises — your call on the cleanest way to show this without cluttering the row). Tapping a row opens it in the Edit Exercise form (view B, pre-filled). Custom (Jeff-added) exercises should be visually distinguishable from the pre-seeded starter library in some subtle way (e.g. a small "custom" tag or dot) — not a hard requirement, use judgment on whether it adds value or clutter.

5. Archived exercises are hidden from this main list by default — consider a small "Show Archived" toggle or link at the bottom of the screen for the rare case Jeff wants to find/unarchive one.

---

**(B) Add/Edit Exercise Form**

Presented as a full-screen view (pushed from the list, or a large bottom sheet — your call). Fields, top to bottom:

1. **Name** — text input, required.
2. **Metric Type** — a clear 3-way selector (segmented control or 3 selectable cards): **Weight** / **Bodyweight** / **Time**. This determines how the exercise will be logged later, so it should be presented as a meaningful choice, not a buried dropdown. Brief helper text under each option: "Weight — standard lifts logged in lbs," "Bodyweight — logged as BW ± added/assisted weight," "Time — logged as a duration (e.g. distance-based cardio like a 400m Run)."
3. **Equipment** — multi-select chips from the existing equipment list, PLUS a way to add a brand new equipment tag inline (e.g. a "+ New" chip that opens a small text input right there, no separate screen) — equipment isn't a fixed list, Jeff can extend it as he adds exercises.
4. **Muscle Group(s)** — multi-select chips (chest, back, shoulders, arms, legs, glutes, core, full body, etc.), marked optional — not every exercise needs one (e.g. a "400m Run" wouldn't).
5. **Type** — optional categorization (strength / cardio / mobility / etc.) for filtering purposes, distinct from Metric Type — keep visually secondary to Metric Type so the two aren't confused.
6. **Notes** — optional multi-line text field.

Bottom of form: a clear "Save" call-to-action. When editing an existing custom exercise, also show an "Archive" action (styled as a lower-emphasis/destructive-adjacent action, not competing with Save) — tapping it archives rather than hard-deletes, so it should read as "remove from active use," not "delete forever." Pre-seeded (non-custom) exercises should not show an Archive option in the same way — treat that as a permanent starter set (your judgment on whether to hide the action entirely or disable it with an explanation).

---

Design for a single Android phone screen, portrait orientation. This screen is used deliberately and unhurried (planning at a desk, not mid-workout), so it can afford slightly more information density and smaller touch targets than the in-gym logging screens — but should still feel like it belongs to the same app.
