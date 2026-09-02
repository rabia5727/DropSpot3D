export type DefectType =
  | 'scratch'
  | 'crack'
  | 'misalignment'
  | 'solder_bridge'
  | 'missing_component'
  | 'unknown'

export type Severity = 'low' | 'med' | 'high'

export type Source = 'human' | 'agent'

export type SuggestionStatus = 'none' | 'pending' | 'accepted' | 'rejected'

export interface Product {
  id: string
  name: string
  diagram_url: string
  diagram_width: number
  diagram_height: number
  created_at: string
}

export interface Defect {
  id: string
  product_id: string
  x: number
  y: number
  defect_type: DefectType
  severity: Severity | null
  note: string | null
  resolved: boolean
  source: Source
  suggested_defect_type: DefectType | null
  suggested_severity: Severity | null
  suggestion_note: string | null
  suggestion_status: SuggestionStatus
  created_at: string
}

export interface ReportSummary {
  total: number
  byType: Record<DefectType, number>
  bySeverity: Record<Severity, number>
  unresolved: number
  passFail: 'pass' | 'fail'
}

export interface Report {
  id: string
  scope_type: 'product' | 'shift' | 'batch'
  product_id: string | null
  shift_id: string | null
  product_ids: string[] | null
  summary: ReportSummary
  pass_fail: 'pass' | 'fail' | null
  created_at: string
}

export const DEFECT_TYPES: DefectType[] = [
  'scratch',
  'crack',
  'misalignment',
  'solder_bridge',
  'missing_component',
  'unknown',
]

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#facc15',
  med: '#fb923c',
  high: '#ef4444',
}

export const DEFECT_LABELS: Record<DefectType, string> = {
  scratch: 'Scratch',
  crack: 'Crack',
  misalignment: 'Misalignment',
  solder_bridge: 'Solder Bridge',
  missing_component: 'Missing Component',
  unknown: 'Unknown / Flag',
}

/** Default severity applied when a human drags a palette tag onto the diagram - editable afterwards. */
export const DEFAULT_SEVERITY: Record<DefectType, Severity | null> = {
  scratch: 'low',
  crack: 'med',
  misalignment: 'med',
  solder_bridge: 'high',
  missing_component: 'high',
  unknown: null,
}

export const PALETTE_COLORS: Record<DefectType, string> = {
  scratch: SEVERITY_COLORS.low,
  crack: SEVERITY_COLORS.med,
  misalignment: SEVERITY_COLORS.med,
  solder_bridge: SEVERITY_COLORS.high,
  missing_component: SEVERITY_COLORS.high,
  unknown: '#9ca3af',
}
