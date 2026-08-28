import { useEffect, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Sheet } from './ui.jsx'
import { fetchSessionsInRange, fetchPlannedCounts } from '../lib/sessions.js'
import { todayISO, fromISODate, MONTHS, DOW_MON_FIRST } from '../lib/format.js'

// A month-grid date picker in a bottom sheet — used to choose a "Copy to" target
// (§3.3). Dots mark dates that already hold a workout, so it's obvious which
// picks will need an overwrite confirmation.
const pad = (n) => String(n).padStart(2, '0')

export default function DatePickerSheet({ open, onClose, onPick, title = 'Pick a date', excludeDate }) {
  const today = todayISO()
  const [ym, setYm] = useState(() => {
    const d = fromISODate(today)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [contentDates, setContentDates] = useState(() => new Set())

  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const monthStart = `${ym.y}-${pad(ym.m + 1)}-01`
  const monthEnd = `${ym.y}-${pad(ym.m + 1)}-${pad(daysInMonth)}`

  useEffect(() => {
    if (!open) return
    let live = true
    ;(async () => {
      try {
        const rows = await fetchSessionsInRange(monthStart, monthEnd)
        const counts = await fetchPlannedCounts(rows.map((r) => r.id))
        const s = new Set(
          rows.filter((r) => (counts[r.id] ?? 0) > 0 || r.status !== 'planned').map((r) => r.date),
        )
        if (live) setContentDates(s)
      } catch {
        /* dots are a nicety; the overwrite check still runs on pick */
      }
    })()
    return () => {
      live = false
    }
  }, [open, monthStart, monthEnd])

  const lead = (fromISODate(monthStart).getDay() + 6) % 7
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${ym.y}-${pad(ym.m + 1)}-${pad(i + 1)}`),
  ]

  const step = (delta) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sheet-body">
        <div className="kicker">{title}</div>

        <div className="dp-monthrow">
          <button type="button" className="wk-nav" aria-label="Previous month" onClick={() => step(-1)}>
            <CaretLeft size={15} weight="bold" />
          </button>
          <span>
            {MONTHS[ym.m]} {ym.y}
          </span>
          <button type="button" className="wk-nav" aria-label="Next month" onClick={() => step(1)}>
            <CaretRight size={15} weight="bold" />
          </button>
        </div>

        <div className="cal-dow">
          {DOW_MON_FIRST.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((iso, i) =>
            iso === null ? (
              <div key={`b${i}`} />
            ) : (
              <button
                key={iso}
                type="button"
                className={`dp-cell${iso === today ? ' today' : ''}`}
                disabled={iso === excludeDate}
                onClick={() => onPick(iso)}
              >
                <span className="tnum">{Number(iso.slice(-2))}</span>
                <span
                  className="dp-dot"
                  style={{ background: contentDates.has(iso) ? 'var(--color-accent)' : 'transparent' }}
                />
              </button>
            ),
          )}
        </div>

        <div className="cal-legend">
          <div className="cal-legend-item">
            <span className="dp-dot" style={{ background: 'var(--color-accent)' }} />
            Has a workout
          </div>
        </div>
      </div>
    </Sheet>
  )
}
