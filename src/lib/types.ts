export type DefectType =
  | 'scratch'
  | 'dent'
  | 'paint_defect'
  | 'misalignment'
  | 'crack'
  | 'missing_part'
  | 'unknown'

export type Severity = 'low' | 'med' | 'high'

export type Source = 'human' | 'agent'

export type SuggestionStatus = 'none' | 'pending' | 'accepted' | 'rejected'

export interface Product {
  id: string
  name: string
  diagram_url: string
  /** Car bounding-box length (x-axis range: 0..diagram_width). */
  diagram_width: number
  /** Car bounding-box height (y-axis range: 0..diagram_height). */
  diagram_height: number
  /** Car bounding-box width (z-axis range: 0..diagram_depth). */
  diagram_depth: number
  created_at: string
}

export interface Defect {
  id: string
  product_id: string
  x: number
  y: number
  z: number
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
  'dent',
  'paint_defect',
  'misalignment',
  'crack',
  'missing_part',
  'unknown',
]

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#facc15',
  med: '#fb923c',
  high: '#ef4444',
}

export const DEFECT_LABELS: Record<DefectType, string> = {
  scratch: 'Scratch',
  dent: 'Dent',
  paint_defect: 'Paint Defect',
  misalignment: 'Misalignment',
  crack: 'Crack',
  missing_part: 'Missing Part',
  unknown: 'Unknown / Flag',
}

/** Default severity applied when a human drags a palette tag onto the car - editable afterwards. */
export const DEFAULT_SEVERITY: Record<DefectType, Severity | null> = {
  scratch: 'low',
  dent: 'med',
  paint_defect: 'low',
  misalignment: 'med',
  crack: 'med',
  missing_part: 'high',
  unknown: null,
}

export const PALETTE_COLORS: Record<DefectType, string> = {
  scratch: SEVERITY_COLORS.low,
  dent: SEVERITY_COLORS.med,
  paint_defect: SEVERITY_COLORS.low,
  misalignment: SEVERITY_COLORS.med,
  crack: SEVERITY_COLORS.med,
  missing_part: SEVERITY_COLORS.high,
  unknown: '#9ca3af',
}

/**
 * Fixed reference points on the car's bounding box (0..diagram_width x,
 * 0..diagram_height y, 0..diagram_depth z) - given to the agent in the
 * log_defect tool description so it can reason in named zones instead of
 * guessing raw 3D coordinates.
 */
export const CAR_ZONES: Record<string, [number, number, number]> = {
  front_bumper: [4.1, 0.5, 0.95],
  hood: [3.2, 0.75, 0.95],
  windshield: [2.5, 1.2, 0.95],
  roof: [1.9, 1.5, 0.95],
  rear_windshield: [1.3, 1.2, 0.95],
  trunk: [0.6, 0.75, 0.95],
  rear_bumper: [0.1, 0.5, 0.95],
  left_front_door: [2.6, 0.65, 1.85],
  left_rear_door: [1.6, 0.65, 1.85],
  right_front_door: [2.6, 0.65, 0.05],
  right_rear_door: [1.6, 0.65, 0.05],
  left_front_fender: [3.4, 0.55, 1.75],
  right_front_fender: [3.4, 0.55, 0.15],
  left_headlight: [4.15, 0.55, 1.5],
  right_headlight: [4.15, 0.55, 0.4],
  left_mirror: [2.9, 1.05, 1.9],
  right_mirror: [2.9, 1.05, 0.0],
}
