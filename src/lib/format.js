// Small formatting + date helpers. Dates are handled as local-time YYYY-MM-DD
// strings (the "date" column type) to avoid timezone drift on day boundaries.

export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DOW_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISODate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDays(iso, n) {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

// Monday-anchored week start for a given ISO date.
export function weekStart(iso) {
  const d = fromISODate(iso)
  const dow = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - dow)
  return toISODate(d)
}

export function weekDates(startIso) {
  return Array.from({ length: 7 }, (_, i) => addDays(startIso, i))
}

// e.g. "Monday, August 24"
export function longDate(iso) {
  const d = fromISODate(iso)
  const dowFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
  return `${dowFull}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

// e.g. "Aug 24"
export function shortDate(iso) {
  const d = fromISODate(iso)
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

export function relativeDayLabel(iso) {
  const t = todayISO()
  if (iso === t) return 'Today'
  if (iso === addDays(t, 1)) return 'Tomorrow'
  if (iso === addDays(t, -1)) return 'Yesterday'
  return DOW_MON_FIRST[(fromISODate(iso).getDay() + 6) % 7]
}

// seconds -> "m:ss"
export function mmss(total) {
  const t = Math.max(0, Math.round(total))
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// seconds -> compact rest label, e.g. "2 min", "45s"
export function restLabel(seconds) {
  if (!seconds) return null
  if (seconds % 60 === 0) return `${seconds / 60} min`
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export const EFFORTS = [
  { key: 'easy', label: 'Easy', color: '#5ecf9e' },
  { key: 'mod', label: 'Mod', color: '#e3c85c' },
  { key: 'hard', label: 'Hard', color: '#e39a5c' },
  { key: 'max', label: 'Max', color: '#e0625f' },
]

export function effortColor(key) {
  return EFFORTS.find((e) => e.key === key)?.color ?? 'var(--text-5)'
}

export function effortLabel(key) {
  return EFFORTS.find((e) => e.key === key)?.label ?? ''
}

// Format a logged primary metric value for a given metric type.
export function metricValueLabel(metricType, { weight, duration }) {
  if (metricType === 'time') return duration != null ? mmss(duration) : '—'
  if (metricType === 'bodyweight') {
    if (weight == null || weight === 0) return 'BW'
    return weight > 0 ? `BW +${weight}` : `BW −${Math.abs(weight)}`
  }
  return weight != null ? `${weight} lb` : '—'
}
