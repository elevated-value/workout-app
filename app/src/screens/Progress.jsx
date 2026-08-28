import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlass, CaretRight, ChartLineUp } from '@phosphor-icons/react'
import { Loading, ErrorNote } from '../components/ui.jsx'
import { fetchAllLoggedSets, buildSessions, prValue, prLabel } from '../lib/progress.js'

// Progress landing (§3.6) — the exercises Jeff has actually logged, each with an
// at-a-glance PR for its metric type / format. Same search + chip-filter pattern
// as the Library. (Body Weight lives here too per §3.6 — added with §3.8.)
export default function Progress() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [equip, setEquip] = useState('all')
  const [muscle, setMuscle] = useState('all')

  useEffect(() => {
    let live = true
    fetchAllLoggedSets()
      .then((all) => {
        if (!live) return
        const byEx = new Map()
        for (const s of all) {
          if (!s.exercise) continue
          if (!byEx.has(s.exercise.id)) byEx.set(s.exercise.id, { exercise: s.exercise, sets: [] })
          byEx.get(s.exercise.id).sets.push(s)
        }
        const list = [...byEx.values()]
          .map(({ exercise, sets }) => {
            const { mode, sessions } = buildSessions(exercise, sets)
            return {
              exercise,
              mode,
              stat: prLabel(mode, prValue(mode, sessions)),
              sessionCount: sessions.length,
            }
          })
          .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name))
        setRows(list)
      })
      .catch((e) => live && setErr(e.message ?? 'Could not load progress.'))
    return () => {
      live = false
    }
  }, [])

  const equipOpts = useMemo(() => {
    const set = new Set()
    for (const r of rows ?? []) for (const e of r.exercise.equipment ?? []) set.add(e)
    return [...set].sort()
  }, [rows])

  const muscleOpts = useMemo(() => {
    const set = new Set()
    for (const r of rows ?? []) for (const m of r.exercise.muscle_groups ?? []) set.add(m)
    return [...set].sort()
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (rows ?? []).filter((r) => {
      if (needle && !r.exercise.name.toLowerCase().includes(needle)) return false
      if (equip !== 'all' && !(r.exercise.equipment ?? []).includes(equip)) return false
      if (muscle !== 'all' && !(r.exercise.muscle_groups ?? []).includes(muscle)) return false
      return true
    })
  }, [rows, q, equip, muscle])

  return (
    <>
      <div className="lib-head">
        <div className="lib-title-row">
          <span className="lib-title">Progress</span>
        </div>

        {rows && rows.length > 0 && (
          <>
            <div className="search-wrap">
              <MagnifyingGlass size={15} weight="bold" className="search-icon" />
              <input
                className="search"
                type="text"
                placeholder="Search exercises"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {equipOpts.length > 0 && (
              <div className="chip-row">
                {['all', ...equipOpts].map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`chip${equip === name ? ' on' : ''}`}
                    onClick={() => setEquip(name)}
                  >
                    {name === 'all' ? 'All equipment' : name}
                  </button>
                ))}
              </div>
            )}
            {muscleOpts.length > 0 && (
              <div className="chip-row">
                {['all', ...muscleOpts].map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`chip${muscle === name ? ' on' : ''}`}
                    onClick={() => setMuscle(name)}
                  >
                    {name === 'all' ? 'All muscles' : name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {err && <ErrorNote>{err}</ErrorNote>}

      {rows === null && !err ? (
        <Loading label="Loading progress" />
      ) : (
        <div className="screen-scroll">
          {rows.length === 0 ? (
            <div className="empty-card" style={{ marginTop: 8 }}>
              <ChartLineUp size={22} weight="bold" style={{ color: 'var(--text-5)' }} />
              <h3>No history yet</h3>
              <p>Log a workout to start tracking progress. Every set you record shows up here.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-card" style={{ marginTop: 8 }}>
              <p>No logged exercises match those filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {filtered.map((r) => (
                <Link key={r.exercise.id} to={`/progress/${r.exercise.id}`} className="row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-title">{r.exercise.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                      {r.exercise.equipment?.[0] && <span className="pill">{r.exercise.equipment[0]}</span>}
                      {r.exercise.format === 'amrap' && <span className="metric-pill">AMRAP</span>}
                      {r.exercise.is_archived && <span className="badge missed">Archived</span>}
                      <span className="row-sub tnum" style={{ marginTop: 0 }}>
                        {r.sessionCount} session{r.sessionCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div className="tnum" style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
                        {r.stat}
                      </div>
                      <div
                        style={{
                          fontSize: 8.5,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'var(--text-5)',
                          marginTop: 2,
                        }}
                      >
                        PR
                      </div>
                    </div>
                    <CaretRight size={15} weight="bold" style={{ color: 'var(--text-5)' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
