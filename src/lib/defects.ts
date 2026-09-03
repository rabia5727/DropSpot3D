import { supabase } from './supabaseClient'
import type { Defect, DefectType, Product, Report, ReportSummary, Severity } from './types'
import { DEFECT_LABELS, DEFECT_TYPES } from './types'

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
  z: number
  defect_type: DefectType
  severity?: Severity | null
  note?: string | null
  source?: 'human' | 'agent'
  /** URL of a real photo of this defect - see uploadDefectPhoto() below. */
  photo_url?: string | null
}

/**
 * Any successful write goes through this - both to tell views to refetch,
 * and to feed the visible "Sync Log" HUD, so a database write is something
 * you can actually see happen in the app instead of a silent backend call.
 */
function notifyChanged(message: string) {
  window.dispatchEvent(new CustomEvent('linecheck:changed', { detail: message }))
}

export async function placeDefect(input: PlaceDefectInput): Promise<Defect> {
  const { data, error } = await supabase
    .from('defects')
    .insert({
      product_id: input.product_id,
      x: input.x,
      y: input.y,
      z: input.z,
      defect_type: input.defect_type,
      severity: input.severity ?? null,
      note: input.note ?? null,
      source: input.source ?? 'human',
      photo_url: input.photo_url ?? null,
    })
    .select()
    .single()
  if (error) throw error
  notifyChanged(`${DEFECT_LABELS[input.defect_type]} logged to database (${input.source ?? 'human'})`)
  return data as Defect
}

/**
 * Uploads a photo to the public 'defect-photos' storage bucket and returns
 * its public URL. Used both by the in-app upload widget (human path) and
 * available for anyone to paste the resulting link into an agent chat, so
 * the agent can view the photo and pass the same URL to log_defect - the
 * real photo then travels with the defect record end to end.
 */
export async function uploadDefectPhoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('defect-photos').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('defect-photos').getPublicUrl(path)
  return data.publicUrl
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
      detail: { x: input.x, y: input.y, z: input.z, productId: input.product_id },
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
  const message =
    patch.resolved !== undefined
      ? `Defect marked ${patch.resolved ? 'resolved' : 'reopened'} in database`
      : 'Defect record updated in database'
  notifyChanged(message)
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

/**
 * Pure, synchronous summary from an already-loaded defect list - no network
 * call. This is what the always-visible HUD uses so the pass/fail readout
 * recalculates instantly on every change, with no manual "scan" step.
 */
export function summarizeDefects(defects: Defect[]): ReportSummary {
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

  return { total: defects.length, byType, bySeverity, unresolved, passFail }
}

/**
 * Persists a formal report snapshot to the `reports` table - used by the
 * generate_qa_report WebMCP tool (and the header button) when someone
 * explicitly wants a logged record, distinct from the live HUD above.
 */
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

  const summary = summarizeDefects(defects)
  const scope_type = params.product_id ? 'product' : params.shift_id ? 'shift' : 'batch'

  const { data, error } = await supabase
    .from('reports')
    .insert({
      scope_type,
      product_id: params.product_id ?? null,
      shift_id: params.shift_id ?? null,
      product_ids: params.product_ids ?? null,
      summary,
      pass_fail: summary.passFail,
    })
    .select()
    .single()
  if (error) throw error

  notifyChanged(`Report snapshot saved to database (${summary.passFail.toUpperCase()})`)
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
  notifyChanged('Unit flagged for rework in database')
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
  notifyChanged(`Agent's classification suggestion saved to database`)
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
    notifyChanged('Suggestion rejected, saved to database')
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
  notifyChanged('Suggestion accepted, saved to database')
  return data as Defect
}
