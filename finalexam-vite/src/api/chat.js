// src/api/chat.js
const BASE = import.meta.env.VITE_API_BASE ?? "";

export function sendMessageStream(
  message,
  history = [],
  { cart = {}, onChunk, onDone, onError } = {}
) {
  if (!message?.trim()) {
    onError?.(new Error("Message is empty"));
    return () => {};
  }

  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, cart }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let err = `Request failed (${res.status})`;
        try {
          const body = await res.json();
          err = body.error || err;
        } catch {}
        throw new Error(err);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneCalled = false;   // Stronger protection

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;

          try {
            const event = JSON.parse(line.slice(5).trim());

            if (event.type === "delta") {
              onChunk?.(event.text || "");
            }

            if (event.type === "done" && !doneCalled) {
              doneCalled = true;                    // Ensure only once
              onDone?.(event.actions ?? [], event.fullText ?? "");
            }

            if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch (e) {
            if (e.name !== "SyntaxError") {
              console.error("SSE Parse Error:", e);
            }
          }
        }
      }

      // Safety: If "done" was never received, call it at the end
      if (!doneCalled) {
        onDone?.([], "");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Stream error:", err);
        onError?.(err);
      }
    }
  })();

  return () => controller.abort();
}