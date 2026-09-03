import { useWebMCP } from '@mcp-b/react-webmcp'
import {
  flagForRework,
  generateReport,
  getProductDiagram,
  fetchHistory,
  placeDefectViaAgent,
  suggestClassification,
  updateDefect,
} from '../lib/defects'
import { CAR_ZONES, DEFECT_TYPES } from '../lib/types'

const ZONE_NAMES = Object.keys(CAR_ZONES)
const ZONE_HINT = Object.entries(CAR_ZONES)
  .map(([name, [x, y, z]]) => `${name}=(${x},${y},${z})`)
  .join(', ')

/**
 * Mounted once at the app root in App.tsx and NEVER conditionally unmounted -
 * if it lived inside a component that unmounts, the tools it registers would
 * silently disappear mid agent-session. Every tool here delegates straight
 * into src/lib/defects.ts, the same functions the drag-and-drop UI calls -
 * there is no separate "agent" code path.
 */
export function ToolRegistrar() {
  useWebMCP({
    name: 'get_product_diagram',
    description:
      'Get the 3D model reference and bounding-box dimensions (diagram_width=length, diagram_height=' +
      'height, diagram_depth=width) for a car unit. Call this FIRST before log_defect so you know the ' +
      'coordinate system: x/y/z for a defect must be a world point on the car\'s surface, measured from ' +
      'a fixed corner of its bounding box (0,0,0), x toward the front, y upward, z toward the driver side, ' +
      'each within 0..diagram_width / 0..diagram_height / 0..diagram_depth respectively.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'The product/unit ID to inspect.' },
      },
      required: ['product_id'],
    } as const,
    execute: async (input) => {
      const product = await getProductDiagram(input.product_id)
      return {
        content: [{ type: 'text', text: JSON.stringify(product) }],
      }
    },
  })

  useWebMCP({
    name: 'log_defect',
    description:
      'Place a defect tag at an exact 3D point on the car model - this is the SAME action a human ' +
      'performs by dragging a tag onto the hologram; it triggers the same crosshair-sweep-and-drop ' +
      'animation. Prefer the `zone` parameter (a named location on the car) over guessing raw x/y/z - ' +
      `known zones and their approximate coordinates: ${ZONE_HINT}. ` +
      'Only pass raw x/y/z (call get_product_diagram first to learn the bounding box) if the defect is ' +
      'between zones or none of the named zones fit. ' +
      'Choose severity by asking: does this defect affect FUNCTION or safety (high), is it APPEARANCE-' +
      'only (low), or is it borderline/unclear (medium)? If you cannot tell what the defect actually is ' +
      'from the description, use defect_type "unknown" and leave severity unset - a human will classify ' +
      'it, or call suggest_classification once you have more information.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        zone: { type: 'string', enum: ZONE_NAMES, description: 'A named location on the car - preferred over raw coordinates.' },
        x: { type: 'number', description: 'World x (front-back) - only if not using `zone`.' },
        y: { type: 'number', description: 'World y (up-down) - only if not using `zone`.' },
        z: { type: 'number', description: 'World z (left-right) - only if not using `zone`.' },
        defect_type: { type: 'string', enum: DEFECT_TYPES },
        severity: { type: 'string', enum: ['low', 'med', 'high'] },
        note: { type: 'string', description: 'Optional free-text note, e.g. quoting the inspection note.' },
      },
      required: ['product_id', 'defect_type'],
    } as const,
    execute: async (input) => {
      const zoneCoords = input.zone ? CAR_ZONES[input.zone] : null
      if (!zoneCoords && (input.x === undefined || input.y === undefined || input.z === undefined)) {
        throw new Error('Provide either `zone` or all of x, y, z.')
      }
      const [x, y, z] = zoneCoords ?? [input.x!, input.y!, input.z!]
      const defect = await placeDefectViaAgent({
        product_id: input.product_id,
        x,
        y,
        z,
        defect_type: input.defect_type as never,
        severity: (input.severity as never) ?? null,
        note: input.note ?? null,
      })
      // Focuses the same camera zoom-in a human click triggers, so the agent's
      // placement is visibly "looked at" rather than a dot just appearing.
      window.dispatchEvent(
        new CustomEvent('agent-defect-placed', { detail: { id: defect.id, productId: defect.product_id } }),
      )
      return { content: [{ type: 'text', text: JSON.stringify(defect) }] }
    },
  })

  useWebMCP({
    name: 'get_defect_history',
    description:
      'Get all logged defects for a product/unit, including who/what placed each one (source: human or ' +
      'agent), resolved status, and any pending suggestion. Useful for trend analysis across a shift.',
    inputSchema: {
      type: 'object',
      properties: { product_id: { type: 'string' } },
      required: ['product_id'],
    } as const,
    execute: async (input) => {
      const history = await fetchHistory(input.product_id)
      return { content: [{ type: 'text', text: JSON.stringify(history) }] }
    },
  })

  useWebMCP({
    name: 'update_defect',
    description:
      'Edit or resolve an existing defect tag by ID: change its severity, note, or mark it resolved. ' +
      'Do NOT use this to change defect_type or severity based on a guess when the type is genuinely ' +
      'unclear - use suggest_classification instead so a human confirms before the record changes.',
    inputSchema: {
      type: 'object',
      properties: {
        defect_id: { type: 'string' },
        severity: { type: 'string', enum: ['low', 'med', 'high'] },
        note: { type: 'string' },
        resolved: { type: 'boolean' },
      },
      required: ['defect_id'],
    } as const,
    execute: async (input) => {
      const defect = await updateDefect({
        id: input.defect_id,
        severity: input.severity as never,
        note: input.note,
        resolved: input.resolved,
      })
      return { content: [{ type: 'text', text: JSON.stringify(defect) }] }
    },
  })

  useWebMCP({
    name: 'generate_qa_report',
    description:
      'Compile a QA summary for a product (or a whole batch of product_ids): defect counts by type and ' +
      'severity, how many are unresolved, and a pass/fail recommendation (fails if any high-severity ' +
      'defect is unresolved). Pass exactly one of product_id or product_ids.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        product_ids: { type: 'array', items: { type: 'string' } },
        shift_id: { type: 'string' },
      },
    } as const,
    execute: async (input) => {
      const report = await generateReport(input)
      return { content: [{ type: 'text', text: JSON.stringify(report) }] }
    },
  })

  useWebMCP({
    name: 'flag_for_rework',
    description:
      'Mark an entire product/unit as needing rework, separate from tagging individual defects. Use this ' +
      'when the accumulation of defects (or one severe one) means the whole unit should be pulled from ' +
      'the line, not just logged.',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['product_id', 'reason'],
    } as const,
    execute: async (input) => {
      const result = await flagForRework(input.product_id, input.reason)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  })

  useWebMCP({
    name: 'suggest_classification',
    description:
      'Propose a defect_type and severity for a defect a human flagged as "unknown" (or one you logged ' +
      'as unknown yourself) because it could not be classified with confidence. This does NOT change the ' +
      'defect record directly - it stores a pending suggestion that a human must accept or reject in the ' +
      'UI, so the defect\'s real classification never changes without human confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        defect_id: { type: 'string' },
        suggested_defect_type: { type: 'string', enum: DEFECT_TYPES },
        suggested_severity: { type: 'string', enum: ['low', 'med', 'high'] },
        suggestion_note: { type: 'string', description: 'Brief reasoning for the suggestion.' },
      },
      required: ['defect_id', 'suggested_defect_type', 'suggested_severity'],
    } as const,
    execute: async (input) => {
      const defect = await suggestClassification({
        defect_id: input.defect_id,
        suggested_defect_type: input.suggested_defect_type as never,
        suggested_severity: input.suggested_severity as never,
        suggestion_note: input.suggestion_note,
      })
      return { content: [{ type: 'text', text: JSON.stringify(defect) }] }
    },
  })

  return null
}
