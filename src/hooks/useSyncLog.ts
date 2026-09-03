import { useEffect, useState } from 'react'

export interface SyncEvent {
  id: string
  message: string
  at: number
}

/**
 * Listens to the same 'linecheck:changed' event every database write already
 * fires (see notifyChanged in lib/defects.ts) and keeps a rolling feed of
 * what was just saved - makes persistence visible in the app itself instead
 * of something only checkable in an external database dashboard.
 */
export function useSyncLog(maxEntries = 6) {
  const [events, setEvents] = useState<SyncEvent[]>([])

  useEffect(() => {
    function handler(e: Event) {
      const message = (e as CustomEvent<string>).detail
      if (!message) return
      setEvents((prev) => [{ id: `${Date.now()}-${Math.random()}`, message, at: Date.now() }, ...prev].slice(0, maxEntries))
    }
    window.addEventListener('linecheck:changed', handler)
    return () => window.removeEventListener('linecheck:changed', handler)
  }, [maxEntries])

  return events
}
