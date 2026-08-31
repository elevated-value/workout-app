import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  PencilSimple,
  Plus,
  Play,
  Pause,
  SkipForward,
  CheckCircle,
  CircleHalf,
  CaretRight,
  FlagCheckered,
  Barbell,
  MagnifyingGlass,
  NotePencil,
} from '@phosphor-icons/react'
import { TopBar, Loading, ErrorNote, Sheet, Stepper, Confirm, Toast, NotesSheet } from '../components/ui.jsx'
import { useToast } from '../lib/useToast.js'
import { fetchExercises, fetchEquipment } from '../lib/library.js'
import { fetchSettings } from '../lib/settings.js'
import {
  fetchDay,
  ensureSession,
  startSession,
  completeSession,
  updateSession,
  deleteSessionIfEmpty,
  addPlannedExercise,
  logSet,
  fetchLastPerformance,
} from '../lib/sessions.js'
import {
  longDate,
  todayISO,
  mmss,
  restLabel,
  metricValueLabel,
  plannedTargetLabel,
  formatTag,
  EFFORTS,
} from '../lib/format.js'

// Workout Logging (§3.5) — the in-gym screen. One exercise sheet, three metric
// modes, two formats. Timers never start on their own: the rest timer is a
// direct consequence of logging a set, and the AMRAP clock waits on Start.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const groupByExercise = (rows) => {
  const m = {}
  for (const r of rows) (m[r.exercise_id] ??= []).push(r)
  return m
}

