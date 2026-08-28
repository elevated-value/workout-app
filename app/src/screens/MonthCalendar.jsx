import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { TopBar, Loading, ErrorNote } from '../components/ui.jsx'
import { fetchSessionsInRange, computeStreak, dayStatus } from '../lib/sessions.js'
import { todayISO, fromISODate, addDays, MONTHS, DOW_MON_FIRST } from '../lib/format.js'

// Month calendar (§3.7) — reached from Home's streak chip. Same Day Record tap
// behaviour as the weekly strip, just a wider window.

const CELL_STYLE = {
  logged: { bg: 'var(--accent-soft)', border: 'var(--accent-line)', color: 'var(--color-text)' },
  today: { bg: 'var(--accent-tint)', border: 'var(--color-accent)', color: 'var(--accent-fg)' },
  scheduled: { bg: 'var(--row)', border: 'var(--line-strong)', color: 'var(--text-2)' },
  missed: { bg: 'var(--warn-bg)', border: 'var(--warn-line)', color: 'var(--warn-fg)' },
  empty: { bg: 'transparent', border: 'var(--line)', color: 'var(--text-5)' },
}

const LEGEND = [
  { label: 'Logged', key: 'logged' },
  { label: 'Scheduled', key: 'scheduled' },
  { label: 'Nothing scheduled', key: 'empty' },
]

const pad = (n) => String(n).padStart(2, '0')

export default function MonthCalendar() {
  const navigate = useNavigate()
  const today = todayISO()
  const [ym, setYm] = useState(() => {
    const d = fromISODate(today)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [sessions, setSessions] = useState(null)
  const [err, setErr] = useState(null)

  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const monthStart = `${ym.y}-${pad(ym.m + 1)}-01`
  const monthEnd = `${ym.y}-${pad(ym.m + 1)}-${pad(daysInMonth)}`

  useEffect(() => {
    let live = true
    setSessions(null)
    fetchSessionsInRange(addDays(monthStart, -120), monthEnd)
      .then((r) => live && setSessions(r))
      .catch((e) => live && setErr(e.message ?? 'Could not load the calendar.'))
    return () => {
      live = false
    }
  }, [monthStart, monthEnd])

  const byDate = useMemo(() => {
    const m = {}
    for (const s of sessions ?? []) m[s.date] = s
    return m
  }, [sessions])

  const streak = useMemo(() => computeStreak(sessions ?? [], today), [sessions, today])
  const loggedThisMonth = useMemo(
    () =>
      (sessions ?? []).filter(
        (s) => s.date >= monthStart && s.date <= monthEnd && s.status === 'completed',
      ).length,
    [sessions, monthStart, monthEnd],
  )

  const lead = (fromISODate(monthStart).getDay() + 6) % 7
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const iso = `${ym.y}-${pad(ym.m + 1)}-${pad(i + 1)}`
      const state = iso === today ? 'today' : dayStatus(byDate[iso], iso, today)
      return { iso, n: i + 1, state }
    }),
  ]

  const step = (delta) => {
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  return (
    <>
      <TopBar
        title={`${MONTHS[ym.m]} ${ym.y}`}
        onBack={() => navigate('/')}
        right={
          <div style={{ display: 'flex', gap: 2, flex: 'none' }}>
            <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => step(-1)}>
              <CaretLeft size={16} weight="bold" />
            </button>
            <button type="button" className="icon-btn" aria-label="Next month" onClick={() => step(1)}>
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        }
      />

      {err && <ErrorNote>{err}</ErrorNote>}

      <div className="cal-stats">
        <div>
          <div className="cal-stat-num tnum" style={{ color: 'var(--color-accent)' }}>{streak}</div>
          <div className="cal-stat-label">Day streak</div>
        </div>
        <div>
          <div className="cal-stat-num tnum">{loggedThisMonth}</div>
          <div className="cal-stat-label">Logged this month</div>
        </div>
      </div>

      {sessions === null && !err ? (
        <Loading label="Loading" />
      ) : (
        <div className="screen-scroll">
          <div className="cal-dow">
            {DOW_MON_FIRST.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="cal-grid">
            {cells.map((c, i) =>
              c === null ? (
                <div key={`b${i}`} />
              ) : (
                <button
                  key={c.iso}
                  type="button"
                  className="cal-cell tnum"
                  style={{ background: CELL_STYLE[c.state].bg, borderColor: CELL_STYLE[c.state].border, color: CELL_STYLE[c.state].color }}
                  onClick={() => navigate(`/day/${c.iso}`)}
                >
                  {c.n}
                </button>
              ),
            )}
          </div>

          <div className="cal-legend">
            {LEGEND.map((l) => (
              <div key={l.key} className="cal-legend-item">
                <span
                  className="cal-swatch"
                  style={{ background: CELL_STYLE[l.key].bg, borderColor: CELL_STYLE[l.key].border }}
                />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
