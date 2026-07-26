function textFromDelta(delta) {
  if (typeof delta === "string") return delta;
  if (Array.isArray(delta)) {
    return delta
      .map((part) => (typeof part === "string" ? part : part?.text || part?.content || ""))
      .join("");
  }
  return "";
}

export function normalizeStreamEvent(event) {
  if (!event || typeof event !== "object") return { text: "" };
  const providerError = event.error?.message || event.error;
  if (providerError) return { text: "", error: String(providerError) };
  const choice = event.choices?.[0];
  const text =
    textFromDelta(choice?.delta?.content) ||
    textFromDelta(choice?.text) ||
    textFromDelta(event.delta) ||
    textFromDelta(event.output_text?.delta);
  return { text, done: event.type === "response.completed" };
}

export function createSseDecoder(onEvent) {
  let buffer = "";
  const emitBlock = (block) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
      .trim();
    if (!data) return;
    if (data === "[DONE]") {
      onEvent({ done: true });
      return;
    }
    try {
      const normalized = normalizeStreamEvent(JSON.parse(data));
      if (normalized.text || normalized.error || normalized.done) onEvent(normalized);
    } catch {
      onEvent({ malformed: true });
    }
  };
  return {
    push(chunk) {
      buffer += String(chunk).replaceAll("\r\n", "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        emitBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
    },
    finish() {
      if (buffer.trim()) emitBlock(buffer);
      buffer = "";
    },
  };
}

export function createTextBatcher(onFlush, options = {}) {
  const delay = Math.max(16, Number(options.delay || 40));
  const schedule = options.schedule || ((callback) => setTimeout(callback, delay));
  const cancel = options.cancel || clearTimeout;
  let pending = "";
  let timer;
  const flush = () => {
    timer = undefined;
    if (!pending) return;
    const value = pending;
    pending = "";
    onFlush(value);
  };
  return {
    push(completeText) {
      pending = String(completeText);
      if (timer === undefined) timer = schedule(flush);
    },
    flush,
    cancel() {
      if (timer !== undefined) cancel(timer);
      timer = undefined;
      pending = "";
    },
  };
}

export function branchMessages(messages, messageId, options = {}) {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index < 0) return [...messages];
  return messages.slice(0, index + (options.includeTarget === false ? 0 : 1));
}
