// src/api/chat.js
// Chat API client — supports both streaming (SSE) and non-streaming modes.

const BASE = import.meta.env.VITE_API_BASE ?? "";

/**
 * Send a message and get a full reply (non-streaming).
 * @param {string} message
 * @param {Array<{role:string, content:string}>} history
 * @returns {Promise<{reply: string, actions: Array}>}
 */
export async function sendMessage(message, history = []) {
  if (!message?.trim()) throw new Error("Message is empty");

  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    let err = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      err = body.error || body.message || err;
    } catch {}
    throw new Error(err);
  }

  const data = await res.json();
  if (data?.reply == null) throw new Error("Invalid response from assistant");
  return { reply: data.reply, actions: data.actions ?? [] };
}

/**
 * Send a message and stream the reply token by token.
 *
 * @param {string} message
 * @param {Array<{role:string, content:string}>} history
 * @param {object} callbacks
 * @param {(chunk: string) => void}  callbacks.onChunk   - called for each text delta
 * @param {(actions: Array) => void} callbacks.onDone    - called when stream ends
 * @param {(err: Error) => void}     callbacks.onError   - called on network/parse error
 * @returns {() => void} abort function — call to cancel the stream
 */
export function sendMessageStream(message, history = [], { onChunk, onDone, onError } = {}) {
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
        body: JSON.stringify({ message, history }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // keep incomplete chunk

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const event = JSON.parse(line.slice(5).trim());
            if (event.type === "delta") onChunk?.(event.text);
            if (event.type === "done") onDone?.(event.actions ?? []);
            if (event.type === "error") throw new Error(event.message);
          } catch (e) {
            if (e.name !== "SyntaxError") throw e;
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err);
    }
  })();

  return () => controller.abort();
}

/**
 * Parse [id:product-id] tags in assistant reply text
 * and return segments ready for rendering.
 *
 * @param {string} text
 * @returns {Array<{type:'text'|'product_link', content:string, productId?:string}>}
 */
export function parseReplySegments(text) {
  const segments = [];
  const re = /\[id:([\w-]+)\]/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", content: text.slice(last, match.index) });
    }
    segments.push({ type: "product_link", content: match[0], productId: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", content: text.slice(last) });
  }
  return segments;
}