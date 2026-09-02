# LineCheck

A visual QA inspection board for manufacturing lines. Instead of filling out a defect form, inspectors drag a colored tag directly onto the exact spot on a product diagram. An AI agent can perform the identical action — via the same [WebMCP](https://webmachinelearning.github.io/webmcp/) tools, calling the same functions the UI calls — from a written inspection note, animated as a crosshair sweeping to the target before the tag drops.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

## How it works

- **Human path:** drag a defect tag from the sidebar palette onto the diagram. It snaps to the drop point and becomes a pin.
- **Agent path:** an AI agent connected via a WebMCP-aware client (e.g. the [Rook](https://docs.mcp-b.ai/) browser extension, or a browser with native WebMCP support) calls the exact same `log_defect` function registered on this page — no separate agent backend, no API key required by this app.
- **Unknown defects:** if an inspector can't classify what they're seeing, they drop an "Unknown / Flag" tag instead. The agent can then call `suggest_classification` to propose a type/severity, which a human must explicitly accept or reject before the record actually changes.

Every WebMCP tool is a thin wrapper around [`src/lib/defects.ts`](src/lib/defects.ts) — the same file the drag-and-drop UI calls. There is no separate agent code path.

## WebMCP tools registered

Registered in [`src/webmcp/ToolRegistrar.tsx`](src/webmcp/ToolRegistrar.tsx) via `document.modelContext.registerTool` (through `@mcp-b/react-webmcp`'s `useWebMCP` hook):

| Tool | Purpose |
|---|---|
| `get_product_diagram` | Diagram URL + pixel dimensions for coordinate mapping |
| `log_defect` | Place a tag at exact (x, y) — same function as the human drag |
| `get_defect_history` | All logged defects for a unit |
| `update_defect` | Edit/resolve an existing tag |
| `generate_qa_report` | Defect counts by type/severity + pass/fail recommendation |
| `flag_for_rework` | Mark a whole unit for rework |
| `suggest_classification` | Agent proposes a classification for an "unknown" defect; human confirms |

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

The database schema lives in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql); seed data (sample PCB units) is in [`supabase/seed.sql`](supabase/seed.sql).

## Testing the agent path

1. Install the [Rook extension](https://docs.mcp-b.ai/) (or use a browser with native `document.modelContext` support).
2. Open this app in that browser.
3. Ask a connected AI client to log a defect, e.g.: *"Cold solder joint near U3, capacitor C12 appears misaligned, minor flux residue on the top edge."*
4. Watch the crosshair sweep to each spot and tags drop in with severity coloring.

## Stack

Vite + React + TypeScript, Framer Motion (drag/snap/pulse/sweep animations), Supabase (Postgres + RLS), `@mcp-b/global` + `@mcp-b/react-webmcp` for WebMCP tool registration.
