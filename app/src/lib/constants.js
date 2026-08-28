// Shared vocab for the Exercise Library (spec §3.1). Kept here so the form, the
// list filters, and later the day builder all pull from one place.

export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'full body',
]

// Optional categorisation, distinct from metric type — used for filtering only.
export const EXERCISE_TYPES = ['strength', 'cardio', 'mobility']

// Metric type decides what the "primary metric" slot means when logging (§3.1).
export const METRIC_TYPES = [
  { key: 'weight', label: 'Weight', help: 'Standard lifts logged in lbs.' },
  { key: 'bodyweight', label: 'Bodyweight', help: 'Logged as BW ± added / assisted weight.' },
  { key: 'time', label: 'Time', help: 'Logged as a duration — e.g. a 400m Run.' },
]

// Format decides how the work is structured and scored (§3.1). AMRAP never has
// a Sets concept — not a field, not a default, absent everywhere.
export const FORMATS = [
  { key: 'straight_sets', label: 'Straight Sets', help: 'A fixed number of sets, each logged on its own.' },
  { key: 'amrap', label: 'AMRAP', help: 'As many rounds as possible within a time cap.' },
]

export function metricLabel(key) {
  return METRIC_TYPES.find((m) => m.key === key)?.label ?? key
}

// Label for the default primary-metric field, which varies by metric type (§3.1).
export function primaryDefaultLabel(metricType) {
  if (metricType === 'time') return 'Default Time'
  if (metricType === 'bodyweight') return 'Default Added Weight'
  return 'Default Weight'
}
