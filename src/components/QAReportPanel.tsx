import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { generateReport } from '../lib/defects'
import type { ReportSummary } from '../lib/types'
import { DEFECT_LABELS } from '../lib/types'

interface Props {
  productId: string
  onClose: () => void
}

const rowVariants = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

export function QAReportPanel({ productId, onClose }: Props) {
  const [report, setReport] = useState<ReportSummary | null>(null)

  useEffect(() => {
    generateReport({ product_id: productId }).then(setReport)
  }, [productId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12141c] p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">QA Report</h2>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
            ×
          </button>
        </div>

        {!report ? (
          <p className="mt-6 text-sm text-white/50">Generating…</p>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="mt-4 space-y-3"
          >
            <motion.div
              variants={rowVariants}
              className={`rounded-xl p-3 text-center text-lg font-bold ${
                report.passFail === 'pass'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {report.passFail === 'pass' ? 'PASS' : 'FAIL — Rework Recommended'}
            </motion.div>

            <motion.p variants={rowVariants} className="text-sm text-white/70">
              {report.total} defects logged, {report.unresolved} unresolved.
            </motion.p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(report.byType)
                .filter(([, count]) => count > 0)
                .map(([type, count]) => (
                  <motion.div key={type} variants={rowVariants} className="rounded-lg bg-white/5 p-2 text-white/80">
                    {DEFECT_LABELS[type as keyof typeof DEFECT_LABELS]}: {count}
                  </motion.div>
                ))}
            </div>

            <motion.div variants={rowVariants} className="flex gap-3 text-xs text-white/60">
              <span>Low: {report.bySeverity.low}</span>
              <span>Med: {report.bySeverity.med}</span>
              <span>High: {report.bySeverity.high}</span>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
