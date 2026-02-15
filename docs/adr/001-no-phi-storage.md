# ADR 001: No PHI Storage

## Status
Accepted

## Context
CRx Navigator is shipping for an internal clinician pilot with a strict no-PHI-storage policy.

## Decision
Only non-clinical user preferences are persisted. Consultation content is session-ephemeral and is never written to browser persistence.

## Consequences
- Reload resets consultation note content.
- Layout, theme, and workflow preferences can be restored.
- Legacy storage keys containing clinical content are purged during app initialization.
