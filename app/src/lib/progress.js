// Progress tracking (§3.6) — derives per-exercise history and PRs from logged
// sets. PersonalRecord is a computed thing, not a table (§4).

import { supabase } from './supabase.js'
import { mmss, metricValueLabel } from './format.js'

const SET_COLS =
  'id, exercise_id, set_number, reps, weight, duration, effort, is_partial, performed_at, workout_session_id, workout_sessions!inner(date)'

// Every logged set ever, newest exercise data attached — the Progress landing
// list groups these by exercise.
export async function fetchAllLoggedSets() {
  const { data, error } = await supabase
    .from('logged_sets')
    .select(
      `${SET_COLS}, exercise:exercises(id, name, equipment, muscle_groups, metric_type, format, is_archived)`,
    )
    .order('performed_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({ ...r, date: r.workout_sessions?.date }))
}

export async function fetchExerciseLog(exerciseId) {
  const { data: exercise, error: e1 } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single()
  if (e1) throw e1
  const { data, error } = await supabase
    .from('logged_sets')
    .select(SET_COLS)
    .eq('exercise_id', exerciseId)
    .order('performed_at', { ascending: true })
  if (error) throw error
  const sets = (data ?? []).map((r) => ({ ...r, date: r.workout_sessions?.date }))
  return { exercise, sets }
}

// Which chart/PR shape applies, layering format on top of metric type (§3.6).
export function progressMode(exercise, sets) {
  if (exercise.format === 'amrap') return 'amrap'
  if (exercise.metric_type === 'time') return 'time'
  if (exercise.metric_type === 'bodyweight') {
    return sets.some((s) => s.weight != null && s.weight !== 0) ? 'added' : 'reps'
  }
  return 'weight'
}

function groupSessions(sets) {
  const byKey = new Map()
  for (const s of sets) {
    if (!byKey.has(s.workout_session_id)) {
      byKey.set(s.workout_session_id, { date: s.date, sets: [] })
    }
    byKey.get(s.workout_session_id).sets.push(s)
  }
  return [...byKey.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// One data point per session, chronological.
export function buildSessions(exercise, sets) {
  const mode = progressMode(exercise, sets)
  const sessions = groupSessions(sets).map((g) => {
    if (mode === 'amrap') {
      const full = g.sets.filter((s) => !s.is_partial).length
      const partial = g.sets.find((s) => s.is_partial)?.reps ?? 0
      return { date: g.date, value: full, partial }
    }
    if (mode === 'time') {
      const t = g.sets.map((s) => s.duration).filter((d) => d != null)
      return { date: g.date, value: t.length ? Math.min(...t) : null }
    }
    const key = mode === 'weight' || mode === 'added' ? 'weight' : 'reps'
    return { date: g.date, value: Math.max(...g.sets.map((s) => s[key] ?? 0)) }
  })
  return { mode, sessions }
}

// PR = best across sessions: lowest for time, highest otherwise. AMRAP breaks
// ties on the trailing partial reps.
export function prValue(mode, sessions) {
  const pts = sessions.filter((s) => s.value != null)
  if (!pts.length) return null
  if (mode === 'time') return Math.min(...pts.map((s) => s.value))
  if (mode === 'amrap') {
    let best = pts[0]
    for (const s of pts) {
      if (s.value > best.value || (s.value === best.value && (s.partial ?? 0) > (best.partial ?? 0))) best = s
    }
    return best
  }
  return Math.max(...pts.map((s) => s.value))
}

export function prLabel(mode, pr) {
  if (pr == null) return '—'
  switch (mode) {
    case 'weight':
      return `${pr} lb`
    case 'reps':
      return `${pr} reps`
    case 'added':
      return metricValueLabel('bodyweight', { weight: pr })
    case 'time':
      return mmss(pr)
    case 'amrap':
      return pr.partial ? `${pr.value}+${pr.partial}` : `${pr.value} round${pr.value === 1 ? '' : 's'}`
    default:
      return '—'
  }
}

export const HEADLINE = {
  weight: 'Heaviest lifted',
  reps: 'Most reps at bodyweight',
  added: 'Heaviest added weight',
  time: 'Fastest time',
  amrap: 'Best score',
}

export const CHART_CAPTION = {
  weight: 'Top set per session.',
  reps: 'Best set per session.',
  added: 'Heaviest added weight per session.',
  time: 'Lower is faster — the line climbs as you improve.',
  amrap: 'Rounds completed per session.',
}

// Value label for one row of the recent-sets table.
export function setValueLabel(mode, s) {
  if (mode === 'amrap') return s.is_partial ? 'partial round' : `round ${s.set_number}`
  if (mode === 'time') return s.duration != null ? mmss(s.duration) : '—'
  if (mode === 'added') return metricValueLabel('bodyweight', { weight: s.weight })
  if (mode === 'reps') return 'BW'
  return s.weight != null ? `${s.weight} lb` : '—'
}
