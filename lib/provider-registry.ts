import { generationModelCostClass } from "@/lib/openrouter";
import type {
  GenerationCost,
  GenerationProvider,
  ImageModel,
  MediaKind,
  VideoModel,
} from "@/lib/types";

export type ProviderCapability =
  | "text-to-image"
  | "image-to-image"
  | "upscale"
  | "remove-background"
  | "text-to-video"
  | "image-to-video"
  | "local-motion";

export type CreativeProviderPlugin = {
  id: GenerationProvider;
  name: string;
  privacy: "private" | "provider" | "community";
  asynchronous: boolean;
  capabilities: ProviderCapability[];
  requires: "openrouter-key" | "publishable-key" | "nothing";
};

export const CREATIVE_PROVIDER_PLUGINS: CreativeProviderPlugin[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    privacy: "provider",
    asynchronous: true,
    capabilities: [
      "text-to-image",
      "image-to-image",
      "upscale",
      "remove-background",
      "text-to-video",
      "image-to-video",
    ],
    requires: "openrouter-key",
  },
  {
    id: "pollinations",
    name: "Pollinations",
    privacy: "provider",
    asynchronous: false,
    capabilities: ["text-to-video", "image-to-video"],
    requires: "publishable-key",
  },
  {
    id: "ai-horde",
    name: "AI Horde",
    privacy: "community",
    asynchronous: true,
    capabilities: ["text-to-image", "image-to-image", "upscale", "remove-background"],
    requires: "nothing",
  },
  {
    id: "local",
    name: "Limitless local renderer",
    privacy: "private",
    asynchronous: false,
    capabilities: ["local-motion", "image-to-video"],
    requires: "nothing",
  },
];

export type CreativeRouteCandidate = {
  provider: GenerationProvider;
  model?: ImageModel | VideoModel;
  cost: GenerationCost;
  label: string;
  genuineGenerativeVideo: boolean;
};

function capabilityFor(kind: MediaKind): ProviderCapability {
  if (kind === "video") return "text-to-video";
  if (kind === "animate") return "image-to-video";
  if (kind === "upscale") return "upscale";
  if (kind === "remove-background") return "remove-background";
  if (kind === "edit" || kind === "variation") return "image-to-image";
  return "text-to-image";
}

export function buildCreativeRoutes({
  kind,
  apiKey,
  pollinationsKey,
  imageModels,
  videoModels,
  spendLocked,
}: {
  kind: MediaKind;
  apiKey: boolean;
  pollinationsKey: boolean;
  imageModels: ImageModel[];
  videoModels: VideoModel[];
  spendLocked: boolean;
}): CreativeRouteCandidate[] {
  const motion = kind === "video" || kind === "animate";
  const models = motion ? videoModels : imageModels;
  const routes: CreativeRouteCandidate[] = [];

  if (apiKey) {
    models
      .filter((model) => !spendLocked || generationModelCostClass(model) === "free")
      .forEach((model) => {
        routes.push({
          provider: "openrouter",
          model,
          cost: generationModelCostClass(model),
          label: `${model.name || model.id} · OpenRouter`,
          genuineGenerativeVideo: motion,
        });
      });
  }

  if (motion && pollinationsKey && !spendLocked) {
    routes.push({
      provider: "pollinations",
      cost: "paid",
      label: "Pollinations budgeted AI video",
      genuineGenerativeVideo: true,
    });
  }

  if (!motion || kind === "video") {
    routes.push({
      provider: "ai-horde",
      cost: "free",
      label: motion ? "AI Horde keyframe" : "AI Horde community GPU",
      genuineGenerativeVideo: false,
    });
  }

  if (motion) {
    routes.push({
      provider: "local",
      cost: "free",
      label: "Private browser motion renderer",
      genuineGenerativeVideo: false,
    });
  }

  const required = capabilityFor(kind);
  return routes.filter((route) => {
    const plugin = CREATIVE_PROVIDER_PLUGINS.find((item) => item.id === route.provider);
    const capability =
      route.provider === "local"
        ? "local-motion"
        : motion && route.provider === "ai-horde"
          ? "text-to-image"
          : required;
    return plugin?.capabilities.includes(capability);
  });
}
