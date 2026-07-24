export type Role = "user" | "assistant" | "system";
export type AppSection = "chat" | "create" | "library" | "models" | "agent" | "settings";
export type AttachmentKind = "image" | "pdf" | "audio" | "video" | "text" | "file";
export type AssetKind = "image" | "video" | "audio" | "document" | "other";
export type ProjectKind = "image" | "video";
export type MediaKind =
  | "image"
  | "video"
  | "animate"
  | "edit"
  | "variation"
  | "upscale"
  | "remove-background";
export type GenerationProvider = "openrouter" | "pollinations" | "ai-horde" | "local";
export type GenerationCost = "free" | "paid" | "unknown";

export type Attachment = {
  id: string;
  name: string;
  type: string;
  kind: AttachmentKind;
  size: number;
  assetId?: string;
  dataUrl?: string;
  remoteUrl?: string;
  storagePath?: string;
};

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  model?: string;
  routed?: boolean;
  attachments?: Attachment[];
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  summary?: string;
  summarizedMessageCount?: number;
  createdAt: number;
  updatedAt: number;
  revision: number;
  deviceId: string;
  deletedAt?: number;
  recoveredFrom?: string;
};

export type ModelPricing = {
  prompt?: string;
  completion?: string;
  image?: string;
  request?: string;
};

export type TextModel = {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: ModelPricing;
  supported_parameters?: string[];
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
};

export type ImageModel = {
  id: string;
  name?: string;
  description?: string;
  pricing?: ModelPricing;
  endpoints?: GenerationEndpoint[] | string;
  supports_streaming?: boolean;
  supported_parameters?:
    | string[]
    | Record<
        string,
        {
          type?: "enum" | "range" | "boolean";
          values?: string[];
          min?: number;
          max?: number;
        }
      >;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
};

export type VideoModel = ImageModel & {
  canonical_slug?: string;
  supported_resolutions?: string[];
  supported_aspect_ratios?: string[];
  supported_sizes?: string[];
  pricing_skus?: Record<string, string | number>;
  allowed_passthrough_parameters?: string[];
};

export type GenerationEndpoint = {
  providerName: string;
  providerSlug: string;
  providerTag?: string;
  free: boolean;
  verified: boolean;
  pricing: Array<{
    billable?: string;
    unit?: string;
    costUsd: number;
    variant?: string;
  }>;
};

export type ModelHealth = Record<
  string,
  { failures: number; latency: number; lastFailed?: number; successes?: number }
>;

export type MediaOutput = {
  id: string;
  assetId?: string;
  url?: string;
  dataUrl?: string;
  storagePath?: string;
  mimeType?: string;
};

export type MediaJob = {
  id: string;
  kind: MediaKind;
  prompt: string;
  negativePrompt?: string;
  model: string;
  provider?: GenerationProvider;
  routeLabel?: string;
  cost?: GenerationCost;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress?: number;
  providerJobId?: string;
  attempts?: number;
  nextRetryAt?: number;
  cancelledAt?: number;
  error?: string;
  inputs?: Attachment[];
  outputs: MediaOutput[];
  options: Record<string, string | number | boolean>;
  createdAt: number;
  updatedAt: number;
  revision: number;
  deviceId: string;
  deletedAt?: number;
};

export type MediaAsset = {
  id: string;
  name: string;
  kind: AssetKind;
  mimeType: string;
  size: number;
  blob?: Blob;
  dataUrl?: string;
  remoteUrl?: string;
  storagePath?: string;
  width?: number;
  height?: number;
  duration?: number;
  sourceJobId?: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  deviceId: string;
  deletedAt?: number;
};

export type ImageLayer = {
  id: string;
  name: string;
  type: "image" | "text" | "shape";
  assetId?: string;
  text?: string;
  shape?: "rectangle" | "ellipse";
  fill?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blendMode:
    | "source-over"
    | "multiply"
    | "screen"
    | "overlay"
    | "darken"
    | "lighten";
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  filters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    grayscale: number;
  };
};

export type MaskStroke = {
  id: string;
  erase: boolean;
  size: number;
  points: Array<{ x: number; y: number }>;
};

export type ImageProjectData = {
  width: number;
  height: number;
  background: string;
  layers: ImageLayer[];
  mask: MaskStroke[];
};

export type ClipTransition = "cut" | "fade" | "dissolve" | "slide";

export type TimelineClip = {
  id: string;
  assetId: string;
  name: string;
  kind: "image" | "video";
  duration: number;
  trimStart: number;
  trimEnd: number;
  speed: number;
  volume: number;
  transition: ClipTransition;
  transitionDuration: number;
  filter: "none" | "mono" | "warm" | "cool" | "high-contrast";
};

export type TimelineCaption = {
  id: string;
  text: string;
  start: number;
  end: number;
  position: "top" | "center" | "bottom";
  size: number;
};

export type VideoProjectData = {
  width: number;
  height: number;
  fps: number;
  background: string;
  clips: TimelineClip[];
  captions: TimelineCaption[];
};

export type MediaProject = {
  id: string;
  name: string;
  kind: ProjectKind;
  data: ImageProjectData | VideoProjectData;
  assetIds: string[];
  createdAt: number;
  updatedAt: number;
  revision: number;
  deviceId: string;
  deletedAt?: number;
  recoveredFrom?: string;
};

export type ProjectVersion = {
  id: string;
  projectId: string;
  project: MediaProject;
  createdAt: number;
};

export type MemoryItem = {
  id: string;
  text: string;
  category: "preference" | "profile" | "project" | "instruction" | "other";
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  revision: number;
  deviceId: string;
  deletedAt?: number;
};

export type SyncState = {
  configured: boolean;
  syncing: boolean;
  lastSyncedAt?: number;
  error?: string;
};

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const newChat = (deviceId: string): Chat => {
  const now = Date.now();
  return {
    id: uid(),
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId,
  };
};
