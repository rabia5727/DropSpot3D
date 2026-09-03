import { useState } from 'react'
import { motion } from 'framer-motion'
import { generateReport, summarizeDefects } from '../lib/defects'
import type { Defect } from '../lib/types'
import { DEFECT_LABELS } from '../lib/types'

interface Props {
  productId: string
  defects: Defect[]
  onOpenFullReport: () => void
}

const rowVariants = { hidden: { opacity: 0, x: 12 }, show: { opacity: 1, x: 0 } }

/**
 * Always-on HUD readout - recalculates instantly from whatever's on the car
 * right now (summarizeDefects is pure/synchronous over the already-loaded
 * `defects` prop), no manual "scan" click needed. "Log Snapshot" is separate:
 * it persists a formal row to the `reports` table for history/audit, which
 * is what the generate_qa_report WebMCP tool also does.
 */
export function QAReportPanel({ productId, defects, onOpenFullReport }: Props) {
  const [logging, setLogging] = useState(false)
  const [lastLoggedAt, setLastLoggedAt] = useState<Date | null>(null)
  const report = summarizeDefects(defects)

  async function handleLogSnapshot() {
    setLogging(true)
    try {
      await generateReport({ product_id: productId })
      setLastLoggedAt(new Date())
    } finally {
      setLogging(false)
    }
  }

  return (
    <motion.div
      layout
      className="w-full rounded-xl border border-cyan-400/30 bg-[#050810]/90 p-4 shadow-[0_0_30px_rgba(34,211,238,0.15)]"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Live Scan</h2>

      <motion.div layout className="mt-3 space-y-2">
        <motion.div
          layout
          className={`rounded-lg border px-3 py-2 text-center text-sm font-bold tracking-wide ${
            report.passFail === 'pass'
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
              : 'border-red-400/40 bg-red-400/10 text-red-300'
          }`}
        >
          {report.passFail === 'pass' ? 'PASS' : 'FAIL — REWORK'}
        </motion.div>
        <p className="text-[11px] text-white/50">
          {report.total} defects · {report.unresolved} unresolved
        </p>
        <div className="space-y-1">
          {Object.entries(report.byType)
            .filter(([, count]) => count > 0)
            .map(([type, count]) => (
              <motion.div
                key={type}
                layout
                variants={rowVariants}
                className="flex justify-between text-[11px] text-white/70"
              >
                <span>{DEFECT_LABELS[type as keyof typeof DEFECT_LABELS]}</span>
                <span className="text-cyan-300">{count}</span>
              </motion.div>
            ))}
          {report.total === 0 && <p className="text-[11px] text-white/40">No defects yet.</p>}
        </div>
      </motion.div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpenFullReport}
          className="flex-1 rounded-lg border border-cyan-400/30 bg-cyan-400/5 py-1.5 text-[11px] font-medium text-cyan-300 hover:bg-cyan-400/10"
        >
          Full Report
        </button>
        <button
          type="button"
          onClick={handleLogSnapshot}
          disabled={logging}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10 disabled:opacity-50"
        >
          {logging ? 'Logging…' : 'Log Snapshot'}
        </button>
      </div>
      {lastLoggedAt && (
        <p className="mt-1 text-center text-[10px] text-white/40">
          Logged {lastLoggedAt.toLocaleTimeString()}
        </p>
      )}
    </motion.div>
  )
}
