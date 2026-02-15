# ADR 002: Composer and Editor Linking

## Status
Accepted

## Context
Clinicians need explicit control over inserting structured/reasoning output into notes without destructive overwrites.

## Decision
Sections are inserted as linked blocks with visible provenance markers. Linked blocks refresh only if unchanged by the clinician.

## Consequences
- Provenance is explicit inside the editor.
- Manual edits to linked blocks are preserved and marked as detached/modified.
- Export strips linking markers and yields clean note text.
