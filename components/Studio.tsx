"use client";

import {
  ArrowRight,
  Clapperboard,
  Download,
  Expand,
  Image as ImageIcon,
  Images,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MoveUpRight,
  Play,
  Route,
  Scissors,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  pollHordeImageJob,
  submitHordeImageJob,
  type HordeImageOutput,
} from "@/lib/ai-horde";
import { composeMotionVideo } from "@/lib/local-motion";
import { getSetting, setSetting } from "@/lib/local-store";
import { generatePollinationsVideo } from "@/lib/pollinations";
import { buildCreativeRoutes } from "@/lib/provider-registry";
import {
  generateImages,
  getVideoJob,
  modelCostClass,
  modelPriceLabel,
  planVisualShots,
  readAttachment,
  submitVideoJob,
} from "@/lib/openrouter";
import type {
  Attachment,
  GenerationProvider,
  ImageModel,
  MediaAsset,
  MediaJob,
  MediaKind,
  MediaProject,
  VideoModel,
} from "@/lib/types";
import { uid } from "@/lib/types";

const AUTO_MODEL = "__limitless_auto_free__";
const ImageEditor = dynamic(
  () => import("@/components/ImageEditor").then((module) => module.ImageEditor),
  {
    ssr: false,
    loading: () => <div className="editor-loading"><LoaderCircle className="spin" size={18} /> Loading image canvas…</div>,
  },
);
const VideoEditor = dynamic(
  () => import("@/components/VideoEditor").then((module) => module.VideoEditor),
  {
    ssr: false,
    loading: () => <div className="editor-loading"><LoaderCircle className="spin" size={18} /> Loading timeline…</div>,
  },
);

const tools: Array<{
  id: MediaKind;
  label: string;
  description: string;
  icon: typeof ImageIcon;
  input?: boolean;
}> = [
  { id: "image", label: "Generate image", description: "Text to image", icon: ImageIcon },
  { id: "video", label: "Generate video", description: "AI video or free motion film", icon: Video },
  { id: "animate", label: "Animate image", description: "AI motion or local motion", icon: Play, input: true },
  { id: "edit", label: "Edit image", description: "Prompt-directed edit", icon: WandSparkles, input: true },
  { id: "variation", label: "Create variations", description: "Explore alternate directions", icon: Images, input: true },
  { id: "upscale", label: "Upscale", description: "Enhance detail and size", icon: Expand, input: true },
  {
    id: "remove-background",
    label: "Remove background",
    description: "Create a clean isolated subject",
    icon: Scissors,
    input: true,
  },
];

const promptGuidance: Record<MediaKind, string> = {
  image: "",
  video:
    "Create a cinematic keyframe with a clear subject, dimensional lighting, and room for natural camera motion. ",
  animate: "Animate this still image with coherent, natural motion. ",
  edit: "Edit the reference image while preserving unrelated details. ",
  variation: "Create a distinct visual variation of this reference, keeping its core subject. ",
  upscale: "Preserve this image exactly while improving clarity and edge detail. ",
  "remove-background":
    "Isolate the main subject on a transparent background with clean, accurate edges. ",
};

function outputSource(output: MediaJob["outputs"][number]): string | undefined {
  return output.url || output.dataUrl;
}

function isMotion(kind: MediaKind): boolean {
  return kind === "video" || kind === "animate";
}

