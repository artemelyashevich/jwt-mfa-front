"use client"

import * as React from "react"

/** Seconds left until a deadline set via `start`, re-rendering once per second. */
export function useCountdown() {
  const [deadline, setDeadline] = React.useState<number | null>(null)
  const [now, setNow] = React.useState(0)

  React.useEffect(() => {
    if (deadline === null) {
      return
    }
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])

  const start = React.useCallback((seconds: number) => {
    const current = Date.now()
    setNow(current)
    setDeadline(current + seconds * 1000)
  }, [])

  const remaining =
    deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000))

  return { remaining, start }
}

export function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
