import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  PencilSimple,
  Play,
  Plus,
  NotePencil,
  ArrowCounterClockwise,
  CheckCircle,
  MinusCircle,
  CircleDashed,
  Barbell,
} from '@phosphor-icons/react'
import { TopBar, Loading, ErrorNote, Toast } from '../components/ui.jsx'
import { useToast } from '../lib/useToast.js'
import { fetchDay, dayStatus } from '../lib/sessions.js'
import { todayISO, longDate, mmss, metricValueLabel, plannedTargetLabel, formatTag } from '../lib/format.js'

// Day Record (§3.7) — every date resolves to one of: logged (or in progress),
// scheduled, missed, or an empty open day. Never a dead end.

function loggedDetail(sets, metricType) {
  if (!sets.length) return 'Not logged'
  if (metricType === 'time') {
    return sets.map((s) => (s.duration != null ? mmss(s.duration) : '–')).join(' / ')
  }
  const vals = sets.map((s) => metricValueLabel(metricType, { weight: s.weight, duration: s.duration }))
  const uniq = [...new Set(vals)]
  return uniq.length === 1 ? `${sets.length}× ${uniq[0]}` : vals.join(' / ')
}

function ExerciseRow({ name, equip, tag, detail, dim, icon }) {
  return (
    <div className={`dr-row${dim ? ' dim' : ''}`}>
      <span className="dr-thumb" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          {tag && <span className="dr-sets tnum">{tag}</span>}
          <span className="dr-name">{name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
          {equip && <span className="pill">{equip}</span>}
          <span className="dr-detail tnum">{detail}</span>
        </div>
      </div>
      {icon}
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

  useEffect(() => {
    let live = true
    setData(null)
    setErr(null)
    fetchDay(date)
      .then((d) => live && setData(d))
      .catch((e) => live && setErr(e.message ?? 'Could not load this day.'))
    return () => {
      live = false
    }
  }, [date])

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
            <div className="kicker" style={{ marginBottom: 12 }}>{listLabel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {planned.map((p) => {
                const mt = p.exercise?.metric_type ?? 'weight'
                const sets = loggedByExercise[p.exercise_id] ?? []
                const isLoggedView = mode === 'logged'
                const done = sets.length > 0
                return (
                  <ExerciseRow
                    key={p.id}
                    name={p.exercise?.name ?? 'Exercise'}
                    equip={p.exercise?.equipment?.[0]}
                    tag={formatTag(p)}
                    detail={isLoggedView ? loggedDetail(sets, mt) : plannedTargetLabel(p)}
                    dim={isLoggedView && !done}
                    icon={
                      isLoggedView ? (
                        done ? (
                          <CheckCircle size={16} weight="bold" style={{ color: 'var(--color-accent)', flex: 'none' }} />
                        ) : (
                          <MinusCircle size={16} weight="bold" style={{ color: 'var(--text-5)', flex: 'none' }} />
                        )
                      ) : (
                        <CircleDashed size={16} weight="bold" style={{ color: 'var(--text-5)', flex: 'none' }} />
                      )
                    }
                  />
                )
              })}

              {extraGroups.map((g) => (
                <ExerciseRow
                  key={g.id}
                  name={g.exercise?.name ?? 'Exercise'}
                  equip={g.exercise?.equipment?.[0]}
                  tag=""
                  detail={loggedDetail(g.sets, g.exercise?.metric_type ?? 'weight')}
                  icon={<CheckCircle size={16} weight="bold" style={{ color: 'var(--color-accent)', flex: 'none' }} />}
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
          <button
            type="button"
            className="cta cta-quiet"
            onClick={() => show('Repeat / Copy arrives with the Copy & Duplicate step.')}
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            Repeat this workout
          </button>
        )}
      </div>

      <Toast message={message} />
    </>
  )
}
