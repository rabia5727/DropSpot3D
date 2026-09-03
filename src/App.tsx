import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CarScene } from './components/CarScene'
import { DefectCloseup } from './components/DefectCloseup'
import { DefectDetailCard } from './components/DefectDetailCard'
import { DefectTable } from './components/DefectTable'
import { ProductSwitcher } from './components/ProductSwitcher'
import { QAReportPanel } from './components/QAReportPanel'
import { SyncLog } from './components/SyncLog'
import { useDefects } from './hooks/useDefects'
import { flagForRework, listProducts, placeDefect } from './lib/defects'
import type { Product } from './lib/types'
import { ToolRegistrar } from './webmcp/ToolRegistrar'

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null)

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

  // When the agent places a defect, focus it the same way a human click would -
  // triggers the same camera zoom-in, so the agent's action is visibly "looked at",
  // not just a dot appearing.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { id: string; productId: string }
      if (detail.productId !== selectedId) return
      setSelectedDefectId(detail.id)
    }
    window.addEventListener('agent-defect-placed', handler)
    return () => window.removeEventListener('agent-defect-placed', handler)
  }, [selectedId])

  // Click directly on the car where the problem is - no type to pick first.
  // Lands as "unknown" so the just-opened detail card is where you add a note
  // and/or a photo; ask the agent to classify it from there if you're not sure
  // what it is.
  async function handlePlaceAt(point: [number, number, number]) {
    if (!product) return
    const [x, y, z] = point
    const defect = await placeDefect({
      product_id: product.id,
      x,
      y,
      z,
      defect_type: 'unknown',
      severity: null,
      source: 'human',
    })
    refetch()
    setSelectedDefectId(defect.id)
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
        </div>
      </header>

      {!product ? (
        <p className="text-white/50">Loading products…</p>
      ) : (
        <div className="grid grid-cols-[minmax(420px,1fr)_260px] gap-4">
          <div className="relative h-[480px] w-full max-w-3xl overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#050810] shadow-[0_0_40px_rgba(34,211,238,0.08)]">
            <CarScene
              product={product}
              defects={defects}
              selectedDefectId={selectedDefectId}
              onSelectDefect={(d) => setSelectedDefectId(d.id)}
              onDeselect={() => setSelectedDefectId(null)}
              onPlaceAt={handlePlaceAt}
            />
            <AnimatePresence>
              {selectedDefect && (
                <DefectDetailCard defect={selectedDefect} onClose={() => setSelectedDefectId(null)} />
              )}
            </AnimatePresence>
            {selectedDefect && <DefectCloseup defect={selectedDefect} />}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                Defect Log
              </h2>
              <DefectTable defects={defects} onSelect={(d) => setSelectedDefectId(d.id)} />
            </div>
            <QAReportPanel productId={product.id} defects={defects} />
            <SyncLog />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
