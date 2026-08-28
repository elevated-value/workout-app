import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, Barbell, Play, Plus, CaretRight, Check, Scales } from '@phosphor-icons/react'
import { Loading, ErrorNote, Toast } from '../components/ui.jsx'
import BodyWeightSheet from '../components/BodyWeightSheet.jsx'
import { useToast } from '../lib/useToast.js'
import {
  fetchSessionsInRange,
  fetchPlannedCounts,
  computeStreak,
  dayStatus,
} from '../lib/sessions.js'
import {
  todayISO,
  fromISODate,
  weekStart,
  weekDates,
  addDays,
  shortDate,
  longDate,
  relativeDayLabel,
} from '../lib/format.js'

// Home — the landing view (§3.7): weekly strip, streak indicator, and a featured
// card for today. Every day in the strip taps through to its Day Record.
// "Copy previous week" (§3.3) lands with the Copy/Duplicate build step.

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STRIP_STYLE = {
  logged: { bg: 'var(--accent-soft)', border: 'var(--accent-line)', num: 'var(--color-text)', dow: 'var(--color-accent-400)' },
  today: { bg: 'var(--accent-tint)', border: 'var(--color-accent)', num: 'var(--color-text)', dow: 'var(--accent-fg)' },
  scheduled: { bg: 'var(--row)', border: 'var(--line-strong)', num: 'var(--text-2)', dow: 'var(--text-4)' },
  missed: { bg: 'var(--warn-bg)', border: 'var(--warn-line)', num: 'var(--warn-fg)', dow: 'var(--warn-fg)' },
  empty: { bg: 'transparent', border: 'var(--line)', num: 'var(--text-5)', dow: 'var(--text-5)' },
}

function stripIcon(state) {
  if (state === 'logged') return <Check size={11} weight="bold" style={{ color: 'var(--color-accent)' }} />
  if (state === 'today') return <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--color-accent)' }} />
  if (state === 'missed') return <span style={{ fontSize: 11, color: 'var(--warn-fg)', lineHeight: 1 }}>!</span>
  if (state === 'scheduled') return <span style={{ width: 4, height: 4, borderRadius: 99, border: '1px solid var(--text-4)' }} />
  return <span style={{ width: 6, height: 1, background: 'var(--line-strong)' }} />
}