function routeCopy({
  activeTool,
  selectedModel,
  selectedModelData,
  apiKey,
  pollinationsKey,
  references,
}: {
  activeTool: MediaKind;
  selectedModel: string;
  selectedModelData?: ImageModel;
  apiKey: string;
  pollinationsKey: string;
  references: Attachment[];
}) {
  if (selectedModel !== AUTO_MODEL && selectedModelData) {
    return {
      label: `${modelCostClass(selectedModelData) === "free" ? "FREE" : "DIRECT"} · OpenRouter`,
      detail: `${selectedModelData.name || selectedModelData.id} will handle this request.`,
    };
  }
  if (isMotion(activeTool)) {
    if (pollinationsKey) {
      return {
        label: "FREE QUOTA · Multi-provider video",
        detail:
          "Zero-price OpenRouter models are tried first, then Pollinations creates true AI video from free quota, with local motion as the final fallback.",
      };
    }
    return references.length
      ? {
          label: "FREE · Local motion",
          detail: "Your image is animated and encoded inside this browser. No visual API is required.",
        }
      : {
          label: "FREE · Hybrid route",
          detail: `${apiKey ? "A free text model plans the frame, " : ""}AI Horde creates it, then your browser renders motion video.`,
        };
  }
  return {
    label: "FREE · Smart failover",
    detail: apiKey
      ? "A zero-cost OpenRouter image model is tried first, then AI Horde takes over if needed."
      : "AI Horde supplies community GPU image generation without requiring an account.",
  };
}

