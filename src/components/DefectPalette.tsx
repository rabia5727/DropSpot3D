import { motion, type PanInfo } from 'framer-motion'
import { DEFECT_TYPES, DEFECT_LABELS, PALETTE_COLORS } from '../lib/types'
import type { DefectType } from '../lib/types'

interface Props {
  onDropAt: (type: DefectType, point: { x: number; y: number }) => void
}

export function DefectPalette({ onDropAt }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
        Defect Types
      </h2>
      {DEFECT_TYPES.map((type) => (
        <motion.div
          key={type}
          drag
          dragSnapToOrigin
          dragElastic={0.2}
          whileDrag={{ scale: 1.15, boxShadow: '0 8px 20px rgba(0,0,0,0.35)', zIndex: 50 }}
          onDragEnd={(_, info: PanInfo) =>
            onDropAt(type, { x: info.point.x, y: info.point.y })
          }
          className="cursor-grab select-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white active:cursor-grabbing"
          style={{ borderLeft: `4px solid ${PALETTE_COLORS[type]}` }}
        >
          {DEFECT_LABELS[type]}
        </motion.div>
      ))}
    </div>
  )
}
