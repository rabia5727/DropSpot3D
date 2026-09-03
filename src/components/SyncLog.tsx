import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSyncLog } from '../hooks/useSyncLog'

function timeAgo(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000))
  if (seconds < 1) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.round(seconds / 60)}m ago`
}

/**
 * Makes "saving to the database" visible inside the app - there's no other
 * screen where that's shown, so every write (a placed defect, an update, a
 * report snapshot) streams into this feed the instant it's persisted to
 * Supabase, whether triggered by a human action or an agent's WebMCP call.
 */
export function SyncLog() {
  const events = useSyncLog()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full rounded-xl border border-cyan-400/30 bg-[#050810]/90 p-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
          Database Sync
        </h2>
      </div>

      <div className="mt-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 text-[11px]"
            >
              <span className="mt-0.5 text-emerald-400">✓</span>
              <span className="flex-1 text-white/70">{event.message}</span>
              <span className="whitespace-nowrap text-white/30">{timeAgo(event.at, now)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && (
          <p className="text-[11px] text-white/40">No writes yet this session.</p>
        )}
      </div>
    </div>
  )
}
