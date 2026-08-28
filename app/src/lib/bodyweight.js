// Body weight tracking (§3.8). Entirely independent of workouts — logged any
// day, any number of times, never linked to a WorkoutSession.

import { supabase } from './supabase.js'

export async function fetchBodyWeight() {
  const { data, error } = await supabase
    .from('body_weight_entries')
    .select('*')
    .order('logged_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function logBodyWeight({ weight, logged_at, notes }) {
  const row = { weight, notes: notes?.trim() || null }
  if (logged_at) row.logged_at = logged_at
  const { data, error } = await supabase.from('body_weight_entries').insert(row).select().single()
  if (error) throw error
  return data
}

export async function deleteBodyWeightEntry(id) {
  const { error } = await supabase.from('body_weight_entries').delete().eq('id', id)
  if (error) throw error
}

// "YYYY-MM-DDTHH:mm" in local time — the value shape a datetime-local input wants.
export function nowLocalInput() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function fmtWhen(iso) {
  const d = new Date(iso)
  const midnight = (x) => {
    const c = new Date(x)
    c.setHours(0, 0, 0, 0)
    return c.getTime()
  }
  const today = midnight(new Date())
  const day =
    midnight(d) === today
      ? 'Today'
      : midnight(d) === today - 86400000
        ? 'Yesterday'
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${day}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}
