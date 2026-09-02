import { motion } from 'framer-motion'
import type { Defect } from '../lib/types'
import { SEVERITY_COLORS } from '../lib/types'

interface Props {
  defect: Defect
  leftPct: number
  topPct: number
  onClick: () => void
}

export function DefectPin({ defect, leftPct, topPct, onClick }: Props) {
  const color = defect.severity ? SEVERITY_COLORS[defect.severity] : '#9ca3af'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ scale: 0, y: -10 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15, mass: 0.8 }}
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 shadow-lg"
      style={{ left: `${leftPct}%`, top: `${topPct}%`, width: 18, height: 18, background: color }}
      title={`${defect.defect_type} (${defect.severity ?? 'unclassified'})`}
    >
      {defect.severity === 'high' && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
          animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      {defect.source === 'agent' && (
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-sky-400 ring-1 ring-white/80" />
      )}
      {defect.suggestion_status === 'pending' && (
        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-yellow-300 ring-1 ring-white/80" />
      )}
    </motion.button>
  )
}
