

# CRx Navigator v0.1.0 — Implementation Plan

## Overview
A hybrid clinical note-writing and reasoning tool for primary care. Three-pane desktop layout with fast free-text editing, structured data capture, and topic-driven snippet insertion — all writing to one shared consultation state with one final output.

---

## Phase 1: Foundation, Types & Topic Loading
- App skeleton with the specified folder structure
- TypeScript types for `TopicV1`, `ConsultationState`, and all sub-types exactly as specified
- Topic loader from `/public/topics/*.json` with runtime validation and safe fallback UI for invalid/missing topics
- 3 realistic starter topics: **Sore Throat**, **UTI**, **Low Back Pain** — each with snippets, reasoning data, structured fields, and output templates
- Professional clinical design system: clean whites, blue-grey accents, high-contrast text, light mode first

## Phase 2: Shared State, Persistence & Autosave
- Central `ConsultationProvider` context with reducer managing all consultation state
- localStorage persistence with debounced writes (500–1000ms)
- Autosave snapshot every 30s with timestamp tracking
- Restore/discard modal on load when a previous draft exists
- UI preferences (pane sizes, active pane, theme) persisted separately

## Phase 3: Layout & Navigation
- Desktop: 3-pane resizable layout using `react-resizable-panels` (~20% / 45% / 35% default)
- Mobile/tablet: tabbed panes with bottom navigation bar
- Right pane with Reasoning / Structured tab switcher
- Pane sizes persist to localStorage; keyboard focus targets for Ctrl+1 / Ctrl+2

## Phase 4: Library & Insertion UX (Pane 1)
- Topic selector dropdown that loads the active topic's data
- Searchable snippet list grouped by category
- Click-to-insert at editor cursor position
- Command palette via Ctrl/Cmd+K (using `cmdk`) — searches snippets across all topics
- Recent inserts tracking

## Phase 5: Editor & Token Resolver (Pane 2)
- Monospace textarea editor, distraction-free styling
- Slash-trigger (`/`) autocomplete dropdown filtered to active topic snippets
- **Insertion-time token resolution** (not inline widgets):
  - `@date(+7d)` resolved automatically on insert
  - `{a|b*|c}` choice tokens and `[Duration]` variable tokens → resolver modal before insertion
- Undo/redo stack (Ctrl/Cmd+Z / Shift+Z)
- Word & character count footer
- Copy button + Ctrl/Cmd+S mapped to copy/export with toast feedback

## Phase 6: Reasoning & Structured Capture (Pane 3)
- **Reasoning tab**: discriminators list, must-not-miss list, red flags with prominent warning styling + confirmation checkboxes, external reference links
- **Structured tab**: dynamic form renderer from topic's `structuredFields` — supports text, textarea, number, select, multi, toggle, date field types
- `showIf` conditional visibility using defined subset: `==`, `!=`, `contains`, `&&`, `||`
- All structured responses sync into the shared consultation state

## Phase 7: Output Composition & Preview
- Output composer reads `outputTemplate.sections` order, pulls from editor + structured + reasoning
- Empty sections automatically omitted
- Section include/exclude toggles in preview
- Direct editing sets `outputOverrideText` (explicit override mode with "Reset to computed" option)
- Copy/export from preview

## Phase 8: Shortcuts, Accessibility & Polish
- All keyboard shortcuts: Ctrl/Cmd+K (palette), Ctrl/Cmd+S (export), Ctrl/Cmd+Z/Shift+Z (undo/redo), Ctrl/Cmd+1 (editor focus), Ctrl/Cmd+2 (structured focus), ? (help modal)
- Toast notifications for copy/save/restore actions
- Keyboard navigation in dialogs and palette, ARIA labels on key controls
- Final styling pass for clinical light-first aesthetic

## Phase 9: Tests & Documentation
- Unit tests: token parser, `showIf` evaluator, output composer, persistence serialization
- Integration tests: snippet insert → resolve → editor update; structured update → preview update; autosave restore flow
- README with architecture overview, topic schema docs, shortcut list, and known v0.1 limitations

