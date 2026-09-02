# DropSpot3D — Devpost Submission Description

## Why WebMCP is a strong fit

Automotive QA logging is still, in most real lines, a paper checklist or a form disconnected from *where* on the vehicle a defect actually is. DropSpot3D replaces that with spatial tagging on a live holographic 3D car model: inspectors drag a defect tag directly onto the exact surface point where the problem is, and the defect map itself — a glowing, color-coded hologram — is the primary display, not a spreadsheet.

WebMCP fits this perfectly because the core interaction — "place a tag at an exact 3D point" — is a single function, and there is no reason a human dragging a mouse and an AI agent reading a written inspection note should go through different code paths to do the same thing. `log_defect` is registered as a WebMCP tool via `document.modelContext.registerTool`, and it is the *literal same function* the drag-and-drop UI calls on drop (via a 3D raycast). The agent isn't bolted on as a chatbot with its own hidden API — it is a first-class caller of the app's real interaction primitive, exactly like a human.

## How it improves the user experience

- No context-switching to a form: the 3D hologram *is* the log.
- A human and an agent can build the same 3D defect map together, live, in the same session — glowing markers from both sources appear on one model, color-coded by severity, with agent-placed pins visually distinguished.
- The agent can reason in named car zones (front bumper, left front door, right headlight, ...) instead of guessing raw 3D coordinates, making its placements both accurate and legible to a human reviewing the scene.
- Inspectors who can't identify a defect aren't stuck: they drop a neutral "Unknown / Flag" tag, and the agent can later propose a classification via `suggest_classification` — which never silently changes the record, it only becomes a pending suggestion a human must accept or reject.

## What humans and agents can accomplish together that was previously hard

Before: an inspector's written shift notes ("crack near the hood edge, right mirror missing...") had to be manually transcribed into a form, one entry at a time, with no spatial context. With DropSpot3D, the same note can be handed to an agent, which calls `log_defect` for each defect it identifies — visibly, with a crosshair sweep animation through 3D space showing where it's "scanning" before each tag drops — building the same holographic defect map a human would, in seconds. A human then reviews, edits, or resolves any of those tags through the identical UI they'd use for their own manual entries, and generates a pass/fail QA readout (`generate_qa_report`) that aggregates both sources of data together — displayed as a compact HUD beside the still-visible hologram, never covering it.

## Implementation approach

- **Frontend:** Vite + React + TypeScript. Three.js + React Three Fiber render the holographic 3D car (translucent emissive materials + edge lines for the sci-fi look); Framer Motion handles the 2D palette drag gesture and UI transitions.
- **3D placement:** dragging a palette tag and releasing over the canvas triggers a manual `THREE.Raycaster` cast from the release point through the fixed camera, hitting the car mesh to find the real (x, y, z) world coordinate — the same coordinate space the agent's `log_defect` calls write to.
- **Shared function layer:** `src/lib/defects.ts` is the single place that talks to the database (Supabase/Postgres). Every UI action and every WebMCP tool calls into it — nothing bypasses it.
- **WebMCP registration:** `src/webmcp/ToolRegistrar.tsx`, mounted once at the app root, registers 7 tools via `@mcp-b/react-webmcp`'s `useWebMCP` hook (built on `document.modelContext`), each delegating straight into the shared function layer.
- **Data model:** `products` (car model reference + bounding-box dimensions for coordinate mapping), `defects` (x, y, z, type, severity, source: human/agent, plus a suggestion sub-state for the "agent proposes, human confirms" flow), `reports` (generated QA summaries).
- **No custom LLM integration:** the agent side of this project is any WebMCP-aware AI client (tested via the Rook browser extension) calling the tools registered on this page directly — this app does not hold or require an LLM API key.
