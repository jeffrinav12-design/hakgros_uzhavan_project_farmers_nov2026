const QUEUE_KEY = "hakgros_telemetry_queue";

function readQueue() {
  try {
    const stored = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn("Unable to read telemetry queue:", error);
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (error) {
    console.warn("Unable to persist telemetry queue:", error);
    return false;
  }
}

export function hasQueuedTelemetry() {
  return readQueue().length > 0;
}

export async function recordTelemetry(event, apiBase = "") {
  const item = {
    event: String(event.event || "integration_status").slice(0, 60),
    status: event.status === "LIVE" ? "LIVE" : "FALLBACK",
    source: String(event.source || "client").slice(0, 40),
    occurredAt: new Date().toISOString(),
  };
  const queue = [...readQueue(), item].slice(-100);
  writeQueue(queue);
  return flushTelemetry(apiBase);
}

export async function flushTelemetry(apiBase = "") {
  const queue = readQueue();
  if (queue.length === 0) return true;

  let delivered = 0;
  for (const event of queue) {
    try {
      const response = await fetch(`${apiBase}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!response.ok) break;
      delivered += 1;
    } catch (error) {
      break;
    }
  }

  if (delivered > 0) writeQueue(queue.slice(delivered));
  return delivered === queue.length;
}
