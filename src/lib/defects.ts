import { supabase } from './supabaseClient'
import type { Defect, DefectType, Product, Report, ReportSummary, Severity } from './types'
import { DEFECT_TYPES } from './types'

/**
 * Every UI action (drag-drop, buttons) and every WebMCP tool calls into this
 * file, and only this file talks to Supabase. This is the single "same
 * function backs the human path and the agent path" contract the project is
 * built around — do not bypass it from a component or from ToolRegistrar.
 */

export async function getProductDiagram(productId: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()
  if (error) throw error
  return data as Product
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Product[]
}

export interface PlaceDefectInput {
  product_id: string
  x: number
  y: number
  defect_type: DefectType
  severity?: Severity | null
  note?: string | null
  source?: 'human' | 'agent'
}

/** Any successful write goes through this so every view (UI + future tabs) can just listen once. */
function notifyChanged() {
  window.dispatchEvent(new Event('linecheck:changed'))
}

export async function placeDefect(input: PlaceDefectInput): Promise<Defect> {
  const { data, error } = await supabase
    .from('defects')
    .insert({
      product_id: input.product_id,
      x: input.x,
      y: input.y,
      defect_type: input.defect_type,
      severity: input.severity ?? null,
      note: input.note ?? null,
      source: input.source ?? 'human',
    })
    .select()
    .single()
  if (error) throw error
  notifyChanged()
  return data as Defect
}

/**
 * Agent-only wrapper: fires the crosshair-sweep animation event and waits for
 * it to finish before actually writing the row, so the pin visibly "arrives"
 * instead of teleporting in. Human drags call placeDefect() directly since
 * the human's own cursor motion is the sweep.
 */
export async function placeDefectViaAgent(input: PlaceDefectInput): Promise<Defect> {
  window.dispatchEvent(
    new CustomEvent('agent-target', {
      detail: { x: input.x, y: input.y, productId: input.product_id },
    }),
  )
  await new Promise((resolve) => setTimeout(resolve, 900))
  return placeDefect({ ...input, source: 'agent' })
}

export interface UpdateDefectInput {
  id: string
  severity?: Severity | null
  note?: string | null
  resolved?: boolean
  defect_type?: DefectType
}

export async function updateDefect(input: UpdateDefectInput): Promise<Defect> {
  const { id, ...patch } = input
  const { data, error } = await supabase
    .from('defects')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  notifyChanged()
  return data as Defect
}

export async function fetchHistory(productId: string): Promise<Defect[]> {
  const { data, error } = await supabase
    .from('defects')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Defect[]
}

function emptyCounts<T extends string>(keys: T[]): Record<T, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>
}

export async function generateReport(params: {
  product_id?: string
  shift_id?: string
  product_ids?: string[]
}): Promise<ReportSummary & { id: string }> {
  let defects: Defect[] = []

  if (params.product_id) {
    defects = await fetchHistory(params.product_id)
  } else if (params.product_ids?.length) {
    const { data, error } = await supabase
      .from('defects')
      .select('*')
      .in('product_id', params.product_ids)
    if (error) throw error
    defects = data as Defect[]
  } else {
    const { data, error } = await supabase.from('defects').select('*')
    if (error) throw error
    defects = data as Defect[]
  }

  const byType = emptyCounts(DEFECT_TYPES)
  const bySeverity = emptyCounts<Severity>(['low', 'med', 'high'])
  let unresolved = 0

  for (const d of defects) {
    byType[d.defect_type]++
    if (d.severity) bySeverity[d.severity]++
    if (!d.resolved) unresolved++
  }

  const highUnresolved = defects.filter((d) => d.severity === 'high' && !d.resolved).length
  const passFail: 'pass' | 'fail' = highUnresolved > 0 ? 'fail' : 'pass'

  const summary: ReportSummary = {
    total: defects.length,
    byType,
    bySeverity,
    unresolved,
    passFail,
  }

  const scope_type = params.product_id ? 'product' : params.shift_id ? 'shift' : 'batch'

  const { data, error } = await supabase
    .from('reports')
    .insert({
      scope_type,
      product_id: params.product_id ?? null,
      shift_id: params.shift_id ?? null,
      product_ids: params.product_ids ?? null,
      summary,
      pass_fail: passFail,
    })
    .select()
    .single()
  if (error) throw error

  return { ...summary, id: data.id as string }
}

export async function flagForRework(productId: string, reason: string) {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      scope_type: 'product',
      product_id: productId,
      summary: { rework: true, reason },
      pass_fail: 'fail',
    })
    .select()
    .single()
  if (error) throw error
  return data as Report
}

/** Agent proposes a classification for a defect it (or a human) couldn't identify. */
export async function suggestClassification(input: {
  defect_id: string
  suggested_defect_type: DefectType
  suggested_severity: Severity
  suggestion_note?: string
}): Promise<Defect> {
  const { data, error } = await supabase
    .from('defects')
    .update({
      suggested_defect_type: input.suggested_defect_type,
      suggested_severity: input.suggested_severity,
      suggestion_note: input.suggestion_note ?? null,
      suggestion_status: 'pending',
    })
    .eq('id', input.defect_id)
    .select()
    .single()
  if (error) throw error
  notifyChanged()
  return data as Defect
}

export async function resolveSuggestion(
  defectId: string,
  action: 'accept' | 'reject',
): Promise<Defect> {
  if (action === 'reject') {
    const { data, error } = await supabase
      .from('defects')
      .update({ suggestion_status: 'rejected' })
      .eq('id', defectId)
      .select()
      .single()
    if (error) throw error
    notifyChanged()
    return data as Defect
  }

  const { data: current, error: fetchErr } = await supabase
    .from('defects')
    .select('*')
    .eq('id', defectId)
    .single()
  if (fetchErr) throw fetchErr
  const defect = current as Defect

  const { data, error } = await supabase
    .from('defects')
    .update({
      defect_type: defect.suggested_defect_type ?? defect.defect_type,
      severity: defect.suggested_severity ?? defect.severity,
      suggestion_status: 'accepted',
    })
    .eq('id', defectId)
    .select()
    .single()
  if (error) throw error
  notifyChanged()
  return data as Defect
}
