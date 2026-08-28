import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { TopBar, Loading, ErrorNote } from '../components/ui.jsx'
import { fetchExerciseLog, buildSessions, prValue, prLabel, HEADLINE, CHART_CAPTION, setValueLabel } from '../lib/progress.js'
import { fromISODate, shortDate, mmss, EFFORTS } from '../lib/format.js'

// Per-exercise progress detail (§3.6). One shared layout, three metric-type
// variants plus an AMRAP variant, all driven off buildSessions().

// Chart colours — concrete values matching the Nocturne tokens (SVG fill/stroke
// attributes don't resolve CSS custom properties reliably).
const C = { accent: '#9184d9', grid: '#262835', axis: '#595d6c' }

const RECENT = 14

function dLabel(iso) {
  const d = fromISODate(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function ChartTip({ active, payload, label, mode }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const val =
    mode === 'time'
      ? mmss(p.value)
      : mode === 'amrap'
        ? `${p.value} round${p.value === 1 ? '' : 's'}${p.partial ? ` +${p.partial}` : ''}`
        : mode === 'weight' || mode === 'added'
          ? `${p.value} lb`
          : `${p.value} reps`
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
      <div style={{ color: 'var(--color-text)', fontWeight: 600 }} className="tnum">
        {val}
      </div>
    </div>
  )
}

export default function ExerciseProgress() {
  const { exerciseId } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let live = true
    setData(null)
    setErr(null)
    fetchExerciseLog(exerciseId)
      .then((d) => live && setData(d))
      .catch((e) => live && setErr(e.message ?? 'Could not load this exercise.'))
    return () => {
      live = false
    }
  }, [exerciseId])

  const built = useMemo(
    () => (data ? buildSessions(data.exercise, data.sets) : { mode: null, sessions: [] }),
    [data],
  )
  const { mode, sessions } = built
  const pr = prValue(mode, sessions)

  const shown = expanded ? sessions : sessions.slice(-RECENT)
  const chartData = shown.map((s) => ({ ...s, label: dLabel(s.date) }))
  const recentSets = data ? [...data.sets].reverse().slice(0, 12) : []

  if (err) {
    return (
      <>
        <TopBar title="Progress" />
        <ErrorNote>{err}</ErrorNote>
      </>
    )
  }
  if (data === null) {
    return (
      <>
        <TopBar title="Progress" />
        <Loading label="Loading" />
      </>
    )
  }

  return (
    <>
      <TopBar title={data.exercise.name} />

      <div className="screen-scroll">
        <div className="prog-headline">
          <span className="tnum">{prLabel(mode, pr)}</span>
          <span>{HEADLINE[mode]}</span>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-card" style={{ marginTop: 18 }}>
            <p>No logged sets for this exercise yet.</p>
          </div>
        ) : (
          <>
            <div className="prog-chart">
              <ResponsiveContainer width="100%" height={176}>
                {mode === 'time' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 6, bottom: 0, left: -14 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: C.axis, fontSize: 9 }}
                      tickLine={false}
                      axisLine={{ stroke: C.grid }}
                    />
                    <YAxis
                      reversed
                      width={44}
                      tickFormatter={mmss}
                      tick={{ fill: C.axis, fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTip mode={mode} />} cursor={{ stroke: C.grid }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={C.accent}
                      strokeWidth={2}
                      dot={{ r: 3, fill: C.accent, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 6, bottom: 0, left: -14 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: C.axis, fontSize: 9 }}
                      tickLine={false}
                      axisLine={{ stroke: C.grid }}
                    />
                    <YAxis
                      width={30}
                      tick={{ fill: C.axis, fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTip mode={mode} />} cursor={{ fill: 'rgba(145,132,217,0.08)' }} />
                    <Bar dataKey="value" fill={C.accent} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  </BarChart>
                )}
              </ResponsiveContainer>
              <div className="prog-caption">{CHART_CAPTION[mode]}</div>
            </div>

            {sessions.length > RECENT && (
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button type="button" className="link-btn" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'Show recent only' : `Show all ${sessions.length} sessions`}
                </button>
              </div>
            )}

            <div className="kicker" style={{ margin: '22px 0 10px' }}>Recent sets</div>
            <div className="prog-table">
              <div className="prog-row prog-head">
                <span>Date</span>
                <span>Value</span>
                <span>Reps</span>
                <span>Effort</span>
              </div>
              {recentSets.map((s) => (
                <div key={s.id} className="prog-row">
                  <span className="tnum" style={{ color: 'var(--text-3)' }}>
                    {shortDate(s.date)}
                  </span>
                  <span className="tnum">{setValueLabel(mode, s)}</span>
                  <span className="tnum">{s.reps ?? '—'}</span>
                  <span style={{ color: EFFORTS.find((e) => e.key === s.effort)?.color ?? 'var(--text-5)' }}>
                    {EFFORTS.find((e) => e.key === s.effort)?.label ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