export default function WorkoutLogging() {
  const { date } = useParams()
  const navigate = useNavigate()
  const { message, show } = useToast()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [session, setSession] = useState(null)
  const [planned, setPlanned] = useState([])
  const [logged, setLogged] = useState({}) // exercise_id -> [logged_set]

  const [lib, setLib] = useState([])
  const [equipment, setEquipment] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [q, setQ] = useState('')
  const [equipFilter, setEquipFilter] = useState('all')
  const [step, setStep] = useState(5)

  const [now, setNow] = useState(Date.now())
  const [rest, setRest] = useState(null) // { left, total }
  const [openId, setOpenId] = useState(null)
  const [input, setInput] = useState({ weight: 0, duration: 60, reps: 8, effort: null })
  const [amrap, setAmrap] = useState(null)
  const [lastPerf, setLastPerf] = useState({})
  const [finishAsk, setFinishAsk] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)

  const sessionRef = useRef(null)
  sessionRef.current = session

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const [day, exs, eq, settings] = await Promise.all([
          fetchDay(date),
          fetchExercises(),
          fetchEquipment(),
          fetchSettings(),
        ])
        if (!live) return
        setSession(day.session)
        setPlanned(day.planned)
        setLogged(groupByExercise(day.logged))
        setLib(exs.filter((e) => !e.is_archived))
        setEquipment(eq)
        setStep(Number(settings.weight_step) || 5)
      } catch (e) {
        if (live) setErr(e.message ?? 'Could not load this workout.')
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => {
      live = false
    }
  }, [date])

  // One heartbeat drives the elapsed clock, the rest countdown and the AMRAP clock.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now())
      setRest((r) => (!r ? r : r.left <= 1 ? null : { ...r, left: r.left - 1 }))
      setAmrap((a) => {
        if (!a || a.phase !== 'running') return a
        return a.timeLeft <= 1 ? { ...a, timeLeft: 0, phase: 'time' } : { ...a, timeLeft: a.timeLeft - 1 }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const anyLogged = useMemo(() => Object.values(logged).some((a) => a.length), [logged])

  async function getStarted() {
    let s = sessionRef.current ?? (await ensureSession(date))
    s = await startSession(s)
    setSession(s)
    sessionRef.current = s
    return s
  }

  async function leave() {
    try {
      const s = sessionRef.current
      if (s && !anyLogged && s.status === 'in_progress') {
        await updateSession(s.id, { status: 'planned', started_at: null })
      }
      if (s && planned.length === 0 && !anyLogged) await deleteSessionIfEmpty(s.id)
    } catch {
      /* non-fatal */
    }
    navigate(`/day/${date}`, { replace: true })
  }

  const isDone = useCallback(
    (row) => {
      const sets = logged[row.exercise_id] ?? []
      if (row.format === 'amrap') return sets.length > 0
      return sets.length >= (row.target_sets ?? 1)
    },
    [logged],
  )

  const doneCount = planned.filter(isDone).length
  const allDone = planned.length > 0 && doneCount === planned.length
  const elapsed = session?.started_at
    ? Math.max(0, Math.floor((now - new Date(session.started_at).getTime()) / 1000))
    : 0

  const openRow = planned.find((p) => p.id === openId) ?? null

  async function openExercise(row) {
    setOpenId(row.id)
    const sets = logged[row.exercise_id] ?? []

    if (row.format === 'amrap') {
      if (sets.length) {
        const full = sets.filter((s) => !s.is_partial)
        const partialSet = sets.find((s) => s.is_partial)
        setAmrap({
          phase: 'summary',
          done: true,
          fullRounds: full.length,
          partial: partialSet?.reps ?? 0,
          timeCap: row.time_cap_seconds ?? 0,
          target: row.target_reps ?? 0,
        })
      } else {
        const cap = row.time_cap_seconds ?? 600
        setAmrap({
          phase: 'ready',
          timeLeft: cap,
          timeCap: cap,
          target: row.target_reps ?? 5,
          rounds: [],
          adjusting: false,
          adjustVal: row.target_reps ?? 5,
          partial: 0,
        })
      }
      return
    }

    setAmrap(null)
    setInput({
      weight: row.target_weight ?? 0,
      duration: row.target_duration ?? 60,
      reps: row.target_reps ?? 8,
      effort: null,
    })
    if (lastPerf[row.exercise_id] === undefined) {
      try {
        const p = await fetchLastPerformance(row.exercise_id, date)
        setLastPerf((m) => ({ ...m, [row.exercise_id]: p }))
      } catch {
        setLastPerf((m) => ({ ...m, [row.exercise_id]: null }))
      }
    }
  }

  function closeSheet() {
    setOpenId(null)
    setAmrap(null)
    setNotesOpen(false)
  }

  async function logStraight() {
    const row = openRow
    const mt = row.exercise?.metric_type ?? 'weight'
    const sets = logged[row.exercise_id] ?? []
    const setNumber = sets.length + 1
    try {
      const saved = await logSet({
        workout_session_id: (await getStarted()).id,
        exercise_id: row.exercise_id,
        set_number: setNumber,
        reps: input.reps,
        weight: mt === 'time' ? null : input.weight,
        duration: mt === 'time' ? input.duration : null,
        effort: input.effort,
        is_partial: false,
      })
      setLogged((m) => ({ ...m, [row.exercise_id]: [...(m[row.exercise_id] ?? []), saved] }))
      const target = row.target_sets ?? setNumber
      const more = setNumber < target
      setInput((i) => ({ ...i, effort: null }))
      if (more && row.rest_seconds) setRest({ left: row.rest_seconds, total: row.rest_seconds })
      if (!more) setTimeout(() => setOpenId((id) => (id === row.id ? null : id)), 450)
    } catch (e) {
      setErr(e.message ?? 'Could not log that set.')
    }
  }

  async function completeRound(reps) {
    const row = openRow
    const roundNo = (amrap.rounds?.length ?? 0) + 1
    try {
      const saved = await logSet({
        workout_session_id: (await getStarted()).id,
        exercise_id: row.exercise_id,
        set_number: roundNo,
        reps,
        weight: row.target_weight ?? null,
        duration: null,
        effort: null,
        is_partial: false,
      })
      setLogged((m) => ({ ...m, [row.exercise_id]: [...(m[row.exercise_id] ?? []), saved] }))
      setAmrap((a) => ({
        ...a,
        rounds: [...a.rounds, reps],
        adjusting: false,
        adjustVal: a.target,
      }))
    } catch (e) {
      setErr(e.message ?? 'Could not log that round.')
    }
  }

  async function finishAmrap() {
    const row = openRow
    const rounds = amrap.rounds ?? []
    try {
      if (amrap.partial > 0) {
        const saved = await logSet({
          workout_session_id: (await getStarted()).id,
          exercise_id: row.exercise_id,
          set_number: rounds.length + 1,
          reps: amrap.partial,
          weight: row.target_weight ?? null,
          duration: null,
          effort: null,
          is_partial: true,
        })
        setLogged((m) => ({ ...m, [row.exercise_id]: [...(m[row.exercise_id] ?? []), saved] }))
      }
      setAmrap((a) => ({
        ...a,
        phase: 'summary',
        fullRounds: rounds.length,
      }))
    } catch (e) {
      setErr(e.message ?? 'Could not log the score.')
    }
  }

  async function addExercise(ex) {
    try {
      const s = await getStarted()
      const position = planned.length ? Math.max(...planned.map((r) => r.position)) + 1 : 0
      const row = await addPlannedExercise(s.id, ex, position)
      setPlanned((p) => [...p, row])
      setPickerOpen(false)
      setQ('')
      show(`${ex.name} added`)
    } catch (e) {
      setErr(e.message ?? 'Could not add that exercise.')
    }
  }

  async function doFinish() {
    try {
      const s = await getStarted()
      await completeSession(s.id)
      // Reached via a flow, not a back-navigable page load — tag it so the Day
      // Record's back arrow goes Home instead of into the completed log.
      navigate(`/day/${date}`, { replace: true, state: { from: 'workout-complete' } })
    } catch (e) {
      setErr(e.message ?? 'Could not finish the workout.')
      setFinishAsk(false)
    }
  }

  const pickerList = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return lib.filter((e) => {
      if (needle && !e.name.toLowerCase().includes(needle)) return false
      if (equipFilter !== 'all' && !e.equipment.includes(equipFilter)) return false
      return true
    })
  }, [lib, q, equipFilter])

  const title =
    session?.name || (planned.length ? 'Workout' : 'New workout')

  if (loading) {
    return (
      <>
        <TopBar title={longDate(date)} />
        <Loading label="Loading" />
      </>
    )
  }
  if (err && !planned.length && !session) {
    return (
      <>
        <TopBar title={longDate(date)} />
        <ErrorNote>{err}</ErrorNote>
      </>
    )
  }

  return (
    <>
      <div className="log-head">
        <div className="topbar" style={{ padding: 0, minHeight: 40 }}>
          <button type="button" className="icon-btn" aria-label="Back" onClick={leave}>
            <ArrowLeft size={19} weight="bold" />
          </button>
          <div className="topbar-title">{title}</div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Edit workout"
            onClick={() => navigate(`/day/${date}/build`)}
          >
            <PencilSimple size={18} weight="bold" />
          </button>
        </div>

        <div className="log-stats">
          <div>
            <div className="log-stat-num tnum">{mmss(elapsed)}</div>
            <div className="log-stat-label">Elapsed</div>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <span className="tnum" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {doneCount} of {planned.length} done
            </span>
          </div>
        </div>
        <div className="log-bar">
          <div
            className="log-bar-fill"
            style={{ width: `${planned.length ? (doneCount / planned.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {err && <ErrorNote>{err}</ErrorNote>}

      <div className="screen-scroll">
        {planned.length === 0 ? (
          <div className="empty-card" style={{ marginTop: 8 }}>
            <Barbell size={22} weight="bold" style={{ color: 'var(--text-5)' }} />
            <p style={{ marginTop: 12 }}>
              Nothing planned for this day yet. Add exercises as you go — everything you log saves
              to {longDate(date)}.
            </p>
            <button type="button" className="cta" style={{ marginTop: 16 }} onClick={() => setPickerOpen(true)}>
              <Plus size={14} weight="bold" />
              Add exercises
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {planned.map((row) => {
              const sets = logged[row.exercise_id] ?? []
              const done = isDone(row)
              const started = sets.length > 0
              return (
                <button
                  key={row.id}
                  type="button"
                  className="log-row"
                  onClick={() => openExercise(row)}
                >
                  <span className="dr-thumb" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      {formatTag(row) && <span className="dr-sets tnum">{formatTag(row)}</span>}
                      <span className="dr-name" style={{ color: done ? 'var(--text-3)' : 'var(--color-text)' }}>
                        {row.exercise?.name}
                      </span>
                      {row.exercise?.notes?.trim() && (
                        <NotePencil size={12} weight="bold" style={{ color: 'var(--text-4)', flex: 'none' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                      {row.exercise?.equipment?.[0] && (
                        <span className="pill">{row.exercise.equipment[0]}</span>
                      )}
                      <span className="tnum" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {row.format === 'amrap' && started
                          ? `${sets.filter((s) => !s.is_partial).length} rounds logged`
                          : started && row.format !== 'amrap'
                            ? `${sets.length}/${row.target_sets ?? sets.length} sets`
                            : plannedTargetLabel(row)}
                      </span>
                    </div>
                    {restLabel(row.rest_seconds) && row.format !== 'amrap' && (
                      <div className="tnum" style={{ fontSize: 10.5, color: 'var(--text-5)', marginTop: 5 }}>
                        {restLabel(row.rest_seconds)} rest
                      </div>
                    )}
                  </div>
                  {done ? (
                    <CheckCircle size={19} weight="bold" style={{ color: 'var(--color-accent)', flex: 'none' }} />
                  ) : started ? (
                    <CircleHalf size={19} weight="bold" style={{ color: 'var(--color-accent-400)', flex: 'none' }} />
                  ) : (
                    <CaretRight size={16} weight="bold" style={{ color: 'var(--text-5)', flex: 'none' }} />
                  )}
                </button>
              )
            })}

            <button
              type="button"
              className={`log-finish${allDone ? ' ready' : ''}`}
              onClick={() => (allDone ? doFinish() : setFinishAsk(true))}
            >
              Finish workout
            </button>
          </div>
        )}
      </div>

      {/* Persistent rest bar (§3.5 — auto-started by logging a set) */}
      {rest && (
        <div className="rest-bar">
          <div className="rest-bar-top">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="log-stat-label">Rest</span>
              <span className="tnum" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--accent-fg)', lineHeight: 1 }}>
                {mmss(rest.left)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="rest-btn"
                onClick={() => setRest((r) => ({ left: r.left + 15, total: r.total + 15 }))}
              >
                +15s
              </button>
              <button type="button" className="rest-btn accent" onClick={() => setRest(null)}>
                <SkipForward size={13} weight="bold" />
                Skip
              </button>
            </div>
          </div>
          <div className="log-bar" style={{ marginTop: 10 }}>
            <div
              className="log-bar-fill"
              style={{ width: `${rest.total ? (rest.left / rest.total) * 100 : 0}%`, transition: 'width 1s linear' }}
            />
          </div>
        </div>
      )}

      {/* ── exercise sheet ─────────────────────────────────────────── */}
      <Sheet
        open={Boolean(openRow)}
        onClose={() => {
          // Don't let a stray backdrop tap kill a running AMRAP clock — pause it first.
          if (amrap?.phase === 'running') return
          closeSheet()
        }}
      >
        {openRow && !amrap && (
          <StraightSheet
            row={openRow}
            sets={logged[openRow.exercise_id] ?? []}
            last={lastPerf[openRow.exercise_id]}
            input={input}
            setInput={setInput}
            step={step}
            rest={rest}
            onSkipRest={() => setRest(null)}
            onAddRest={() => setRest((r) => ({ left: r.left + 15, total: r.total + 15 }))}
            onLog={logStraight}
            onDone={closeSheet}
            onShowNotes={() => setNotesOpen(true)}
          />
        )}
        {openRow && amrap && (
          <AmrapSheet
            row={openRow}
            amrap={amrap}
            setAmrap={setAmrap}
            onStart={() => setAmrap((a) => ({ ...a, phase: 'running' }))}
            onPause={() => setAmrap((a) => ({ ...a, phase: 'paused' }))}
            onResume={() => setAmrap((a) => ({ ...a, phase: 'running' }))}
            onCompleteRound={completeRound}
            onFinish={finishAmrap}
            onDone={closeSheet}
            onShowNotes={() => setNotesOpen(true)}
          />
        )}
      </Sheet>

      {/* Exercise library notes — stacks over the exercise sheet (§3.5). */}
      <NotesSheet
        stack
        open={Boolean(openRow) && notesOpen}
        onClose={() => setNotesOpen(false)}
        name={openRow?.exercise?.name}
        notes={openRow?.exercise?.notes}
      />

      {/* ── on-the-fly library picker ──────────────────────────────── */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div style={{ flex: 'none', padding: '4px 16px 12px' }}>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>Add exercise</span>
          <div className="search-wrap" style={{ marginTop: 12 }}>
            <MagnifyingGlass size={15} weight="bold" className="search-icon" />
            <input
              className="search"
              type="text"
              placeholder="Search exercises"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="chip-row" style={{ marginTop: 10 }}>
            {['all', ...equipment.map((x) => x.name)].map((nm) => (
              <button
                key={nm}
                type="button"
                className={`chip${equipFilter === nm ? ' on' : ''}`}
                onClick={() => setEquipFilter(nm)}
              >
                {nm === 'all' ? 'All equipment' : nm}
              </button>
            ))}
          </div>
        </div>
        <div className="sheet-body">
          {pickerList.length === 0 ? (
            <div style={{ padding: '34px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--text-4)' }}>
              Nothing matches that search.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pickerList.map((e) => (
                <button key={e.id} type="button" className="pick-row" onClick={() => addExercise(e)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-title">{e.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
                      {e.equipment[0] && <span className="pill">{e.equipment[0]}</span>}
                      <span className="tnum" style={{ fontSize: 10.5, color: 'var(--text-4)' }}>
                        {e.format === 'amrap' ? 'AMRAP' : `${e.default_sets ?? 3}×${e.default_reps ?? 8}`}
                      </span>
                    </div>
                  </div>
                  <Plus size={16} weight="bold" style={{ color: 'var(--color-accent)', flex: 'none' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </Sheet>

      <Confirm
        open={finishAsk}
        title="Finish now?"
        body={`${planned.length - doneCount} exercise${planned.length - doneCount === 1 ? '' : 's'} still have unlogged sets. You can always log more later.`}
        confirmLabel="Finish"
        onConfirm={doFinish}
        onCancel={() => setFinishAsk(false)}
      />

      <Toast message={message} />
    </>
  )
}

// ── straight-sets sheet ──────────────────────────────────────────────
function StraightSheet({ row, sets, last, input, setInput, step, rest, onSkipRest, onAddRest, onLog, onDone, onShowNotes }) {
  const mt = row.exercise?.metric_type ?? 'weight'
  const target = row.target_sets ?? sets.length + 1
  const allLogged = sets.length >= target
  const setNo = sets.length + 1

  const lastLabel = last
    ? `Last time · ${metricValueLabel(mt, { weight: last.weight, duration: last.duration })} × ${last.reps}`
    : 'No previous logs'

  const primary =
    mt === 'time'
      ? {
          value: mmss(input.duration),
          unit: 'min:sec',
          dec: () => setInput((i) => ({ ...i, duration: clamp(i.duration - 5, 0, 3600) })),
          inc: () => setInput((i) => ({ ...i, duration: clamp(i.duration + 5, 0, 3600) })),
        }
      : mt === 'bodyweight'
        ? {
            value: metricValueLabel('bodyweight', { weight: input.weight }),
            unit: '± BW',
            dec: () => setInput((i) => ({ ...i, weight: clamp(i.weight - step, -300, 500) })),
            inc: () => setInput((i) => ({ ...i, weight: clamp(i.weight + step, -300, 500) })),
          }
        : {
            value: input.weight,
            unit: 'lb',
            dec: () => setInput((i) => ({ ...i, weight: clamp(i.weight - step, 0, 2000) })),
            inc: () => setInput((i) => ({ ...i, weight: clamp(i.weight + step, 0, 2000) })),
          }

  return (
    <>
      <div className="sheet-body">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <button type="button" className="sheet-title-btn" onClick={onShowNotes}>
            <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.015em' }}>{row.exercise?.name}</span>
            <NotePencil size={13} weight="bold" style={{ color: 'var(--text-4)', flex: 'none' }} />
          </button>
          <span className="tnum" style={{ fontSize: 12, color: 'var(--text-4)' }}>
            {sets.length}/{target} sets
          </span>
        </div>

        <div className="set-table">
          <div className="set-row set-head">
            <span>Set</span>
            <span>{mt === 'time' ? 'Time' : mt === 'bodyweight' ? 'BW ±' : 'Weight'}</span>
            <span>Reps</span>
            <span>Effort</span>
          </div>
          {sets.map((s, i) => (
            <div key={s.id} className="set-row">
              <span className="tnum" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{i + 1}</span>
              <span className="tnum">{metricValueLabel(mt, { weight: s.weight, duration: s.duration })}</span>
              <span className="tnum">{s.reps}</span>
              <span style={{ color: EFFORTS.find((e) => e.key === s.effort)?.color ?? 'var(--text-5)' }}>
                {EFFORTS.find((e) => e.key === s.effort)?.label ?? '—'}
              </span>
            </div>
          ))}
          {!allLogged && (
            <div className="set-row set-active">
              <span className="tnum" style={{ fontWeight: 600 }}>{setNo}</span>
              <span className="tnum" style={{ color: 'var(--text-3)' }}>{primary.value}</span>
              <span className="tnum" style={{ color: 'var(--text-3)' }}>{input.reps}</span>
              <span style={{ color: 'var(--text-5)' }}>—</span>
            </div>
          )}
        </div>
      </div>

      <div className="action-bar">
        {rest ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="log-stat-label">Rest</span>
              <span className="tnum" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--accent-fg)', lineHeight: 1 }}>
                {mmss(rest.left)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              <button type="button" className="cta cta-quiet" style={{ flex: 1 }} onClick={onAddRest}>
                +15s
              </button>
              <button type="button" className="cta" style={{ flex: 2 }} onClick={onSkipRest}>
                <SkipForward size={13} weight="bold" />
                Skip rest
              </button>
            </div>
          </>
        ) : allLogged ? (
          <button type="button" className="cta cta-quiet" onClick={onDone}>
            Done — back to workout
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="log-stat-label">Set {setNo} of {target}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-5)' }}>{lastLabel}</span>
            </div>
            <div className="log-steppers">
              <Stepper label="Primary" value={primary.value} unit={primary.unit} onDec={primary.dec} onInc={primary.inc} />
              <Stepper
                label="Reps"
                value={input.reps}
                unit="reps"
                onDec={() => setInput((i) => ({ ...i, reps: clamp(i.reps - 1, 0, 200) }))}
                onInc={() => setInput((i) => ({ ...i, reps: clamp(i.reps + 1, 0, 200) }))}
              />
            </div>
            <div className="effort-row">
              <span className="log-stat-label" style={{ flex: 'none' }}>Effort</span>
              {EFFORTS.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  className="effort-opt"
                  style={
                    input.effort === e.key
                      ? { borderColor: e.color, color: e.color, background: 'rgba(255,255,255,0.04)' }
                      : undefined
                  }
                  onClick={() => setInput((i) => ({ ...i, effort: i.effort === e.key ? null : e.key }))}
                >
                  {e.label}
                </button>
              ))}
            </div>
            <button type="button" className="cta" style={{ marginTop: 11 }} onClick={onLog}>
              {setNo === target ? 'Log set · finish exercise' : 'Log set'}
            </button>
          </>
        )}
      </div>
    </>
  )
}

// ── AMRAP sheet ──────────────────────────────────────────────────────
function AmrapSheet({ row, amrap, setAmrap, onStart, onPause, onResume, onCompleteRound, onFinish, onDone, onShowNotes }) {
  const { phase } = amrap
  const rounds = amrap.rounds ?? []
  const fullRounds = amrap.fullRounds ?? rounds.length
  const scoreLine = `${fullRounds} round${fullRounds === 1 ? '' : 's'}${amrap.partial ? ` + ${amrap.partial} reps` : ''}`

  return (
    <>
      <div className="sheet-body">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <button type="button" className="sheet-title-btn" onClick={onShowNotes}>
            <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.015em' }}>{row.exercise?.name}</span>
            <NotePencil size={13} weight="bold" style={{ color: 'var(--text-4)', flex: 'none' }} />
          </button>
          <span className="tnum" style={{ fontSize: 12, color: 'var(--text-4)' }}>
            {mmss(amrap.timeCap)} AMRAP · {amrap.target}/round
          </span>
        </div>

        {row.exercise?.notes?.trim() && (
          <button type="button" className="amrap-notes-hint" onClick={onShowNotes}>
            <NotePencil size={13} weight="bold" style={{ flex: 'none' }} />
            <span>Round instructions</span>
            <CaretRight size={12} weight="bold" style={{ flex: 'none', marginLeft: 'auto' }} />
          </button>
        )}

        {(phase === 'ready' || phase === 'running' || phase === 'paused') && (
          <div className="amrap-clock">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="log-stat-label">Time cap {mmss(amrap.timeCap)}</span>
              {phase === 'paused' && <span className="badge missed">Paused</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <span
                className="tnum"
                style={{ fontSize: 60, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 0.95, color: phase === 'ready' ? 'var(--text-3)' : 'var(--color-text)' }}
              >
                {mmss(phase === 'ready' ? amrap.timeCap : amrap.timeLeft)}
              </span>
              {phase === 'running' && (
                <button type="button" className="amrap-circle" onClick={onPause}>
                  <Pause size={17} weight="bold" />
                </button>
              )}
              {phase === 'paused' && (
                <button type="button" className="amrap-circle on" onClick={onResume}>
                  <Play size={17} weight="bold" />
                </button>
              )}
            </div>
            <div className="log-bar" style={{ marginTop: 16 }}>
              <div
                className="log-bar-fill"
                style={{ width: `${(amrap.timeLeft / amrap.timeCap) * 100}%`, transition: 'width 1s linear' }}
              />
            </div>

            {phase !== 'ready' && (
              <>
                <div className="amrap-target">
                  <div>
                    <div className="log-stat-label">Round {rounds.length + 1}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-5)', marginTop: 4 }}>
                      Target {amrap.target} reps
                    </div>
                  </div>
                  <span className="tnum" style={{ fontSize: 28, fontWeight: 600 }}>{amrap.target}</span>
                </div>
                {rounds.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    {rounds.map((r, i) => (
                      <span key={i} className="pill tnum">
                        R{i + 1}: {r}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {phase === 'time' && (
          <div style={{ textAlign: 'center', padding: '26px 0 10px' }}>
            <FlagCheckered size={30} weight="bold" style={{ color: 'var(--color-accent)' }} />
            <div style={{ fontSize: 24, fontWeight: 600, marginTop: 12 }}>Time!</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
              {rounds.length} full round{rounds.length === 1 ? '' : 's'} logged. Add any reps from the final round.
            </div>
          </div>
        )}

        {phase === 'summary' && (
          <div style={{ textAlign: 'center', padding: '30px 0 14px' }}>
            <div className="log-stat-label">Final score</div>
            <div className="tnum" style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--accent-fg)', marginTop: 12 }}>
              {fullRounds}
              {amrap.partial ? `+${amrap.partial}` : ''}
            </div>
            <div style={{ fontSize: 14, marginTop: 8 }}>{scoreLine}</div>
          </div>
        )}
      </div>

      <div className="action-bar">
        {phase === 'ready' && (
          <button type="button" className="cta cta-solid" onClick={onStart}>
            <Play size={16} weight="bold" />
            Start AMRAP
          </button>
        )}
        {(phase === 'running' || phase === 'paused') && !amrap.adjusting && (
          <div style={{ display: 'flex', gap: 9 }}>
            <button
              type="button"
              className="cta cta-quiet"
              style={{ flex: 1 }}
              onClick={() => setAmrap((a) => ({ ...a, adjusting: true, adjustVal: a.target }))}
            >
              Short round
            </button>
            <button
              type="button"
              className="cta"
              style={{ flex: 2 }}
              onClick={() => onCompleteRound(amrap.target)}
            >
              Complete round · {amrap.target}
            </button>
          </div>
        )}
        {(phase === 'running' || phase === 'paused') && amrap.adjusting && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Stepper
                label="Actual reps"
                value={amrap.adjustVal}
                unit="reps this round"
                onDec={() => setAmrap((a) => ({ ...a, adjustVal: clamp(a.adjustVal - 1, 0, 200) }))}
                onInc={() => setAmrap((a) => ({ ...a, adjustVal: clamp(a.adjustVal + 1, 0, 200) }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              <button
                type="button"
                className="cta cta-quiet"
                style={{ flex: 1 }}
                onClick={() => setAmrap((a) => ({ ...a, adjusting: false }))}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cta"
                style={{ flex: 2 }}
                onClick={() => onCompleteRound(amrap.adjustVal)}
              >
                Log round
              </button>
            </div>
          </>
        )}
        {phase === 'time' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Stepper
                label="Partial reps"
                value={amrap.partial}
                unit="reps in final round"
                onDec={() => setAmrap((a) => ({ ...a, partial: clamp(a.partial - 1, 0, 200) }))}
                onInc={() => setAmrap((a) => ({ ...a, partial: clamp(a.partial + 1, 0, 200) }))}
              />
            </div>
            <button type="button" className="cta" style={{ marginTop: 12 }} onClick={onFinish}>
              Log score
            </button>
          </>
        )}
        {phase === 'summary' && (
          <button type="button" className="cta cta-quiet" onClick={onDone}>
            Done — back to workout
          </button>
        )}
      </div>
    </>
  )
}
