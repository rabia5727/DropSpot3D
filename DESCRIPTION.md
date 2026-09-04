# DropSpot3D — Devpost Submission Description

## Why WebMCP is a strong fit

Automotive QA logging is still, in most real lines, a paper checklist or a form disconnected from *where* on the vehicle a defect actually is. DropSpot3D replaces that with spatial tagging on a live 3D car model rendered in a holographic style: an inspector clicks the exact spot on the car where the problem is, and the glowing, color-coded defect map *is* the QA record — not a spreadsheet, not a separate report screen.

WebMCP fits this because the core interaction — "place a tag at an exact 3D point" — is a single function, and there's no reason a human's click and an AI agent's tool call should go through different code paths to do the same thing. `log_defect` is registered as a WebMCP tool via `document.modelContext.registerTool`, and it is the *literal same function* the UI calls when a human clicks the car. The agent isn't a chatbot bolted on the side with its own hidden API — it's a first-class caller of the app's real interaction primitive, exactly like a human.

## How it improves the user experience

- **No predefined category to pick first.** A human just clicks where the damage is — it lands as an unclassified pin, and they add a note or a real photo right there. No form, no dropdown standing between seeing a problem and recording it.
- **A camera that actually inspects with you.** Clicking any pin flies the camera in close from outside the car body, looking down at that exact spot — with every other pin fading into the background — plus a magnified picture-in-picture close-up. The rest of the time, the car is freely rotatable (drag to orbit, scroll to zoom).
- **Real photos, not just markers.** Attach an actual photo to a pin — human-uploaded in-app, or supplied via a link an agent viewed — and it's what you see when you zoom in, not an abstract icon.
- **Human and agent build the same live map together.** Pins from both sources appear on one model, color-coded by severity, agent-placed ones visually distinguished, all triggering the same crosshair-sweep-and-drop animation.
- **Inspectors who can't identify something aren't stuck.** They just flag it; the agent can later propose a classification via `suggest_classification` — which never silently changes the record, it only becomes a pending suggestion a human must accept or reject.
- **The QA status is always live**, never a stale snapshot: a HUD readout recalculates instantly from whatever's on the car right now, no manual "scan" step, alongside a running feed of every database write as it actually happens — and a full inspection report is one click away.

## What humans and agents can accomplish together that was previously hard

Before: an inspector's written shift notes, or a phone photo of a defect, had to be manually transcribed into a form — one entry at a time, with no spatial context, and the photo usually never made it into the record at all. With DropSpot3D, that same note or photo can be handed to an agent, which calls `log_defect` — visibly, with a crosshair sweep through 3D space showing where it's "looking" before the tag drops — building the same live defect map a human would, in seconds, with the real photo attached and shown on zoom. A human then reviews, corrects, or resolves any of those entries through the identical UI they'd use for their own manual ones, and the pass/fail status and full inspection report reflect both sources of data together, instantly.

## Implementation approach

- **Frontend:** Vite + React + TypeScript. Three.js + React Three Fiber render the 3D car — a real, CC-BY-licensed sedan model (credited in README) with a translucent holographic material treatment, not a photorealistic render — with a scripted camera that flies to a focused defect from outside the body (never inside the hollow shell, regardless of which side it's on) and free orbit controls otherwise.
- **3D placement:** clicking the car body fires a native React Three Fiber pointer event carrying the exact world-space intersection point — no manual raycasting needed for the human path. The agent's `log_defect` calls write to that same (x, y, z) coordinate space directly, or via named zones (`front_bumper`, `left_front_door`, ...) so it doesn't have to guess raw coordinates.
- **Shared function layer:** `src/lib/defects.ts` is the single place that talks to the database (Supabase/Postgres + Storage). Every UI action and every WebMCP tool calls into it — nothing bypasses it.
- **WebMCP registration:** `src/webmcp/ToolRegistrar.tsx`, mounted once at the app root, registers 7 tools (`get_product_diagram`, `log_defect`, `get_defect_history`, `update_defect`, `generate_qa_report`, `flag_for_rework`, `suggest_classification`) via `@mcp-b/react-webmcp`'s `useWebMCP` hook (built on `document.modelContext`), each delegating straight into the shared function layer.
- **Data model:** `products` (car reference + bounding-box dimensions), `defects` (x, y, z, type, severity, source: human/agent, an optional real photo URL, plus a suggestion sub-state for the "agent proposes, human confirms" flow), `reports` (logged QA snapshots).
- **No custom LLM integration:** the agent side of this project is any WebMCP-aware AI client (tested via the Rook browser extension, with real photo input) calling the tools registered on this page directly — this app does not hold or require an LLM API key.
