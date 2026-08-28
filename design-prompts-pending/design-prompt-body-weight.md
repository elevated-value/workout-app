design the "Body Weight Tracking" feature for a mobile workout tracking app (Android PWA, dark theme). This lives inside the existing Progress tab as its own section, separate from exercise progress, plus a small quick-log shortcut on the Home screen. Design all three pieces below.

**Style:** Match the established system — near-black background (~#0A0A0C), elevated dark gray cards (~#18181B), electric blue (~#2E7DFF) primary accent, off-white primary text, mid-gray secondary text, bold condensed headline type, rounded-corner cards with pill-shaped tags — consistent with the workout, home, library, and progress screens already designed. Reuse the bold-headline-stat-above-chart pattern already established for the exercise progress detail view.

---

**1. Progress tab — Exercises / Body Weight toggle:** At the top of the Progress tab (above the existing exercise list/search), add a simple two-way toggle or segmented control: "Exercises" | "Body Weight." Selecting "Body Weight" swaps the content below to the Body Weight section (view 2). This should feel like switching sections within the same screen, not navigating to a different part of the app.

**2. Body Weight section:**
- A large headline stat at top showing current/most recent logged weight (e.g. "182 lbs").
- Directly below or alongside it, goal weight progress: the target weight Jeff set, and how far he has to go (e.g. "Goal: 175 lbs · 7 lbs to go"), styled as a supporting stat, not competing with the current-weight headline. Include a way to edit the goal weight (e.g. tapping it opens a simple numeric input).
- Below that, a trend chart of logged weight over time — same "recent window by default" pattern as the exercise charts (last 10–15 entries, expandable to full history).
- Below the chart, a simple list of recent entries (date/time, weight, optional notes if present).
- A clear "+ Log Weight" action (button or floating action button) opening the log-entry form (view 3).

**3. Log Weight entry form:** A compact form/bottom sheet — weight input (numeric, large and easy to tap given this may be logged one-handed), date/time (defaults to now, editable for logging a past weigh-in), optional notes field. Clear "Save" action. Keep this fast to fill out — it should feel like a 5-second task, consistent with this app's general "minimal data entry friction" principle.

**4. Home screen quick-log shortcut:** A small, low-emphasis addition to the existing Home screen — near the streak indicator is a reasonable spot, but use your judgment on what fits without competing with the featured workout card, which stays the dominant element. Tapping it should open the same lightweight log-entry form as view 3 (weight + date, defaulting to now) without navigating away from Home. This is a convenience shortcut, not a full Body Weight view — no chart or goal display here, just the fast path to log a number.

---

Design for a single Android phone screen, portrait orientation. The Body Weight section is browsed casually/reflectively; the quick-log shortcut and entry form should be fast and thumb-friendly, since logging weight is a quick daily habit, not a considered task.
