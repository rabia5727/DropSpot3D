# DropSpot3D

A holographic 3D QA inspection board for automotive lines. Instead of filling out a defect form, inspectors click directly on the exact spot on a live 3D car model. An AI agent can perform the identical action — via the same [WebMCP](https://webmachinelearning.github.io/webmcp/) tools, calling the same functions the UI calls — from a written inspection note or a real photo, animated as a crosshair sweeping to the target in 3D space before the tag drops. The car itself, glowing with color-coded defect markers, *is* the QA display — not a text report.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

## How it works

- **Human path:** click directly on the 3D car where the problem is — no type to pick first, no menu. It lands as "Unknown" and opens straight into a card where you add a note and/or attach a real photo.
- **Agent path:** an AI agent connected via a WebMCP-aware client (e.g. the [Rook](https://docs.mcp-b.ai/) browser extension, or a browser with native WebMCP support) calls the exact same `log_defect` function registered on this page — no separate agent backend, no API key required by this app. The agent can reason in named car zones (`front_bumper`, `left_front_door`, `right_headlight`, ...) instead of guessing raw 3D coordinates, and can attach a real photo it was shown via `photo_url`.
- **Unclassified defects:** the agent can call `suggest_classification` to propose a type/severity for anything logged as "Unknown," which a human must explicitly accept or reject before the record actually changes.
- **The hologram *is* the report:** the "Live Scan" panel isn't a blocking modal - it's a compact, always-live HUD readout (pass/fail + counts) that sits alongside the still-visible glowing 3D defect map, which is the primary display.

Every WebMCP tool is a thin wrapper around [`src/lib/defects.ts`](src/lib/defects.ts) — the same file the click-to-place UI calls. There is no separate agent code path.

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

Vite + React + TypeScript, Three.js + React Three Fiber (the 3D holographic car, free orbit + scripted zoom-to-defect camera), Framer Motion (card/pin animation), Supabase (Postgres + RLS + Storage for defect photos), `@mcp-b/global` + `@mcp-b/react-webmcp` for WebMCP tool registration.

## Credits

Car model: ["Generic Sedan Car"](https://sketchfab.com/3d-models/generic-sedan-car-58c33766470d46e7b2aed542650494e5) by MMC Works, licensed [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) — an original generic design, not modeled after any real manufacturer's vehicle.
