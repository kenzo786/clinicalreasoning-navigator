# Telemetry Events (No PHI)

CRx Navigator telemetry captures workflow metadata only. It must never include free-text notes, editor content, or patient identifiers.

## Event Schema

Each event payload contains:

- `app`: `crx-navigator`
- `appVersion`: current pilot app version
- `event`: one of the event names below
- `timestamp`: ISO-8601 UTC timestamp
- `props`: sanitized key/value metadata

Blocked keys include patterns such as `text`, `note`, `editor`, `content`, `body`, and `draft`.

## Events

- `session_started`
- `quick_start_shown`
- `quick_start_dismissed`
- `quick_start_reopened`
- `snippet_inserted`
- `token_modal_opened`
- `token_modal_resolved`
- `diagnosis_added`
- `diagnosis_removed`
- `evidence_assignment_updated`
- `export_format_selected`
- `export_download_triggered`
- `section_sync_executed`
- `review_status_updated`
- `telemetry_preference_changed`

## Endpoint

Set `VITE_TELEMETRY_ENDPOINT` to enable POST delivery.  
If unset, telemetry is a no-op.
