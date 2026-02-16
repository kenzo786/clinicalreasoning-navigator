export type TelemetryEvent =
  | "session_started"
  | "quick_start_shown"
  | "quick_start_dismissed"
  | "quick_start_reopened"
  | "snippet_inserted"
  | "token_modal_opened"
  | "token_modal_resolved"
  | "diagnosis_added"
  | "diagnosis_removed"
  | "evidence_assignment_updated"
  | "export_format_selected"
  | "export_download_triggered"
  | "section_sync_executed"
  | "review_status_updated"
  | "telemetry_preference_changed";

type TelemetryPrimitive = string | number | boolean;
export type TelemetryProps = Record<string, TelemetryPrimitive | null | undefined>;

export interface TelemetryPayload {
  app: "crx-navigator";
  appVersion: string;
  event: TelemetryEvent;
  timestamp: string;
  props: Record<string, TelemetryPrimitive>;
}

export interface TelemetrySink {
  send: (payload: TelemetryPayload) => void | Promise<void>;
}

const APP_VERSION = "1.0-pilot";
const KEY_BLOCKLIST = /(text|note|editor|content|body|draft)/i;
const MAX_STRING_LENGTH = 120;

class NoopSink implements TelemetrySink {
  send(): void {
    // Intentionally empty.
  }
}

class EndpointSink implements TelemetrySink {
  constructor(private readonly endpoint: string) {}

  async send(payload: TelemetryPayload): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Fail silently. Telemetry should never break clinical workflow.
    }
  }
}

function sanitizeProps(props: TelemetryProps): Record<string, TelemetryPrimitive> {
  const next: Record<string, TelemetryPrimitive> = {};
  for (const [key, value] of Object.entries(props)) {
    if (KEY_BLOCKLIST.test(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "boolean") {
      next[key] = value;
      continue;
    }
    if (typeof value === "number") {
      if (Number.isFinite(value)) next[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized || normalized.length > MAX_STRING_LENGTH) continue;
      next[key] = normalized;
    }
  }
  return next;
}

let cachedSink: TelemetrySink | null = null;

export function resolveTelemetrySink(): TelemetrySink {
  if (cachedSink) return cachedSink;
  const endpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT?.trim();
  cachedSink = endpoint ? new EndpointSink(endpoint) : new NoopSink();
  return cachedSink;
}

export function trackTelemetry(
  event: TelemetryEvent,
  props: TelemetryProps = {},
  options?: { enabled?: boolean; sink?: TelemetrySink }
): void {
  if (options?.enabled === false) return;
  const sink = options?.sink ?? resolveTelemetrySink();
  const payload: TelemetryPayload = {
    app: "crx-navigator",
    appVersion: APP_VERSION,
    event,
    timestamp: new Date().toISOString(),
    props: sanitizeProps(props),
  };
  void sink.send(payload);
}

