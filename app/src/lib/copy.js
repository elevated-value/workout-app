// Copy & Duplicate workouts (§3.3). Structure only — exercises, their order,
// target sets/reps, format, time cap, rest. Never logged sets, never weights or
// durations: "last time" (§3.5) surfaces prior performance once the copy is
// logged, so the copy itself is a fresh, blank version. Both copy actions
// overwrite the destination; callers confirm first when it has content.

import { supabase } from './supabase.js'
import { weekDates } from './format.js'
import { fetchDay, ensureSession } from './sessions.js'

const PLANNED_SELECT = '*, exercise:exercises(name, equipment, metric_type, notes)'

function structureRow(pe, destSessionId, position) {
  return {
    workout_session_id: destSessionId,
    exercise_id: pe.exercise_id,
    position,
    format: pe.format,
    target_sets: pe.target_sets,
    target_reps: pe.target_reps,
    target_weight: null,
    target_duration: null,
    time_cap_seconds: pe.time_cap_seconds,
    rest_seconds: pe.rest_seconds,
  }
}

// Does a date hold anything a copy would overwrite?
export async function dayContent(dateISO) {
  const day = await fetchDay(dateISO)
  return {
    hasPlanned: day.planned.length > 0,
    hasLogged: day.logged.length > 0,
    hasContent: day.planned.length > 0 || day.logged.length > 0,
  }
}

export async function weekContent(weekStartISO) {
  const days = weekDates(weekStartISO)
  const results = await Promise.all(days.map(dayContent))
  return days.map((date, i) => ({ date, ...results[i] }))
}

// Replace whatever is on destDate with a fresh copy of sourceDate's structure.
export async function copyDayTo(sourceDate, destDate) {
  const src = await fetchDay(sourceDate)
  if (!src.session || src.planned.length === 0) {
    throw new Error('That day has no workout to copy.')
  }

  const dest = await ensureSession(destDate)

  // Clear the destination (keep the session row, reuse it).
  const del1 = await supabase.from('logged_sets').delete().eq('workout_session_id', dest.id)
  if (del1.error) throw del1.error
  const del2 = await supabase.from('planned_exercises').delete().eq('workout_session_id', dest.id)
  if (del2.error) throw del2.error
  const upd = await supabase
    .from('workout_sessions')
    .update({
      status: 'planned',
      started_at: null,
      completed_at: null,
      name: src.session.name ?? null,
    })
    .eq('id', dest.id)
  if (upd.error) throw upd.error

  const rows = src.planned
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((pe, i) => structureRow(pe, dest.id, i))
  const { data, error } = await supabase.from('planned_exercises').insert(rows).select(PLANNED_SELECT)
  if (error) throw error
  return data
}

// Delete a date's session entirely — turns it back into a rest day.
async function clearDay(dateISO) {
  const day = await fetchDay(dateISO)
  if (!day.session) return
  const { error } = await supabase.from('workout_sessions').delete().eq('id', day.session.id)
  if (error) throw error
}

// Copy a full Mon–Sun week's structure into another week, day for day.
// A source day with a workout copies its structure; a source rest day makes the
// matching destination day a rest day too, clearing whatever it held (§3.3).
export async function copyWeekTo(sourceWeekStart, destWeekStart) {
  const srcDays = weekDates(sourceWeekStart)
  const destDays = weekDates(destWeekStart)
  for (let i = 0; i < 7; i++) {
    const src = await fetchDay(srcDays[i])
    if (src.session && src.planned.length > 0) {
      await copyDayTo(srcDays[i], destDays[i])
    } else {
      await clearDay(destDays[i])
    }
  }
}
