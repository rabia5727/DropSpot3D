# LineCheck — Devpost Submission Description

## Why WebMCP is a strong fit

Manufacturing QA logging is still, in most real lines, a paper checklist or a form disconnected from *where* on the product a defect actually is. LineCheck replaces that with spatial tagging: inspectors drag a defect tag directly onto the exact spot on a product diagram.

WebMCP fits this perfectly because the core interaction — "place a tag at (x, y)" — is a single function, and there is no reason a human dragging a mouse and an AI agent reading a written inspection note should go through different code paths to do the same thing. `log_defect` is registered as a WebMCP tool via `document.modelContext.registerTool`, and it is the *literal same function* the drag-and-drop UI calls on drop. The agent isn't bolted on as a chatbot with its own hidden API — it is a first-class caller of the app's real interaction primitive, exactly like a human.

## How it improves the user experience

- No context-switching to a form: the spatial map *is* the log.
- A human and an agent can build the same defect map together, live, in the same session — you can watch pins from both sources appear on one diagram, color-coded by severity, with agent-placed pins visually distinguished.
- Inspectors who can't identify a defect aren't stuck: they drop a neutral "Unknown / Flag" tag, and the agent can later propose a classification via `suggest_classification` — which never silently changes the record, it only becomes a pending suggestion a human must accept or reject.

## What humans and agents can accomplish together that was previously hard

Before: an inspector's written shift notes ("cold solder joint near U3, C12 misaligned...") had to be manually transcribed into a form, one entry at a time, with no spatial context. With LineCheck, the same note can be handed to an agent, which calls `log_defect` for each defect it identifies — visibly, with a crosshair sweep animation showing where it's "looking" before each tag drops — building the same visual defect map a human would, in seconds. A human then reviews, edits, or resolves any of those tags through the identical UI they'd use for their own manual entries, and generates a pass/fail QA report (`generate_qa_report`) that aggregates both sources of data together.

## Implementation approach

- **Frontend:** Vite + React + TypeScript, Framer Motion for drag/snap/pulse/crosshair-sweep animations.
- **Shared function layer:** `src/lib/defects.ts` is the single place that talks to the database (Supabase/Postgres). Every UI action and every WebMCP tool calls into it — nothing bypasses it.
- **WebMCP registration:** `src/webmcp/ToolRegistrar.tsx`, mounted once at the app root, registers 7 tools via `@mcp-b/react-webmcp`'s `useWebMCP` hook (built on `document.modelContext`), each delegating straight into the shared function layer.
- **Data model:** `products` (diagram + pixel dimensions for coordinate mapping), `defects` (x, y, type, severity, source: human/agent, plus a suggestion sub-state for the "agent proposes, human confirms" flow), `reports` (generated QA summaries).
- **No custom LLM integration:** the agent side of this project is any WebMCP-aware AI client (tested via the Rook browser extension) calling the tools registered on this page directly — this app does not hold or require an LLM API key.
