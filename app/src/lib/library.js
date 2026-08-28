// Data access for the Exercise Library + its equipment list (spec §3.1, §4).
// Thin wrappers over supabase-js; screens own their own loading / error state.

import { supabase } from './supabase.js'

export async function fetchExercises() {
  const { data, error } = await supabase.from('exercises').select('*').order('name')
  if (error) throw error
  return data
}

export async function fetchExercise(id) {
  const { data, error } = await supabase.from('exercises').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function fetchEquipment() {
  const { data, error } = await supabase.from('equipment').select('*').order('name')
  if (error) throw error
  return data
}

// Equipment is user-extensible (§3.1) — new tags come in from the Add/Edit form.
// Upsert-ignore keeps this safe to call with names that already exist.
export async function ensureEquipment(names) {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  if (!clean.length) return
  const { error } = await supabase
    .from('equipment')
    .upsert(clean.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true })
  if (error) throw error
}

export async function createExercise(payload) {
  const { data, error } = await supabase.from('exercises').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateExercise(id, payload) {
  const { data, error } = await supabase.from('exercises').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Soft delete only (§3.1) — archived exercises stay intact wherever they're
// already referenced (past logs, progress charts).
export async function setExerciseArchived(id, isArchived) {
  const { error } = await supabase.from('exercises').update({ is_archived: isArchived }).eq('id', id)
  if (error) throw error
}
