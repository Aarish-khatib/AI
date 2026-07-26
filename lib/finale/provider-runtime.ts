"use client";

import type {
  ProviderRecord,
  UsageMode,
} from "@/lib/finale/contracts";
import {
  extractProviderText,
  providerRequestShape,
  type ProviderRequest,
} from "@/lib/finale/provider-hub";
import {
  resolveUsageRoute,
  validateCompatibleEndpoint,
} from "@/lib/finale/policy.mjs";
import { sha256Hex } from "@/lib/integrity.mjs";

export type NormalizedProviderEvent =
  | { type: "response.started"; providerId: string; modelId: string }
  | { type: "response.delta"; text: string }
  | {
      type: "tool.call";
      id: string;
      name: string;
      arguments: string;
    }
  | {
      type: "response.completed";
      text: string;
      usage?: unknown;
      actualCostUsd?: number;
      requestId?: string;
    }
  | {
      type: "response.failed";
      code: string;
      message: string;
      retryable: boolean;
      retryAfterMs?: number;
    };

export class NormalizedProviderError extends Error {
  status: number;
  code: string;
  retryable: boolean;
  retryAfterMs?: number;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
  }) {
    super(redactProviderMessage(input.message));
    this.name = "NormalizedProviderError";
    this.status = input.status;
    this.code = input.code;
    this.retryable = input.retryable;
    this.retryAfterMs = input.retryAfterMs;
  }
}

const activeRequests = new Map<string, Promise<ProviderExecutionResult>>();
const circuits = new Map<string, { failures: number; openUntil: number }>();

export type ProviderExecutionResult = {
  text: string;
  usage?: unknown;
  actualCostUsd?: number;
  requestId?: string;
  attempts: number;
  deduplicated: boolean;
  latencyMs: number;
  events: NormalizedProviderEvent[];
};

export function redactProviderMessage(value: unknown): string {
  return String(value || "Provider request failed.")
    .replace(/(?:authorization|bearer)\s*[:=]?\s*\S+/gi, "[redacted]")
    .replace(/\b(?:sk|rk|pk|api)[-_][a-z0-9_-]{8,}\b/gi, "[redacted]")
    .replace(/[?&](?:key|token|api_key)=[^&\s]+/gi, (match) =>
      `${match.split("=")[0]}=[redacted]`,
    )
    .slice(0, 800);
}

export function retryAfterMilliseconds(
  value: string | null | undefined,
  now = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, 15 * 60_000);
  }
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.min(Math.max(0, date - now), 15 * 60_000);
  return undefined;
}

function providerErrorCode(status: number): string {
  if (status === 401) return "authentication_failed";
  if (status === 402) return "payment_required";
  if (status === 403) return "permission_denied";
  if (status === 408) return "timeout";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_unavailable";
  return "provider_request_failed";
}

export async function normalizeProviderError(
  response: Response,
): Promise<NormalizedProviderError> {
  let message = `Provider request failed with HTTP ${response.status}.`;
  try {
    const payload = (await response.clone().json()) as {
      error?: { message?: unknown };
      message?: unknown;
    };
    message = String(payload.error?.message || payload.message || message);
  } catch {
    const text = await response.clone().text().catch(() => "");
    if (text.trim()) message = text.trim().slice(0, 800);
  }
  const retryable =
    response.status === 408 ||
    response.status === 429 ||
    response.status >= 500;
  return new NormalizedProviderError({
    status: response.status,
    code: providerErrorCode(response.status),
    message,
    retryable,
    retryAfterMs: retryAfterMilliseconds(response.headers.get("retry-after")),
  });
}

