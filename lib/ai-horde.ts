"use client";

import type { Attachment, MediaKind } from "@/lib/types";

const HORDE_API = "https://stablehorde.net/api/v2";
const ANONYMOUS_KEY = "0000000000";
const CLIENT_AGENT = "LimitlessAI:5.0:https://github.com";

export type HordeImageRequest = {
  prompt: string;
  negativePrompt?: string;
  kind: MediaKind;
  aspectRatio?: string;
  quality?: string;
  count?: number;
  references?: Attachment[];
  apiKey?: string;
};

export type HordeImageOutput = {
  dataUrl?: string;
  url?: string;
  mimeType: string;
  model?: string;
};

export type HordeJobState = {
  done: boolean;
  faulted: boolean;
  queuePosition?: number;
  waitTime?: number;
  processing?: number;
  outputs: HordeImageOutput[];
  error?: string;
};

const hordeHeaders = (apiKey?: string): HeadersInit => ({
  "Content-Type": "application/json",
  apikey: apiKey?.trim() || ANONYMOUS_KEY,
  "Client-Agent": CLIENT_AGENT,
});

async function hordeError(response: Response): Promise<Error> {
  let message = `${response.status} ${response.statusText}`;
  try {
    const payload = (await response.json()) as {
      message?: string;
      error?: string;
      rc?: string;
    };
    message = payload.message || payload.error || payload.rc || message;
  } catch {
    // Keep the HTTP status when the service returns a non-JSON error.
  }
  if (response.status === 429) {
    return new Error("The free community queue is busy. Limitless can retry shortly.");
  }
  return new Error(`AI Horde: ${message}`);
}

function dimensions(aspectRatio = "1:1"): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9":
      return { width: 768, height: 448 };
    case "9:16":
      return { width: 448, height: 768 };
    case "4:5":
      return { width: 512, height: 640 };
    case "3:2":
      return { width: 640, height: 448 };
    default:
      return { width: 512, height: 512 };
  }
}

function attachmentBase64(attachment?: Attachment): string | undefined {
  const source = attachment?.dataUrl;
  if (!source) return undefined;
  return source.includes(",") ? source.slice(source.indexOf(",") + 1) : source;
}

function postProcessors(kind: MediaKind): string[] | undefined {
  if (kind === "upscale") return ["RealESRGAN_x4plus"];
  if (kind === "remove-background") return ["strip_background"];
  return undefined;
}

export async function submitHordeImageJob(
  request: HordeImageRequest,
  signal?: AbortSignal,
): Promise<{ id: string }> {
  const { width, height } = dimensions(request.aspectRatio);
  const sourceImage = attachmentBase64(request.references?.[0]);
  const usesSource = Boolean(sourceImage);
  const prompt = request.negativePrompt?.trim()
    ? `${request.prompt.trim()} ### ${request.negativePrompt.trim()}`
    : request.prompt.trim();

  const response = await fetch(`${HORDE_API}/generate/async`, {
    method: "POST",
    headers: hordeHeaders(request.apiKey),
    signal,
    body: JSON.stringify({
      prompt,
      params: {
        sampler_name: "k_euler_a",
        cfg_scale: request.kind === "variation" ? 6.5 : 7,
        denoising_strength:
          request.kind === "upscale" || request.kind === "remove-background"
            ? 0.08
            : request.kind === "edit"
              ? 0.62
              : request.kind === "variation"
                ? 0.72
                : undefined,
        steps: request.quality === "high" ? 30 : 22,
        width,
        height,
        n: Math.min(Math.max(request.count || 1, 1), 4),
        karras: true,
        post_processing: postProcessors(request.kind),
      },
      source_image: sourceImage,
      source_processing: usesSource ? "img2img" : undefined,
      nsfw: false,
      censor_nsfw: true,
      replacement_filter: true,
      trusted_workers: false,
      slow_workers: true,
      extra_slow_workers: true,
      shared: false,
      r2: false,
    }),
  });
  if (!response.ok) throw await hordeError(response);
  const payload = (await response.json()) as { id?: string; message?: string };
  if (!payload.id) throw new Error(payload.message || "AI Horde did not return a job ID.");
  return { id: payload.id };
}

function normalizeHordeImage(image: string): HordeImageOutput {
  if (/^https?:\/\//i.test(image)) {
    return { url: image, mimeType: "image/webp" };
  }
  if (image.startsWith("data:")) {
    const mimeType = image.slice(5, image.indexOf(";")) || "image/webp";
    return { dataUrl: image, mimeType };
  }
  return {
    dataUrl: `data:image/webp;base64,${image}`,
    mimeType: "image/webp",
  };
}

export async function getHordeImageJob(
  id: string,
  signal?: AbortSignal,
): Promise<HordeJobState> {
  const check = await fetch(`${HORDE_API}/generate/check/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
  });
  if (!check.ok) throw await hordeError(check);
  const state = (await check.json()) as {
    done?: boolean;
    faulted?: boolean;
    queue_position?: number;
    wait_time?: number;
    processing?: number;
  };
  if (!state.done) {
    return {
      done: false,
      faulted: Boolean(state.faulted),
      queuePosition: state.queue_position,
      waitTime: state.wait_time,
      processing: state.processing,
      outputs: [],
      error: state.faulted ? "The free community job stopped before completion." : undefined,
    };
  }

  const response = await fetch(`${HORDE_API}/generate/status/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await hordeError(response);
  const payload = (await response.json()) as {
    faulted?: boolean;
    message?: string;
    generations?: Array<{ img?: string; model?: string; censored?: boolean }>;
  };
  const outputs = (payload.generations || [])
    .filter((generation) => generation.img && !generation.censored)
    .map((generation) => ({
      ...normalizeHordeImage(generation.img as string),
      model: generation.model,
    }));
  return {
    done: true,
    faulted: Boolean(payload.faulted),
    outputs,
    error:
      payload.message ||
      (payload.faulted && !outputs.length
        ? "The free community job could not be completed."
        : undefined),
  };
}

export async function pollHordeImageJob(
  id: string,
  onProgress?: (progress: number, label: string) => void,
  signal?: AbortSignal,
): Promise<HordeImageOutput[]> {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if (signal?.aborted) throw new DOMException("Generation cancelled.", "AbortError");
    const state = await getHordeImageJob(id, signal);
    if (state.faulted && !state.done) {
      throw new Error(state.error || "The free community job failed.");
    }
    if (state.done) {
      if (!state.outputs.length) {
        throw new Error(state.error || "The free community model returned no usable image.");
      }
      onProgress?.(100, "Free image ready");
      return state.outputs;
    }
    const queuePosition = Math.max(state.queuePosition || 0, 0);
    const progress = state.processing
      ? Math.min(92, 56 + attempt)
      : Math.min(48, Math.max(4, 48 - Math.min(queuePosition, 44)));
    onProgress?.(
      progress,
      state.processing
        ? "Community GPU rendering"
        : `Free queue${queuePosition ? ` · ${queuePosition} ahead` : ""}`,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 3_000));
  }
  throw new Error("The free job is still queued. It remains saved and will resume next time.");
}
