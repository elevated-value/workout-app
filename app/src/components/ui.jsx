import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, X, Warning, CheckCircle, Minus, Plus } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'

// ── top bar ────────────────────────────────────────────────────────
export function TopBar({ title, onBack, back = true, right = null }) {
  const navigate = useNavigate()
  return (
    <div className="topbar">
      {back && (
        <button
          type="button"
          className="icon-btn"
          aria-label="Back"
          onClick={onBack ?? (() => navigate(-1))}
        >
          <ArrowLeft size={19} weight="bold" />
        </button>
      )}
      <div className="topbar-title">{title}</div>
      {right}
    </div>
  )
}

// ── loading / empty ────────────────────────────────────────────────
export function Loading({ label }) {
  return (
    <div className="center-fill">
      <div className="spinner" />
      {label && <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{label}</div>}
    </div>
  )
}

export function ErrorNote({ children }) {
  return (
    <div
      style={{
        margin: '14px 16px',
        padding: '11px 13px',
        borderRadius: 7,
        background: 'rgba(224,160,140,0.08)',
        border: '1px solid var(--warn-line)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: 'var(--warn-fg)',
      }}
    >
      <Warning size={14} weight="bold" style={{ flex: 'none' }} />
      <span>{children}</span>
    </div>
  )
}

// ── bottom sheet ───────────────────────────────────────────────────
// `stack` lifts a sheet above another already-open sheet (still below Confirm),
// so a notes sheet can sit over the in-workout exercise sheet (§3.5).
export function Sheet({ open, onClose, children, stack = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div
        className="sheet-backdrop"
        style={stack ? { zIndex: 28 } : undefined}
        onClick={onClose}
      />
      <div
        className="sheet"
        style={stack ? { zIndex: 29 } : undefined}
        role="dialog"
        aria-modal="true"
      >
        <div className="sheet-grip" onClick={onClose} />
        {children}
      </div>
    </>
  )
}

// ── exercise notes viewer ──────────────────────────────────────────
// Opened by tapping an exercise on the Day Record list or its card on the
// in-workout logging screen (§3.5, rev. 25). Every exercise opens this — an
// exercise with no notes shows the empty state rather than being a dead tap.
export function NotesSheet({ open, onClose, name, notes, stack = false }) {
  const text = (notes ?? '').trim()
  return (
    <Sheet open={open} onClose={onClose} stack={stack}>
      <div className="sheet-body">
        <div className="kicker">Exercise notes</div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 8 }}>
          {name}
        </div>
        {text ? (
          <p
            style={{
              marginTop: 14,
              fontSize: 13.5,
              lineHeight: 1.65,
              color: 'var(--text-2)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {text}
          </p>
        ) : (
          <p style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-4)' }}>
            No notes set for this exercise. Add them from Manage Library.
          </p>
        )}
      </div>
      <div className="action-bar">
        <button type="button" className="cta cta-quiet" onClick={onClose}>
          Close
        </button>
      </div>
    </Sheet>
  )
}

// ── confirm dialog ─────────────────────────────────────────────────
export function Confirm({ open, title, body, warn, confirmLabel = 'Replace', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-head">
          <Warning size={16} weight="bold" style={{ color: 'var(--warn)' }} />
          <span>{title}</span>
        </div>
        {body && <div className="confirm-body">{body}</div>}
        {warn && <div className="confirm-warn">{warn}</div>}
        <div className="confirm-actions">
          <button type="button" className="cta cta-quiet" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="cta" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── toast ──────────────────────────────────────────────────────────
export function Toast({ message }) {
  if (!message) return null
  return (
    <div className="toast">
      <CheckCircle size={15} weight="bold" style={{ color: 'var(--color-accent)', flex: 'none' }} />
      <span>{message}</span>
    </div>
  )
}

// A hook-free helper for a self-dismissing toast lives in useToast.js.

// ── stepper ────────────────────────────────────────────────────────
export function Stepper({ label, value, unit, onDec, onInc, disabled = false }) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" onClick={onDec} disabled={disabled} aria-label={`Decrease ${label}`}>
        <Minus size={16} weight="bold" />
      </button>
      <div className="stepper-val">
        <div className="stepper-num">{value}</div>
        {unit && <div className="stepper-unit">{unit}</div>}
      </div>
      <button type="button" onClick={onInc} disabled={disabled} aria-label={`Increase ${label}`}>
        <Plus size={16} weight="bold" />
      </button>
    </div>
  )
}

export function CloseButton({ onClick }) {
  return (
    <button type="button" className="icon-btn" aria-label="Close" onClick={onClick}>
      <X size={19} weight="bold" />
    </button>
  )
}

export function Modal({ children, onClose }) {
  return createPortal(
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="confirm" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
