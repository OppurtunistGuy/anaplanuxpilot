// Minimal SSE parser for the Lovable AI Gateway image stream.
// Calls onFrame(dataUrl, isFinal) for each partial/completed image event.

export async function streamImage(
  endpoint: string,
  payload: unknown,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Image generation failed (${res.status}): ${text || res.statusText}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let sawCompleted = false;

  const flushEvent = (raw: string) => {
    // Parse a single SSE event block
    const lines = raw.split(/\r?\n/);
    let eventName = "";
    let dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    const dataStr = dataLines.join("\n");
    if (dataStr === "[DONE]") return;
    let payload: { type?: string; b64_json?: string };
    try {
      payload = JSON.parse(dataStr);
    } catch {
      return;
    }
    const type = eventName || payload.type;
    if (!payload.b64_json) return;
    const isFinal = type === "image_generation.completed";
    const dataUrl = `data:image/png;base64,${payload.b64_json}`;
    onFrame(dataUrl, isFinal);
    if (isFinal) sawCompleted = true;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (raw.trim()) flushEvent(raw);
      }
    }
    if (buffer.trim()) flushEvent(buffer);
  } finally {
    reader.cancel().catch(() => {});
  }
  if (!sawCompleted) throw new Error("Image stream ended without a completed event");
}
