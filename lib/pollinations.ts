"use client";

import type { Attachment } from "@/lib/types";

const GENERATE_API = "https://gen.pollinations.ai";
const MEDIA_API = "https://media.pollinations.ai";

export type PollinationsVideoRequest = {
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  audio?: boolean;
  reference?: Attachment;
  signal?: AbortSignal;
  onStage?: (label: string, progress: number) => void;
};

export type PollinationsVideoOutput = {
  dataUrl: string;
  mimeType: string;
  model: string;
};

async function providerError(response: Response): Promise<Error> {
  let message = `${response.status} ${response.statusText}`;
  try {
    const payload = (await response.json()) as {
      message?: string;
      error?: string | { message?: string };
    };
    message =
      payload.message ||
      (typeof payload.error === "string" ? payload.error : payload.error?.message) ||
      message;
  } catch {
    // Preserve the HTTP status when a media endpoint returns plain text.
  }
  if (response.status === 402) {
    return new Error("The free Pollinations balance is empty. Switching to local motion.");
  }
  if (response.status === 429) {
    return new Error("The free Pollinations quota is busy. Switching to local motion.");
  }
  return new Error(`Pollinations: ${message}`);
}

function ensurePublishableKey(key: string): string {
  const normalized = key.trim();
  if (!normalized.startsWith("pk_")) {
    throw new Error("Pollinations browser generation requires a client-safe pk_ publishable key.");
  }
  return normalized;
}

async function uploadReference(
  key: string,
  attachment: Attachment,
  signal?: AbortSignal,
): Promise<string> {
  if (attachment.remoteUrl) return attachment.remoteUrl;
  if (!attachment.dataUrl) throw new Error("The reference image cannot be read.");
  const response = await fetch(`${MEDIA_API}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      data: attachment.dataUrl,
      contentType: attachment.type || "image/webp",
      name: attachment.name || "limitless-reference.webp",
    }),
  });
  if (!response.ok) throw await providerError(response);
  const payload = (await response.json()) as { url?: string };
  if (!payload.url) throw new Error("Pollinations did not return a reference URL.");
  return payload.url;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The generated video could not be saved."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

type PollinationsVideoModel = {
  id?: string;
  name?: string;
  model?: string;
  paid_only?: boolean;
  input_modalities?: string[];
  pricing?: {
    completionVideoSeconds?: number | string;
    output_video_seconds?: number | string;
    video?: number | string;
  };
  video_capabilities?: Record<string, unknown>;
};

function videoModelPrice(model: PollinationsVideoModel): number {
  const values = [
    model.pricing?.completionVideoSeconds,
    model.pricing?.output_video_seconds,
    model.pricing?.video,
  ];
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return Number.POSITIVE_INFINITY;
}

function acceptsImage(model: PollinationsVideoModel): boolean {
  if (model.input_modalities?.some((modality) => modality.toLowerCase() === "image")) {
    return true;
  }
  const capabilities = Object.keys(model.video_capabilities || {}).join(" ").toLowerCase();
  return /(image|start.?frame|reference|first.?frame)/.test(capabilities);
}

async function selectVideoModel(
  key: string,
  hasReference: boolean,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const response = await fetch(`${GENERATE_API}/video/models`, {
      cache: "no-store",
      signal,
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return "wan-fast";
    const payload = (await response.json()) as
      | PollinationsVideoModel[]
      | { data?: PollinationsVideoModel[]; models?: PollinationsVideoModel[] };
    const listed = Array.isArray(payload) ? payload : payload.data || payload.models || [];
    const accessible = listed.filter(
      (model) => !model.paid_only && (model.id || model.model || model.name),
    );
    const compatible = hasReference
      ? accessible.filter(acceptsImage)
      : accessible;
    const candidates = compatible.length ? compatible : accessible;
    candidates.sort((left, right) => {
      const priceDelta = videoModelPrice(left) - videoModelPrice(right);
      if (Number.isFinite(priceDelta) && priceDelta !== 0) return priceDelta;
      const leftFast = /(fast|turbo|lite|1\.3b)/i.test(
        left.id || left.model || left.name || "",
      );
      const rightFast = /(fast|turbo|lite|1\.3b)/i.test(
        right.id || right.model || right.name || "",
      );
      return Number(rightFast) - Number(leftFast);
    });
    return candidates[0]?.id || candidates[0]?.model || candidates[0]?.name || "wan-fast";
  } catch {
    return "wan-fast";
  }
}

export async function validatePollinationsPublishableKey(
  key: string,
  signal?: AbortSignal,
): Promise<number> {
  const normalized = ensurePublishableKey(key);
  const response = await fetch(`${GENERATE_API}/account/balance`, {
    cache: "no-store",
    signal,
    headers: { Authorization: `Bearer ${normalized}` },
  });
  if (!response.ok) throw await providerError(response);
  const payload = (await response.json()) as { balance?: number };
  return Number(payload.balance || 0);
}

export async function generatePollinationsVideo(
  key: string,
  request: PollinationsVideoRequest,
): Promise<PollinationsVideoOutput> {
  const normalized = ensurePublishableKey(key);
  request.onStage?.("Checking free video quota", 10);
  const balance = await validatePollinationsPublishableKey(normalized, request.signal);
  if (balance <= 0) {
    throw new Error("The free Pollinations balance is empty. Switching to local motion.");
  }

  let referenceUrl = request.reference?.remoteUrl;
  if (request.reference && !referenceUrl) {
    request.onStage?.("Preparing private reference", 18);
    referenceUrl = await uploadReference(normalized, request.reference, request.signal);
  }

  request.onStage?.("Selecting the best available video model", 21);
  const model = await selectVideoModel(normalized, Boolean(referenceUrl), request.signal);
  const url = new URL(`${GENERATE_API}/video/${encodeURIComponent(request.prompt.trim())}`);
  url.searchParams.set("model", model);
  url.searchParams.set("duration", String(Math.min(Math.max(request.duration || 5, 2), 10)));
  url.searchParams.set("aspectRatio", request.aspectRatio || "16:9");
  url.searchParams.set("audio", request.audio ? "true" : "false");
  url.searchParams.set("safe", "privacy,secrets,sexual,violence,shield");
  if (request.negativePrompt?.trim()) {
    url.searchParams.set("negative_prompt", request.negativePrompt.trim());
  }
  if (referenceUrl) url.searchParams.append("image", referenceUrl);

  request.onStage?.("Free AI video model rendering", 24);
  const response = await fetch(url, {
    cache: "no-store",
    signal: request.signal,
    headers: {
      Authorization: `Bearer ${normalized}`,
      "Pollinations-Safe": "privacy,secrets,sexual,violence,shield",
    },
  });
  if (!response.ok) throw await providerError(response);
  const blob = await response.blob();
  if (!blob.size) throw new Error("Pollinations returned an empty video.");
  const mimeType = blob.type.startsWith("video/") ? blob.type : "video/mp4";
  request.onStage?.("Saving generated video", 96);
  return {
    dataUrl: await blobToDataUrl(new Blob([blob], { type: mimeType })),
    mimeType,
    model,
  };
}
