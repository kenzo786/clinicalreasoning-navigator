import { describe, expect, it, vi } from "vitest";
import {
  trackTelemetry,
  type TelemetryPayload,
  type TelemetrySink,
} from "@/lib/telemetry";

describe("telemetry", () => {
  it("redacts blocked fields and long strings from props", () => {
    const send = vi.fn();
    const sink: TelemetrySink = { send };

    trackTelemetry(
      "export_download_triggered",
      {
        format: "soap",
        editor_text: "should-never-send",
        noteBody: "also-blocked",
        ok_flag: true,
        long_value: "x".repeat(200),
      },
      { enabled: true, sink }
    );

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0] as TelemetryPayload;
    expect(payload.props).toMatchObject({
      format: "soap",
      ok_flag: true,
    });
    expect(payload.props).not.toHaveProperty("editor_text");
    expect(payload.props).not.toHaveProperty("noteBody");
    expect(payload.props).not.toHaveProperty("long_value");
  });

  it("does not emit when disabled", () => {
    const send = vi.fn();
    const sink: TelemetrySink = { send };

    trackTelemetry("session_started", { topic_id: "sore-throat" }, { enabled: false, sink });
    expect(send).not.toHaveBeenCalled();
  });
});

