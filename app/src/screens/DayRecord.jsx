import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  PencilSimple,
  Play,
  Plus,
  Copy,
  NotePencil,
  ArrowCounterClockwise,
  CheckCircle,
  MinusCircle,
  CircleDashed,
  Barbell,
} from '@phosphor-icons/react'
import { TopBar, Loading, ErrorNote, Toast, Confirm, NotesSheet } from '../components/ui.jsx'
import SetEditSheet from '../components/SetEditSheet.jsx'
import DatePickerSheet from '../components/DatePickerSheet.jsx'
import { useToast } from '../lib/useToast.js'
import { fetchDay, dayStatus, updateLoggedSet } from '../lib/sessions.js'
import { fetchSettings } from '../lib/settings.js'
import { copyDayTo, dayContent } from '../lib/copy.js'
import {
  todayISO,
  longDate,
  shortDate,
  mmss,
  metricValueLabel,
  plannedTargetLabel,
  formatTag,
  effortColor,
  effortLabel,
} from '../lib/format.js'

// Day Record (§3.7) — every date resolves to one of: logged (or in progress),
// scheduled, missed, or an empty open day. Never a dead end.

// Scheduled/missed row: not yet logged, so the whole row just opens the
// exercise's library notes (§3.5, rev. 25) — never a dead tap, even with none.
function ExerciseRow({ name, equip, tag, detail, icon, hasNotes, onClick }) {
  return (
    <button type="button" className="dr-row" onClick={onClick}>
      <span className="dr-thumb" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          {tag && <span className="dr-sets tnum">{tag}</span>}
          <span className="dr-name">{name}</span>
          {hasNotes && (
            <NotePencil size={12} weight="bold" style={{ color: 'var(--text-4)', flex: 'none' }} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
          {equip && <span className="pill">{equip}</span>}
          <span className="dr-detail tnum">{detail}</span>
        </div>
      </div>
      {icon}
    </button>
  )
}

// One already-logged set or AMRAP round — tappable to correct it in place,
// whether it was logged moments ago or weeks back (§3.4, rev. 27).
function LoggedSetRow({ index, set, metricType, isAmrap, onClick }) {
  const label = isAmrap ? (set.is_partial ? 'Partial' : `Round ${index + 1}`) : `Set ${index + 1}`
  const valueLabel = isAmrap
    ? `${set.reps} reps`
    : `${metricValueLabel(metricType, { weight: set.weight, duration: set.duration })} × ${set.reps}`
  return (
    <button type="button" className="dr-set-row" onClick={onClick}>
      <span className="dr-set-label">{label}</span>
      <span className="tnum dr-set-value">{valueLabel}</span>
      {!isAmrap && set.effort && (
        <span className="dr-set-effort" style={{ color: effortColor(set.effort) }}>
          {effortLabel(set.effort)}
        </span>
      )}
    </button>
  )
}

// Logged exercise card ("What you did"). The header still opens the
// exercise's library notes (§3.5, rev. 25); each set/round beneath it is its
// own tappable row to correct that value in place (§3.4, rev. 27).
function LoggedExerciseCard({ name, equip, tag, done, hasNotes, onShowNotes, sets, metricType, isAmrap, onEditSet }) {
  const rounds = isAmrap ? sets.filter((s) => !s.is_partial).sort((a, b) => a.set_number - b.set_number) : sets
  const partial = isAmrap ? sets.find((s) => s.is_partial) : null
  return (
    <div className={`dr-card${done ? '' : ' dim'}`}>
      <button type="button" className="dr-card-head" onClick={onShowNotes}>
        <span className="dr-thumb" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {tag && <span className="dr-sets tnum">{tag}</span>}
            <span className="dr-name">{name}</span>
            {hasNotes && (
              <NotePencil size={12} weight="bold" style={{ color: 'var(--text-4)', flex: 'none' }} />
            )}
          </div>
          {equip && (
            <div style={{ marginTop: 6 }}>
              <span className="pill">{equip}</span>
            </div>
          )}
        </div>
        {done ? (
          <CheckCircle size={16} weight="bold" style={{ color: 'var(--color-accent)', flex: 'none' }} />
        ) : (
          <MinusCircle size={16} weight="bold" style={{ color: 'var(--text-5)', flex: 'none' }} />
        )}
      </button>
      {done ? (
        <div className="dr-set-list">
          {rounds.map((s, i) => (
            <LoggedSetRow key={s.id} index={i} set={s} metricType={metricType} isAmrap={isAmrap} onClick={() => onEditSet(s, isAmrap)} />
          ))}
          {partial && (
            <LoggedSetRow key={partial.id} index={rounds.length} set={partial} metricType={metricType} isAmrap={isAmrap} onClick={() => onEditSet(partial, isAmrap)} />
          )}
        </div>
      ) : (
        <div className="dr-set-empty">Not logged</div>
      )}
    </div>
  )
}

export default function DayRecord() {
  const { date } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { message, show } = useToast()
  const today = todayISO()

  // Reached by finishing a workout or leaving the builder → those entries were
  // replaced, so history-back is broken/ambiguous. Go Home instead. (The bottom
  // nav is always there too, per §6 — this just makes the arrow do the sane thing.)
  const cameFromFlow = location.state?.from === 'workout-complete' || location.state?.from === 'builder'
  const onBack = () => (cameFromFlow ? navigate('/') : navigate(-1))

  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [pendingCopy, setPendingCopy] = useState(null) // { destDate, hasLogged, navigateAfter }
  const [copyBusy, setCopyBusy] = useState(false)
  const [notesFor, setNotesFor] = useState(null) // { name, notes } | null
  const [step, setStep] = useState(5)
  const [editingSet, setEditingSet] = useState(null) // logged_set being corrected (§3.4, rev. 27)
  const [editingFormat, setEditingFormat] = useState(null) // format resolved by the card it came from

  useEffect(() => {
    let live = true
    setData(null)
    setErr(null)
    Promise.all([fetchDay(date), fetchSettings()])
      .then(([d, settings]) => {
        if (!live) return
        setData(d)
        setStep(Number(settings.weight_step) || 5)
      })
      .catch((e) => live && setErr(e.message ?? 'Could not load this day.'))
    return () => {
      live = false
    }
  }, [date])

  // `isAmrap` here is resolved the same way LoggedExerciseCard resolves it
  // (preferring the planned row's frozen format over the exercise's current
  // library format), so the edit sheet can't be fooled by a since-changed
  // Format on the exercise itself (§3.4, rev. 27).
  function handleEditSet(set, isAmrap) {
    setEditingSet(set)
    setEditingFormat(isAmrap ? 'amrap' : 'straight_sets')
  }

  // Correct an already-logged set/round in place (§3.4, rev. 27) — no
  // confirmation, direct overwrite; works for a workout logged moments ago or
  // completed weeks back.
  async function saveEditedSet(patch) {
    try {
      const saved = await updateLoggedSet(editingSet.id, patch)
      setData((d) => ({ ...d, logged: d.logged.map((s) => (s.id === saved.id ? saved : s)) }))
      setEditingSet(null)
      setEditingFormat(null)
    } catch (e) {
      setErr(e.message ?? 'Could not save that set.')
    }
  }

  // Copy this day's structure elsewhere (§3.3). Confirm first only when the
  // destination already holds something.
  async function requestCopy(destDate, navigateAfter) {
    if (destDate === date) return
    setCopyOpen(false)
    try {
      const c = await dayContent(destDate)
      if (c.hasContent) {
        setPendingCopy({ destDate, hasLogged: c.hasLogged, navigateAfter })
      } else {
        await runCopy(destDate, navigateAfter)
      }
    } catch (e) {
      setErr(e.message ?? 'Could not check that date.')
    }
  }

  async function runCopy(destDate, navigateAfter) {
    setCopyBusy(true)
    try {
      await copyDayTo(date, destDate)
      setPendingCopy(null)
      if (navigateAfter) navigate(`/day/${destDate}`)
      else show(`Copied to ${shortDate(destDate)}`)
    } catch (e) {
      setErr(e.message ?? 'Could not copy the workout.')
      setPendingCopy(null)
    }
    setCopyBusy(false)
  }

  const dateLabel = longDate(date) + (date === today ? ' · Today' : '')

  if (err) {
    return (
      <>
        <TopBar title={dateLabel} onBack={onBack} />
        <ErrorNote>{err}</ErrorNote>
      </>
    )
  }
  if (data === null) {
    return (
      <>
        <TopBar title={dateLabel} onBack={onBack} />
        <Loading label="Loading" />
      </>
    )
  }

  const { session, planned, logged } = data
  const mode = dayStatus(session, date, today)
  const inProgress = session?.status === 'in_progress'
  const editable = mode === 'scheduled' || inProgress

  const loggedByExercise = {}
  for (const s of logged) {
    ;(loggedByExercise[s.exercise_id] ??= []).push(s)
  }
  const plannedIds = new Set(planned.map((p) => p.exercise_id))
  const extraLogged = logged.filter((s) => !plannedIds.has(s.exercise_id))
  const extraGroups = [...new Set(extraLogged.map((s) => s.exercise_id))].map((id) => ({
    id,
    exercise: extraLogged.find((s) => s.exercise_id === id).exercise,
    sets: loggedByExercise[id],
  }))

  const badge = {
    logged: inProgress ? { label: 'In progress', cls: 'scheduled' } : { label: 'Logged', cls: 'logged' },
    scheduled: { label: 'Scheduled', cls: 'scheduled' },
    missed: { label: 'Missed', cls: 'missed' },
    empty: { label: 'Nothing scheduled', cls: 'empty' },
  }[mode]

  const title =
    mode === 'empty' ? 'Open day' : session?.name ?? 'Workout'

  const totalSets = planned.reduce((n, p) => n + (p.format === 'amrap' ? 0 : p.target_sets ?? 0), 0)
  const subtitle = {
    logged: inProgress
      ? 'Logging in progress.'
      : session?.completed_at
        ? `Completed ${new Date(session.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
        : 'Workout logged.',
    scheduled: `${planned.length} exercise${planned.length === 1 ? '' : 's'}${totalSets ? ` · ${totalSets} sets planned` : ''}`,
    missed: 'Scheduled for this date. Nothing was logged.',
    empty: 'No workout planned and nothing logged.',
  }[mode]

  const doneCount = planned.filter((p) => (loggedByExercise[p.exercise_id] ?? []).length > 0).length
  let elapsed = null
  if (mode === 'logged' && session?.started_at) {
    const end = session.completed_at ? new Date(session.completed_at) : new Date()
    elapsed = mmss((end - new Date(session.started_at)) / 1000)
  }

  const listLabel = { logged: 'What you did', scheduled: 'Planned', missed: 'Was planned' }[mode]

  return (
    <>
      <TopBar
        title={dateLabel}
        onBack={onBack}
        right={
          editable ? (
            <button
              type="button"
              className="icon-btn"
              aria-label="Edit workout"
              onClick={() => navigate(`/day/${date}/build`)}
              style={{ flex: 'none' }}
            >
              <PencilSimple size={18} weight="bold" />
            </button>
          ) : null
        }
      />

      <div className="screen-scroll" style={{ paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
        </div>

        <div className="dr-title">{title}</div>
        <div className="dr-sub">{subtitle}</div>

        {mode === 'logged' && (
          <div className="dr-stats">
            {elapsed && (
              <div>
                <div className="dr-stat-num tnum">{elapsed}</div>
                <div className="dr-stat-label">Total time</div>
              </div>
            )}
            <div>
              <div className="dr-stat-num tnum">
                {doneCount}/{planned.length || doneCount}
              </div>
              <div className="dr-stat-label">Exercises</div>
            </div>
          </div>
        )}

        {mode === 'empty' ? (
          <div className="empty-card" style={{ marginTop: 22 }}>
            <Barbell size={22} weight="bold" style={{ color: 'var(--text-5)' }} />
            <p style={{ marginTop: 14 }}>
              Pick exercises as you go. Everything you log saves to this date, not today.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <span className="kicker">{listLabel}</span>
              {planned.length > 0 && (
                <button
                  type="button"
                  className="wk-copy"
                  style={{ marginTop: 0 }}
                  onClick={() => setCopyOpen(true)}
                >
                  <Copy size={12} weight="bold" />
                  Copy to…
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {planned.map((p) => {
                const mt = p.exercise?.metric_type ?? 'weight'
                const sets = loggedByExercise[p.exercise_id] ?? []
                const isLoggedView = mode === 'logged'
                const done = sets.length > 0
                return isLoggedView ? (
                  <LoggedExerciseCard
                    key={p.id}
                    name={p.exercise?.name ?? 'Exercise'}
                    equip={p.exercise?.equipment?.[0]}
                    tag={formatTag(p)}
                    done={done}
                    hasNotes={Boolean(p.exercise?.notes?.trim())}
                    onShowNotes={() =>
                      setNotesFor({ name: p.exercise?.name ?? 'Exercise', notes: p.exercise?.notes })
                    }
                    sets={sets}
                    metricType={mt}
                    isAmrap={(p.format ?? p.exercise?.format) === 'amrap'}
                    onEditSet={handleEditSet}
                  />
                ) : (
                  <ExerciseRow
                    key={p.id}
                    name={p.exercise?.name ?? 'Exercise'}
                    equip={p.exercise?.equipment?.[0]}
                    tag={formatTag(p)}
                    detail={plannedTargetLabel(p)}
                    hasNotes={Boolean(p.exercise?.notes?.trim())}
                    onClick={() =>
                      setNotesFor({ name: p.exercise?.name ?? 'Exercise', notes: p.exercise?.notes })
                    }
                    icon={<CircleDashed size={16} weight="bold" style={{ color: 'var(--text-5)', flex: 'none' }} />}
                  />
                )
              })}

              {extraGroups.map((g) => (
                <LoggedExerciseCard
                  key={g.id}
                  name={g.exercise?.name ?? 'Exercise'}
                  equip={g.exercise?.equipment?.[0]}
                  tag=""
                  done
                  hasNotes={Boolean(g.exercise?.notes?.trim())}
                  onShowNotes={() =>
                    setNotesFor({ name: g.exercise?.name ?? 'Exercise', notes: g.exercise?.notes })
                  }
                  sets={g.sets}
                  metricType={g.exercise?.metric_type ?? 'weight'}
                  isAmrap={g.exercise?.format === 'amrap'}
                  onEditSet={setEditingSet}
                />
              ))}
            </div>
          </div>
        )}

        {session?.notes && <div className="dr-note">{session.notes}</div>}
      </div>

      <div className="action-bar">
        {mode === 'empty' && (
          <button type="button" className="cta" onClick={() => navigate(`/day/${date}/build`)}>
            <Plus size={14} weight="bold" />
            Build workout
          </button>
        )}
        {mode === 'scheduled' && (
          <button type="button" className="cta" onClick={() => navigate(`/day/${date}/log`)}>
            <Play size={14} weight="bold" />
            Start workout
          </button>
        )}
        {mode === 'missed' && (
          <>
            <button type="button" className="cta cta-quiet" onClick={() => navigate(`/day/${date}/log`)}>
              <NotePencil size={14} weight="bold" />
              Log this workout anyway
            </button>
            <button
              type="button"
              className="cta"
              style={{ minHeight: 44, marginTop: 9, border: 0, background: 'transparent', color: 'var(--text-3)' }}
              onClick={() => navigate(-1)}
            >
              Leave it missed
            </button>
          </>
        )}
        {mode === 'logged' && inProgress && (
          <button type="button" className="cta" onClick={() => navigate(`/day/${date}/log`)}>
            <Play size={14} weight="bold" />
            Resume workout
          </button>
        )}
        {mode === 'logged' && !inProgress && (
          date === today ? (
            <button type="button" className="cta cta-quiet" onClick={() => navigate('/progress')}>
              <ArrowCounterClockwise size={14} weight="bold" />
              See your progress
            </button>
          ) : (
            <button
              type="button"
              className="cta cta-quiet"
              disabled={copyBusy}
              onClick={() => requestCopy(today, true)}
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              {copyBusy ? 'Copying…' : 'Repeat today'}
            </button>
          )
        )}
      </div>

      <DatePickerSheet
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        onPick={(iso) => requestCopy(iso, false)}
        title={`Copy ${title === 'Open day' ? 'this workout' : title} to`}
        excludeDate={date}
      />

      <Confirm
        open={Boolean(pendingCopy)}
        title="Replace that day?"
        body={
          pendingCopy &&
          `This replaces the workout on ${longDate(pendingCopy.destDate)} with a fresh copy of this one.`
        }
        warn={pendingCopy?.hasLogged ? 'Logged data for that day will be lost.' : null}
        confirmLabel="Replace"
        onConfirm={() => runCopy(pendingCopy.destDate, pendingCopy.navigateAfter)}
        onCancel={() => setPendingCopy(null)}
      />

      <NotesSheet
        open={Boolean(notesFor)}
        onClose={() => setNotesFor(null)}
        name={notesFor?.name}
        notes={notesFor?.notes}
      />

      {/* Correcting an already-logged set — reachable from a completed workout
          weeks back, not just one still in progress (§3.4, rev. 27). */}
      <SetEditSheet
        key={editingSet?.id ?? 'none'}
        open={Boolean(editingSet)}
        onClose={() => {
          setEditingSet(null)
          setEditingFormat(null)
        }}
        setRow={editingSet}
        format={editingFormat}
        step={step}
        onSave={saveEditedSet}
      />

      <Toast message={message} />
    </>
  )
}
