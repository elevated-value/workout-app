import { supabase } from './supabase.js'

const FALLBACK = { id: 1, goal_weight: null, weight_step: 5 }

// Single-row settings (§3.8). goal_weight for Body Weight; weight_step is the
// logging stepper increment.
export async function fetchSettings() {
  const { data, error } = await supabase.from('user_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data ?? FALLBACK
}

export async function updateSettings(patch) {
  const { error } = await supabase.from('user_settings').update(patch).eq('id', 1)
  if (error) throw error
}