function streamText(provider: ProviderRecord, payload: unknown): {
  text?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  usage?: unknown;
  completed?: boolean;
} {
  const data = payload as Record<string, unknown>;
  if (provider.apiStyle === "anthropic-messages") {
    const delta = data.delta as { text?: unknown } | undefined;
    const contentBlock = data.content_block as {
      id?: unknown;
      name?: unknown;
      input?: unknown;
    } | undefined;
    return {
      text: typeof delta?.text === "string" ? delta.text : undefined,
      toolCalls:
        data.type === "content_block_start" && contentBlock?.name
          ? [{
              id: String(contentBlock.id || ""),
              name: String(contentBlock.name),
              arguments: JSON.stringify(contentBlock.input || {}),
            }]
          : undefined,
      usage: data.usage,
      completed: data.type === "message_stop",
    };
  }
  if (provider.apiStyle === "gemini-generate-content") {
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const content = (candidates[0] as {
      content?: { parts?: Array<{ text?: unknown; functionCall?: { name?: unknown; args?: unknown } }> };
      finishReason?: unknown;
    } | undefined);
    const parts = content?.content?.parts || [];
    return {
      text: parts.map((part) => typeof part.text === "string" ? part.text : "").join("") || undefined,
      toolCalls: parts
        .filter((part) => part.functionCall?.name)
        .map((part, index) => ({
          id: `gemini-tool-${index}`,
          name: String(part.functionCall?.name),
          arguments: JSON.stringify(part.functionCall?.args || {}),
        })),
      usage: data.usageMetadata,
      completed: Boolean(content?.finishReason),
    };
  }
  if (provider.apiStyle === "ollama") {
    return {
      text: typeof (data.message as { content?: unknown } | undefined)?.content === "string"
        ? String((data.message as { content?: unknown }).content)
        : undefined,
      completed: data.done === true,
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
      },
    };
  }
  if (provider.apiStyle === "openai-responses") {
    const type = String(data.type || "");
    const delta = data.delta;
    const item = data.item as {
      id?: unknown;
      name?: unknown;
      arguments?: unknown;
    } | undefined;
    return {
      text:
        type.includes("output_text.delta") && typeof delta === "string"
          ? delta
          : undefined,
      toolCalls:
        type.includes("function_call") && item?.name
          ? [{
              id: String(item.id || ""),
              name: String(item.name),
              arguments: String(item.arguments || "{}"),
            }]
          : undefined,
      usage: data.usage,
      completed: type === "response.completed",
    };
  }
  const choice = (Array.isArray(data.choices) ? data.choices[0] : undefined) as {
    delta?: {
      content?: unknown;
      tool_calls?: Array<{
        id?: unknown;
        function?: { name?: unknown; arguments?: unknown };
      }>;
    };
    finish_reason?: unknown;
  } | undefined;
  return {
    text: typeof choice?.delta?.content === "string" ? choice.delta.content : undefined,
    toolCalls: choice?.delta?.tool_calls
      ?.filter((call) => call.function?.name)
      .map((call) => ({
        id: String(call.id || ""),
        name: String(call.function?.name),
        arguments: String(call.function?.arguments || "{}"),
      })),
    usage: data.usage,
    completed: Boolean(choice?.finish_reason),
  };
}

export function normalizeProviderStreamEvent(
  provider: ProviderRecord,
  payload: unknown,
): NormalizedProviderEvent[] {
  const normalized = streamText(provider, payload);
  const events: NormalizedProviderEvent[] = [];
  if (normalized.text) events.push({ type: "response.delta", text: normalized.text });
  for (const call of normalized.toolCalls || []) {
    events.push({ type: "tool.call", ...call });
  }
  return events;
}

export function extractReportedCost(payload: unknown): number | undefined {
  const data = payload as Record<string, unknown>;
  const usage = (data.usage || data.usageMetadata || {}) as Record<string, unknown>;
  const candidates = [
    data.cost,
    data.total_cost,
    usage.cost,
    usage.total_cost,
    usage.totalCostUsd,
  ];
  for (const value of candidates) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount >= 0) return amount;
  }
  return undefined;
}

async function readStreamingResponse(
  provider: ProviderRecord,
  response: Response,
  onEvent?: (event: NormalizedProviderEvent) => void,
): Promise<{
  text: string;
  usage?: unknown;
  actualCostUsd?: number;
  events: NormalizedProviderEvent[];
}> {
  if (!response.body) throw new NormalizedProviderError({
    status: 502,
    code: "empty_stream",
    message: "The provider returned an empty stream.",
    retryable: true,
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: NormalizedProviderEvent[] = [];
  let buffer = "";
  let text = "";
  let usage: unknown;
  let actualCostUsd: number | undefined;
  const emit = (event: NormalizedProviderEvent) => {
    events.push(event);
    onEvent?.(event);
  };
  const consumePayload = (data: string) => {
    if (!data || data === "[DONE]") return;
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }
    const normalized = streamText(provider, payload);
    usage = normalized.usage || usage;
    actualCostUsd = extractReportedCost(payload) ?? actualCostUsd;
    for (const event of normalizeProviderStreamEvent(provider, payload)) {
      if (event.type === "response.delta") text += event.text;
      emit(event);
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    if (provider.apiStyle === "ollama") {
      const records = buffer.split(/\r?\n/);
      buffer = records.pop() || "";
      records.forEach((record) => consumePayload(record.trim()));
    } else {
      const records = buffer.split(/\r?\n\r?\n/);
      buffer = records.pop() || "";
      for (const record of records) {
        const data = record
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");
        consumePayload(data);
      }
    }
    if (done) {
      if (buffer.trim()) {
        if (provider.apiStyle === "ollama") consumePayload(buffer.trim());
        else {
          const data = buffer
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .join("\n");
          consumePayload(data);
        }
      }
      break;
    }
  }
  return { text, usage, actualCostUsd, events };
}

function sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("The request was cancelled.", "AbortError"));
    }, { once: true });
  });
}