export function Studio({
  apiKey,
  pollinationsKey,
  deviceId,
  imageModels,
  videoModels,
  assets,
  projects,
  onRequireKey,
  onSaveJob,
  onAssetSaved,
  onProjectSaved,
}: {
  apiKey: string;
  pollinationsKey: string;
  deviceId: string;
  imageModels: ImageModel[];
  videoModels: VideoModel[];
  assets: MediaAsset[];
  projects: MediaProject[];
  onRequireKey: () => void;
  onSaveJob: (job: MediaJob) => Promise<void>;
  onAssetSaved: (asset: MediaAsset) => void;
  onProjectSaved: (project: MediaProject) => void;
}) {
  const [workspaceMode, setWorkspaceMode] = useState<"generate" | "image" | "video">("generate");
  const [activeTool, setActiveTool] = useState<MediaKind>("image");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [references, setReferences] = useState<Attachment[]>([]);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1024x1024");
  const [quality, setQuality] = useState("standard");
  const [duration, setDuration] = useState(5);
  const [audio, setAudio] = useState(false);
  const [count, setCount] = useState(1);
  const [imageModel, setImageModel] = useState(AUTO_MODEL);
  const [videoModel, setVideoModel] = useState(AUTO_MODEL);
  const [spendLocked, setSpendLocked] = useState(true);
  const [working, setWorking] = useState(false);
  const [stageLabel, setStageLabel] = useState("");
  const [error, setError] = useState("");
  const [currentJob, setCurrentJob] = useState<MediaJob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestJobRef = useRef<MediaJob | null>(null);
  const motion = isMotion(activeTool);
  const selectedModel = motion ? videoModel : imageModel;
  const allModels = motion ? videoModels : imageModels;
  const visibleModels = useMemo(
    () =>
      spendLocked
        ? allModels.filter((model) => modelCostClass(model) === "free")
        : allModels,
    [allModels, spendLocked],
  );
  const selectedModelData = allModels.find((model) => model.id === selectedModel);
  const autoRoutes = useMemo(
    () =>
      buildCreativeRoutes({
        kind: activeTool,
        apiKey: Boolean(apiKey),
        pollinationsKey: Boolean(pollinationsKey),
        imageModels,
        videoModels,
        spendLocked,
      }),
    [activeTool, apiKey, imageModels, pollinationsKey, spendLocked, videoModels],
  );
  const needsReference = Boolean(tools.find((tool) => tool.id === activeTool)?.input);
  const acceptsReference = needsReference || activeTool === "video";
  const route = routeCopy({
    activeTool,
    selectedModel,
    selectedModelData,
    apiKey,
    pollinationsKey,
    references,
  });

  useEffect(() => {
    getSetting("studio-spend-lock", true)
      .then(setSpendLocked)
      .catch(() => undefined);
    return () => abortRef.current?.abort();
  }, []);

  const chooseTool = (kind: MediaKind) => {
    abortRef.current?.abort();
    setActiveTool(kind);
    setError("");
    setStageLabel("");
    setCurrentJob(null);
    if (isMotion(kind)) {
      setAspectRatio("16:9");
      setResolution("720p");
    } else {
      setAspectRatio("1:1");
      setResolution("1024x1024");
    }
  };

  const commit = async (
    job: MediaJob,
    patch: Partial<MediaJob>,
  ): Promise<MediaJob> => {
    const updated: MediaJob = {
      ...job,
      ...patch,
      updatedAt: Date.now(),
      revision: job.revision + 1,
    };
    latestJobRef.current = updated;
    setCurrentJob(updated);
    await onSaveJob(updated);
    return updated;
  };

  const runOpenRouterVideo = async (
    initial: MediaJob,
    model: ImageModel,
    controller: AbortController,
  ): Promise<MediaJob> => {
    setStageLabel("Submitting visual model");
    const submitted = await submitVideoJob(apiKey, {
      model: model.id,
      prompt: `${promptGuidance[activeTool]}${prompt.trim()}`.trim(),
      negativePrompt,
      duration,
      aspectRatio,
      resolution,
      audio,
      references,
      animate: activeTool === "animate",
    });
    let job = await commit(initial, {
      model: model.id,
      provider: "openrouter",
      routeLabel: `${modelCostClass(model) === "free" ? "Free " : ""}OpenRouter video`,
      cost: modelCostClass(model),
      status: "processing",
      providerJobId: submitted.id,
      progress: 2,
      attempts: (initial.attempts || 0) + 1,
    });

    for (let attempt = 0; attempt < 150; attempt += 1) {
      if (controller.signal.aborted) throw new DOMException("Generation cancelled.", "AbortError");
      await new Promise((resolve) => window.setTimeout(resolve, 4_000));
      const state = await getVideoJob(apiKey, submitted.id);
      const normalized = state.status.toLowerCase();
      if (["failed", "cancelled", "canceled", "error"].includes(normalized)) {
        throw new Error(state.error || "Video generation failed.");
      }
      const completed = ["completed", "succeeded"].includes(normalized);
      setStageLabel(completed ? "Video ready" : "Visual model rendering");
      job = await commit(job, {
        status: completed ? "completed" : "processing",
        progress: completed ? 100 : state.progress || Math.min(94, 5 + attempt),
        outputs:
          state.url || state.dataUrl
            ? [
                {
                  id: uid(),
                  url: state.url,
                  dataUrl: state.dataUrl,
                  mimeType: "video/mp4",
                },
              ]
            : [],
      });
      if (completed) return job;
    }
    throw new Error("The video is still processing. It remains saved and will resume next time.");
  };

  const runOpenRouterImages = async (
    initial: MediaJob,
    model: ImageModel,
    controller: AbortController,
  ): Promise<MediaJob> => {
    setStageLabel("OpenRouter image model");
    let job = await commit(initial, {
      model: model.id,
      provider: "openrouter",
      routeLabel: `${modelCostClass(model) === "free" ? "Free " : ""}OpenRouter image`,
      cost: modelCostClass(model),
      status: "processing",
      progress: 18,
      attempts: (initial.attempts || 0) + 1,
    });
    const images = await generateImages(apiKey, {
      model: model.id,
      prompt: `${promptGuidance[activeTool]}${prompt.trim()}`.trim(),
      negativePrompt,
      aspectRatio,
      resolution,
      quality,
      outputFormat: activeTool === "remove-background" ? "png" : "webp",
      count,
      references,
      signal: controller.signal,
    });
    if (!images.length) throw new Error("The image model returned no output.");
    job = await commit(job, {
      status: "completed",
      progress: 100,
      outputs: images.map((image) => ({
        id: uid(),
        dataUrl: image.dataUrl,
        url: image.url,
        mimeType: image.mimeType || "image/webp",
      })),
    });
    return job;
  };

  const runPollinationsVideo = async (
    initial: MediaJob,
    controller: AbortController,
  ): Promise<MediaJob> => {
    setStageLabel("Checking free AI video quota");
    let job = await commit(initial, {
      model: "pollinations/wan-fast",
      provider: "pollinations",
      routeLabel: "Pollinations free-quota AI video",
      cost: "free",
      providerJobId: undefined,
      status: "processing",
      progress: 8,
      attempts: (initial.attempts || 0) + 1,
    });
    const output = await generatePollinationsVideo(pollinationsKey, {
      prompt: prompt.trim(),
      negativePrompt,
      duration,
      aspectRatio,
      audio,
      reference: references[0],
      signal: controller.signal,
      onStage: (label, progress) => {
        setStageLabel(label);
        setCurrentJob((current) => (current ? { ...current, progress } : current));
      },
    });
    job = await commit(job, {
      model: `pollinations/${output.model}`,
      status: "completed",
      progress: 100,
      outputs: [{ id: uid(), dataUrl: output.dataUrl, mimeType: output.mimeType }],
    });
    setStageLabel("Free-quota AI video ready");
    return job;
  };

  const runLocalMotion = async (
    initial: MediaJob,
    sources: string[],
    routeLabel: string,
    controller: AbortController,
  ): Promise<MediaJob> => {
    setStageLabel("Browser motion renderer");
    let job = await commit(initial, {
      model: "limitless/local-motion",
      provider: "local",
      routeLabel,
      cost: "free",
      providerJobId: undefined,
      status: "processing",
      progress: 62,
      attempts: (initial.attempts || 0) + 1,
    });
    const video = await composeMotionVideo(sources, {
      duration,
      aspectRatio,
      resolution,
      signal: controller.signal,
      onProgress: (progress) => {
        const mapped = 62 + Math.round(progress * 0.37);
        setCurrentJob((current) => (current ? { ...current, progress: mapped } : current));
      },
    });
    job = await commit(job, {
      status: "completed",
      progress: 100,
      outputs: [{ id: uid(), dataUrl: video.dataUrl, mimeType: video.mimeType }],
    });
    setStageLabel("Free motion video ready");
    return job;
  };

  const runHordeRoute = async (
    initial: MediaJob,
    controller: AbortController,
  ): Promise<MediaJob> => {
    if (isMotion(activeTool) && references[0]) {
      const source = references[0].dataUrl || references[0].remoteUrl;
      if (!source) throw new Error("The reference image cannot be read.");
      return runLocalMotion(initial, [source], "Free local motion", controller);
    }

    setStageLabel(apiKey ? "Free model planning keyframe" : "Preparing free community route");
    const plannedPrompt = isMotion(activeTool)
      ? (await planVisualShots(apiKey, prompt.trim(), 1))[0]
      : `${promptGuidance[activeTool]}${prompt.trim()}`.trim();
    const submitted = await submitHordeImageJob(
      {
        prompt: plannedPrompt,
        negativePrompt,
        kind: activeTool,
        aspectRatio,
        quality,
        count: isMotion(activeTool) ? 1 : count,
        references,
      },
      controller.signal,
    );
    let job = await commit(initial, {
      model: "ai-horde/auto",
      provider: "ai-horde",
      routeLabel: isMotion(activeTool)
        ? "AI Horde keyframe + local motion"
        : "AI Horde community image",
      cost: "free",
      status: "processing",
      providerJobId: submitted.id,
      progress: 4,
      attempts: (initial.attempts || 0) + 1,
    });
    const outputs = await pollHordeImageJob(
      submitted.id,
      (progress, label) => {
        setStageLabel(label);
        setCurrentJob((current) => (current ? { ...current, progress } : current));
      },
      controller.signal,
    );
    const model = outputs.find((output) => output.model)?.model;
    const keyframeInputs = isMotion(activeTool)
      ? outputs.reduce<Attachment[]>((inputs, image, index) => {
            const source = image.dataUrl || image.url;
            if (!source) return inputs;
            inputs.push({
              id: uid(),
              name: `free-keyframe-${index + 1}.webp`,
              type: image.mimeType,
              kind: "image",
              size: image.dataUrl?.length || 0,
              dataUrl: image.dataUrl,
              remoteUrl: image.url,
            });
            return inputs;
          }, [])
      : [];
    job = await commit(job, {
      model: model ? `ai-horde/${model}` : "ai-horde/auto",
      progress: isMotion(activeTool) ? 58 : 100,
      providerJobId: undefined,
      status: isMotion(activeTool) ? "processing" : "completed",
      inputs: isMotion(activeTool) ? [...(job.inputs || []), ...keyframeInputs] : job.inputs,
      outputs: isMotion(activeTool)
        ? []
        : outputs.map((image) => ({
            id: uid(),
            dataUrl: image.dataUrl,
            url: image.url,
            mimeType: image.mimeType,
          })),
    });
    if (!isMotion(activeTool)) return job;
    const sources = outputs
      .map((output: HordeImageOutput) => output.dataUrl || output.url)
      .filter(Boolean) as string[];
    return runLocalMotion(job, sources, "AI Horde keyframe + local motion", controller);
  };

  const runFreeFallback = async (
    initial: MediaJob,
    controller: AbortController,
  ): Promise<MediaJob> => {
    let job = initial;
    if (isMotion(activeTool) && pollinationsKey) {
      try {
        return await runPollinationsVideo(job, controller);
      } catch (caught) {
        if (controller.signal.aborted) throw caught;
        setStageLabel("Free AI video unavailable · switching to local route");
        job = await commit(latestJobRef.current || job, {
          status: "processing",
          error: undefined,
          outputs: [],
          providerJobId: undefined,
          progress: 3,
        });
      }
    }
    return runHordeRoute(job, controller);
  };

  const run = async () => {
    if (working) {
      abortRef.current?.abort();
      return;
    }
    setError("");
    setStageLabel("");
    if (!prompt.trim() && activeTool !== "remove-background" && activeTool !== "upscale") {
      setError("Describe the result you want.");
      return;
    }
    if (needsReference && !references.length) {
      setError("Add a reference image for this tool.");
      return;
    }

    const directModel =
      selectedModel === AUTO_MODEL
        ? undefined
        : allModels.find((model) => model.id === selectedModel);
    if (selectedModel !== AUTO_MODEL && !directModel) {
      setError("That visual model is no longer available. Switch back to Auto free route.");
      return;
    }
    if (directModel && !apiKey) {
      onRequireKey();
      return;
    }
    const directCost = directModel ? modelCostClass(directModel) : "free";
    if (directModel && spendLocked && directCost !== "free") {
      setError("Spend lock blocked this model because its price is not confirmed as zero.");
      return;
    }
    if (directModel && directCost !== "free") {
      const confirmed = window.confirm(
        `${directModel.name || directModel.id} is ${modelPriceLabel(directModel)}. Continue with this paid provider request?`,
      );
      if (!confirmed) return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const now = Date.now();
    const initialProvider: GenerationProvider =
      directModel
        ? "openrouter"
        : isMotion(activeTool) && pollinationsKey
          ? "pollinations"
          : isMotion(activeTool) && references.length
            ? "local"
            : "ai-horde";
    let job: MediaJob = {
      id: uid(),
      kind: activeTool,
      prompt: prompt.trim() || tools.find((tool) => tool.id === activeTool)?.label || "",
      negativePrompt: negativePrompt.trim() || undefined,
      model: directModel?.id || "limitless/auto-free",
      provider: initialProvider,
      routeLabel: route.detail,
      cost: directModel ? directCost : "free",
      status: "queued",
      attempts: 0,
      inputs: references,
      outputs: [],
      options: {
        aspectRatio,
        resolution,
        quality,
        count,
        duration,
        audio,
        spendLocked,
      },
      createdAt: now,
      updatedAt: now,
      revision: 1,
      deviceId,
    };
    setCurrentJob(job);
    latestJobRef.current = job;
    setWorking(true);
    await onSaveJob(job);

    try {
      if (directModel) {
        job = isMotion(activeTool)
          ? await runOpenRouterVideo(job, directModel, controller)
          : await runOpenRouterImages(job, directModel, controller);
      } else {
        const freeModel = autoRoutes.find(
          (candidate) => candidate.provider === "openrouter" && candidate.cost === "free",
        )?.model;
        if (freeModel) {
          try {
            job = isMotion(activeTool)
              ? await runOpenRouterVideo(job, freeModel, controller)
              : await runOpenRouterImages(job, freeModel, controller);
          } catch (firstError) {
            if (controller.signal.aborted) throw firstError;
            setStageLabel("Free model unavailable · switching route");
            job = await commit(job, {
              status: "processing",
              error: undefined,
              outputs: [],
              providerJobId: undefined,
              progress: 3,
            });
            job = await runFreeFallback(job, controller);
          }
        } else {
          job = await runFreeFallback(job, controller);
        }
      }
      setCurrentJob(job);
    } catch (caught) {
      const cancelled =
        controller.signal.aborted ||
        (caught instanceof DOMException && caught.name === "AbortError");
      const message = cancelled
        ? "Generation cancelled. The saved job remains in Library."
        : caught instanceof Error
          ? caught.message
          : "Generation failed.";
      const latest = latestJobRef.current || job;
      const canResume =
        !cancelled &&
        Boolean(latest.providerJobId) &&
        /(still (?:queued|processing)|resume)/i.test(message);
      const failed = await commit(latest, {
        status: canResume ? "processing" : cancelled ? "cancelled" : "failed",
        cancelledAt: cancelled ? Date.now() : undefined,
        error: message,
      });
      setCurrentJob(failed);
      setError(message);
    } finally {
      abortRef.current = null;
      setWorking(false);
    }
  };

  return (
    <section className="workspace studio-workspace">
      <header className="workspace-header">
        <div>
          <span className="section-kicker">CREATE</span>
          <b>Generative studio</b>
        </div>
        <div className="header-status">
          <span className="status-dot" />
          Free route engine online
        </div>
      </header>

      <nav className="creation-mode-tabs" aria-label="Creation workspace">
        <button
          type="button"
          className={workspaceMode === "generate" ? "active" : ""}
          onClick={() => setWorkspaceMode("generate")}
        >
          <Sparkles size={16} />
          Generate
        </button>
        <button
          type="button"
          className={workspaceMode === "image" ? "active" : ""}
          onClick={() => setWorkspaceMode("image")}
        >
          <Layers3 size={16} />
          Image canvas
        </button>
        <button
          type="button"
          className={workspaceMode === "video" ? "active" : ""}
          onClick={() => setWorkspaceMode("video")}
        >
          <Clapperboard size={16} />
          Video editor
        </button>
      </nav>

      {workspaceMode === "generate" && <div className="studio-layout">
        <aside className="studio-tools">
          <div className="studio-tools-heading">
            <span>TOOLS</span>
            <small>7</small>
          </div>
          {tools.map(({ id, label, description, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={activeTool === id ? "selected" : ""}
              onClick={() => chooseTool(id)}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>
                <b>{label}</b>
                <small>{description}</small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))}
          <div className="studio-principle">
            <ShieldCheck size={16} />
            <p>
              Auto mode combines zero-cost models, community GPUs, and local rendering. Every result is saved.
            </p>
          </div>
        </aside>

        <main className="studio-canvas">
          <div className="studio-title">
            <span>
              {(() => {
                const ToolIcon = tools.find((tool) => tool.id === activeTool)?.icon || ImageIcon;
                return <ToolIcon size={22} />;
              })()}
            </span>
            <div>
              <p>{activeTool.toUpperCase().replace("-", " ")}</p>
              <h1>{tools.find((tool) => tool.id === activeTool)?.label}</h1>
            </div>
          </div>

          <div className="studio-grid">
            <div className="generation-form">
              <div className="route-engine-card">
                <div>
                  <Route size={17} />
                  <span>
                    <b>{route.label}</b>
                    <small>{route.detail} {autoRoutes.length} route{autoRoutes.length === 1 ? "" : "s"} available.</small>
                  </span>
                </div>
                <label className="spend-lock">
                  <input
                    type="checkbox"
                    checked={spendLocked}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSpendLocked(checked);
                      if (
                        checked &&
                        selectedModelData &&
                        modelCostClass(selectedModelData) !== "free"
                      ) {
                        if (motion) setVideoModel(AUTO_MODEL);
                        else setImageModel(AUTO_MODEL);
                      }
                      void setSetting("studio-spend-lock", checked);
                    }}
                  />
                  <span><i /></span>
                  <LockKeyhole size={13} />
                  Never spend
                </label>
              </div>

              {acceptsReference && (
                <div className="field-block">
                  <div className="field-label">
                    <label>REFERENCE IMAGE</label>
                    <span>{needsReference ? "REQUIRED" : "OPTIONAL"}</span>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={async (event) => {
                      if (!event.target.files?.[0]) return;
                      const attachment = await readAttachment(event.target.files[0]);
                      setReferences([attachment]);
                      event.target.value = "";
                    }}
                  />
                  {references[0] ? (
                    <div className="reference-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={references[0].dataUrl || references[0].remoteUrl}
                        alt="Reference"
                      />
                      <span>{references[0].name}</span>
                      <button type="button" onClick={() => setReferences([])}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="drop-zone"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={20} />
                      <b>Choose an image</b>
                      <span>PNG, JPG, or WEBP</span>
                    </button>
                  )}
                </div>
              )}

              <div className="field-block">
                <div className="field-label">
                  <label htmlFor="studio-prompt">PROMPT</label>
                  <span>{prompt.length}/4000</span>
                </div>
                <textarea
                  id="studio-prompt"
                  value={prompt}
                  maxLength={4000}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={
                    activeTool === "image"
                      ? "A quiet brutalist gallery at dawn, soft directional light, editorial photography…"
                      : activeTool === "animate"
                        ? "Slow camera push, gentle fabric movement, natural light shifting…"
                        : "Describe the exact result and what must remain unchanged…"
                  }
                  rows={6}
                />
              </div>
              <details className="negative-prompt">
                <summary>Negative prompt <span>Optional</span></summary>
                <textarea
                  value={negativePrompt}
                  onChange={(event) => setNegativePrompt(event.target.value)}
                  placeholder="Elements, styles, or artifacts to avoid…"
                  rows={3}
                />
              </details>

              <div className="option-grid">
                <label>
                  <span>ROUTE / MODEL</span>
                  <select
                    value={selectedModel}
                    onChange={(event) =>
                      motion ? setVideoModel(event.target.value) : setImageModel(event.target.value)
                    }
                  >
                    <option value={AUTO_MODEL}>Auto · free route engine</option>
                    {visibleModels.map((model) => (
                      <option value={model.id} key={model.id}>
                        {modelCostClass(model) === "free" ? "FREE · " : ""}
                        {model.name || model.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>ASPECT</span>
                  <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                    <option>1:1</option>
                    <option>4:5</option>
                    <option>3:2</option>
                    <option>16:9</option>
                    <option>9:16</option>
                  </select>
                </label>
                <label>
                  <span>RESOLUTION</span>
                  <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
                    {motion ? (
                      <>
                        <option>720p</option>
                        <option>1080p</option>
                      </>
                    ) : (
                      <>
                        <option>1024x1024</option>
                        <option>1536x1024</option>
                        <option>1024x1536</option>
                      </>
                    )}
                  </select>
                </label>
                {motion ? (
                  <label>
                    <span>DURATION</span>
                    <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                      <option value={5}>5 seconds</option>
                      <option value={8}>8 seconds</option>
                      <option value={10}>10 seconds</option>
                    </select>
                  </label>
                ) : (
                  <label>
                    <span>OUTPUTS</span>
                    <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
                      <option value={1}>1 image</option>
                      <option value={2}>2 images</option>
                      <option value={4}>4 images</option>
                    </select>
                  </label>
                )}
              </div>
              <div className="quality-row">
                {!motion ? (
                  <div className="segmented">
                    {["standard", "high"].map((level) => (
                      <button
                        type="button"
                        key={level}
                        className={quality === level ? "active" : ""}
                        onClick={() => setQuality(level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                ) : (
                  <label className="switch-row">
                    <input type="checkbox" checked={audio} onChange={(event) => setAudio(event.target.checked)} />
                    <span />
                    Audio when the selected AI model supports it
                  </label>
                )}
                <span className="price-note">
                  {selectedModelData
                    ? modelPriceLabel(selectedModelData)
                    : motion && pollinationsKey
                      ? "Free quota · local fallback"
                      : "No provider charge"}
                </span>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="button" className="generate-button" onClick={run}>
                {working ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
                {working ? "Cancel generation" : tools.find((tool) => tool.id === activeTool)?.label}
                {!working && <MoveUpRight size={16} />}
              </button>
              <p className="credit-warning">
                Spend lock rejects paid and unknown-price OpenRouter models. Pollinations uses only the configured publishable-key quota. AI Horde is public, so never include private information in community prompts.
              </p>
            </div>

            <div className={`generation-result ${currentJob?.outputs.length ? "has-output" : ""}`}>
              {currentJob?.outputs.length ? (
                <>
                  <div className="result-toolbar">
                    <span>
                      <i />
                      {currentJob.status}
                    </span>
                    <span>{currentJob.routeLabel || currentJob.model.split("/").pop()}</span>
                  </div>
                  <div className="output-grid">
                    {currentJob.outputs.map((output) => {
                      const source = outputSource(output);
                      if (!source) return null;
                      return output.mimeType?.startsWith("video/") ? (
                        <video key={output.id} src={source} controls playsInline />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={output.id} src={source} alt={currentJob.prompt} />
                      );
                    })}
                  </div>
                  <div className="result-actions">
                    <span>{currentJob.cost === "free" ? "Free result · " : ""}Saved to Library</span>
                    {outputSource(currentJob.outputs[0]) && (
                      <a href={outputSource(currentJob.outputs[0])} download>
                        <Download size={15} />
                        Download
                      </a>
                    )}
                  </div>
                </>
              ) : currentJob && working ? (
                <div className="generation-progress">
                  <span className="progress-orbit">
                    <Layers3 size={24} />
                  </span>
                  <b>{stageLabel || (motion ? "Building motion" : "Composing pixels")}</b>
                  <p>{currentJob.progress || 1}% · The route can switch automatically without spending.</p>
                  <div>
                    <i style={{ width: `${currentJob.progress || 12}%` }} />
                  </div>
                </div>
              ) : (
                <div className="result-empty">
                  <span>
                    {motion ? <Video size={27} /> : <ImageIcon size={27} />}
                  </span>
                  <b>Your result appears here</b>
                  <p>
                    Auto mode can create without a paid visual model. Dedicated models remain available when you deliberately unlock them.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>}
      {workspaceMode === "image" && (
        <ImageEditor
          deviceId={deviceId}
          assets={assets}
          projects={projects}
          onAssetSaved={onAssetSaved}
          onProjectSaved={onProjectSaved}
          onGenerate={(reference, nextPrompt) => {
            setReferences([reference]);
            setPrompt(nextPrompt);
            setActiveTool("edit");
            setWorkspaceMode("generate");
          }}
        />
      )}
      {workspaceMode === "video" && (
        <VideoEditor
          deviceId={deviceId}
          assets={assets}
          projects={projects}
          onAssetSaved={onAssetSaved}
          onProjectSaved={onProjectSaved}
        />
      )}
    </section>
  );
}
