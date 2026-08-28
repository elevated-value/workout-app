import { useCallback, useRef, useState } from 'react'

// A single transient toast message. `show(msg)` displays it for `ms` then clears.
export function useToast(ms = 3000) {
  const [message, setMessage] = useState(null)
  const timer = useRef(null)
  const show = useCallback(
    (msg) => {
      setMessage(msg)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMessage(null), ms)
    },
    [ms],
  )
  return { message, show }
}
