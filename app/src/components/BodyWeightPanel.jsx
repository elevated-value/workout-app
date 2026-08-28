import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { PencilSimple, Plus, Check, Minus, Scales } from '@phosphor-icons/react'
import { Loading, ErrorNote, Toast } from './ui.jsx'
import BodyWeightSheet from './BodyWeightSheet.jsx'
import { useToast } from '../lib/useToast.js'
import { fetchBodyWeight, fmtWhen } from '../lib/bodyweight.js'
import { fetchSettings, updateSettings } from '../lib/settings.js'

// Progress → Body Weight section (§3.8). Reuses the headline-stat-above-chart
// pattern from the exercise-progress detail view.
const C = { accent: '#9184d9', grid: '#262835', axis: '#595d6c', goal: '#5d5294' }
const RECENT = 14
const round1 = (n) => Math.round(n * 10) / 10

function dLabel(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function goalDiffLabel(current, goal) {
  const diff = Math.abs(current - goal)
  return diff < 0.1 ? 'at goal' : `${round1(diff)} to go`
}

function BwTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--line-strong)',
        borderRadius: 6,
        padding: '6px 9px',
        fontSize: 11,
      }}
    >
      <div style={{ color: 'var(--text-4)' }}>{label}</div>
      <div className="tnum" style={{ color: 'var(--color-text)', fontWeight: 600 }}>
        {payload[0].value} lbs
      </div>
    </div>
  )
}

export default function BodyWeightPanel() {
  const [entries, setEntries] = useState(null)
  const [settings, setSettings] = useState(null)
  const [err, setErr] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [goalEditing, setGoalEditing] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const { message, show } = useToast()

  useEffect(() => {
    let live = true
    Promise.all([fetchBodyWeight(), fetchSettings()])
      .then(([e, s]) => {
        if (!live) return
        setEntries(e)
        setSettings(s)
      })
      .catch((e) => live && setErr(e.message ?? 'Could not load body weight.'))
    return () => {
      live = false
    }
  }, [])

  const latest = entries?.length ? entries[entries.length - 1] : null
  const current = latest ? round1(Number(latest.weight)) : null
  const goal = settings?.goal_weight != null ? round1(Number(settings.goal_weight)) : null

  const shown = useMemo(
    () => (expanded ? entries ?? [] : (entries ?? []).slice(-RECENT)),
    [entries, expanded],
  )
  const chartData = shown.map((e) => ({ label: dLabel(e.logged_at), value: round1(Number(e.weight)) }))
  const recent = entries ? [...entries].reverse().slice(0, 10) : []

  async function saveGoal() {
    const g = parseFloat(goalDraft)
    const next = g > 0 ? round1(g) : null
    try {
      await updateSettings({ goal_weight: next })
      setSettings((s) => ({ ...s, goal_weight: next }))
      setGoalEditing(false)
    } catch (e) {
      setErr(e.message ?? 'Could not save the goal.')
    }
  }

  if (err) {
    return (
      <div className="screen-scroll">
        <ErrorNote>{err}</ErrorNote>
      </div>
    )
  }
  if (entries === null) return <Loading label="Loading" />

  return (
    <>
    <div className="screen-scroll">
      {entries.length === 0 ? (
        <div className="empty-card" style={{ marginTop: 8 }}>
          <Scales size={22} weight="bold" style={{ color: 'var(--text-5)' }} />
          <h3>No weigh-ins yet</h3>
          <p>Log your weight to start the trend. It’s independent of your workouts — record it any time.</p>
          <button type="button" className="cta" style={{ marginTop: 16 }} onClick={() => setSheetOpen(true)}>
            <Plus size={14} weight="bold" />
            Log weight
          </button>
        </div>
      ) : (
        <>
          <div className="prog-headline">
            <span className="tnum">{current} lbs</span>
            <span>Latest · {fmtWhen(latest.logged_at)}</span>
          </div>

          {goalEditing ? (
            <div className="bw-goal editing">
              <button type="button" aria-label="Lower goal" onClick={() => setGoalDraft((d) => String(Math.max(0, round1((parseFloat(d) || 0) - 1))))}>
                <Minus size={14} weight="bold" />
              </button>
              <input
                inputMode="decimal"
                className="tnum"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                aria-label="Goal weight"
              />
              <button type="button" aria-label="Raise goal" onClick={() => setGoalDraft((d) => String(round1((parseFloat(d) || 0) + 1)))}>
                <Plus size={14} weight="bold" />
              </button>
              <button type="button" className="bw-goal-done" onClick={saveGoal}>
                <Check size={13} weight="bold" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="bw-goal"
              onClick={() => {
                setGoalDraft(goal != null ? String(goal) : String(Math.round(current ?? 170)))
                setGoalEditing(true)
              }}
            >
              {goal != null ? (
                <span className="tnum">
                  Goal {goal} lbs · {goalDiffLabel(current, goal)}
                </span>
              ) : (
                <span>Set a goal weight</span>
              )}
              <PencilSimple size={11} weight="bold" style={{ color: 'var(--text-4)' }} />
            </button>
          )}

          <div className="prog-chart">
            <ResponsiveContainer width="100%" height={176}>
              <LineChart data={chartData} margin={{ top: 10, right: 6, bottom: 0, left: -8 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.axis, fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                />
                <YAxis
                  width={38}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: C.axis, fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<BwTip />} cursor={{ stroke: C.grid }} />
                {goal != null && <ReferenceLine y={goal} stroke={C.goal} strokeDasharray="4 4" />}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={C.accent}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: C.accent, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="prog-caption">
              {goal != null ? 'Dashed line is your goal weight.' : 'Logged weight over time.'}
            </div>
          </div>

          {entries.length > RECENT && (
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <button type="button" className="link-btn" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Show recent only' : `Show all ${entries.length} entries`}
              </button>
            </div>
          )}

          <div className="kicker" style={{ margin: '22px 0 10px' }}>Recent entries</div>
          <div className="prog-table">
            <div className="prog-row prog-head bw-entry">
              <span>When</span>
              <span>Weight</span>
              <span>Note</span>
            </div>
            {recent.map((e) => (
              <div key={e.id} className="prog-row bw-entry">
                <span style={{ color: 'var(--text-3)' }}>{fmtWhen(e.logged_at)}</span>
                <span className="tnum">{round1(Number(e.weight))} lbs</span>
                <span
                  style={{
                    color: 'var(--text-4)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {e.notes || '—'}
                </span>
              </div>
            ))}
          </div>

          <button type="button" className="cta" style={{ marginTop: 20 }} onClick={() => setSheetOpen(true)}>
            <Plus size={14} weight="bold" />
            Log weight
          </button>
        </>
      )}
    </div>

    <BodyWeightSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      defaultWeight={current ?? undefined}
      onSaved={(entry) => {
        setEntries((es) =>
          [...(es ?? []), entry].sort((a, b) =>
            a.logged_at < b.logged_at ? -1 : a.logged_at > b.logged_at ? 1 : 0,
          ),
        )
        show('Weigh-in saved')
      }}
    />
    <Toast message={message} />
    </>
  )
}
