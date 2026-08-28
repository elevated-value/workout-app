import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, MagnifyingGlass, CaretRight, Barbell } from '@phosphor-icons/react'
import { fetchExercises, fetchEquipment } from '../lib/library.js'
import { MUSCLE_GROUPS } from '../lib/constants.js'
import { Loading, ErrorNote } from '../components/ui.jsx'

// Manage Library — the dedicated curation screen (§3.1). Browse / search / filter
// the exercise library; tap a row to edit it; add via the header button. Archived
// exercises are hidden until the toggle at the bottom is switched on.
// Weight is the common case and needs no tag; only flag the two that differ.
const METRIC_TAG = { bodyweight: 'BW', time: 'TIME' }

export default function Library() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState(null)
  const [equipment, setEquipment] = useState([])
  const [err, setErr] = useState(null)

  const [q, setQ] = useState('')
  const [equip, setEquip] = useState('all')
  const [muscle, setMuscle] = useState('all')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([fetchExercises(), fetchEquipment()])
      .then(([ex, eq]) => {
        if (!live) return
        setExercises(ex)
        setEquipment(eq)
      })
      .catch((e) => live && setErr(e.message ?? 'Could not load the library.'))
    return () => {
      live = false
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (exercises ?? []).filter((e) => {
      if (e.is_archived && !showArchived) return false
      if (needle && !e.name.toLowerCase().includes(needle)) return false
      if (equip !== 'all' && !e.equipment.includes(equip)) return false
      if (muscle !== 'all' && !e.muscle_groups.includes(muscle)) return false
      return true
    })
  }, [exercises, q, equip, muscle, showArchived])

  const archivedCount = useMemo(
    () => (exercises ?? []).filter((e) => e.is_archived).length,
    [exercises],
  )

  return (
    <>
      <div className="lib-head">
        <div className="lib-title-row">
          <span className="lib-title">Exercise Library</span>
          <button type="button" className="mini-btn" onClick={() => navigate('/library/new')}>
            <Plus size={13} weight="bold" />
            Add
          </button>
        </div>

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

        <div className="chip-row">
          {['all', ...equipment.map((x) => x.name)].map((name) => (
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

        <div className="chip-row">
          {['all', ...MUSCLE_GROUPS].map((name) => (
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
      </div>

      {err && <ErrorNote>{err}</ErrorNote>}

      {exercises === null && !err ? (
        <Loading label="Loading library" />
      ) : (
        <div className="screen-scroll">
          {filtered.length === 0 ? (
            <div className="empty-card" style={{ marginTop: 8 }}>
              <Barbell size={22} weight="bold" style={{ color: 'var(--text-5)' }} />
              <h3>Nothing here</h3>
              <p>
                {exercises.length === 0
                  ? 'The library is empty. Add your first exercise to get started.'
                  : 'No exercises match those filters.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {filtered.map((e) => (
                <Link key={e.id} to={`/library/${e.id}`} className="row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          opacity: e.is_archived ? 0.55 : 1,
                        }}
                      >
                        {e.name}
                      </span>
                      {e.is_custom && (
                        <span
                          title="Custom exercise"
                          style={{
                            flex: 'none',
                            width: 5,
                            height: 5,
                            borderRadius: 99,
                            background: 'var(--color-accent)',
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 5,
                        marginTop: 6,
                      }}
                    >
                      {METRIC_TAG[e.metric_type] && (
                        <span className="metric-pill">{METRIC_TAG[e.metric_type]}</span>
                      )}
                      {e.format === 'amrap' && <span className="metric-pill">AMRAP</span>}
                      {e.equipment.slice(0, 3).map((name) => (
                        <span key={name} className="pill">
                          {name}
                        </span>
                      ))}
                      {e.equipment.length > 3 && (
                        <span className="pill">+{e.equipment.length - 3}</span>
                      )}
                      {e.is_archived && <span className="badge missed">Archived</span>}
                    </div>
                  </div>
                  <CaretRight size={15} weight="bold" style={{ color: 'var(--text-5)', flex: 'none' }} />
                </Link>
              ))}
            </div>
          )}

          {archivedCount > 0 && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowArchived((v) => !v)}
              >
                {showArchived
                  ? 'Hide archived'
                  : `Show archived (${archivedCount})`}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
