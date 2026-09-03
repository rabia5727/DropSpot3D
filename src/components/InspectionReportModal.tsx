import { motion } from 'framer-motion'
import { summarizeDefects } from '../lib/defects'
import type { Defect, Product } from '../lib/types'
import { DEFECT_LABELS, SEVERITY_COLORS } from '../lib/types'

interface Props {
  product: Product
  defects: Defect[]
  onClose: () => void
}

/**
 * The full inspection record, not the compact sidebar summary - every field
 * on every defect, in one place. Doubles as the "database screen" (every
 * row, every column, as actually stored) and the formal inspection report
 * (verdict + full defect-by-defect detail) a real QA process would produce.
 */
export function InspectionReportModal({ product, defects, onClose }: Props) {
  const report = summarizeDefects(defects)
  const sorted = [...defects].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-cyan-400/30 bg-[#0b0f16] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Inspection Report — {product.name}</h2>
            <p className="text-xs text-white/50">Generated {new Date().toLocaleString()}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div
            className={`rounded-xl border px-4 py-3 text-center text-base font-bold tracking-wide ${
              report.passFail === 'pass'
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border-red-400/40 bg-red-400/10 text-red-300'
            }`}
          >
            {report.passFail === 'pass' ? 'PASS' : 'FAIL — REWORK RECOMMENDED'}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-lg font-semibold text-white">{report.total}</div>
              <div className="text-white/50">Total defects</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-lg font-semibold text-white">{report.unresolved}</div>
              <div className="text-white/50">Unresolved</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-lg font-semibold text-white">{report.bySeverity.high}</div>
              <div className="text-white/50">High severity</div>
            </div>
          </div>

          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-white/50">
            Full Record ({sorted.length})
          </h3>

          {sorted.length === 0 ? (
            <p className="text-sm text-white/40">No defects logged for this unit.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((d) => (
                <div
                  key={d.id}
                  className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs"
                >
                  {d.photo_url ? (
                    <img
                      src={d.photo_url}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-black/30 text-[10px] text-white/30">
                      no photo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{DEFECT_LABELS[d.defect_type]}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          color: d.severity ? SEVERITY_COLORS[d.severity] : '#9ca3af',
                          background: d.severity ? `${SEVERITY_COLORS[d.severity]}22` : '#9ca3af22',
                        }}
                      >
                        {d.severity ?? 'unclassified'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-white/50">
                      {new Date(d.created_at).toLocaleString()} · {d.source} ·{' '}
                      {d.resolved ? 'resolved' : 'open'}
                    </p>
                    {d.note && <p className="mt-1 text-white/70">{d.note}</p>}
                    <p className="mt-1 font-mono text-[10px] text-white/30">
                      id {d.id.slice(0, 8)} · x={d.x.toFixed(2)} y={d.y.toFixed(2)} z={d.z.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
