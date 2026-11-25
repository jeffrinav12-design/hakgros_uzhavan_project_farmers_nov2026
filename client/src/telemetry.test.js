import { flushTelemetry, recordTelemetry } from "./telemetry";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

test("retains telemetry locally when the backend is offline", async () => {
  global.fetch.mockRejectedValue(new Error("offline"));

  await recordTelemetry({ event: "weather", status: "FALLBACK" });

  expect(JSON.parse(localStorage.getItem("hakgros_telemetry_queue"))).toHaveLength(1);
});

test("removes queued telemetry after the backend accepts it", async () => {
  global.fetch.mockResolvedValue({ ok: true });
  await recordTelemetry({ event: "weather", status: "LIVE" });

  expect(localStorage.getItem("hakgros_telemetry_queue")).toBe("[]");
});
