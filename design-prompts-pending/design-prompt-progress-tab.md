design the "Progress" tab for a mobile workout tracking app (Android PWA, dark theme) — reachable from the bottom navigation. This screen is exercise-focused: browse your exercises, tap into one, see its trend and personal record. No separate chronological workout-history list here (that's handled elsewhere, by the home calendar).

**Style:** Match the established system — near-black background (~#0A0A0C), elevated dark gray cards (~#18181B), electric blue (~#2E7DFF) primary accent, off-white primary text, mid-gray secondary text, bold condensed headline type, rounded-corner cards with pill-shaped tags — consistent with the workout, home, and library screens already designed. Reuse the equipment filter chip pattern already established (the "All / Barbell / Dumbbells" pills) and the bold-headline-stat-above-chart pattern from the original reference screenshot.

Design this as two views: **(A) the Progress landing list**, and **(B) the per-exercise detail view**, which needs three visual variants depending on the exercise's metric type.

---

**(A) Progress Landing List**

1. Header: "Progress" title.
2. Search bar: filters the exercise list by name as Jeff types — this needs to feel fast, it's the primary way he'll find an exercise here.
3. Filter chips: equipment and/or muscle group, same pattern as the Library screen.
4. Exercise list: each row shows the exercise name, its equipment tag, and a small at-a-glance stat appropriate to its metric type (e.g. current PR or most recent value) so there's some useful signal before even tapping in — e.g. "165 lbs" for a Weight exercise, "12 reps" for Bodyweight, "1:42" for a Time exercise. Tapping a row opens view (B).
5. Only exercises Jeff has actually logged at least once should appear here (an exercise sitting unused in the Library with no history has nothing to show yet) — decide the best way to communicate that if the list is ever empty (e.g. "Log a workout to start tracking progress").

---

**(B) Per-Exercise Detail View — three variants**

Shared layout: back arrow + exercise name in the header, a large bold headline stat at top (the current PR), a chart below it showing the most recent 10–15 sessions, and a compact table below the chart listing recent sets (date, metric value, reps, effort).

Design all three variants:

1. **Weight variant** (e.g. "Reverse Grip Bent Over Row," matching the original reference screenshot): headline stat = heaviest weight lifted (e.g. "165 lbs"), bar chart of weight over recent sessions, table columns: date, weight, reps, effort.

2. **Bodyweight variant** (e.g. "Pull-Up"): headline stat = most reps at bodyweight, or heaviest added weight if weighted variations were logged (e.g. "12 reps" or "BW +25"), chart of reps (or added weight) over recent sessions, table columns: date, weight (BW ± modifier), reps, effort.

3. **Time variant** (e.g. "400m Run"): headline stat = fastest time (e.g. "1:38"), chart of time over recent sessions — this one needs special care: a lower number is an improvement, so the chart should read as "down is good" as intuitively as an upward bar chart reads as "up is good" for the other two variants. Consider an inverted y-axis, a downward-trending line styled positively (e.g. green/accent-colored when trending faster), or explicit "faster" labeling — use your best visual judgment, but don't let it accidentally read as decline. Table columns: date, time, reps, effort.

---

Design for a single Android phone screen, portrait orientation. This screen is browsed casually/reflectively, not under time pressure mid-workout, so it can afford a bit more visual richness than the logging screen — but should still feel like the same app.
