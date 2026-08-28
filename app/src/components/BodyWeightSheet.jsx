import { useEffect, useState } from 'react'
import { Check, Minus, Plus } from '@phosphor-icons/react'
import { Sheet } from './ui.jsx'
import { fetchBodyWeight, logBodyWeight, nowLocalInput } from '../lib/bodyweight.js'

// The "Log Weight" bottom sheet — shared by the Progress → Body Weight section
// and the Home quick-log shortcut (§3.8, §3.7). Meant to be a 5-second task.
// It's a bottom sheet, so it may cover the nav while open (§6).
const round1 = (n) => Math.round(n * 10) / 10

export default function BodyWeightSheet({ open, onClose, onSaved, defaultWeight = null }) {
  const [weight, setWeight] = useState('170')
  const [when, setWhen] = useState(nowLocalInput())
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!open) return
    setWhen(nowLocalInput())
    setNotes('')
    setErr(null)
    setBusy(false)
    if (defaultWeight != null) {
      setWeight(String(defaultWeight))
      return
    }
    // No hint passed (Home shortcut) — seed from the last weigh-in.
    let live = true
    fetchBodyWeight()
      .then((es) => {
        if (!live) return
        const last = es[es.length - 1]
        setWeight(last ? String(round1(Number(last.weight))) : '170')
      })
      .catch(() => live && setWeight('170'))
    return () => {
      live = false
    }
  }, [open, defaultWeight])

  const bump = (d) => setWeight((w) => String(Math.max(0, round1((parseFloat(w) || 0) + d))))

  async function save() {
    if (busy) return
    const w = parseFloat(weight)
    if (!w || w <= 0) {
      setErr('Enter a weight.')
      return
    }
    setBusy(true)
    try {
      const entry = await logBodyWeight({
        weight: round1(w),
        logged_at: new Date(when).toISOString(),
        notes,
      })
      onSaved?.(entry)
      onClose?.()
    } catch (e) {
      setErr(e.message ?? 'Could not save.')
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sheet-body">
        <div className="kicker">Log weight</div>

        <div className="bw-input">
          <button type="button" aria-label="Decrease" onClick={() => bump(-0.2)}>
            <Minus size={18} weight="bold" />
          </button>
          <div className="bw-num">
            <input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ''))}
              aria-label="Weight in pounds"
            />
            <span>lbs</span>
          </div>
          <button type="button" aria-label="Increase" onClick={() => bump(0.2)}>
            <Plus size={18} weight="bold" />
          </button>
        </div>
        <div className="bw-nudge">
          {[-1, -0.2, 0.2, 1].map((d) => (
            <button key={d} type="button" onClick={() => bump(d)}>
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>

        <div className="fld">
          <div className="fld-label">When</div>
          <input
            className="input"
            type="datetime-local"
            value={when}
            max={nowLocalInput()}
            onChange={(e) => setWhen(e.target.value)}
          />
        </div>
        <div className="fld">
          <div className="fld-label">
            Notes <span className="fld-opt">optional</span>
          </div>
          <input
            className="input"
            type="text"
            placeholder="Morning, post-workout…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {err && <div className="bw-err">{err}</div>}
      </div>

      <div className="action-bar">
        <button type="button" className="cta" disabled={busy} onClick={save}>
          <Check size={14} weight="bold" />
          {busy ? 'Saving…' : 'Save weigh-in'}
        </button>
      </div>
    </Sheet>
  )
}
