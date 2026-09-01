import { useState } from 'react'
import { NotePencil } from '@phosphor-icons/react'
import { Sheet, Stepper } from './ui.jsx'
import { EFFORTS, metricValueLabel, mmss } from '../lib/format.js'

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

// Correcting an already-logged set/round (§3.4, rev. 27) — a direct fix, not a
// separate limited UI: the same primary/reps/effort/notes controls used to
// log it originally, pre-filled, saved in place with no confirmation. Opens
// from a set row during active logging (stacked over the exercise sheet) or
// from a completed Day Record, so it carries its own copy of the exercise
// (embedded on the logged_sets row) rather than depending on screen state.
// `format` should be the format the set was actually logged under (a planned
// row's frozen format, or the format resolved alongside it in a Day Record
// list) — not just the exercise's *current* library format, which may have
// been changed since. Falls back to the exercise's format when the caller
// has no better source (e.g. an exercise logged without ever being planned).
export default function SetEditSheet({ open, onClose, stack = false, setRow, format, step = 5, onSave }) {
  const exercise = setRow?.exercise
  const mt = exercise?.metric_type ?? 'weight'
  const isAmrap = (format ?? exercise?.format) === 'amrap'

  const [val, setVal] = useState(() => ({
    weight: setRow?.weight ?? 0,
    duration: setRow?.duration ?? 0,
    reps: setRow?.reps ?? 0,
    effort: setRow?.effort ?? null,
    notes: setRow?.notes ?? '',
  }))

  if (!open || !setRow) return null

  const primary =
    mt === 'time'
      ? {
          value: mmss(val.duration),
          unit: 'min:sec',
          dec: () => setVal((v) => ({ ...v, duration: clamp(v.duration - 5, 0, 3600) })),
          inc: () => setVal((v) => ({ ...v, duration: clamp(v.duration + 5, 0, 3600) })),
        }
      : mt === 'bodyweight'
        ? {
            value: metricValueLabel('bodyweight', { weight: val.weight }),
            unit: '± BW',
            dec: () => setVal((v) => ({ ...v, weight: clamp(v.weight - step, -300, 500) })),
            inc: () => setVal((v) => ({ ...v, weight: clamp(v.weight + step, -300, 500) })),
          }
        : {
            value: val.weight,
            unit: 'lb',
            dec: () => setVal((v) => ({ ...v, weight: clamp(v.weight - step, 0, 2000) })),
            inc: () => setVal((v) => ({ ...v, weight: clamp(v.weight + step, 0, 2000) })),
          }

  function save() {
    const patch = isAmrap
      ? { reps: val.reps, notes: val.notes.trim() || null }
      : {
          reps: val.reps,
          weight: mt === 'time' ? null : val.weight,
          duration: mt === 'time' ? val.duration : null,
          effort: val.effort,
          notes: val.notes.trim() || null,
        }
    onSave(patch)
  }

  return (
    <Sheet open={open} onClose={onClose} stack={stack}>
      <div className="sheet-body">
        <div className="kicker">
          {isAmrap
            ? setRow.is_partial
              ? 'Editing partial round'
              : `Editing round ${setRow.set_number}`
            : `Editing set ${setRow.set_number}`}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 8 }}>
          {exercise?.name}
        </div>

        {exercise?.notes?.trim() && (
          <div className="exercise-notes-inline">
            <div className="exercise-notes-inline-label">
              <NotePencil size={12} weight="bold" />
              Notes
            </div>
            <p className="exercise-notes-inline-text">{exercise.notes.trim()}</p>
          </div>
        )}

        <div className="log-steppers" style={{ marginTop: 16 }}>
          {!isAmrap && (
            <Stepper label="Primary" value={primary.value} unit={primary.unit} onDec={primary.dec} onInc={primary.inc} />
          )}
          <Stepper
            label="Reps"
            value={val.reps}
            unit="reps"
            onDec={() => setVal((v) => ({ ...v, reps: clamp(v.reps - 1, 0, 200) }))}
            onInc={() => setVal((v) => ({ ...v, reps: clamp(v.reps + 1, 0, 200) }))}
          />
        </div>

        {!isAmrap && (
          <div className="effort-row">
            <span className="log-stat-label" style={{ flex: 'none' }}>Effort</span>
            {EFFORTS.map((e) => (
              <button
                key={e.key}
                type="button"
                className="effort-opt"
                style={
                  val.effort === e.key
                    ? { borderColor: e.color, color: e.color, background: 'rgba(255,255,255,0.04)' }
                    : undefined
                }
                onClick={() => setVal((v) => ({ ...v, effort: v.effort === e.key ? null : e.key }))}
              >
                {e.label}
              </button>
            ))}
          </div>
        )}

        <textarea
          className="set-notes-input"
          placeholder="Notes for this set (optional)"
          value={val.notes}
          onChange={(e) => setVal((v) => ({ ...v, notes: e.target.value }))}
        />
      </div>
      <div className="action-bar">
        <button type="button" className="cta" onClick={save}>
          Save changes
        </button>
      </div>
    </Sheet>
  )
}
