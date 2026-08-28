import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Flame,
  Barbell,
  Play,
  Plus,
  Copy,
  CaretLeft,
  CaretRight,
  Check,
  NotePencil,
  Scales,
} from '@phosphor-icons/react'
import { Loading, ErrorNote, Toast, Confirm } from '../components/ui.jsx'
import BodyWeightSheet from '../components/BodyWeightSheet.jsx'
import { useToast } from '../lib/useToast.js'
import {
  fetchSessionsInRange,
  fetchPlannedCounts,
  computeStreak,
  dayStatus,
} from '../lib/sessions.js'
import { copyWeekTo, weekContent } from '../lib/copy.js'
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

// Home — the landing view (§3.7). The weekly strip swipes / chevrons between
// weeks (§3.7 rev. 24); the featured card follows whichever day is selected,
// defaulting to today. A strip day still taps through to its Day Record.
// "Copy previous week" (§3.3) fills the shown week from the one before it.

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

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export default function Home() {
  const navigate = useNavigate()
  const today = todayISO()
  const [searchParams, setSearchParams] = useSearchParams()

  // Selected day lives in the URL (?d=) so it survives a round-trip to a Day
  // Record; no param means "today".
  const paramD = searchParams.get('d')
  const selectedDate = ISO_RE.test(paramD ?? '') ? paramD : today

  const start = useMemo(() => weekStart(selectedDate), [selectedDate])
  const dates = useMemo(() => weekDates(start), [start])
  const onThisWeek = start === weekStart(today)

  const [sessions, setSessions] = useState(null)
  const [counts, setCounts] = useState({})
  const [err, setErr] = useState(null)
  const [bwOpen, setBwOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [copyAsk, setCopyAsk] = useState(null) // { srcWeek, destWeek, conflicts, anyLogged }
  const [copyBusy, setCopyBusy] = useState(false)
  const { message, show } = useToast()

  const touchRef = useRef(null)
  const swipedRef = useRef(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const rangeStart = dates[0] < addDays(today, -120) ? dates[0] : addDays(today, -120)
        const rangeEnd = dates[6] > today ? dates[6] : today
        const rows = await fetchSessionsInRange(rangeStart, rangeEnd)
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
  }, [today, dates, reloadKey])

  const byDate = useMemo(() => {
    const m = {}
    for (const s of sessions ?? []) m[s.date] = s
    return m
  }, [sessions])

  const streak = useMemo(() => computeStreak(sessions ?? [], today), [sessions, today])

  const shiftWeek = (dir) =>
    setSearchParams({ d: addDays(selectedDate, dir * 7) }, { replace: true })

  const selectDay = (iso) => setSearchParams({ d: iso }, { replace: true })

  const openDay = (iso) => {
    if (swipedRef.current) return // a swipe that ended on a cell shouldn't also open it
    selectDay(iso)
    navigate(`/day/${iso}`)
  }

  // "Copy previous week" — fills the shown week from the one before it (§3.3).
  async function askCopyWeek() {
    setCopyBusy(true)
    try {
      const destWeek = start
      const srcWeek = addDays(start, -7)
      const src = await weekContent(srcWeek)
      if (!src.some((d) => d.hasPlanned)) {
        show('Nothing to copy — the previous week has no workouts.')
        return
      }
      const conflicts = (await weekContent(destWeek)).filter((d) => d.hasContent)
      if (conflicts.length === 0) {
        await runCopyWeek(srcWeek, destWeek)
      } else {
        setCopyAsk({ srcWeek, destWeek, conflicts, anyLogged: conflicts.some((d) => d.hasLogged) })
      }
    } catch (e) {
      setErr(e.message ?? 'Could not copy the week.')
    } finally {
      setCopyBusy(false)
    }
  }

  async function runCopyWeek(srcWeek, destWeek) {
    setCopyBusy(true)
    try {
      await copyWeekTo(srcWeek, destWeek)
      setCopyAsk(null)
      setReloadKey((k) => k + 1)
      show('Previous week copied in')
    } catch (e) {
      setErr(e.message ?? 'Could not copy the week.')
      setCopyAsk(null)
    } finally {
      setCopyBusy(false)
    }
  }

  const weekRange = (ws) => `${shortDate(ws)} – ${shortDate(addDays(ws, 6))}`

  const onTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e) => {
    const s = touchRef.current
    touchRef.current = null
    if (!s) return
    const dx = e.changedTouches[0].clientX - s.x
    const dy = e.changedTouches[0].clientY - s.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swipedRef.current = true
      setTimeout(() => {
        swipedRef.current = false
      }, 350)
      shiftWeek(dx < 0 ? 1 : -1)
    }
  }

  const week = dates.map((iso) => {
    const s = byDate[iso]
    const state = iso === today ? 'today' : dayStatus(s, iso, today)
    const d = fromISODate(iso)
    return { iso, s, state, selected: iso === selectedDate, dow: DOW[d.getDay()], num: d.getDate() }
  })

  const weekSessions = week.filter((d) => d.s)
  const doneCount = weekSessions.filter((d) => d.s.status === 'completed').length

  const selSession = byDate[selectedDate]
  const selCount = selSession ? counts[selSession.id] ?? 0 : 0
  const selStatus = dayStatus(selSession, selectedDate, today)

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

  const badge =
    selStatus === 'logged'
      ? 'Logged'
      : selStatus === 'missed'
        ? 'Missed'
        : selectedDate === today
          ? 'Today'
          : 'Scheduled'

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
          <button type="button" className="wk-nav" aria-label="Previous week" onClick={() => shiftWeek(-1)}>
            <CaretLeft size={13} weight="bold" />
          </button>
          <span className="kicker" style={{ flex: 1 }}>
            {shortDate(dates[0])} – {shortDate(dates[6])}
          </span>
          {!onThisWeek && (
            <button type="button" className="wk-today" onClick={() => setSearchParams({}, { replace: true })}>
              Today
            </button>
          )}
          <span className="tnum" style={{ fontSize: 10, color: 'var(--text-5)' }}>
            {doneCount}/{weekSessions.length} done
          </span>
          <button type="button" className="wk-nav" aria-label="Next week" onClick={() => shiftWeek(1)}>
            <CaretRight size={13} weight="bold" />
          </button>
        </div>

        <div className="week-strip" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {week.map((d) => {
            const st = STRIP_STYLE[d.state]
            return (
              <button
                type="button"
                key={d.iso}
                className={`week-cell${d.selected ? ' selected' : ''}`}
                style={{ background: st.bg, borderColor: st.border }}
                onClick={() => openDay(d.iso)}
              >
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: st.dow }}>
                  {d.dow}
                </span>
                <span className="tnum" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, color: st.num }}>
                  {d.num}
                </span>
                {stripIcon(d.state)}
              </button>
            )
          })}
        </div>

        <button type="button" className="wk-copy" disabled={copyBusy} onClick={askCopyWeek}>
          <Copy size={12} weight="bold" />
          {copyBusy ? 'Copying…' : 'Copy previous week'}
        </button>

        <div className="home-section">
          <div className="kicker" style={{ marginBottom: 10 }}>
            {longDate(selectedDate)}
            {selectedDate === today ? ' · Today' : ''}
          </div>

          {selSession && selCount > 0 ? (
            <div
              className="today-card"
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/day/${selectedDate}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/day/${selectedDate}`)}
            >
              <div className="today-tags">
                <span className={`badge ${selStatus === 'logged' ? 'logged' : selStatus === 'missed' ? 'missed' : 'scheduled'}`}>
                  {badge}
                </span>
                {selSession.name && <span className="badge type">{selSession.name}</span>}
              </div>
              <div className="today-name">{selSession.name ?? 'Workout'}</div>
              <div className="today-sub tnum">
                {selCount} exercise{selCount === 1 ? '' : 's'}
                {selStatus === 'logged' ? ' · completed' : ''}
              </div>
              <div className="today-foot">
                {selStatus === 'logged' ? (
                  <span className="today-cta-quiet">
                    View day record <CaretRight size={13} weight="bold" />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="cta"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/day/${selectedDate}/log`)
                    }}
                    style={{ minHeight: 48 }}
                  >
                    {selStatus === 'missed' ? (
                      <>
                        <NotePencil size={14} weight="bold" />
                        Log workout
                      </>
                    ) : (
                      <>
                        <Play size={14} weight="bold" />
                        Start workout
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-card">
              <Barbell size={22} weight="bold" style={{ color: 'var(--text-5)' }} />
              <h3>Nothing scheduled</h3>
              <p>Build one on the fly — pick exercises as you go and it saves to this day.</p>
              <button
                type="button"
                className="cta"
                style={{ marginTop: 16 }}
                onClick={() => navigate(`/day/${selectedDate}/build`)}
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

      <Confirm
        open={Boolean(copyAsk)}
        title="Replace this week?"
        body={
          copyAsk &&
          `${copyAsk.conflicts.length} day${copyAsk.conflicts.length === 1 ? '' : 's'} in ${weekRange(
            copyAsk.destWeek,
          )} already have workouts. Copying ${weekRange(copyAsk.srcWeek)} replaces them.`
        }
        warn={copyAsk?.anyLogged ? 'Logged data for those days will be lost.' : null}
        confirmLabel="Replace"
        onConfirm={() => runCopyWeek(copyAsk.srcWeek, copyAsk.destWeek)}
        onCancel={() => setCopyAsk(null)}
      />

      <Toast message={message} />
    </>
  )
}
