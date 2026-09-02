# DropSpot3D

A holographic 3D QA inspection board for automotive lines. Instead of filling out a defect form, inspectors drag a colored tag directly onto the exact spot on a live 3D car model. An AI agent can perform the identical action — via the same [WebMCP](https://webmachinelearning.github.io/webmcp/) tools, calling the same functions the UI calls — from a written inspection note, animated as a crosshair sweeping to the target in 3D space before the tag drops. The car itself, glowing with color-coded defect markers, *is* the QA display — not a text report.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

## How it works

- **Human path:** drag a defect tag from the sidebar palette onto the 3D car. A raycast finds the exact 3D surface point under the cursor and a glowing marker snaps into place there.
- **Agent path:** an AI agent connected via a WebMCP-aware client (e.g. the [Rook](https://docs.mcp-b.ai/) browser extension, or a browser with native WebMCP support) calls the exact same `log_defect` function registered on this page — no separate agent backend, no API key required by this app. The agent can reason in named car zones (`front_bumper`, `left_front_door`, `right_headlight`, ...) instead of guessing raw 3D coordinates.
- **Unknown defects:** if an inspector can't classify what they're seeing, they drop an "Unknown / Flag" tag instead. The agent can then call `suggest_classification` to propose a type/severity, which a human must explicitly accept or reject before the record actually changes.
- **The hologram *is* the report:** "Scan / Report" doesn't open a blocking modal - it's a compact HUD readout (pass/fail + counts) that sits alongside the still-visible glowing 3D defect map, which is the primary display.

Every WebMCP tool is a thin wrapper around [`src/lib/defects.ts`](src/lib/defects.ts) — the same file the drag-and-drop UI calls. There is no separate agent code path.

## WebMCP tools registered

Registered in [`src/webmcp/ToolRegistrar.tsx`](src/webmcp/ToolRegistrar.tsx) via `document.modelContext.registerTool` (through `@mcp-b/react-webmcp`'s `useWebMCP` hook):

| Tool | Purpose |
|---|---|
| `get_product_diagram` | Car model reference + bounding-box dimensions for coordinate mapping |
| `log_defect` | Place a tag at an exact 3D point (or named zone) — same function as the human drag |
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

The database schema lives in [`supabase/migrations/`](supabase/migrations/) (run in order); seed data (sample sedan units) is in [`supabase/seed.sql`](supabase/seed.sql).

## Testing the agent path

1. Install the [Rook extension](https://docs.mcp-b.ai/) (or use a browser with native `document.modelContext` support).
2. Open this app in that browser.
3. Ask a connected AI client to log a defect, e.g.: *"Cold crack near the hood edge, and the right side mirror looks completely missing."*
4. Watch the crosshair sweep to each spot in 3D and tags drop in with severity coloring.

## Stack

Vite + React + TypeScript, Three.js + React Three Fiber (the 3D holographic car), Framer Motion (palette drag/snap/pulse), Supabase (Postgres + RLS), `@mcp-b/global` + `@mcp-b/react-webmcp` for WebMCP tool registration.
