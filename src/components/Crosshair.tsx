import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Product } from '../lib/types'

interface Props {
  product: Product | null
}

interface Target {
  x: number
  y: number
}

/**
 * Sweeps a crosshair to the agent's target coordinates before its pin drops,
 * so the diagram reads as "the AI is inspecting this" rather than data
 * teleporting in. Listens for the 'agent-target' event dispatched by
 * placeDefectViaAgent() in lib/defects.ts.
 */
export function Crosshair({ product }: Props) {
  const [target, setTarget] = useState<Target | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { x: number; y: number; productId: string }
      if (!product || detail.productId !== product.id) return
      setTarget({ x: detail.x, y: detail.y })
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 900)
      return () => clearTimeout(timer)
    }
    window.addEventListener('agent-target', handler)
    return () => window.removeEventListener('agent-target', handler)
  }, [product])

  if (!product || !target) return null

  const leftPct = (target.x / product.diagram_width) * 100
  const topPct = (target.y / product.diagram_height) * 100

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`${target.x}-${target.y}`}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          initial={{ left: '50%', top: '50%', opacity: 0 }}
          animate={{ left: `${leftPct}%`, top: `${topPct}%`, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
        >
          <motion.div
            className="h-8 w-8 rounded-full border-2 border-sky-400"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 0.3, delay: 0.8 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
