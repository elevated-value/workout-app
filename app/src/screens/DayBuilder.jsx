import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus,
  Minus,
  CaretUp,
  CaretDown,
  MagnifyingGlass,
  Barbell,
} from '@phosphor-icons/react'
import { TopBar, Loading, ErrorNote, Sheet, Stepper, Toast } from '../components/ui.jsx'
import { useToast } from '../lib/useToast.js'
import { fetchExercises, fetchEquipment } from '../lib/library.js'
import {
  fetchDay,
  ensureSession,
  updateSession,
  deleteSessionIfEmpty,
  addPlannedExercise,
  updatePlannedExercise,
  removePlannedExercise,
  swapPlannedPositions,
} from '../lib/sessions.js'
import {
  longDate,
  todayISO,
  mmss,
  restLabel,
  metricValueLabel,
  plannedTargetLabel,
  formatTag,
} from '../lib/format.js'

// Day builder / Edit a day (§3.2, §3.4). Add from the library, reorder with
// Move Up / Move Down, remove, and adjust per-day targets — none of it touches
// the library defaults or any other date. AMRAP rows never show a Sets control.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

// Local editable copy of a row's targets, seeded from the planned row.
function targetsFromRow(r) {
  return {
    sets: r.target_sets ?? 3,
    reps: r.target_reps ?? (r.format === 'amrap' ? 5 : 8),
    weight: r.target_weight ?? 0,
    duration: r.target_duration ?? 60,
    rest: r.rest_seconds ?? 90,
    capMin: r.time_cap_seconds ? Math.round(r.time_cap_seconds / 60) : 12,
  }
}

