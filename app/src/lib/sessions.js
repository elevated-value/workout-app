// Data access for workout sessions + the Day Record (spec §3.2, §3.7, §4).
// A calendar date resolves to a record purely by looking for a session on it.

import { supabase } from './supabase.js'
import { addDays, todayISO } from './format.js'

export async function fetchSessionsInRange(startISO, endISO) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, date, status, name, notes, started_at, completed_at')
    .gte('date', startISO)
    .lte('date', endISO)
    .order('date')
  if (error) throw error
  return data ?? []
}

// { session_id: plannedExerciseCount } for the given sessions.
export async function fetchPlannedCounts(sessionIds) {
  if (!sessionIds.length) return {}
  const { data, error } = await supabase
    .from('planned_exercises')
    .select('workout_session_id')
    .in('workout_session_id', sessionIds)
  if (error) throw error
  const counts = {}
  for (const r of data) counts[r.workout_session_id] = (counts[r.workout_session_id] ?? 0) + 1
  return counts
}

// The four Day Record states (§3.7).
export function dayStatus(session, dateISO, today = todayISO()) {
  if (!session) return 'empty'
  if (session.status === 'completed' || session.status === 'in_progress') return 'logged'
  return dateISO < today ? 'missed' : 'scheduled'
}

// Consecutive completed workouts, walking back from today. Rest days (no session)
// don't break it; a past planned day that was never completed does. Today's
// not-yet-done plan is not counted as a miss.
export function computeStreak(sessions, today = todayISO()) {
  const byDate = {}
  for (const s of sessions) byDate[s.date] = s
  let streak = 0
  for (let i = 0; i < 120; i++) {
    const d = addDays(today, -i)
    const s = byDate[d]
    if (!s) continue
    if (s.status === 'completed') {
      streak++
      continue
    }
    if (d === today) continue
    break
  }
  return streak
}

// ── mutations — building / editing a day (§3.2, §3.4) ───────────────────────

export async function ensureSession(dateISO) {
  const { data: existing, error: e1 } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('date', dateISO)
    .maybeSingle()
  if (e1) throw e1
  if (existing) return existing
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ date: dateISO, status: 'planned' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSession(id, patch) {
  const { error } = await supabase.from('workout_sessions').update(patch).eq('id', id)
  if (error) throw error
}

// Move a session into logging (§3.5). Only stamps started_at the first time.
export async function startSession(session) {
  if (session.status !== 'planned') return session
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', session.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeSession(id) {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// The exercise fields every session/day query embeds. `notes` backs the
// tap-to-view-notes affordance on the Day Record and in-workout screens (§3.5).
const EXERCISE_EMBED = 'exercise:exercises(name, equipment, metric_type, notes)'

// One set (Straight Sets) or one round (AMRAP — set_number is the round number).
export async function logSet(row) {
  const { data, error } = await supabase
    .from('logged_sets')
    .insert(row)
    .select(`*, ${EXERCISE_EMBED}`)
    .single()
  if (error) throw error
  return data
}

export async function deleteLoggedSet(id) {
  const { error } = await supabase.from('logged_sets').delete().eq('id', id)
  if (error) throw error
}

// Most recent logged set for an exercise on any earlier date — the "last time"
// reference shown while logging (§3.5).
export async function fetchLastPerformance(exerciseId, beforeDateISO) {
  const { data, error } = await supabase
    .from('logged_sets')
    .select('reps, weight, duration, effort, performed_at, workout_sessions!inner(date)')
    .eq('exercise_id', exerciseId)
    .lt('workout_sessions.date', beforeDateISO)
    .order('performed_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

// Drop an empty planned session so it stops colouring the calendar.
export async function deleteSessionIfEmpty(id) {
  const [{ count: plannedCount }, { count: loggedCount }] = await Promise.all([
    supabase.from('planned_exercises').select('id', { count: 'exact', head: true }).eq('workout_session_id', id),
    supabase.from('logged_sets').select('id', { count: 'exact', head: true }).eq('workout_session_id', id),
  ])
  if ((plannedCount ?? 0) === 0 && (loggedCount ?? 0) === 0) {
    const { error } = await supabase.from('workout_sessions').delete().eq('id', id)
    if (error) throw error
    return true
  }
  return false
}

const PLANNED_SELECT = `*, ${EXERCISE_EMBED}`

// Add a library exercise to a day, pre-filling every target from its defaults
// (§3.4). AMRAP never gets target_sets.
export async function addPlannedExercise(sessionId, exercise, position) {
  const isAmrap = exercise.format === 'amrap'
  const row = {
    workout_session_id: sessionId,
    exercise_id: exercise.id,
    position,
    format: exercise.format,
    target_sets: isAmrap ? null : exercise.default_sets ?? 3,
    target_reps: exercise.default_reps ?? (isAmrap ? 5 : 8),
    target_weight: exercise.metric_type === 'time' ? null : exercise.default_weight ?? null,
    target_duration: exercise.metric_type === 'time' ? exercise.default_duration ?? null : null,
    time_cap_seconds: isAmrap ? exercise.default_time_cap_seconds ?? 600 : null,
    rest_seconds: exercise.default_rest_seconds ?? null,
  }
  const { data, error } = await supabase
    .from('planned_exercises')
    .insert(row)
    .select(PLANNED_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updatePlannedExercise(id, patch) {
  const { error } = await supabase.from('planned_exercises').update(patch).eq('id', id)
  if (error) throw error
}

export async function removePlannedExercise(id) {
  const { error } = await supabase.from('planned_exercises').delete().eq('id', id)
  if (error) throw error
}

// Swap the position values of two rows — backs the Move Up / Move Down controls
// (§3.4), which are used instead of drag-and-drop.
export async function swapPlannedPositions(a, b) {
  await Promise.all([
    updatePlannedExercise(a.id, { position: b.position }),
    updatePlannedExercise(b.id, { position: a.position }),
  ])
}

export async function fetchDay(dateISO) {
  const { data: session, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('date', dateISO)
    .maybeSingle()
  if (error) throw error
  if (!session) return { date: dateISO, session: null, planned: [], logged: [] }

  const [planned, logged] = await Promise.all([
    supabase
      .from('planned_exercises')
      .select(PLANNED_SELECT)
      .eq('workout_session_id', session.id)
      .order('position'),
    supabase
      .from('logged_sets')
      .select(`*, ${EXERCISE_EMBED}`)
      .eq('workout_session_id', session.id)
      .order('set_number'),
  ])
  if (planned.error) throw planned.error
  if (logged.error) throw logged.error
  return { date: dateISO, session, planned: planned.data ?? [], logged: logged.data ?? [] }
}