export async function executeProviderWithPolicy(input: {
  mode: UsageMode;
  provider: ProviderRecord;
  key?: string;
  model: string;
  prompt: string;
  taskId: string;
  estimatedCostUsd?: number;
  confirmedPaidCost?: boolean;
  stream?: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  sleepImpl?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  onEvent?: (event: NormalizedProviderEvent) => void;
}): Promise<ProviderExecutionResult> {
  const route = resolveUsageRoute({
    mode: input.mode,
    provider: input.provider,
    estimatedCostUsd: input.estimatedCostUsd,
    taskId: input.taskId,
  });
  if (!route.allowed) {
    throw new NormalizedProviderError({
      status: 403,
      code: "policy_blocked",
      message: route.reason || "The usage policy blocked this provider request.",
      retryable: false,
    });
  }
  if (route.route === "paid" && route.requiresConfirmation && !input.confirmedPaidCost) {
    throw new NormalizedProviderError({
      status: 403,
      code: "confirmation_required",
      message: "Confirm the displayed paid-request estimate before this request runs.",
      retryable: false,
    });
  }
  if (!input.model.trim() || !input.prompt.trim()) {
    throw new NormalizedProviderError({
      status: 400,
      code: "invalid_request",
      message: "A model and prompt are required.",
      retryable: false,
    });
  }
  const requestKey = sha256Hex([
    input.taskId,
    input.provider.id,
    input.model,
    input.prompt,
    route.route,
  ].join("\n"));
  const running = activeRequests.get(requestKey);
  if (running) {
    const result = await running;
    return { ...result, deduplicated: true };
  }
  const operation = (async (): Promise<ProviderExecutionResult> => {
    const started = Date.now();
    const circuit = circuits.get(input.provider.id);
    if (circuit && circuit.openUntil > started) {
      throw new NormalizedProviderError({
        status: 503,
        code: "circuit_open",
        message: "This provider is cooling down after repeated failures.",
        retryable: true,
        retryAfterMs: circuit.openUntil - started,
      });
    }
    const providerAttempts = Math.max(1, input.provider.maxRetries ?? 2) + 1;
    const maximumAttempts = Math.min(
      providerAttempts,
      route.route === "paid"
        ? Math.max(1, input.mode.maxPaidCandidateCalls || 1)
        : providerAttempts,
      4,
    );
    const fetchImpl = input.fetchImpl || fetch;
    const wait = input.sleepImpl || sleep;
    let lastError: NormalizedProviderError | undefined;
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      if (input.signal?.aborted) throw new DOMException("The request was cancelled.", "AbortError");
      const controller = new AbortController();
      const timeoutMs = Math.min(Math.max(input.provider.timeoutMs || 60_000, 5_000), 180_000);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const forwardAbort = () => controller.abort();
      input.signal?.addEventListener("abort", forwardAbort, { once: true });
      const events: NormalizedProviderEvent[] = [{
        type: "response.started",
        providerId: input.provider.id,
        modelId: input.model,
      }];
      input.onEvent?.(events[0]);
      try {
        const request: ProviderRequest = {
          provider: input.provider,
          key: input.key,
          model: input.model,
          prompt: input.prompt,
          stream: input.stream,
          signal: controller.signal,
        };
        const shaped = providerRequestShape(request);
        const response = await fetchImpl(shaped.url, shaped.init);
        if (!response.ok) throw await normalizeProviderError(response);
        let text = "";
        let usage: unknown;
        let actualCostUsd: number | undefined;
        if (input.stream) {
          const streamed = await readStreamingResponse(input.provider, response, (event) => {
            events.push(event);
            input.onEvent?.(event);
          });
          text = streamed.text;
          usage = streamed.usage;
          actualCostUsd = streamed.actualCostUsd;
        } else {
          const payload = await response.json() as Record<string, unknown>;
          text = extractProviderText(input.provider, payload);
          usage = payload.usage || payload.usageMetadata;
          actualCostUsd = extractReportedCost(payload);
        }
        if (!text.trim()) {
          throw new NormalizedProviderError({
            status: 502,
            code: "empty_response",
            message: "The provider returned no usable text.",
            retryable: true,
          });
        }
        const completed: NormalizedProviderEvent = {
          type: "response.completed",
          text,
          usage,
          actualCostUsd,
          requestId:
            response.headers.get("request-id") ||
            response.headers.get("x-request-id") ||
            undefined,
        };
        events.push(completed);
        input.onEvent?.(completed);
        circuits.set(input.provider.id, { failures: 0, openUntil: 0 });
        return {
          text,
          usage,
          actualCostUsd,
          requestId: completed.requestId,
          attempts: attempt,
          deduplicated: false,
          latencyMs: Date.now() - started,
          events,
        };
      } catch (error) {
        const normalized =
          error instanceof NormalizedProviderError
            ? error
            : error instanceof DOMException && error.name === "AbortError"
              ? new NormalizedProviderError({
                  status: input.signal?.aborted ? 499 : 408,
                  code: input.signal?.aborted ? "cancelled" : "timeout",
                  message: input.signal?.aborted ? "The request was cancelled." : "The provider request timed out.",
                  retryable: !input.signal?.aborted,
                })
              : new NormalizedProviderError({
                  status: 503,
                  code: "network_error",
                  message: error instanceof Error ? error.message : "The provider network request failed.",
                  retryable: true,
                });
        lastError = normalized;
        const previous = circuits.get(input.provider.id) || { failures: 0, openUntil: 0 };
        const failures = previous.failures + 1;
        circuits.set(input.provider.id, {
          failures,
          openUntil: failures >= 3 ? Date.now() + 60_000 : 0,
        });
        const failedEvent: NormalizedProviderEvent = {
          type: "response.failed",
          code: normalized.code,
          message: normalized.message,
          retryable: normalized.retryable,
          retryAfterMs: normalized.retryAfterMs,
        };
        input.onEvent?.(failedEvent);
        if (!normalized.retryable || attempt >= maximumAttempts || input.signal?.aborted) {
          throw normalized;
        }
        const delay = normalized.retryAfterMs ??
          Math.min(8_000, 250 * 2 ** (attempt - 1) + (attempt * 37) % 113);
        await wait(delay, input.signal);
      } finally {
        clearTimeout(timeout);
        input.signal?.removeEventListener("abort", forwardAbort);
      }
    }
    throw lastError || new NormalizedProviderError({
      status: 503,
      code: "provider_unavailable",
      message: "No provider attempt completed.",
      retryable: true,
    });
  })();
  activeRequests.set(requestKey, operation);
  try {
    return await operation;
  } finally {
    activeRequests.delete(requestKey);
  }
}

