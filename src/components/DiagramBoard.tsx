import { forwardRef } from 'react'
import type { Defect, Product } from '../lib/types'
import { Crosshair } from './Crosshair'
import { DefectPin } from './DefectPin'

interface Props {
  product: Product
  defects: Defect[]
  onSelectDefect: (defect: Defect) => void
}

export const DiagramBoard = forwardRef<HTMLDivElement, Props>(function DiagramBoard(
  { product, defects, onSelectDefect },
  ref,
) {
  return (
    <div
      ref={ref}
      className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black/30"
    >
      <img
        src={product.diagram_url}
        alt={product.name}
        className="block h-auto w-full select-none"
        draggable={false}
      />
      {defects.map((d) => (
        <DefectPin
          key={d.id}
          defect={d}
          leftPct={(d.x / product.diagram_width) * 100}
          topPct={(d.y / product.diagram_height) * 100}
          onClick={() => onSelectDefect(d)}
        />
      ))}
      <Crosshair product={product} />
    </div>
  )
})
