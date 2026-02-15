# CRx Navigator (v0.2)

CRx Navigator is a hybrid clinical documentation app that combines:
1. Fast free-text note writing,
2. Topic-driven snippet insertion,
3. Structured clinical capture, review guidance, and DDx reasoning,
4. A unified final output preview.

## Core Workflow
1. Pick a topic in the left pane.
2. Write in the center editor and insert snippets with `/trigger` or `Ctrl/Cmd + K`.
3. Use the right pane tabs (`Review`, `Reason`, `Structured`) during the consultation.
4. Review and optionally edit final output in Preview.
5. Copy final output with `Ctrl/Cmd + S`.

## Features Implemented
- Three-pane desktop layout with resizable panels.
- Mobile pane navigation (Library / Editor / Reason).
- Topic JSON loader from `public/topics/*.json`.
- Trigger suggestions and command palette snippet insertion.
- Token resolver modal for:
  - choice tokens: `{yes|no*|n/a}`
  - variable tokens: `[Duration]`
  - date tokens: `@date(+7d)`, `@date(+2w)`, `@date(+1m)`
- Structured forms with `showIf` conditional display.
- Review panel with educational consultation flow and JITL links.
- Reason panel with full working diagnosis builder:
  - select/star/reorder diagnoses
  - custom diagnosis
  - evidence for/against
  - compare two diagnoses
- Preview provenance chips (`editor`, `structured`, `ddx`, `reasoning`).
- Canonical composer bridge with section-level insert/append into editor.
- Editor anchors with refresh/detach behavior for inserted sections.
- Composed output preview with section include/exclude toggles.
- Output override mode (manual edit + reset to computed).
- Local persistence + autosave restore modal.

## Keyboard Shortcuts
- `Ctrl/Cmd + K`: Open command palette
- `Ctrl/Cmd + S`: Copy/export final output
- `Ctrl/Cmd + 1`: Focus editor
- `Ctrl/Cmd + 2`: Focus structured pane
- `Ctrl/Cmd + 3`: Focus reason tab
- `Ctrl/Cmd + Shift + I`: Insert current right-pane section into editor
- `?`: Show shortcuts modal

## Data Model
Topic schema is defined in:
- `src/types/topic.ts`

Consultation state schema is defined in:
- `src/types/consultation.ts`

Starter topics:
- `public/topics/sore-throat.json`
- `public/topics/uti.json`
- `public/topics/low-back-pain.json`

## Dev Commands
```bash
npm install
npm run dev
npm run test
npm run build
npm run generate-topic-v2
node scripts/import-compass-condition.mjs <path-to-condition.ts> [output.json]
node scripts/import-quicknotes-library.mjs <quicknotes-export.json> <topic.json>
```
