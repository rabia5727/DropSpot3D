import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DefectDetailCard } from './components/DefectDetailCard'
import { DefectPalette } from './components/DefectPalette'
import { DefectTable } from './components/DefectTable'
import { DiagramBoard } from './components/DiagramBoard'
import { ProductSwitcher } from './components/ProductSwitcher'
import { QAReportPanel } from './components/QAReportPanel'
import { useDefects } from './hooks/useDefects'
import { flagForRework, listProducts, placeDefect } from './lib/defects'
import type { DefectType, Product } from './lib/types'
import { DEFAULT_SEVERITY } from './lib/types'
import { ToolRegistrar } from './webmcp/ToolRegistrar'

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const diagramRef = useRef<HTMLDivElement>(null)

  const { defects, refetch } = useDefects(selectedId)
  const product = products.find((p) => p.id === selectedId) ?? null
  // Derived from the live `defects` array (not stored separately) so edits made
  // through the card - or by the agent - are reflected immediately, not just on reselect.
  const selectedDefect = defects.find((d) => d.id === selectedDefectId) ?? null

  useEffect(() => {
    listProducts().then((rows) => {
      setProducts(rows)
      if (rows.length > 0) setSelectedId(rows[0].id)
    })
  }, [])

  async function handleDropAt(type: DefectType, point: { x: number; y: number }) {
    if (!product || !diagramRef.current) return
    const rect = diagramRef.current.getBoundingClientRect()
    const relX = (point.x - rect.left) / rect.width
    const relY = (point.y - rect.top) / rect.height
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return // dropped outside the diagram

    await placeDefect({
      product_id: product.id,
      x: relX * product.diagram_width,
      y: relY * product.diagram_height,
      defect_type: type,
      severity: DEFAULT_SEVERITY[type],
      source: 'human',
    })
    refetch()
  }

  async function handleFlagRework() {
    if (!product) return
    const reason = window.prompt('Reason for flagging this unit for rework?')
    if (!reason) return
    await flagForRework(product.id, reason)
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] p-6 text-white">
      {/* Registers all WebMCP tools once, at the app root - never conditionally unmounted. */}
      <ToolRegistrar />

      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">LineCheck</h1>
          <p className="text-sm text-white/50">Visual QA inspection board</p>
        </div>
        <div className="flex items-center gap-3">
          {product && (
            <ProductSwitcher products={products} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          <button
            type="button"
            onClick={handleFlagRework}
            disabled={!product}
            className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 disabled:opacity-40"
          >
            Flag for Rework
          </button>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            disabled={!product}
            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Generate QA Report
          </button>
        </div>
      </header>

      {!product ? (
        <p className="text-white/50">Loading products…</p>
      ) : (
        <div className="grid grid-cols-[220px_1fr_280px] gap-6">
          <DefectPalette onDropAt={handleDropAt} />

          <div className="relative flex justify-center">
            <DiagramBoard
              ref={diagramRef}
              product={product}
              defects={defects}
              onSelectDefect={(d) => setSelectedDefectId(d.id)}
            />
            <AnimatePresence>
              {selectedDefect && (
                <DefectDetailCard defect={selectedDefect} onClose={() => setSelectedDefectId(null)} />
              )}
            </AnimatePresence>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
              Defect Log
            </h2>
            <DefectTable defects={defects} onSelect={(d) => setSelectedDefectId(d.id)} />
          </div>
        </div>
      )}

      {showReport && product && (
        <QAReportPanel productId={product.id} onClose={() => setShowReport(false)} />
      )}
    </div>
  )
}

export default App
