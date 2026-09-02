import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CarScene, type CarSceneHandle } from './components/CarScene'
import { DefectDetailCard } from './components/DefectDetailCard'
import { DefectPalette } from './components/DefectPalette'
import { DefectTable } from './components/DefectTable'
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
  const carSceneRef = useRef<CarSceneHandle>(null)

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
    if (!product) return
    const hit = carSceneRef.current?.raycastFromClient(point.x, point.y)
    if (!hit) return // dropped outside the car model

    const [x, y, z] = hit
    await placeDefect({
      product_id: product.id,
      x,
      y,
      z,
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
    <div className="min-h-screen bg-[#050810] p-6 text-white">
      {/* Registers all WebMCP tools once, at the app root - never conditionally unmounted. */}
      <ToolRegistrar />

      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-cyan-300">DropSpot3D</h1>
          <p className="text-sm text-white/50">Holographic QA inspection board</p>
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
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-[#050810] disabled:opacity-40"
          >
            Scan / Report
          </button>
        </div>
      </header>

      {!product ? (
        <p className="text-white/50">Loading products…</p>
      ) : (
        <div className="grid grid-cols-[200px_minmax(420px,1fr)_260px] gap-4">
          <DefectPalette onDropAt={handleDropAt} />

          <div className="relative h-[480px] w-full max-w-3xl overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#050810] shadow-[0_0_40px_rgba(34,211,238,0.08)]">
            <CarScene
              ref={carSceneRef}
              product={product}
              defects={defects}
              onSelectDefect={(d) => setSelectedDefectId(d.id)}
            />
            <AnimatePresence>
              {selectedDefect && (
                <DefectDetailCard defect={selectedDefect} onClose={() => setSelectedDefectId(null)} />
              )}
              {showReport && (
                <QAReportPanel productId={product.id} onClose={() => setShowReport(false)} />
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
    </div>
  )
}

export default App