export default function Home() {
  const navigate = useNavigate()
  const today = todayISO()
  const start = useMemo(() => weekStart(today), [today])
  const dates = useMemo(() => weekDates(start), [start])

  const [sessions, setSessions] = useState(null)
  const [counts, setCounts] = useState({})
  const [err, setErr] = useState(null)
  const [bwOpen, setBwOpen] = useState(false)
  const { message, show } = useToast()

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const rows = await fetchSessionsInRange(addDays(today, -120), dates[6])
        const cnt = await fetchPlannedCounts(rows.map((s) => s.id))
        if (!live) return
        setSessions(rows)
        setCounts(cnt)
      } catch (e) {
        if (live) setErr(e.message ?? 'Could not load your workouts.')
      }
    })()
    return () => {
      live = false
    }
  }, [today, dates])

  const byDate = useMemo(() => {
    const m = {}
    for (const s of sessions ?? []) m[s.date] = s
    return m
  }, [sessions])

  const streak = useMemo(() => computeStreak(sessions ?? [], today), [sessions, today])

  const week = dates.map((iso) => {
    const s = byDate[iso]
    const state = iso === today ? 'today' : dayStatus(s, iso, today)
    const d = fromISODate(iso)
    return { iso, s, state, dow: DOW[d.getDay()], num: d.getDate() }
  })

  const weekSessions = week.filter((d) => d.s)
  const doneCount = weekSessions.filter((d) => d.s.status === 'completed').length

  const todaySession = byDate[today]
  const todayCount = todaySession ? counts[todaySession.id] ?? 0 : 0
  const todayDone = todaySession?.status === 'completed'

  const upcoming = (sessions ?? [])
    .filter((s) => s.date > today && s.status === 'planned')
    .slice(0, 3)

  if (err) {
    return (
      <div className="screen-scroll">
        <ErrorNote>{err}</ErrorNote>
      </div>
    )
  }
  if (sessions === null) return <Loading label="Loading" />

  return (
    <>
    <div className="screen-scroll">
      <div className="home-head">
        <div className="brand">Ledger</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Log body weight"
            onClick={() => setBwOpen(true)}
          >
            <Scales size={17} weight="bold" />
          </button>
          <button type="button" className="streak-chip" onClick={() => navigate('/calendar')}>
            <Flame size={14} weight="bold" style={{ color: 'var(--color-accent)' }} />
            <span className="tnum">{streak > 0 ? `${streak} day streak` : 'Start a streak'}</span>
          </button>
        </div>
      </div>

      <div className="home-weeklabel">
        <span className="kicker">
          {shortDate(dates[0])} – {shortDate(dates[6])}
        </span>
        <span className="tnum" style={{ fontSize: 10, color: 'var(--text-5)' }}>
          {doneCount}/{weekSessions.length} done
        </span>
      </div>

      <div className="week-strip">
        {week.map((d) => {
          const st = STRIP_STYLE[d.state]
          return (
            <Link
              key={d.iso}
              to={`/day/${d.iso}`}
              className="week-cell"
              style={{ background: st.bg, borderColor: st.border }}
            >
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: st.dow }}>
                {d.dow}
              </span>
              <span className="tnum" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, color: st.num }}>
                {d.num}
              </span>
              {stripIcon(d.state)}
            </Link>
          )
        })}
      </div>

      <div className="home-section">
        <div className="kicker" style={{ marginBottom: 10 }}>{longDate(today)}</div>

        {todaySession && todayCount > 0 ? (
          <div
            className="today-card"
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/day/${today}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/day/${today}`)}
          >
            <div className="today-tags">
              <span className="badge scheduled">{todayDone ? 'Logged' : 'Today'}</span>
              {todaySession.name && <span className="badge type">{todaySession.name}</span>}
            </div>
            <div className="today-name">{todaySession.name ?? 'Workout'}</div>
            <div className="today-sub tnum">
              {todayCount} exercise{todayCount === 1 ? '' : 's'}
              {todayDone ? ' · completed' : ''}
            </div>
            <div className="today-foot">
              {todayDone ? (
                <span className="today-cta-quiet">
                  View day record <CaretRight size={13} weight="bold" />
                </span>
              ) : (
                <button
                  type="button"
                  className="cta"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/day/${today}/log`)
                  }}
                  style={{ minHeight: 48 }}
                >
                  <Play size={14} weight="bold" />
                  Start workout
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-card">
            <Barbell size={22} weight="bold" style={{ color: 'var(--text-5)' }} />
            <h3>Nothing scheduled</h3>
            <p>Build one on the fly — pick exercises as you go and it saves to today.</p>
            <button
              type="button"
              className="cta"
              style={{ marginTop: 16 }}
              onClick={() => navigate(`/day/${today}/build`)}
            >
              <Plus size={14} weight="bold" />
              Build workout
            </button>
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="home-section">
          <div className="kicker" style={{ marginBottom: 10 }}>Up next</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {upcoming.map((s) => (
              <Link key={s.id} to={`/day/${s.date}`} className="row">
                <span
                  className="tnum"
                  style={{
                    width: 40,
                    flex: 'none',
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-4)',
                  }}
                >
                  {relativeDayLabel(s.date)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row-title">{s.name ?? 'Workout'}</div>
                  <div className="row-sub tnum">
                    {(counts[s.id] ?? 0)} exercise{(counts[s.id] ?? 0) === 1 ? '' : 's'}
                  </div>
                </div>
                <CaretRight size={14} weight="bold" style={{ color: 'var(--text-5)', flex: 'none' }} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>

    <BodyWeightSheet
      open={bwOpen}
      onClose={() => setBwOpen(false)}
      onSaved={(entry) => show(`Logged ${Math.round(Number(entry.weight) * 10) / 10} lbs`)}
    />
    <Toast message={message} />
    </>
  )
}
