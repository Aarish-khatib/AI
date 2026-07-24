"use client";

import {
  createAssetFromSource,
  saveAsset,
  saveMediaJob,
} from "@/lib/local-store";
import type { MediaAsset, MediaJob } from "@/lib/types";

export function assetSource(asset: MediaAsset): string | undefined {
  return asset.dataUrl || asset.remoteUrl;
}

export function useableAssetName(job: MediaJob, index: number, mimeType: string): string {
  const base =
    job.prompt
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || job.kind;
  const extension =
    mimeType.includes("png")
      ? "png"
      : mimeType.includes("jpeg")
        ? "jpg"
        : mimeType.includes("webp")
          ? "webp"
          : mimeType.includes("mp4")
            ? "mp4"
            : mimeType.includes("webm")
              ? "webm"
              : "bin";
  return `${base}-${index + 1}.${extension}`;
}

export async function materializeJobOutputs(
  job: MediaJob,
  deviceId: string,
): Promise<{ job: MediaJob; assets: MediaAsset[] }> {
  if (job.status !== "completed" || !job.outputs.length) return { job, assets: [] };
  const assets: MediaAsset[] = [];
  const outputs = [...job.outputs];
  let changed = false;

  for (let index = 0; index < outputs.length; index += 1) {
    const output = outputs[index];
    if (output.assetId) continue;
    const source = output.dataUrl || output.url;
    if (!source) continue;
    const mimeType =
      output.mimeType ||
      (job.kind === "video" || job.kind === "animate" ? "video/mp4" : "image/webp");
    const asset = await createAssetFromSource(source, deviceId, {
      name: useableAssetName(job, index, mimeType),
      mimeType,
      kind: mimeType.startsWith("video/") ? "video" : "image",
      sourceJobId: job.id,
    });
    await saveAsset(asset);
    assets.push(asset);
    outputs[index] = {
      ...output,
      assetId: asset.id,
      dataUrl: undefined,
      url: asset.remoteUrl || output.url,
    };
    changed = true;
  }

  if (!changed) return { job, assets };
  const updated: MediaJob = {
    ...job,
    outputs,
    updatedAt: Date.now(),
    revision: job.revision + 1,
  };
  await saveMediaJob(updated);
  return { job: updated, assets };
}

export function createAssetUrl(asset: MediaAsset): {
  url?: string;
  revoke: () => void;
} {
  if (asset.blob) {
    const url = URL.createObjectURL(asset.blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  }
  return {
    url: asset.dataUrl || asset.remoteUrl,
    revoke: () => undefined,
  };
}
