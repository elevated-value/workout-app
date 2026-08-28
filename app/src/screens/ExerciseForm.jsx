import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Archive, ArrowCounterClockwise } from '@phosphor-icons/react'
import { TopBar, Loading, ErrorNote, Stepper, Confirm, Toast } from '../components/ui.jsx'
import {
  fetchExercise,
  fetchEquipment,
  ensureEquipment,
  createExercise,
  updateExercise,
  setExerciseArchived,
} from '../lib/library.js'
import {
  MUSCLE_GROUPS,
  EXERCISE_TYPES,
  METRIC_TYPES,
  FORMATS,
  primaryDefaultLabel,
} from '../lib/constants.js'
import { useToast } from '../lib/useToast.js'
import { mmss, restLabel } from '../lib/format.js'

// Add / Edit Exercise (§3.1). One form, reached via /library/new (blank) or
// /library/:id (pre-filled). Editing opens the same form. Which default fields
// are shown depends on format (AMRAP has no Sets) and metric type (weight vs.
// added-weight vs. duration).

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

export default function ExerciseForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { message, show } = useToast()

  const [loading, setLoading] = useState(editing)
  const [loadErr, setLoadErr] = useState(null)
  const [saveErr, setSaveErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [askArchive, setAskArchive] = useState(false)

  const [isCustom, setIsCustom] = useState(true)
  const [isArchived, setIsArchived] = useState(false)
  const [equipList, setEquipList] = useState([])
  const [newEquip, setNewEquip] = useState('')

  // form fields
  const [name, setName] = useState('')
  const [metricType, setMetricType] = useState('weight')
  const [format, setFormat] = useState('straight_sets')
  const [equipment, setEquipment] = useState([])
  const [muscles, setMuscles] = useState([])
  const [type, setType] = useState(null)
  const [notes, setNotes] = useState('')

  // defaults (kept as plain numbers; a 0 primary metric is stored as null)
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(8)
  const [weight, setWeight] = useState(0)
  const [duration, setDuration] = useState(60)
  const [rest, setRest] = useState(90)
  const [capMin, setCapMin] = useState(12)

  useEffect(() => {
    let live = true
    fetchEquipment()
      .then((eq) => live && setEquipList(eq.map((x) => x.name)))
      .catch(() => {})
    if (!editing) return
    fetchExercise(id)
      .then((e) => {
        if (!live) return
        setIsCustom(e.is_custom)
        setIsArchived(e.is_archived)
        setName(e.name)
        setMetricType(e.metric_type)
        setFormat(e.format)
        setEquipment(e.equipment ?? [])
        setMuscles(e.muscle_groups ?? [])
        setType(e.type ?? null)
        setNotes(e.notes ?? '')
        setSets(e.default_sets ?? 3)
        setReps(e.default_reps ?? 8)
        setWeight(e.default_weight ?? 0)
        setDuration(e.default_duration ?? 60)
        setRest(e.default_rest_seconds ?? 90)
        setCapMin(e.default_time_cap_seconds ? Math.round(e.default_time_cap_seconds / 60) : 12)
        setLoading(false)
      })
      .catch((err) => {
        if (!live) return
        setLoadErr(err.message ?? 'Could not load this exercise.')
        setLoading(false)
      })
    return () => {
      live = false
    }
  }, [id, editing])

  const allEquip = useMemo(
    () => [...new Set([...equipList, ...equipment])].sort((a, b) => a.localeCompare(b)),
    [equipList, equipment],
  )

  const toggle = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])

  function addNewEquipment() {
    const v = newEquip.trim()
    if (!v) return
    if (!equipment.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setEquipment([...equipment, v])
    }
    if (!equipList.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setEquipList([...equipList, v])
    }
    setNewEquip('')
  }

  async function save() {
    if (busy) return
    const trimmed = name.trim()
    if (!trimmed) {
      setSaveErr('Give the exercise a name.')
      return
    }
    setBusy(true)
    setSaveErr(null)

    const isAmrap = format === 'amrap'
    const payload = {
      name: trimmed,
      equipment,
      muscle_groups: muscles,
      type: type || null,
      metric_type: metricType,
      format,
      notes: notes.trim() || null,
      default_reps: reps,
      default_sets: isAmrap ? null : sets,
      default_rest_seconds: isAmrap ? null : rest,
      default_time_cap_seconds: isAmrap ? capMin * 60 : null,
      default_weight: metricType === 'time' ? null : weight || null,
      default_duration: metricType === 'time' ? duration || null : null,
    }

    try {
      await ensureEquipment(equipment)
      if (editing) await updateExercise(id, payload)
      else await createExercise(payload)
      navigate('/library', { replace: true })
    } catch (err) {
      setSaveErr(err.message ?? 'Could not save. Try again.')
      setBusy(false)
    }
  }

  async function doArchive() {
    setAskArchive(false)
    try {
      await setExerciseArchived(id, !isArchived)
      if (isArchived) {
        setIsArchived(false)
        show('Exercise restored')
      } else {
        navigate('/library', { replace: true })
      }
    } catch (err) {
      setSaveErr(err.message ?? 'Could not archive. Try again.')
    }
  }

  if (loading) {
    return (
      <>
        <TopBar title="Edit Exercise" />
        <Loading label="Loading" />
      </>
    )
  }
  if (loadErr) {
    return (
      <>
        <TopBar title="Edit Exercise" />
        <ErrorNote>{loadErr}</ErrorNote>
      </>
    )
  }

  const isAmrap = format === 'amrap'
  const primaryLabel = primaryDefaultLabel(metricType)
  const weightDisplay =
    metricType === 'bodyweight'
      ? weight === 0
        ? 'BW'
        : weight > 0
          ? `+${weight}`
          : `${weight}`
      : `${weight}`

  return (
    <>
      <TopBar
        title={editing ? 'Edit Exercise' : 'New Exercise'}
        right={
          <button
            type="button"
            className="mini-btn"
            onClick={save}
            disabled={busy}
            style={{ flex: 'none' }}
          >
            <Check size={13} weight="bold" />
            {busy ? 'Saving' : 'Save'}
          </button>
        }
      />

      {saveErr && <ErrorNote>{saveErr}</ErrorNote>}

      <div className="form-scroll">
        {/* Name */}
        <div className="fld" style={{ marginTop: 6 }}>
          <div className="fld-label">Name</div>
          <input
            className="input"
            type="text"
            placeholder="e.g. Barbell Bench Press"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!editing}
          />
        </div>

        {/* Metric type */}
        <div className="fld">
          <div className="fld-label">Metric Type</div>
          <div className="seg">
            {METRIC_TYPES.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`seg-opt${metricType === m.key ? ' on' : ''}`}
                onClick={() => setMetricType(m.key)}
              >
                <div className="seg-opt-title">{m.label}</div>
                <div className="seg-opt-help">{m.help}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="fld">
          <div className="fld-label">Format</div>
          <div className="seg">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`seg-opt${format === f.key ? ' on' : ''}`}
                onClick={() => setFormat(f.key)}
              >
                <div className="seg-opt-title">{f.label}</div>
                <div className="seg-opt-help">{f.help}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="fld">
          <div className="fld-label">Equipment</div>
          <div className="chip-wrap">
            {allEquip.map((name) => (
              <button
                key={name}
                type="button"
                className={`chip${equipment.includes(name) ? ' on' : ''}`}
                onClick={() => toggle(equipment, setEquipment, name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="inline-add">
            <input
              type="text"
              placeholder="Add new equipment"
              value={newEquip}
              onChange={(e) => setNewEquip(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addNewEquipment()
                }
              }}
            />
            <button type="button" className="mini-btn quiet" onClick={addNewEquipment}>
              Add
            </button>
          </div>
        </div>

        {/* Muscle groups */}
        <div className="fld">
          <div className="fld-label">
            Muscle Groups <span className="fld-opt">optional</span>
          </div>
          <div className="chip-wrap">
            {MUSCLE_GROUPS.map((m) => (
              <button
                key={m}
                type="button"
                className={`chip${muscles.includes(m) ? ' on' : ''}`}
                onClick={() => toggle(muscles, setMuscles, m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="fld">
          <div className="fld-label">
            Type <span className="fld-opt">optional</span>
          </div>
          <div className="chip-wrap">
            {EXERCISE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip${type === t ? ' on' : ''}`}
                onClick={() => setType(type === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Defaults */}
        <div className="fld">
          <div className="fld-label">
            Default Targets <span className="fld-opt">pre-fill each day this is added to</span>
          </div>
          <div className="def-list">
            {!isAmrap && (
              <div className="def-row">
                <span className="def-name">Sets</span>
                <Stepper
                  label="Default sets"
                  value={sets}
                  onDec={() => setSets((v) => clamp(v - 1, 1, 20))}
                  onInc={() => setSets((v) => clamp(v + 1, 1, 20))}
                />
              </div>
            )}

            <div className="def-row">
              <span className="def-name">{isAmrap ? 'Reps / round' : 'Reps'}</span>
              <Stepper
                label="Default reps"
                value={reps}
                onDec={() => setReps((v) => clamp(v - 1, 1, 100))}
                onInc={() => setReps((v) => clamp(v + 1, 1, 100))}
              />
            </div>

            {metricType === 'time' ? (
              <div className="def-row">
                <span className="def-name">{primaryLabel}</span>
                <Stepper
                  label={primaryLabel}
                  value={mmss(duration)}
                  unit="min:sec"
                  onDec={() => setDuration((v) => clamp(v - 5, 0, 3600))}
                  onInc={() => setDuration((v) => clamp(v + 5, 0, 3600))}
                />
              </div>
            ) : (
              <div className="def-row">
                <span className="def-name">{primaryLabel}</span>
                <Stepper
                  label={primaryLabel}
                  value={weightDisplay}
                  unit={metricType === 'bodyweight' ? 'lb ± BW' : 'lb'}
                  onDec={() =>
                    setWeight((v) => clamp(v - 5, metricType === 'bodyweight' ? -200 : 0, 2000))
                  }
                  onInc={() => setWeight((v) => clamp(v + 5, metricType === 'bodyweight' ? -200 : 0, 2000))}
                />
              </div>
            )}

            {isAmrap ? (
              <div className="def-row">
                <span className="def-name">Time Cap</span>
                <Stepper
                  label="Time cap"
                  value={capMin}
                  unit="min"
                  onDec={() => setCapMin((v) => clamp(v - 1, 1, 90))}
                  onInc={() => setCapMin((v) => clamp(v + 1, 1, 90))}
                />
              </div>
            ) : (
              <div className="def-row">
                <span className="def-name">Rest</span>
                <Stepper
                  label="Default rest"
                  value={restLabel(rest) ?? 'None'}
                  onDec={() => setRest((v) => clamp(v - 15, 0, 600))}
                  onInc={() => setRest((v) => clamp(v + 15, 0, 600))}
                />
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="fld">
          <div className="fld-label">
            Notes <span className="fld-opt">optional</span>
          </div>
          <textarea
            className="input"
            placeholder="Cues, setup, variations…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Archive — custom exercises only (§3.1) */}
        {editing && isCustom && (
          <button
            type="button"
            className="archive-btn"
            onClick={() => setAskArchive(true)}
          >
            {isArchived ? (
              <>
                <ArrowCounterClockwise size={14} weight="bold" />
                Restore to active library
              </>
            ) : (
              <>
                <Archive size={14} weight="bold" />
                Archive exercise
              </>
            )}
          </button>
        )}
        {editing && !isCustom && (
          <p className="archive-note">
            Starter-library exercises can’t be archived — they stay as a permanent base set.
          </p>
        )}
      </div>

      <Confirm
        open={askArchive}
        title={isArchived ? 'Restore this exercise?' : 'Archive this exercise?'}
        body={
          isArchived
            ? 'It’ll reappear in the active library and the Add Exercise picker.'
            : 'It’s removed from the active library and the Add Exercise picker. Past logged workouts and progress history stay intact.'
        }
        confirmLabel={isArchived ? 'Restore' : 'Archive'}
        onConfirm={doArchive}
        onCancel={() => setAskArchive(false)}
      />

      <Toast message={message} />
    </>
  )
}
