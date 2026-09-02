import type { Defect } from '../lib/types'
import { DEFECT_LABELS, SEVERITY_COLORS } from '../lib/types'

interface Props {
  defects: Defect[]
  onSelect: (defect: Defect) => void
}

export function DefectTable({ defects, onSelect }: Props) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-[#12141c] text-white/50">
          <tr>
            <th className="p-2">Type</th>
            <th className="p-2">Severity</th>
            <th className="p-2">Source</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {defects.map((d) => (
            <tr
              key={d.id}
              onClick={() => onSelect(d)}
              className="cursor-pointer border-t border-white/5 text-white/80 hover:bg-white/5"
            >
              <td className="p-2">{DEFECT_LABELS[d.defect_type]}</td>
              <td className="p-2">
                {d.severity ? (
                  <span style={{ color: SEVERITY_COLORS[d.severity] }}>{d.severity}</span>
                ) : (
                  <span className="text-white/40">-</span>
                )}
              </td>
              <td className="p-2">{d.source}</td>
              <td className="p-2">
                {d.resolved
                  ? 'Resolved'
                  : d.suggestion_status === 'pending'
                    ? 'Pending review'
                    : 'Open'}
              </td>
            </tr>
          ))}
          {defects.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-white/40">
                No defects logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
