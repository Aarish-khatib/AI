"use client";

export type MotionVideoOptions = {
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

export type MotionVideoOutput = {
  dataUrl: string;
  mimeType: string;
};

function outputSize(aspectRatio = "16:9", resolution = "720p") {
  const longSide = resolution === "1080p" ? 1920 : 1280;
  const shortSide = resolution === "1080p" ? 1080 : 720;
  if (aspectRatio === "9:16") return { width: shortSide, height: longSide };
  if (aspectRatio === "1:1") return { width: shortSide, height: shortSide };
  if (aspectRatio === "4:5") return { width: shortSide * 0.8, height: shortSide };
  if (aspectRatio === "3:2") return { width: Math.round(shortSide * 1.5), height: shortSide };
  return { width: longSide, height: shortSide };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A keyframe could not be opened for local animation."));
    image.src = source;
  });
}

function recorderType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function coverRect(
  image: HTMLImageElement,
  width: number,
  height: number,
  scale: number,
  panX: number,
  panY: number,
) {
  const base = Math.max(width / image.naturalWidth, height / image.naturalHeight) * scale;
  const drawWidth = image.naturalWidth * base;
  const drawHeight = image.naturalHeight * base;
  const roomX = Math.max(0, drawWidth - width);
  const roomY = Math.max(0, drawHeight - height);
  return {
    x: -roomX * (0.5 + panX * 0.5),
    y: -roomY * (0.5 + panY * 0.5),
    width: drawWidth,
    height: drawHeight,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The local motion file could not be saved."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function composeMotionVideo(
  sources: string[],
  options: MotionVideoOptions = {},
): Promise<MotionVideoOutput> {
  if (!sources.length) throw new Error("Local motion needs at least one image.");
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot export local motion video. Try Chrome, Edge, or Firefox.");
  }
  const mimeType = recorderType();
  if (!mimeType) throw new Error("This browser has no supported local video encoder.");

  const images = await Promise.all(sources.map(loadImage));
  const { width, height } = outputSize(options.aspectRatio, options.resolution);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("The local motion canvas is unavailable.");

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: options.resolution === "1080p" ? 8_000_000 : 4_500_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };

  const durationMs = Math.min(Math.max(options.duration || 5, 2), 15) * 1_000;
  const segment = durationMs / images.length;
  let animationFrame = 0;

  const completed = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("The browser could not encode the local motion video."));
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
    };
  });

  recorder.start(250);
  const startedAt = performance.now();
  await new Promise<void>((resolve, reject) => {
    const draw = (now: number) => {
      if (options.signal?.aborted) {
        recorder.stop();
        reject(new DOMException("Generation cancelled.", "AbortError"));
        return;
      }
      const elapsed = Math.min(now - startedAt, durationMs);
      const overall = Math.min(elapsed / durationMs, 1);
      const rawIndex = Math.min(Math.floor(elapsed / segment), images.length - 1);
      const local = Math.min((elapsed - rawIndex * segment) / segment, 1);
      const image = images[rawIndex];

      context.fillStyle = "#090909";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const zoom = 1.02 + local * 0.11;
      const panX = Math.sin((rawIndex + 1) * 1.8 + local * Math.PI) * 0.7;
      const panY = Math.cos((rawIndex + 1) * 1.4 + local * Math.PI) * 0.45;
      const rect = coverRect(image, canvas.width, canvas.height, zoom, panX, panY);
      context.globalAlpha = 1;
      context.drawImage(image, rect.x, rect.y, rect.width, rect.height);

      const nextIndex = rawIndex + 1;
      if (nextIndex < images.length && local > 0.82) {
        const fade = (local - 0.82) / 0.18;
        const next = images[nextIndex];
        const nextRect = coverRect(next, canvas.width, canvas.height, 1.02, -panX, -panY);
        context.globalAlpha = fade;
        context.drawImage(next, nextRect.x, nextRect.y, nextRect.width, nextRect.height);
        context.globalAlpha = 1;
      }

      const vignette = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        Math.min(canvas.width, canvas.height) * 0.16,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.7,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.20)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, canvas.width, canvas.height);

      options.onProgress?.(Math.min(99, Math.round(overall * 100)));
      if (elapsed >= durationMs) {
        recorder.stop();
        resolve();
        return;
      }
      animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);
  }).finally(() => cancelAnimationFrame(animationFrame));

  const blob = await completed;
  return {
    dataUrl: await blobToDataUrl(blob),
    mimeType: blob.type || mimeType.split(";")[0],
  };
}