export function createCompatibleProvider(input: {
  id: string;
  name: string;
  baseUrl: string;
  costClass: "free" | "paid" | "local" | "unknown";
  apiStyle?: ProviderRecord["apiStyle"];
  privacyNote: string;
}): ProviderRecord {
  const id = input.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id || !input.name.trim() || !input.privacyNote.trim()) {
    throw new Error("Provider ID, display name, and privacy note are required.");
  }
  const endpoint = validateCompatibleEndpoint(input.baseUrl, {
    allowLocal: input.costClass === "local",
  });
  if (!endpoint.ok || !endpoint.normalized) {
    throw new Error(endpoint.reason || "Provider endpoint is invalid.");
  }
  return {
    id,
    name: input.name.trim().slice(0, 80),
    providerClass: input.costClass === "local" ? "local" : "compatible",
    apiStyle: input.apiStyle || "openai-chat",
    baseUrl: endpoint.normalized,
    costClass: input.costClass,
    status: "untested",
    configured: input.costClass === "local",
    modelIds: [],
    capabilities: [],
    privacyNote: input.privacyNote.trim().slice(0, 500),
    catalogSource: "user-configured endpoint",
    pricingConfidence: "unknown",
    supports: {},
    timeoutMs: 60_000,
    maxRetries: 2,
  };
}
