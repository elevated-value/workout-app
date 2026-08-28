import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WarningCircle } from '@phosphor-icons/react'
import { useAuth } from '../state/AuthProvider.jsx'

// Deliberately minimal: one email/password form, no sign-up, no forgot-password
// flow (spec §5 — password resets happen from the Supabase dashboard).
export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)

  async function submit(e) {
    e?.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const err = await signIn(email, password)
    setBusy(false)
    if (err) {
      setError(
        err.message?.toLowerCase().includes('invalid')
          ? 'Incorrect email or password.'
          : err.message || 'Could not sign in.',
      )
      setShake(true)
      setTimeout(() => setShake(false), 450)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <div
        className="screen"
        style={{ justifyContent: 'center', alignItems: 'center', padding: '0 28px' }}
      >
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              marginBottom: 48,
            }}
          >
            <div style={{ width: 28, height: 3, background: 'var(--color-accent)' }} />
            <span
              style={{
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Ledger
            </span>
          </div>

          <form
            onSubmit={submit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              animation: shake ? 'shake 0.4s ease' : 'none',
            }}
          >
            <input
              className="input"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              style={{ minHeight: 50, borderColor: error ? 'var(--warn-line)' : undefined }}
            />
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              style={{ minHeight: 50, borderColor: error ? 'var(--warn-line)' : undefined }}
            />
            <button
              type="submit"
              className="cta cta-solid"
              disabled={busy}
              style={{ marginTop: 6, minHeight: 52 }}
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: '11px 13px',
                borderRadius: 7,
                background: 'rgba(224,160,140,0.08)',
                border: '1px solid var(--warn-line)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                animation: 'fadeIn 0.18s ease',
              }}
            >
              <WarningCircle
                size={14}
                weight="bold"
                style={{ color: 'var(--warn-fg)', flex: 'none' }}
              />
              <span style={{ fontSize: 12, color: 'var(--warn-fg)' }}>{error}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 'none', padding: '0 0 22px', textAlign: 'center' }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-5)' }}>Single-account access</span>
      </div>
    </div>
  )
}