export default function DayBuilder() {
  const { date } = useParams()
  const navigate = useNavigate()
  const { message, show } = useToast()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [session, setSession] = useState(null)
  const [hasLogged, setHasLogged] = useState(false)
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')

  const [lib, setLib] = useState([])
  const [equipment, setEquipment] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [q, setQ] = useState('')
  const [equipFilter, setEquipFilter] = useState('all')

  const [edit, setEdit] = useState(null) // { row, ...targets }

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const [day, exs, eq] = await Promise.all([fetchDay(date), fetchExercises(), fetchEquipment()])
        if (!live) return
        setSession(day.session)
        setName(day.session?.name ?? '')
        setHasLogged(day.logged.length > 0)
        setRows(day.planned)
        setLib(exs.filter((e) => !e.is_archived))
        setEquipment(eq)
      } catch (e) {
        if (live) setErr(e.message ?? 'Could not load this day.')
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => {
      live = false
    }
  }, [date])

  async function getSession() {
    if (session) return session
    const s = await ensureSession(date)
    setSession(s)
    return s
  }

  async function leave() {
    try {
      if (session && rows.length === 0) await deleteSessionIfEmpty(session.id)
    } catch {
      /* non-fatal — worst case an empty session lingers */
    }
    navigate(`/day/${date}`, { replace: true, state: { from: 'builder' } })
  }

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed && !session) return
    try {
      const s = await getSession()
      await updateSession(s.id, { name: trimmed || null })
    } catch (e) {
      setErr(e.message ?? 'Could not save the name.')
    }
  }

  async function addExercise(ex) {
    try {
      const s = await getSession()
      const position = rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 0
      const row = await addPlannedExercise(s.id, ex, position)
      setRows((r) => [...r, row])
      setPickerOpen(false)
      setQ('')
      show(`${ex.name} added`)
    } catch (e) {
      setErr(e.message ?? 'Could not add that exercise.')
    }
  }

  async function removeRow(row) {
    try {
      await removePlannedExercise(row.id)
      setRows((r) => r.filter((x) => x.id !== row.id))
      show('Removed from this day')
    } catch (e) {
      setErr(e.message ?? 'Could not remove that exercise.')
    }
  }

  async function move(row, dir) {
    const i = rows.findIndex((r) => r.id === row.id)
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const a = rows[i]
    const b = rows[j]
    try {
      await swapPlannedPositions(a, b)
      setRows((r) => {
        const next = [...r]
        next[i] = { ...b, position: a.position }
        next[j] = { ...a, position: b.position }
        return next
      })
    } catch (e) {
      setErr(e.message ?? 'Could not reorder.')
    }
  }

  async function saveTargets() {
    const { row } = edit
    const isAmrap = row.format === 'amrap'
    const mt = row.exercise?.metric_type ?? 'weight'
    const patch = isAmrap
      ? {
          target_reps: edit.reps,
          time_cap_seconds: edit.capMin * 60,
          rest_seconds: edit.rest || null,
        }
      : {
          target_sets: edit.sets,
          target_reps: edit.reps,
          rest_seconds: edit.rest || null,
          target_weight: mt === 'time' ? null : edit.weight || null,
          target_duration: mt === 'time' ? edit.duration || null : null,
        }
    try {
      await updatePlannedExercise(row.id, patch)
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, ...patch } : x)))
      setEdit(null)
    } catch (e) {
      setErr(e.message ?? 'Could not save targets.')
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

  if (loading) {
    return (
      <>
        <TopBar title={longDate(date)} />
        <Loading label="Loading" />
      </>
    )
  }
  if (err && !rows.length && !session) {
    return (
      <>
        <TopBar title={longDate(date)} />
        <ErrorNote>{err}</ErrorNote>
      </>
    )
  }

  return (
    <>
      <TopBar
        title={longDate(date) + (date === todayISO() ? ' · Today' : '')}
        onBack={leave}
      />

      {err && <ErrorNote>{err}</ErrorNote>}

      <div className="form-scroll">
        <div className="fld" style={{ marginTop: 6 }}>
          <div className="fld-label">
            Workout name <span className="fld-opt">optional</span>
          </div>
          <input
            className="input"
            type="text"
            placeholder="e.g. Upper Day A, Cindy"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
          />
        </div>

        {hasLogged && (
          <p className="archive-note" style={{ marginTop: 16, textAlign: 'left' }}>
            Some sets are already logged for this day — removing an exercise keeps its logged history.
          </p>
        )}

        <div className="fld">
          <div className="fld-label">
            Exercises <span className="fld-opt">{rows.length} on this day</span>
          </div>

          {rows.length === 0 ? (
            <div className="empty-card">
              <Barbell size={22} weight="bold" style={{ color: 'var(--text-5)' }} />
              <p style={{ marginTop: 12 }}>
                Nothing added yet. Pull exercises from your library — targets pre-fill from each
                one’s defaults and stay editable for this day.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {rows.map((r, i) => (
                <div key={r.id} className="build-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      {formatTag(r) && <span className="dr-sets tnum">{formatTag(r)}</span>}
                      <span className="dr-name">{r.exercise?.name ?? 'Exercise'}</span>
                    </div>
                    <button
                      type="button"
                      className="build-targets"
                      onClick={() => setEdit({ row: r, ...targetsFromRow(r) })}
                    >
                      {r.exercise?.equipment?.[0] && (
                        <span className="pill">{r.exercise.equipment[0]}</span>
                      )}
                      <span className="tnum">{plannedTargetLabel(r)}</span>
                      {restLabel(r.rest_seconds) && (
                        <span className="tnum" style={{ color: 'var(--text-5)' }}>
                          · {restLabel(r.rest_seconds)} rest
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="build-move">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(r, -1)}
                    >
                      <CaretUp size={13} weight="bold" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={i === rows.length - 1}
                      onClick={() => move(r, 1)}
                    >
                      <CaretDown size={13} weight="bold" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="build-remove"
                    aria-label="Remove exercise"
                    onClick={() => removeRow(r)}
                  >
                    <Minus size={15} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="add-ex-btn"
            onClick={() => setPickerOpen(true)}
          >
            <Plus size={14} weight="bold" />
            Add exercise
          </button>
        </div>
      </div>

      <div className="action-bar">
        <button type="button" className="cta" onClick={leave}>
          Done
        </button>
      </div>

      {/* Library picker */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div style={{ flex: 'none', padding: '4px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>Add exercise</span>
            <span className="tnum" style={{ fontSize: 10.5, color: 'var(--text-4)' }}>
              {pickerList.length}
            </span>
          </div>
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

      {/* Per-exercise targets */}
      <Sheet open={Boolean(edit)} onClose={() => setEdit(null)}>
        {edit && (
          <>
            <div className="sheet-body">
              <div className="kicker">Targets · this day only</div>
              <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 9 }}>
                {edit.row.exercise?.name}
              </div>

              <div className="def-list" style={{ marginTop: 18 }}>
                {edit.row.format !== 'amrap' && (
                  <div className="def-row">
                    <span className="def-name">Sets</span>
                    <Stepper
                      label="Sets"
                      value={edit.sets}
                      onDec={() => setEdit((s) => ({ ...s, sets: clamp(s.sets - 1, 1, 20) }))}
                      onInc={() => setEdit((s) => ({ ...s, sets: clamp(s.sets + 1, 1, 20) }))}
                    />
                  </div>
                )}

                <div className="def-row">
                  <span className="def-name">{edit.row.format === 'amrap' ? 'Reps / round' : 'Reps'}</span>
                  <Stepper
                    label="Reps"
                    value={edit.reps}
                    onDec={() => setEdit((s) => ({ ...s, reps: clamp(s.reps - 1, 1, 100) }))}
                    onInc={() => setEdit((s) => ({ ...s, reps: clamp(s.reps + 1, 1, 100) }))}
                  />
                </div>

                {edit.row.format === 'amrap' ? (
                  <div className="def-row">
                    <span className="def-name">Time cap</span>
                    <Stepper
                      label="Time cap"
                      value={edit.capMin}
                      unit="min"
                      onDec={() => setEdit((s) => ({ ...s, capMin: clamp(s.capMin - 1, 1, 90) }))}
                      onInc={() => setEdit((s) => ({ ...s, capMin: clamp(s.capMin + 1, 1, 90) }))}
                    />
                  </div>
                ) : (edit.row.exercise?.metric_type ?? 'weight') === 'time' ? (
                  <div className="def-row">
                    <span className="def-name">Time</span>
                    <Stepper
                      label="Target time"
                      value={mmss(edit.duration)}
                      unit="min:sec"
                      onDec={() => setEdit((s) => ({ ...s, duration: clamp(s.duration - 5, 0, 3600) }))}
                      onInc={() => setEdit((s) => ({ ...s, duration: clamp(s.duration + 5, 0, 3600) }))}
                    />
                  </div>
                ) : (
                  <div className="def-row">
                    <span className="def-name">
                      {(edit.row.exercise?.metric_type ?? 'weight') === 'bodyweight' ? 'Added wt' : 'Weight'}
                    </span>
                    <Stepper
                      label="Target weight"
                      value={
                        (edit.row.exercise?.metric_type ?? 'weight') === 'bodyweight'
                          ? metricValueLabel('bodyweight', { weight: edit.weight })
                          : edit.weight
                      }
                      unit={(edit.row.exercise?.metric_type ?? 'weight') === 'bodyweight' ? '± BW' : 'lb'}
                      onDec={() =>
                        setEdit((s) => ({
                          ...s,
                          weight: clamp(
                            s.weight - 5,
                            (edit.row.exercise?.metric_type ?? 'weight') === 'bodyweight' ? -200 : 0,
                            2000,
                          ),
                        }))
                      }
                      onInc={() => setEdit((s) => ({ ...s, weight: clamp(s.weight + 5, -200, 2000) }))}
                    />
                  </div>
                )}

                <div className="def-row">
                  <span className="def-name">Rest</span>
                  <Stepper
                    label="Rest"
                    value={restLabel(edit.rest) ?? 'None'}
                    onDec={() => setEdit((s) => ({ ...s, rest: clamp(s.rest - 15, 0, 600) }))}
                    onInc={() => setEdit((s) => ({ ...s, rest: clamp(s.rest + 15, 0, 600) }))}
                  />
                </div>
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-5)', lineHeight: 1.6, marginTop: 16 }}>
                Changing these only affects {longDate(date)} — the library default is untouched.
              </p>
            </div>
            <div className="action-bar">
              <button type="button" className="cta" onClick={saveTargets}>
                Done
              </button>
            </div>
          </>
        )}
      </Sheet>

      <Toast message={message} />
    </>
  )
}
