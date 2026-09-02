import type { Product } from '../lib/types'

interface Props {
  products: Product[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ProductSwitcher({ products, selectedId, onSelect }: Props) {
  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
    >
      {products.map((p) => (
        <option key={p.id} value={p.id} className="bg-[#12141c]">
          {p.name}
        </option>
      ))}
    </select>
  )
}
