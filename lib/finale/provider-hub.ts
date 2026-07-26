"use client";

import type { ProviderRecord } from "@/lib/finale/contracts";
import {
  safeProviderHeaders,
  validateCompatibleEndpoint,
} from "@/lib/finale/policy.mjs";

export type ProviderRequest = {
  provider: ProviderRecord;
  key?: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
  stream?: boolean;
  maxTokens?: number;
};

function providerHeaders(provider: ProviderRecord, key: string): Record<string, string> {
  if (provider.apiStyle === "anthropic-messages") {
    return {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    };
  }
  if (provider.apiStyle === "gemini-generate-content") {
    return {
      "content-type": "application/json",
      ...(key ? { "x-goog-api-key": key } : {}),
    };
  }
  return {
    "content-type": "application/json",
    ...(key ? { authorization: `Bearer ${key}` } : {}),
  };
}

export function providerRequestShape(request: ProviderRequest): {
  url: string;
  init: RequestInit;
} {
  const {
    provider,
    key = "",
    model,
    prompt,
    signal,
    stream = false,
    maxTokens = 1_024,
  } = request;
  const endpoint = validateCompatibleEndpoint(provider.baseUrl, {
    allowLocal: provider.providerClass === "local",
  });
  if (!endpoint.ok || !endpoint.normalized) {
    throw new Error(endpoint.reason || "Provider endpoint is invalid.");
  }
  let url = endpoint.normalized;
  let body: unknown;
  if (provider.apiStyle === "openai-responses") {
    url += provider.responsesEndpoint || "/responses";
    body = { model, input: prompt, stream };
  } else if (provider.apiStyle === "anthropic-messages") {
    url += provider.chatEndpoint || "/messages";
    body = { model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }], stream };
  } else if (provider.apiStyle === "gemini-generate-content") {
    url += `/models/${encodeURIComponent(model)}:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`;
    body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
  } else if (provider.apiStyle === "ollama") {
    url += provider.chatEndpoint || "/api/chat";
    body = { model, messages: [{ role: "user", content: prompt }], stream };
  } else {
    url += provider.chatEndpoint || "/chat/completions";
    body = { model, messages: [{ role: "user", content: prompt }], stream };
  }
  return {
    url,
    init: {
      method: "POST",
      headers: safeProviderHeaders({
        ...(provider.customHeaders || {}),
        ...providerHeaders(provider, key),
      }) as Record<string, string>,
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
      redirect: "error",
    },
  };
}

export function extractProviderText(provider: ProviderRecord, payload: unknown): string {
  const data = payload as Record<string, unknown>;
  if (provider.apiStyle === "openai-responses") {
    if (typeof data.output_text === "string") return data.output_text;
    const output = Array.isArray(data.output) ? data.output : [];
    return output
      .flatMap((item) => (Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : []))
      .map((item) => (item as { text?: string }).text || "")
      .join("");
  }
  if (provider.apiStyle === "anthropic-messages") {
    return (Array.isArray(data.content) ? data.content : [])
      .map((item) => (item as { text?: string }).text || "")
      .join("");
  }
  if (provider.apiStyle === "gemini-generate-content") {
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const parts = ((candidates[0] as { content?: { parts?: unknown[] } } | undefined)?.content?.parts || []);
    return parts.map((part) => (part as { text?: string }).text || "").join("");
  }
  if (provider.apiStyle === "ollama") {
    return (data.message as { content?: string } | undefined)?.content || "";
  }
  return ((data.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message?.content) || "";
}

export async function executeProviderRequest(request: ProviderRequest): Promise<{
  text: string;
  requestId?: string;
  usage?: unknown;
}> {
  const shaped = providerRequestShape(request);
  const response = await fetch(shaped.url, shaped.init);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (payload.error as { message?: string } | undefined)?.message ||
      `Provider request failed with HTTP ${response.status}.`;
    throw new Error(String(message).replace(/(?:bearer|sk-[a-z0-9_-]+)\s*\S*/gi, "[redacted]"));
  }
  const text = extractProviderText(request.provider, payload);
  if (!text) throw new Error("The provider returned no usable text.");
  return {
    text,
    requestId: response.headers.get("request-id") || response.headers.get("x-request-id") || undefined,
    usage: payload.usage || payload.usageMetadata,
  };
}

export async function verifyProviderConnection(
  provider: ProviderRecord,
  key: string,
): Promise<{ modelIds: string[] }> {
  const endpoint = validateCompatibleEndpoint(provider.baseUrl, {
    allowLocal: provider.providerClass === "local",
  });
  if (!endpoint.ok || !endpoint.normalized) {
    throw new Error(endpoint.reason || "Provider endpoint is invalid.");
  }
  let url = `${endpoint.normalized}${provider.modelsEndpoint || "/models"}`;
  if (provider.apiStyle === "ollama") url = `${endpoint.normalized}/api/tags`;
  const response = await fetch(url, {
    method: "GET",
    headers: safeProviderHeaders(providerHeaders(provider, key)) as Record<string, string>,
    cache: "no-store",
    redirect: "error",
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (payload.error as { message?: string } | undefined)?.message ||
      `Provider verification failed with HTTP ${response.status}.`;
    throw new Error(String(message).replace(/(?:bearer|sk-[a-z0-9_-]+)\s*\S*/gi, "[redacted]"));
  }
  const rawModels = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.models)
      ? payload.models
      : [];
  const modelIds = rawModels
    .map((item) => {
      const record = item as { id?: unknown; name?: unknown; model?: unknown };
      return String(record.id || record.name || record.model || "").replace(/^models\//, "");
    })
    .filter(Boolean)
    .slice(0, 500);
  return { modelIds };
}
