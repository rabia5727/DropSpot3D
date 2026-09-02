import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { generateReport } from '../lib/defects'
import type { ReportSummary } from '../lib/types'
import { DEFECT_LABELS } from '../lib/types'

interface Props {
  productId: string
  onClose: () => void
}

const rowVariants = { hidden: { opacity: 0, x: 12 }, show: { opacity: 1, x: 0 } }

/**
 * A compact HUD readout, not a blocking modal - the hologram itself (the
 * car + glowing defect markers) is the primary display. This just adds a
 * small pass/fail summary alongside it.
 */
export function QAReportPanel({ productId, onClose }: Props) {
  const [report, setReport] = useState<ReportSummary | null>(null)

  useEffect(() => {
    generateReport({ product_id: productId }).then(setReport)
  }, [productId])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-4 top-4 z-40 w-64 rounded-xl border border-cyan-400/30 bg-[#050810]/90 p-4 shadow-[0_0_30px_rgba(34,211,238,0.15)] backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Scan Report</h2>
        <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
          ×
        </button>
      </div>

      {!report ? (
        <p className="mt-4 text-xs text-white/50">Scanning…</p>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          className="mt-3 space-y-2"
        >
          <motion.div
            variants={rowVariants}
            className={`rounded-lg border px-3 py-2 text-center text-sm font-bold tracking-wide ${
              report.passFail === 'pass'
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border-red-400/40 bg-red-400/10 text-red-300'
            }`}
          >
            {report.passFail === 'pass' ? 'PASS' : 'FAIL — REWORK'}
          </motion.div>
          <motion.p variants={rowVariants} className="text-[11px] text-white/50">
            {report.total} defects · {report.unresolved} unresolved
          </motion.p>
          <div className="space-y-1">
            {Object.entries(report.byType)
              .filter(([, count]) => count > 0)
              .map(([type, count]) => (
                <motion.div
                  key={type}
                  variants={rowVariants}
                  className="flex justify-between text-[11px] text-white/70"
                >
                  <span>{DEFECT_LABELS[type as keyof typeof DEFECT_LABELS]}</span>
                  <span className="text-cyan-300">{count}</span>
                </motion.div>
              ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
