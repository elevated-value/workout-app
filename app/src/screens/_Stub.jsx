import { Wrench } from '@phosphor-icons/react'

// Temporary placeholder for screens still being built out. Each real screen
// replaces its own file; this keeps routing intact in the meantime.
export default function Stub({ name }) {
  return (
    <div className="center-fill">
      <Wrench size={30} weight="bold" style={{ color: 'var(--line-strong)' }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{name}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-4)' }}>Under construction.</div>
    </div>
  )
}
