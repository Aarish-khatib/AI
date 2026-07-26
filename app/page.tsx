"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import { AccountModal, KeyModal } from "@/components/Modals";
import { Sidebar } from "@/components/Sidebar";
import {
  AgentView,
  type AgentActivity,
  LibraryView,
  ModelsView,
  SettingsView,
} from "@/components/UtilityViews";
import {
  cloudConfigured,
  getCloudUser,
  requestMagicLink,
  signOutCloud,
  subscribeToAuth,
  syncCloudData,
} from "@/lib/cloud-sync";
import { pollHordeImageJob } from "@/lib/ai-horde";
import { composeMotionVideo } from "@/lib/local-motion";
import {
  activateWorkspace,
  checkpointArtifact,
  ensureFirstChat,
  exportBackup,
  getDeviceId,
  getActiveWorkspaceScope,
  getArtifact,
  getSetting,
  importBackup,
  loadAssets,
  loadArtifacts,
  loadMemory,
  loadMediaJobs,
  loadProjects,
  migrateLegacyStorage,
  recoverySnapshotCount,
  saveChat,
  saveMediaJob,
  saveMemoryItem,
  setSetting,
  tombstoneChat,
  tombstoneMemoryItem,
} from "@/lib/local-store";
import {
  artifactContextForChat,
  artifactFromChat,
  inferArtifactType,
} from "@/lib/artifacts/model";
import type { Artifact } from "@/lib/artifacts/types";
import {
  loadKeyPool,
  readyKeySlots,
  recordKeyResult,
  removeKeySlot,
  saveKeySlot,
  setKeySlotEnabled,
  type KeySlot,
  type KeySlotId,
} from "@/lib/key-pool";
import { materializeJobOutputs } from "@/lib/media-library";
import {
  discoverImageModels,
  discoverTextModels,
  discoverVideoModels,
  FALLBACK_TEXT_MODELS,
  getVideoJob,
  improveDraft,
  modelHasTools,
  modelHasTextOutput,
  modelIsFree,
  ProviderRequestError,
  rankTextModels,
  readAttachment,
  streamChat,
  summarizeConversation,
  validateOpenRouterKey,
} from "@/lib/openrouter";
import { branchMessages, createTextBatcher } from "@/lib/streaming.mjs";
import {
  redactDiagnostics,
  releaseFeatureSnapshot,
} from "@/lib/release-state.mjs";
import {
  executeProviderWithPolicy,
} from "@/lib/finale/provider-runtime";
import {
  loadFinaleState,
  loadProviderCredential,
  saveFinaleState,
} from "@/lib/finale/store";
import type {
  AppSection,
  Attachment,
  Chat,
  ImageModel,
  MediaAsset,
  MediaJob,
  MediaProject,
  MemoryItem,
  Message,
  ModelHealth,
  SyncState,
  TextModel,
  VideoModel,
} from "@/lib/types";
import { newChat, uid } from "@/lib/types";

const ArtifactWorkspace = dynamic(
  () =>
    import("@/components/artifacts/ArtifactWorkspace").then(
      (module) => module.ArtifactWorkspace,
    ),
  {
    loading: () => (
      <section className="workspace loading-screen" aria-live="polite">
        <LoaderCircle className="spin" size={22} />
        <p>Opening the artifact workspace…</p>
      </section>
    ),
  },
);

const Studio = dynamic(
  () => import("@/components/Studio").then((module) => module.Studio),
  {
    loading: () => (
      <section className="workspace loading-screen" aria-live="polite">
        <LoaderCircle className="spin" size={22} />
        <p>Opening Create…</p>
      </section>
    ),
  },
);

const BuildWorkspace = dynamic(
  () =>
    import("@/components/finale/FinaleWorkspaces").then(
      (module) => module.BuildWorkspace,
    ),
  {
    loading: () => (
      <section className="workspace loading-screen" aria-live="polite">
        <LoaderCircle className="spin" size={22} />
        <p>Opening Build Studio…</p>
      </section>
    ),
  },
);

const IntelligenceWorkspace = dynamic(
  () =>
    import("@/components/finale/FinaleWorkspaces").then(
      (module) => module.IntelligenceWorkspace,
    ),
);

const DocumentStudioWorkspace = dynamic(
  () =>
    import("@/components/finale/FinaleWorkspaces").then(
      (module) => module.DocumentStudioWorkspace,
    ),
);

const ProviderHubWorkspace = dynamic(
  () =>
    import("@/components/finale/FinaleWorkspaces").then(
      (module) => module.ProviderHubWorkspace,
    ),
);

const SecurityCentreWorkspace = dynamic(
  () =>
    import("@/components/finale/FinaleWorkspaces").then(
      (module) => module.SecurityCentreWorkspace,
    ),
);

const COMPANION = "http://127.0.0.1:4317";
const POLLINATIONS_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY?.trim().startsWith("pk_")
    ? process.env.NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY.trim()
    : "";
const configuredPollinationsBudget = Number(
  process.env.NEXT_PUBLIC_POLLINATIONS_RUN_BUDGET || "0",
);
const POLLINATIONS_RUN_BUDGET =
  Number.isInteger(configuredPollinationsBudget) &&
  configuredPollinationsBudget > 0 &&
  configuredPollinationsBudget <= 1_000
    ? configuredPollinationsBudget
    : 0;
const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and folders in the selected workspace.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, depth: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description: "Search filenames and text before changing unfamiliar code.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          path: { type: "string" },
          max_results: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a UTF-8 text file.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_files",
      description: "Read several UTF-8 files.",
      parameters: {
        type: "object",
        properties: { paths: { type: "array", items: { type: "string" } } },
        required: ["paths"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "file_info",
      description: "Get the type, size, and modification time of a workspace path.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or completely overwrite a text file.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "replace_in_file",
      description: "Make a precise text replacement in an existing file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          search: { type: "string" },
          replace: { type: "string" },
          all: { type: "boolean" },
        },
        required: ["path", "search", "replace"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "make_directory",
      description: "Create a folder inside the workspace.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_path",
      description: "Move or rename a path inside the workspace.",
      parameters: {
        type: "object",
        properties: { from: { type: "string" }, to: { type: "string" } },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "copy_path",
      description: "Copy a path inside the workspace.",
      parameters: {
        type: "object",
        properties: { from: { type: "string" }, to: { type: "string" } },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_path",
      description: "Delete a path inside the workspace only when explicitly necessary.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a terminal command in the selected workspace.",
      parameters: {
        type: "object",
        properties: { command: { type: "string" }, timeout: { type: "number" } },
        required: ["command"],
      },
    },
  },
];

type Toast = { id: string; type: "success" | "error" | "info"; message: string };
type AuthIdentity = { id: string; email?: string } | null;
type AgentToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<AppSection>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [jobs, setJobs] = useState<MediaJob[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [projects, setProjects] = useState<MediaProject[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [openArtifactId, setOpenArtifactId] = useState("");
  const [artifactAssistId, setArtifactAssistId] = useState("");
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [keyPool, setKeyPool] = useState<KeySlot[]>([]);
  const [qualityBoost, setQualityBoost] = useState(false);
  const [keyModal, setKeyModal] = useState(false);
  const [accountModal, setAccountModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [textModels, setTextModels] = useState<TextModel[]>(FALLBACK_TEXT_MODELS);
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);
  const [health, setHealth] = useState<ModelHealth>({});
  const [selectedModel, setSelectedModel] = useState("auto");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [stage, setStage] = useState("");
  const [routeNote, setRouteNote] = useState("Auto-route ready");
  const [sync, setSync] = useState<SyncState>({
    configured: cloudConfigured,
    syncing: false,
  });
  const [recoveryCount, setRecoveryCount] = useState(0);
  const [migrationLabel, setMigrationLabel] = useState("Checking protected data…");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [companionOnline, setCompanionOnline] = useState(false);
  const [companionToken, setCompanionToken] = useState("");
  const [companionWorkspace, setCompanionWorkspace] = useState("");
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [trusted, setTrusted] = useState(false);
  const [agentTask, setAgentTask] = useState("");
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [agentError, setAgentError] = useState("");
  const [agentResult, setAgentResult] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const resumedJobs = useRef(new Set<string>());
  const activeResponseTasks = useRef(new Set<string>());
  const activeChat = chats.find((chat) => chat.id === activeId);

  const notify = useCallback((message: string, type: Toast["type"] = "info") => {
    const toast = { id: uid(), type, message };
    setToasts((current) => [...current, toast]);
    window.setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== toast.id)),
      4_500,
    );
  }, []);

  const applyKeyPool = useCallback((pool: KeySlot[]) => {
    setKeyPool(pool);
    setApiKey(readyKeySlots(pool)[0]?.key || "");
  }, []);

  const refreshLocalState = useCallback(async () => {
    const [
      nextDeviceId,
      nextChats,
      nextJobs,
      nextAssets,
      nextProjects,
      nextArtifacts,
      nextMemory,
      nextPool,
      nextQualityBoost,
    ] = await Promise.all([
      getDeviceId(),
      ensureFirstChat(),
      loadMediaJobs(),
      loadAssets(),
      loadProjects(),
      loadArtifacts(),
      loadMemory(),
      loadKeyPool(),
      getSetting("quality-boost", false),
    ]);
    setDeviceId(nextDeviceId);
    setChats(nextChats);
    setJobs(nextJobs);
    setAssets(nextAssets);
    setProjects(nextProjects);
    setArtifacts(nextArtifacts);
    setMemory(nextMemory);
    applyKeyPool(nextPool);
    setQualityBoost(nextQualityBoost);
    setActiveId((current) =>
      nextChats.some((chat) => chat.id === current) ? current : nextChats[0]?.id || "",
    );
  }, [applyKeyPool]);

  useEffect(() => {
    let alive = true;
    let initialized = false;
    let activeAuthId = "";
    let pendingAuth: AuthIdentity | undefined;
    const switchWorkspace = async (user: AuthIdentity) => {
      const nextAuthId = user?.id || "";
      if (nextAuthId === activeAuthId) {
        if (alive) setUserEmail(user?.email || "");
        return;
      }
      const activated = await activateWorkspace(user?.id || null, {
        importAnonymous: Boolean(user),
      });
      activeAuthId = nextAuthId;
      if (!alive) return;
      setUserEmail(user?.email || "");
      resumedJobs.current.clear();
      await refreshLocalState();
      if (activated.imported) {
        notify(
          `Protected ${activated.imported} local record${
            activated.imported === 1 ? "" : "s"
          } in this account workspace. Provider keys were not copied.`,
          "success",
        );
      }
    };
    const initialize = async () => {
      let discoveryKey = "";
      try {
        await activateWorkspace(null, { importAnonymous: false });
        let migrationIssue = "";
        const migration = await migrateLegacyStorage().catch((error) => {
          migrationIssue =
            error instanceof Error ? error.message : "Legacy migration could not be verified.";
          notify(`Legacy data was left untouched: ${migrationIssue}`, "error");
          return {
            migratedChats: 0,
            keySecured: false,
            alreadyComplete: true,
          };
        });
        const cloudUser = await getCloudUser().catch(() => null);
        if (cloudUser) {
          const activated = await activateWorkspace(cloudUser.id, {
            importAnonymous: true,
          });
          if (activated.imported) {
            notify(
              `Protected ${activated.imported} local record${
                activated.imported === 1 ? "" : "s"
              } in this account workspace. Provider keys were not copied.`,
              "success",
            );
          }
        }
        activeAuthId = cloudUser?.id || "";
        const localDeviceId = await getDeviceId().catch((error) => {
          notify(
            `Device identity is temporary: ${
              error instanceof Error ? error.message : "local storage is unavailable"
            }`,
            "error",
          );
          return uid();
        });
        const readOptional = async <T,>(
          operation: Promise<T>,
          fallback: T,
          label: string,
        ): Promise<T> => {
          try {
            return await operation;
          } catch (error) {
            notify(
              `${label}: ${error instanceof Error ? error.message : "unavailable"}`,
              "error",
            );
            return fallback;
          }
        };
        const [
          initialChats,
          initialJobs,
          initialAssets,
          initialProjects,
          initialMemory,
          initialKeyPool,
          storedHealth,
          storedModels,
          storedSelected,
          storedQualityBoost,
        ] =
          await Promise.all([
            readOptional(
              ensureFirstChat(),
              [newChat(localDeviceId)],
              "Conversation storage",
            ),
            readOptional(loadMediaJobs(), [], "Generation history"),
            readOptional(loadAssets(), [], "Asset library"),
            readOptional(loadProjects(), [], "Project library"),
            readOptional(loadMemory(), [], "Memory"),
            readOptional(loadKeyPool(), [], "Encrypted key vault"),
            readOptional(
              getSetting<ModelHealth>("model-health", {}),
              {},
              "Model health cache",
            ),
            readOptional(
              getSetting<TextModel[]>("cached-text-models", []),
              [],
              "Model catalogue cache",
            ),
            readOptional(
              getSetting("selected-text-model", "auto"),
              "auto",
              "Model preference",
            ),
            readOptional(
              getSetting("quality-boost", false),
              false,
              "Quality Boost preference",
            ),
          ]);
        if (!alive) return;
        setDeviceId(localDeviceId);
        setChats(initialChats);
        setActiveId(initialChats[0]?.id || "");
        setJobs(initialJobs);
        setAssets(initialAssets);
        setProjects(initialProjects);
        setMemory(initialMemory);
        applyKeyPool(initialKeyPool);
        discoveryKey = readyKeySlots(initialKeyPool)[0]?.key || "";
        setQualityBoost(storedQualityBoost);
        setUserEmail(cloudUser?.email || "");
        setHealth(storedHealth);
        const usableStoredModels = storedModels.filter(modelHasTextOutput);
        if (usableStoredModels.length) setTextModels(usableStoredModels);
        setSelectedModel(
          storedSelected === "auto" ||
            !storedModels.length ||
            usableStoredModels.some((model) => model.id === storedSelected)
            ? storedSelected
            : "auto",
        );
        setMigrationLabel(
          migrationIssue
            ? "Original browser records remain untouched because migration needs attention."
            : migration.alreadyComplete
            ? "Legacy conversations are protected; the original fallback remains available."
            : `${migration.migratedChats} conversation${migration.migratedChats === 1 ? "" : "s"} copied and verified. Original fallback retained.`,
        );
        setRecoveryCount(
          await readOptional(recoverySnapshotCount(), 0, "Recovery snapshots"),
        );
        const lastSyncedAt = await getSetting<number | undefined>(
          "last-cloud-sync",
          undefined,
        );
        setSync((current) => ({
          ...current,
          lastSyncedAt,
        }));
      } catch (error) {
        notify(
          error instanceof Error ? `Local recovery check: ${error.message}` : "Local recovery check failed.",
          "error",
        );
      } finally {
        initialized = true;
        if (pendingAuth !== undefined && (pendingAuth?.id || "") !== activeAuthId) {
          try {
            await switchWorkspace(pendingAuth);
            discoveryKey = readyKeySlots(await loadKeyPool())[0]?.key || "";
          } catch (error) {
            notify(
              error instanceof Error
                ? `Workspace switch failed safely: ${error.message}`
                : "Workspace switch failed safely.",
              "error",
            );
          }
        }
        if (alive) setReady(true);
      }

      const discoveries = await Promise.allSettled([
        discoverTextModels(),
        discoverImageModels(discoveryKey),
        discoverVideoModels(discoveryKey),
      ]);
      if (!alive) return;
      if (discoveries[0].status === "fulfilled") {
        setTextModels(discoveries[0].value);
        await setSetting("cached-text-models", discoveries[0].value);
      }
      if (discoveries[1].status === "fulfilled") setImageModels(discoveries[1].value);
      if (discoveries[2].status === "fulfilled") setVideoModels(discoveries[2].value);
      setRouteNote(
        discoveries.some((result) => result.status === "fulfilled")
          ? "Live models discovered"
          : "Cached auto-router ready",
      );
    };
    initialize();

    const unsubscribe = subscribeToAuth((user) => {
      if (!alive) return;
      const identity: AuthIdentity = user
        ? { id: user.id, email: user.email }
        : null;
      if (!initialized) {
        pendingAuth = identity;
        return;
      }
      void (async () => {
        try {
          await switchWorkspace(identity);
        } catch (error) {
          notify(
            error instanceof Error
              ? `Workspace switch failed safely: ${error.message}`
              : "Workspace switch failed safely.",
            "error",
          );
        }
      })();
    });

    const token = sessionStorage.getItem("limitless-companion-token") || "";
    const savedWorkspace = sessionStorage.getItem("limitless-companion-workspace") || "";
    fetch(`${COMPANION}/health`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        if (!alive) return;
        setCompanionOnline(true);
        setCompanionToken(token);
        setCompanionWorkspace(savedWorkspace);
        setWorkspaceInput(savedWorkspace);
        if (token) {
          const status = await fetch(`${COMPANION}/status`, {
            headers: { "x-limitless-token": token },
          });
          if (!status.ok) throw new Error();
          const payload = await status.json();
          setCompanionWorkspace(payload.workspace || savedWorkspace);
          setTrusted(Boolean(payload.trusted));
        }
      })
      .catch(() => {
        if (!alive) return;
        setCompanionOnline(false);
        setCompanionToken("");
      });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        void (async () => {
          const chat = newChat((await getDeviceId()) || uid());
          await saveChat(chat);
          setChats((current) => [chat, ...current]);
          setActiveId(chat.id);
          setSection("chat");
        })();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      alive = false;
      unsubscribe();
      window.removeEventListener("keydown", keyboard);
      abortRef.current?.abort();
    };
  }, [applyKeyPool, notify, refreshLocalState]);

  useEffect(() => {
    const now = Date.now();
    const nextWake = jobs
      .filter(
        (job) =>
          (job.status === "queued" || job.status === "processing") &&
          (job.attempts || 0) < 5 &&
          Boolean(job.nextRetryAt) &&
          Number(job.nextRetryAt) > now,
      )
      .map((job) => Number(job.nextRetryAt))
      .sort((left, right) => left - right)[0];
    const retryWakeTimer = nextWake
      ? window.setTimeout(
          () => setJobs((current) => [...current]),
          Math.max(50, nextWake - now + 50),
        )
      : undefined;

    jobs
      .filter(
        (job) =>
          (job.providerJobId || job.provider === "local") &&
          (job.status === "queued" || job.status === "processing") &&
          (job.attempts || 0) < 5 &&
          (!job.nextRetryAt || job.nextRetryAt <= Date.now()) &&
          !resumedJobs.current.has(job.id) &&
          (
            job.provider === "ai-horde" ||
            job.provider === "local" ||
            Boolean(apiKey)
          ),
      )
      .forEach((job) => {
        resumedJobs.current.add(job.id);
        void (async () => {
          let updated = job;
          const storeUpdate = async (patch: Partial<MediaJob>) => {
            updated = {
              ...updated,
              ...patch,
              updatedAt: Date.now(),
              revision: updated.revision + 1,
              deviceId,
            };
            await saveMediaJob(updated);
            if (
              updated.status === "completed" &&
              updated.outputs.some((output) => !output.assetId)
            ) {
              const materialized = await materializeJobOutputs(updated, deviceId);
              updated = materialized.job;
              if (materialized.assets.length) {
                setAssets((current) => [
                  ...materialized.assets,
                  ...current.filter(
                    (asset) => !materialized.assets.some((saved) => saved.id === asset.id),
                  ),
                ]);
              }
            }
            setJobs((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
          };
          try {
            if (job.provider === "local") {
              const sources = (job.inputs || [])
                .filter((input) => input.kind === "image")
                .map((input) => input.dataUrl || input.remoteUrl)
                .filter(Boolean) as string[];
              const video = await composeMotionVideo(sources, {
                duration: Number(job.options.duration || 5),
                aspectRatio: String(job.options.aspectRatio || "16:9"),
                resolution: String(job.options.resolution || "720p"),
              });
              await storeUpdate({
                status: "completed",
                progress: 100,
                providerJobId: undefined,
                error: undefined,
                nextRetryAt: undefined,
                outputs: [{ id: uid(), dataUrl: video.dataUrl, mimeType: video.mimeType }],
              });
              return;
            }

            if (job.provider === "ai-horde" && job.providerJobId) {
              const images = await pollHordeImageJob(job.providerJobId);
              if (job.kind === "video" || job.kind === "animate") {
                const sources = images
                  .map((image) => image.dataUrl || image.url)
                  .filter(Boolean) as string[];
                const video = await composeMotionVideo(sources, {
                  duration: Number(job.options.duration || 5),
                  aspectRatio: String(job.options.aspectRatio || "16:9"),
                  resolution: String(job.options.resolution || "720p"),
                });
                await storeUpdate({
                  status: "completed",
                  progress: 100,
                  provider: "local",
                  providerJobId: undefined,
                  routeLabel: "AI Horde keyframe + local motion",
                  cost: "free",
                  error: undefined,
                  nextRetryAt: undefined,
                  outputs: [{ id: uid(), dataUrl: video.dataUrl, mimeType: video.mimeType }],
                });
              } else {
                await storeUpdate({
                  status: "completed",
                  progress: 100,
                  providerJobId: undefined,
                  cost: "free",
                  error: undefined,
                  nextRetryAt: undefined,
                  outputs: images.map((image) => ({
                    id: uid(),
                    dataUrl: image.dataUrl,
                    url: image.url,
                    mimeType: image.mimeType,
                  })),
                });
              }
              return;
            }

            if (!apiKey || !job.providerJobId) return;
            for (let attempt = 0; attempt < 150; attempt += 1) {
              const state = await getVideoJob(apiKey, job.providerJobId);
              const normalized = state.status.toLowerCase();
              const completed = ["completed", "succeeded"].includes(normalized);
              const failed = ["failed", "cancelled", "canceled", "error"].includes(normalized);
              if (failed) {
                await storeUpdate({
                  status: "failed",
                  error: state.error || "Video generation failed.",
                });
                return;
              }
              if (completed) {
                await storeUpdate({
                  status: "completed",
                  progress: 100,
                  providerJobId: undefined,
                  error: undefined,
                  nextRetryAt: undefined,
                  outputs:
                    state.url || state.dataUrl
                      ? [{ id: uid(), url: state.url, dataUrl: state.dataUrl, mimeType: "video/mp4" }]
                      : updated.outputs,
                });
                return;
              }
              setJobs((current) =>
                current.map((item) =>
                  item.id === job.id
                    ? { ...item, progress: state.progress || Math.min(94, 5 + attempt) }
                    : item,
                ),
              );
              await new Promise((resolve) => window.setTimeout(resolve, 4_000));
            }
          } catch (error) {
            const attempts = (updated.attempts || 0) + 1;
            const retryDelay = Math.min(60_000, 2_000 * 2 ** Math.min(attempts, 5));
            await storeUpdate({
              status: attempts >= 5 ? "failed" : "processing",
              attempts,
              nextRetryAt: attempts >= 5 ? undefined : Date.now() + retryDelay,
              error:
                error instanceof Error
                  ? `${error.message}${
                      attempts >= 5
                        ? " Retry from Create when the provider is available."
                        : ` Retrying in ${Math.round(retryDelay / 1_000)} seconds.`
                    }`
                  : attempts >= 5
                    ? "The job stopped after five attempts."
                    : "The job will retry automatically.",
            });
            if (attempts < 5) {
              window.setTimeout(() => {
                resumedJobs.current.delete(job.id);
                setJobs((current) => [...current]);
              }, retryDelay + 50);
            }
          }
        })();
      });

    return () => {
      if (retryWakeTimer) window.clearTimeout(retryWakeTimer);
    };
  }, [apiKey, deviceId, jobs]);

  const updateHealth = useCallback(async (modelId: string, success: boolean, latency: number) => {
    setHealth((current) => {
      const prior = current[modelId] || { failures: 0, latency: 0, successes: 0 };
      const next: ModelHealth = {
        ...current,
        [modelId]: success
          ? {
              failures: Math.max(0, prior.failures - 1),
              successes: (prior.successes || 0) + 1,
              latency: prior.latency ? prior.latency * 0.7 + latency * 0.3 : latency,
              lastFailed: prior.lastFailed,
            }
          : {
              ...prior,
              failures: prior.failures + 1,
              latency,
              lastFailed: Date.now(),
            },
      };
      void setSetting("model-health", next);
      return next;
    });
  }, []);

  const runAssistant = useCallback(
    async (baseChat: Chat, options?: { continueFrom?: Message }) => {
      const finaleState = await loadFinaleState();
      const paidMode = finaleState.usageMode.limitlessFree === false;
      const availableKeys = readyKeySlots(keyPool).slice(0, 3);
      if ((!paidMode && !availableKeys.length) || sending) {
        if (!paidMode && !availableKeys.length) setKeyModal(true);
        return;
      }
      const taskId = `${baseChat.id}:${baseChat.revision}:${options?.continueFrom?.id || "reply"}`;
      if (activeResponseTasks.current.has(taskId)) return;
      activeResponseTasks.current.add(taskId);
      setSending(true);
      setStage("Routing the request");
      const controller = new AbortController();
      abortRef.current = controller;
      let contextChat = baseChat;
      let partial = "";
      let usedModelId = "";
      let finalError: Error = new Error("No available model completed the response.");
      const placeholder: Message = {
        id: uid(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        routed: selectedModel === "auto",
        status: "streaming",
        parentId: options?.continueFrom?.id,
      };
      const updateVisiblePlaceholder = (
        content: string,
        modelId?: string,
        status: Message["status"] = "streaming",
      ) => {
        setChats((current) =>
          current.map((chat) =>
            chat.id === baseChat.id
              ? {
                  ...chat,
                  messages: chat.messages.map((message) =>
                    message.id === placeholder.id
                      ? {
                          ...message,
                          content,
                          model: modelId || message.model,
                          status,
                        }
                      : message,
                  ),
                }
              : chat,
          ),
        );
      };
      const batcher = createTextBatcher((content: string) => {
        updateVisiblePlaceholder(content, usedModelId);
      });

      try {
        const summarizedCount = baseChat.summarizedMessageCount || 0;
        const summaryBoundary = Math.max(0, baseChat.messages.length - 16);
        if (
          !paidMode &&
          baseChat.messages.length >= 32 &&
          summaryBoundary - summarizedCount >= 16
        ) {
          try {
            setStage("Compressing older context");
            const summary = await summarizeConversation(
              availableKeys[0].key,
              baseChat.messages.slice(summarizedCount, summaryBoundary),
              baseChat.summary,
            );
            contextChat = {
              ...baseChat,
              summary,
              summarizedMessageCount: summaryBoundary,
              updatedAt: Date.now(),
              revision: baseChat.revision + 1,
              deviceId,
            };
            await saveChat(contextChat);
            setChats((current) =>
              current.map((chat) => (chat.id === contextChat.id ? contextChat : chat)),
            );
          } catch {
            // Compression is optional; original messages remain authoritative.
          }
        }

        setChats((current) =>
          current.map((chat) =>
            chat.id === baseChat.id
              ? {
                  ...contextChat,
                  messages: [...contextChat.messages, placeholder],
                  updatedAt: Date.now(),
                }
              : chat,
          ),
        );
        const lastUser = [...contextChat.messages]
          .reverse()
          .find((message) => message.role === "user");
        const prompt = options?.continueFrom
          ? `${lastUser?.content || ""}\nContinue the saved response.`
          : lastUser?.content || "";
        const hasImages = Boolean(
          lastUser?.attachments?.some((attachment) => attachment.kind === "image"),
        );
        const hasFiles = Boolean(
          lastUser?.attachments?.some((attachment) =>
            ["pdf", "file", "text"].includes(attachment.kind),
          ),
        );
        const hasAudio = Boolean(
          lastUser?.attachments?.some((attachment) => attachment.kind === "audio"),
        );
        const hasVideo = Boolean(
          lastUser?.attachments?.some((attachment) => attachment.kind === "video"),
        );
        const ranked = rankTextModels(textModels, health, prompt, {
          hasImages,
          hasFiles,
          hasAudio,
          hasVideo,
        }).filter(modelIsFree);
        const selected = textModels.find(
          (model) => model.id === selectedModel && modelIsFree(model),
        );
        const candidates =
          selectedModel !== "auto" && selected
            ? [selected, ...ranked.filter((model) => model.id !== selected.id).slice(0, 3)]
            : ranked.slice(0, 5);
        const providerMessages = options?.continueFrom
          ? [
              ...contextChat.messages,
              {
                id: `continue-${options.continueFrom.id}`,
                role: "user" as const,
                content:
                  "Continue the immediately preceding assistant response from where it stopped. Do not repeat completed text.",
                createdAt: Date.now(),
              },
            ]
          : contextChat.messages;
        let attempts = 0;
        let complete = "";
        let completedModel: TextModel | undefined = candidates[0];
        let completedSlot = availableKeys[0];
        const blockedKeyIds = new Set<KeySlotId>();

        if (paidMode) {
          try {
            const provider = finaleState.providers.find(
              (item) => item.id === finaleState.usageMode.defaultProviderId,
            );
            if (!provider) throw new Error("Choose a verified default provider in Provider Hub.");
            const modelId = finaleState.usageMode.defaultModel.trim();
            if (!modelId) throw new Error("Choose a default paid model in Provider Hub.");
            const requiresConfirmation =
              finaleState.usageMode.estimatedCostPerRequestUsd >=
              Number(finaleState.usageMode.confirmAboveUsd || 0);
            const confirmedPaidCost =
              !requiresConfirmation ||
              window.confirm(
                `This Chat request is estimated at $${finaleState.usageMode.estimatedCostPerRequestUsd.toFixed(4)}. Your provider invoice is authoritative. Continue?`,
              );
            if (!confirmedPaidCost) throw new Error("Paid request cancelled before execution.");
            const credential =
              provider.providerClass === "local" || provider.providerClass === "browser"
                ? ""
                : await loadProviderCredential(provider.id);
            const transcript = providerMessages
              .slice(-24)
              .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
              .join("\n\n");
            usedModelId = modelId;
            setRouteNote(`Paid BYOK · ${provider.name} · ${modelId}`);
            setStage("Running the approved provider request");
            const result = await executeProviderWithPolicy({
              mode: finaleState.usageMode,
              provider,
              key: credential,
              model: modelId,
              prompt: [
                contextChat.summary ? `Earlier context summary:\n${contextChat.summary}` : "",
                transcript,
              ].filter(Boolean).join("\n\n"),
              taskId,
              estimatedCostUsd: finaleState.usageMode.estimatedCostPerRequestUsd,
              confirmedPaidCost,
              stream: Boolean(provider.supports?.streaming),
              signal: controller.signal,
              onEvent: (event) => {
                if (event.type === "response.delta") {
                  partial += event.text;
                  setStage("Writing the answer");
                  batcher.push(partial);
                }
              },
            });
            complete = result.text;
            partial = result.text;
            batcher.flush();
            completedModel = { id: modelId, name: `${provider.name} · ${modelId}` };
            const amount =
              result.actualCostUsd ?? finaleState.usageMode.estimatedCostPerRequestUsd;
            await saveFinaleState({
              ...finaleState,
              usageMode: {
                ...finaleState.usageMode,
                paidStatus: "active",
                spentTodayUsd: finaleState.usageMode.spentTodayUsd + amount,
                spentThisMonthUsd: finaleState.usageMode.spentThisMonthUsd + amount,
              },
              costEvents: [{
                id: uid(),
                providerId: provider.id,
                modelId,
                taskId,
                amountUsd: amount,
                costKind: result.actualCostUsd === undefined ? "estimated" as const : "actual" as const,
                providerRequestId: result.requestId,
                createdAt: Date.now(),
              }, ...finaleState.costEvents].slice(0, 500),
            });
          } catch (caught) {
            batcher.flush();
            finalError =
              caught instanceof Error ? caught : new Error("Paid provider request failed.");
          }
        } else {
          responseLoop: for (const model of candidates) {
            for (const slot of availableKeys) {
              if (attempts >= 6) break responseLoop;
              if (blockedKeyIds.has(slot.id)) continue;
              attempts += 1;
              const started = performance.now();
              usedModelId = model.id;
              partial = "";
              try {
                setRouteNote(`Routing to ${model.name || model.id} · ${slot.label}`);
                setStage("Thinking and responding");
                complete = await streamChat({
                  apiKey: slot.key,
                  model,
                  messages: providerMessages,
                  summary: contextChat.summary,
                  memory,
                  signal: controller.signal,
                  onToken: (content) => {
                    partial = content;
                    setStage("Writing the answer");
                    batcher.push(content);
                  },
                });
                batcher.flush();
                completedModel = model;
                completedSlot = slot;
                const nextPool = await recordKeyResult(slot.id, { ok: true });
                applyKeyPool(nextPool);
                await updateHealth(model.id, true, performance.now() - started);
                break responseLoop;
              } catch (caught) {
                batcher.flush();
                finalError =
                  caught instanceof Error ? caught : new Error("Model request failed.");
                if (caught instanceof ProviderRequestError) {
                  const nextPool = await recordKeyResult(slot.id, {
                    ok: false,
                    status: caught.status,
                    retryAfter: caught.retryAfter,
                  });
                  applyKeyPool(nextPool);
                  if ([401, 403, 429].includes(caught.status)) {
                    blockedKeyIds.add(slot.id);
                  }
                }
                if (controller.signal.aborted || partial) break responseLoop;
                await updateHealth(model.id, false, performance.now() - started);
                setStage("Trying a healthy fallback");
              }
            }
          }
        }

        if (complete && !controller.signal.aborted) {
          let finalContent = complete;
          if (!paidMode && qualityBoost && candidates.length) {
            const reviewerModel =
              candidates.find((model) => model.id !== completedModel?.id) ||
              completedModel;
            const reviewerSlot =
              availableKeys.find(
                (slot) =>
                  slot.id !== completedSlot?.id && !blockedKeyIds.has(slot.id),
              ) ||
              completedSlot;
            if (reviewerModel && reviewerSlot) {
              try {
                setStage("Running optional quality pass");
                finalContent = await improveDraft({
                  apiKey: reviewerSlot.key,
                  model: reviewerModel,
                  messages: providerMessages,
                  draft: complete,
                  summary: contextChat.summary,
                  memory,
                  signal: controller.signal,
                });
                applyKeyPool(await recordKeyResult(reviewerSlot.id, { ok: true }));
              } catch (caught) {
                if (caught instanceof ProviderRequestError) {
                  applyKeyPool(
                    await recordKeyResult(reviewerSlot.id, {
                      ok: false,
                      status: caught.status,
                      retryAfter: caught.retryAfter,
                    }),
                  );
                }
                finalContent = complete;
              }
            }
          }
          let completed: Chat = {
            ...contextChat,
            messages: [
              ...contextChat.messages,
              {
                ...placeholder,
                content: finalContent,
                model: completedModel?.id,
                status: "complete",
              },
            ],
            updatedAt: Date.now(),
            revision: contextChat.revision + 1,
            deviceId,
          };
          if (!options?.continueFrom) {
            const targetArtifactId = lastUser?.artifactIds?.[0];
            const targetArtifact = targetArtifactId
              ? await getArtifact(targetArtifactId)
              : undefined;
            const canApplyAiEdit =
              targetArtifact?.content.kind === "presentation" ||
              targetArtifact?.content.kind === "document" ||
              targetArtifact?.content.kind === "spreadsheet";
            const generatedArtifact =
              targetArtifact && !canApplyAiEdit
                ? null
                : artifactFromChat({
                    ownerId: getActiveWorkspaceScope(),
                    deviceId,
                    prompt,
                    response: finalContent,
                    chatId: completed.id,
                    messageId: placeholder.id,
                    forcedType: canApplyAiEdit
                      ? targetArtifact?.type
                      : undefined,
                  });
            if (generatedArtifact) {
              try {
                const artifactToSave =
                  canApplyAiEdit && targetArtifact
                    ? {
                        ...targetArtifact,
                        content: generatedArtifact.content,
                        updatedAt: Date.now(),
                        revision: targetArtifact.revision + 1,
                        deviceId,
                        deletedAt: undefined,
                        autosaveState: "saved" as const,
                        exportState: "idle" as const,
                      }
                    : generatedArtifact;
                const savedArtifact = await checkpointArtifact(
                  artifactToSave,
                  canApplyAiEdit ? "ai-edit" : "created",
                  canApplyAiEdit ? "AI edit from Chat" : "Created from Chat",
                );
                completed = {
                  ...completed,
                  messages: completed.messages.map((message) =>
                    message.id === placeholder.id
                      ? {
                          ...message,
                          artifactIds: [
                            ...(message.artifactIds || []),
                            savedArtifact.artifact.id,
                          ],
                        }
                      : message,
                  ),
                };
                setArtifacts((current) => [
                  savedArtifact.artifact,
                  ...current.filter(
                    (artifact) => artifact.id !== savedArtifact.artifact.id,
                  ),
                ]);
              } catch (error) {
                notify(
                  error instanceof Error
                    ? `The response was saved, but its artifact could not be created: ${error.message}`
                    : "The response was saved, but its artifact could not be created.",
                  "error",
                );
              }
            }
          }
          setChats((current) => [
            completed,
            ...current.filter((chat) => chat.id !== completed.id),
          ]);
          await saveChat(completed);
          setRouteNote(
            `${completedModel?.name || completedModel?.id || "Model"} completed${
              !paidMode && qualityBoost ? " · Quality Boost checked" : ""
            }`,
          );
          return;
        }

        const stopped = controller.signal.aborted;
        const preserved = partial.trim();
        const failed: Chat = {
          ...contextChat,
          messages: [
            ...contextChat.messages,
            {
              ...placeholder,
              content:
                preserved ||
                (stopped
                  ? "Response stopped before text arrived."
                  : `I couldn't complete that request. ${finalError.message}`),
              model: usedModelId || undefined,
              status: stopped ? "stopped" : "failed",
              error: stopped ? undefined : finalError.message,
            },
          ],
          updatedAt: Date.now(),
          revision: contextChat.revision + 1,
          deviceId,
        };
        setChats((current) => [
          failed,
          ...current.filter((chat) => chat.id !== failed.id),
        ]);
        await saveChat(failed);
        setRouteNote(stopped ? "Stopped · partial response saved" : "Ready to retry");
      } finally {
        batcher.cancel();
        activeResponseTasks.current.delete(taskId);
        if (abortRef.current === controller) abortRef.current = null;
        setStage("");
        setSending(false);
      }
    },
    [
      applyKeyPool,
      deviceId,
      health,
      keyPool,
      memory,
      notify,
      qualityBoost,
      selectedModel,
      sending,
      textModels,
      updateHealth,
    ],
  );

  const sendMessage = useCallback(
    async (promptOverride?: string) => {
      if (sending) return;
      const finaleState = await loadFinaleState();
      if (finaleState.usageMode.limitlessFree && !apiKey) {
        setKeyModal(true);
        return;
      }
      const chat = activeChat || newChat(deviceId || (await getDeviceId()));
      const content = (promptOverride ?? input).trim();
      if (!content && !attachments.length) return;
      const now = Date.now();
      const message: Message = {
        id: uid(),
        role: "user",
        content,
        createdAt: now,
        attachments: attachments.length ? attachments : undefined,
        artifactIds: artifactAssistId ? [artifactAssistId] : undefined,
      };
      const next: Chat = {
        ...chat,
        title:
          chat.messages.length === 0 && content
            ? content.replace(/\s+/g, " ").slice(0, 58)
            : chat.title,
        messages: [...chat.messages, message],
        updatedAt: now,
        revision: chat.revision + 1,
        deviceId: deviceId || chat.deviceId,
      };
      setChats((current) => [next, ...current.filter((item) => item.id !== next.id)]);
      setActiveId(next.id);
      setInput("");
      setAttachments([]);
      setArtifactAssistId("");
      await saveChat(next);
      await runAssistant(next);
    },
    [
      activeChat,
      apiKey,
      artifactAssistId,
      attachments,
      deviceId,
      input,
      runAssistant,
      sending,
    ],
  );

  const createArtifactFromMessage = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      const assistantIndex = activeChat.messages.findIndex(
        (message) => message.id === messageId && message.role === "assistant",
      );
      if (assistantIndex < 0) return;
      const assistant = activeChat.messages[assistantIndex];
      if (assistant.artifactIds?.length) {
        setOpenArtifactId(assistant.artifactIds[0]);
        setSection("artifacts");
        return;
      }
      const prompt =
        [...activeChat.messages.slice(0, assistantIndex)]
          .reverse()
          .find((message) => message.role === "user")?.content ||
        "Create an editable document";
      const generated = artifactFromChat({
        ownerId: getActiveWorkspaceScope(),
        deviceId,
        prompt,
        response: assistant.content,
        chatId: activeChat.id,
        messageId,
        forcedType: inferArtifactType(prompt) || "document",
      });
      if (!generated) return;
      try {
        const saved = await checkpointArtifact(
          generated,
          "created",
          "Created from Chat",
        );
        const nextChat: Chat = {
          ...activeChat,
          messages: activeChat.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  artifactIds: [
                    ...(message.artifactIds || []),
                    saved.artifact.id,
                  ],
                }
              : message,
          ),
          updatedAt: Date.now(),
          revision: activeChat.revision + 1,
          deviceId,
        };
        await saveChat(nextChat);
        setChats((current) =>
          current.map((chat) => (chat.id === nextChat.id ? nextChat : chat)),
        );
        setArtifacts((current) => [
          saved.artifact,
          ...current.filter((artifact) => artifact.id !== saved.artifact.id),
        ]);
        setOpenArtifactId(saved.artifact.id);
        setSection("artifacts");
        notify("Editable artifact created from this response.", "success");
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Artifact creation failed.",
          "error",
        );
      }
    },
    [activeChat, deviceId, notify],
  );

  const regenerate = useCallback(
    async (messageId: string) => {
      if (!activeChat || sending) return;
      const index = activeChat.messages.findIndex((message) => message.id === messageId);
      if (index < 0) return;
      const base: Chat = {
        ...activeChat,
        messages: activeChat.messages.slice(0, index),
        updatedAt: Date.now(),
        revision: activeChat.revision + 1,
        deviceId,
      };
      setChats((current) => current.map((chat) => (chat.id === base.id ? base : chat)));
      await saveChat(base);
      await runAssistant(base);
    },
    [activeChat, deviceId, runAssistant, sending],
  );

  const continueResponse = useCallback(
    async (messageId: string) => {
      if (!activeChat || sending) return;
      const message = activeChat.messages.find((item) => item.id === messageId);
      if (
        !message ||
        message.role !== "assistant" ||
        !message.content.trim() ||
        (message.status !== "stopped" && message.status !== "failed")
      ) {
        return;
      }
      await runAssistant(activeChat, { continueFrom: message });
    },
    [activeChat, runAssistant, sending],
  );

  const branchConversation = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      const messages = branchMessages(activeChat.messages, messageId);
      if (messages.length === activeChat.messages.length &&
          !messages.some((message: Message) => message.id === messageId)) {
        return;
      }
      const now = Date.now();
      const branch: Chat = {
        id: uid(),
        title: `${activeChat.title.replace(/\s+\(branch\)$/i, "").slice(0, 48)} (branch)`,
        messages,
        summary: activeChat.summary,
        summarizedMessageCount: Math.min(
          activeChat.summarizedMessageCount || 0,
          messages.length,
        ),
        createdAt: now,
        updatedAt: now,
        revision: 1,
        deviceId,
        branchedFrom: activeChat.id,
      };
      await saveChat(branch);
      setChats((current) => [branch, ...current]);
      setActiveId(branch.id);
      setSection("chat");
      notify("Conversation branch created without changing the original.", "success");
    },
    [activeChat, deviceId, notify],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!activeChat || sending) return;
      const index = activeChat.messages.findIndex((message) => message.id === messageId);
      if (index < 0) return;
      const original = activeChat.messages[index];
      const base: Chat = {
        ...activeChat,
        messages: activeChat.messages.slice(0, index),
        updatedAt: Date.now(),
        revision: activeChat.revision + 1,
        deviceId,
      };
      setInput(content);
      setAttachments(original.attachments || []);
      setChats((current) => current.map((chat) => (chat.id === base.id ? base : chat)));
      await saveChat(base);
      notify("Message moved back to the composer. Edit it, then send.", "info");
    },
    [activeChat, deviceId, notify, sending],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const selected = [...files];
      const total = selected.reduce((sum, file) => sum + file.size, 0);
      if (selected.some((file) => file.size > 12 * 1024 * 1024) || total > 24 * 1024 * 1024) {
        notify("Each file must be under 12 MB and the selection under 24 MB.", "error");
        return;
      }
      try {
        const loaded = await Promise.all(selected.map(readAttachment));
        setAttachments((current) => [...current, ...loaded].slice(0, 8));
      } catch (error) {
        notify(error instanceof Error ? error.message : "A file could not be read.", "error");
      }
    },
    [notify],
  );

  const addNewChat = useCallback(async () => {
    const chat = newChat(deviceId || (await getDeviceId()));
    await saveChat(chat);
    setChats((current) => [chat, ...current]);
    setActiveId(chat.id);
    setSection("chat");
    setInput("");
    setAttachments([]);
  }, [deviceId]);

  const deleteChat = useCallback(
    async (id: string) => {
      const target = chats.find((chat) => chat.id === id);
      if (!target) return;
      await tombstoneChat(target, deviceId);
      let remaining = chats.filter((chat) => chat.id !== id);
      if (!remaining.length) {
        const replacement = newChat(deviceId);
        await saveChat(replacement);
        remaining = [replacement];
      }
      setChats(remaining);
      if (activeId === id) setActiveId(remaining[0].id);
      notify("Conversation moved to recoverable deleted items.", "success");
    },
    [activeId, chats, deviceId, notify],
  );

  const saveJob = useCallback(async (job: MediaJob) => {
    await saveMediaJob(job);
    setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
    if (job.status === "completed" && job.outputs.some((output) => !output.assetId)) {
      try {
        const materialized = await materializeJobOutputs(job, deviceId);
        if (materialized.job !== job) {
          setJobs((current) => [
            materialized.job,
            ...current.filter((item) => item.id !== materialized.job.id),
          ]);
        }
        if (materialized.assets.length) {
          setAssets((current) => [
            ...materialized.assets,
            ...current.filter(
              (asset) => !materialized.assets.some((saved) => saved.id === asset.id),
            ),
          ]);
        }
      } catch (error) {
        notify(
          error instanceof Error
            ? `Result created, but its offline copy failed: ${error.message}`
            : "Result created, but its offline copy failed.",
          "error",
        );
      }
    }
  }, [deviceId, notify]);

  const handleCloudSync = useCallback(async () => {
    setSync((current) => ({ ...current, syncing: true, error: undefined }));
    try {
      const result = await syncCloudData();
      await refreshLocalState();
      const lastSyncedAt = Date.now();
      setSync((current) => ({ ...current, syncing: false, lastSyncedAt }));
      notify(
        `Sync complete: ${result.uploaded} uploaded, ${result.downloaded} downloaded${
          result.recovered ? `, ${result.recovered} conflict recovered` : ""
        }.`,
        "success",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed.";
      setSync((current) => ({ ...current, syncing: false, error: message }));
      notify(message, "error");
    }
  }, [notify, refreshLocalState]);

  const pairCompanion = useCallback(async () => {
    setAgentError("");
    try {
      const response = await fetch(`${COMPANION}/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pairCode, workspace: workspaceInput }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Pairing failed.");
      setCompanionToken(payload.token);
      setCompanionWorkspace(payload.workspace);
      setTrusted(Boolean(payload.trusted));
      sessionStorage.setItem("limitless-companion-token", payload.token);
      sessionStorage.setItem("limitless-companion-workspace", payload.workspace);
      setPairCode("");
      notify("Desktop workspace paired.", "success");
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Pairing failed.");
    }
  }, [notify, pairCode, workspaceInput]);

  const companionRequest = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      const request = async (payload: Record<string, unknown>) => {
        const response = await fetch(`${COMPANION}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-limitless-token": companionToken,
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        return { response, data };
      };
      let result = await request(body);
      if (result.response.status === 409 && result.data.approval_required) {
        const review = result.data.review || {};
        const reviewLines = [
          `Action: ${review.action || result.data.action || "local action"}`,
          review.workspace ? `Workspace: ${review.workspace}` : "",
          review.command ? `Command: ${review.command}` : "",
          Array.isArray(review.targets) && review.targets.length
            ? `Targets: ${review.targets.join(", ")}`
            : "",
          review.contentHash ? `Content SHA-256: ${review.contentHash}` : "",
          review.requestHash ? `Request SHA-256: ${review.requestHash}` : "",
        ].filter(Boolean);
        const code = window.prompt(
          `${reviewLines.join("\n")}\n\nEnter the one-time code shown in the Limitless companion window:`,
        );
        if (!code) throw new Error("Local approval was cancelled.");
        result = await request({
          ...body,
          approval: { id: result.data.approval_id, code },
        });
      }
      if (!result.response.ok) throw new Error(result.data.error || "Companion request failed.");
      return result.data;
    },
    [companionToken],
  );

  const setAgentMode = useCallback(
    async (nextTrusted: boolean) => {
      try {
        const result = await companionRequest("/mode", { trusted: nextTrusted });
        setTrusted(Boolean(result.trusted));
      } catch (error) {
        setAgentError(error instanceof Error ? error.message : "Mode change failed.");
      }
    },
    [companionRequest],
  );

  const unpairCompanion = useCallback(async () => {
    try {
      await companionRequest("/unpair", {});
      sessionStorage.removeItem("limitless-companion-token");
      sessionStorage.removeItem("limitless-companion-workspace");
      setCompanionToken("");
      setCompanionWorkspace("");
      setTrusted(false);
      notify("Desktop workspace unpaired.", "success");
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Unpairing failed.");
    }
  }, [companionRequest, notify]);

  const runAgent = useCallback(async () => {
    if (!apiKey) {
      setKeyModal(true);
      return;
    }
    if (!companionToken || !agentTask.trim() || agentRunning) return;
    setAgentRunning(true);
    setAgentError("");
    setAgentResult("");
    setAgentActivities([]);
    const candidates = rankTextModels(textModels, health, agentTask, { agent: true })
      .filter(modelHasTools)
      .slice(0, 3);
    const model = candidates[0];
    if (!model) {
      setAgentError("No tool-capable model is currently available.");
      setAgentRunning(false);
      return;
    }
    const messages: Array<Record<string, unknown>> = [
      {
        role: "system",
        content:
          "You are a careful coding agent in a user-selected workspace. Inspect before changing unfamiliar files. Keep edits scoped, never delete unless essential, run relevant tests, and finish with a concise result. The companion enforces review approvals and path boundaries.",
      },
      { role: "user", content: agentTask.trim() },
    ];
    let completedResult = "";
    try {
      for (let iteration = 0; iteration < 16; iteration += 1) {
        const thinkingId = uid();
        setAgentActivities((current) => [
          ...current,
          { id: thinkingId, label: iteration ? "Reviewing tool output" : `Planning with ${model.name}`, state: "running" },
        ]);
        let payload: {
          error?: { message?: string };
          choices?: Array<{
            message?: { content?: string; tool_calls?: AgentToolCall[] };
          }>;
        } | undefined;
        let requestError = "Agent model request failed.";
        const agentKeys = readyKeySlots(keyPool).slice(0, 3);
        for (const slot of agentKeys) {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${slot.key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": location.origin,
              "X-Title": "Limitless AI",
            },
            body: JSON.stringify({ model: model.id, messages, tools: AGENT_TOOLS }),
          });
          const candidatePayload = await response.json();
          if (response.ok) {
            payload = candidatePayload;
            applyKeyPool(await recordKeyResult(slot.id, { ok: true }));
            break;
          }
          requestError =
            candidatePayload?.error?.message || `${response.status} agent request failed.`;
          if ([401, 403, 429].includes(response.status)) {
            applyKeyPool(
              await recordKeyResult(slot.id, {
                ok: false,
                status: response.status,
                retryAfter: response.headers.get("retry-after"),
              }),
            );
            continue;
          }
          throw new Error(requestError);
        }
        if (!payload) throw new Error(requestError);
        const message = payload?.choices?.[0]?.message as
          | { content?: string; tool_calls?: AgentToolCall[] }
          | undefined;
        if (!message) throw new Error("The agent returned no message.");
        setAgentActivities((current) =>
          current.map((activity) =>
            activity.id === thinkingId ? { ...activity, state: "done" } : activity,
          ),
        );
        messages.push({
          role: "assistant",
          content: message.content || "",
          tool_calls: message.tool_calls,
        });
        if (!message.tool_calls?.length) {
          completedResult = message.content || "Task completed.";
          setAgentResult(completedResult);
          break;
        }
        for (const toolCall of message.tool_calls) {
          const activityId = uid();
          const label = toolCall.function.name.replaceAll("_", " ");
          setAgentActivities((current) => [
            ...current,
            { id: activityId, label, state: "running" },
          ]);
          let argumentsValue: Record<string, unknown> = {};
          try {
            argumentsValue = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            throw new Error(`The agent returned invalid arguments for ${toolCall.function.name}.`);
          }
          try {
            const responseData = await companionRequest("/tool", {
              name: toolCall.function.name,
              arguments: argumentsValue,
            });
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(responseData.result),
            });
            setAgentActivities((current) =>
              current.map((activity) =>
                activity.id === activityId ? { ...activity, state: "done" } : activity,
              ),
            );
          } catch (error) {
            setAgentActivities((current) =>
              current.map((activity) =>
                activity.id === activityId ? { ...activity, state: "error" } : activity,
              ),
            );
            throw error;
          }
        }
      }
      if (!completedResult) {
        setAgentResult("The agent stopped after its maximum action budget. Review the activity before continuing.");
      }
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Agent task failed.");
    } finally {
      setAgentRunning(false);
    }
  }, [
    agentRunning,
    agentTask,
    apiKey,
    applyKeyPool,
    companionRequest,
    companionToken,
    health,
    keyPool,
    textModels,
  ]);

  const rankedModels = useMemo(
    () => rankTextModels(textModels, health, input, {
      hasImages: attachments.some((attachment) => attachment.kind === "image"),
      hasFiles: attachments.some((attachment) =>
        attachment.kind === "pdf" || attachment.kind === "file" || attachment.kind === "text",
      ),
      hasAudio: attachments.some((attachment) => attachment.kind === "audio"),
      hasVideo: attachments.some((attachment) => attachment.kind === "video"),
    }),
    [attachments, health, input, textModels],
  );

  if (!ready) {
    return (
      <main className="boot-screen">
        <span className="boot-mark">L</span>
        <LoaderCircle className="spin" size={19} />
        <p>Protecting your workspace…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar
        section={section}
        setSection={setSection}
        chats={chats}
        activeChatId={activeId}
        onSelectChat={setActiveId}
        onNewChat={addNewChat}
        onDeleteChat={deleteChat}
        search={search}
        setSearch={setSearch}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        userEmail={userEmail}
        syncing={sync.syncing}
        onAccount={() => setAccountModal(true)}
      />

      {section === "chat" && (
        <ChatWorkspace
          key={activeChat?.id || "empty-chat"}
          chat={activeChat}
          input={input}
          setInput={setInput}
          attachments={attachments}
          onFiles={addFiles}
          onRemoveAttachment={(id) =>
            setAttachments((current) => current.filter((attachment) => attachment.id !== id))
          }
          models={rankedModels}
          selectedModel={selectedModel}
          setSelectedModel={(model) => {
            setSelectedModel(model);
            void setSetting("selected-text-model", model);
          }}
          sending={sending}
          stage={stage}
          routeNote={routeNote}
          keyConfigured={Boolean(apiKey)}
          onOpenKey={() => setKeyModal(true)}
          onSend={() => void sendMessage()}
          onStop={() => abortRef.current?.abort()}
          onStarter={(prompt) => void sendMessage(prompt)}
          onRegenerate={(id) => void regenerate(id)}
          onEdit={(id, content) => void editMessage(id, content)}
          onContinue={(id) => void continueResponse(id)}
          onBranch={(id) => void branchConversation(id)}
          artifacts={artifacts}
          onOpenArtifact={(artifactId) => {
            setOpenArtifactId(artifactId);
            setSection("artifacts");
          }}
          onCreateArtifact={(id) => void createArtifactFromMessage(id)}
        />
      )}
      {section === "artifacts" && (
        <ArtifactWorkspace
          artifacts={artifacts}
          requestedArtifactId={openArtifactId || undefined}
          deviceId={deviceId}
          onArtifactsChanged={setArtifacts}
          onArtifactOpened={(artifactId) => setOpenArtifactId(artifactId || "")}
          onAskAI={(artifact) => {
            setInput(
              `Improve the ${artifact.type.replace("-", " ")} “${artifact.title}” while preserving its useful content and editability. Return the complete revised content so Limitless can save it as a new recoverable version.\n\n${artifactContextForChat(artifact)}`,
            );
            setArtifactAssistId(artifact.id);
            setSection("chat");
          }}
          notify={notify}
        />
      )}
      {section === "build" && <BuildWorkspace notify={notify} />}
      {section === "intelligence" && <IntelligenceWorkspace notify={notify} />}
      {section === "documents" && (
        <DocumentStudioWorkspace
          notify={notify}
          onOpenArtifact={(artifact) => {
            setArtifacts((current) => [
              artifact,
              ...current.filter((item) => item.id !== artifact.id),
            ]);
            setOpenArtifactId(artifact.id);
            setSection("artifacts");
          }}
        />
      )}
      {section === "providers" && <ProviderHubWorkspace notify={notify} />}
      {section === "security" && <SecurityCentreWorkspace notify={notify} />}
      {section === "create" && (
        <Studio
          apiKey={apiKey}
          openRouterKeys={readyKeySlots(keyPool).map(({ id, key, label }) => ({
            id,
            key,
            label,
          }))}
          onProviderKeyResult={async (id, result) => {
            const slot = keyPool.find((candidate) => candidate.id === id);
            if (!slot) return;
            applyKeyPool(await recordKeyResult(slot.id, result));
          }}
          pollinationsKey={POLLINATIONS_PUBLISHABLE_KEY}
          pollinationsRunBudget={POLLINATIONS_RUN_BUDGET}
          deviceId={deviceId}
          imageModels={imageModels}
          videoModels={videoModels}
          assets={assets}
          projects={projects}
          onRequireKey={() => setKeyModal(true)}
          onSaveJob={saveJob}
          onAssetSaved={(asset) =>
            setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)])
          }
          onProjectSaved={(project) =>
            setProjects((current) => [
              project,
              ...current.filter((item) => item.id !== project.id),
            ])
          }
        />
      )}
      {section === "library" && <LibraryView jobs={jobs} assets={assets} projects={projects} />}
      {section === "models" && (
        <ModelsView
          textModels={rankedModels}
          imageModels={imageModels}
          videoModels={videoModels}
        />
      )}
      {section === "agent" && (
        <AgentView
          online={companionOnline}
          paired={Boolean(companionToken)}
          workspace={companionWorkspace}
          trusted={trusted}
          pairCode={pairCode}
          setPairCode={setPairCode}
          workspaceInput={workspaceInput}
          setWorkspaceInput={setWorkspaceInput}
          onPair={() => void pairCompanion()}
          onUnpair={() => void unpairCompanion()}
          onMode={(value) => void setAgentMode(value)}
          task={agentTask}
          setTask={setAgentTask}
          onRun={() => void runAgent()}
          running={agentRunning}
          activities={agentActivities}
          error={agentError}
          result={agentResult}
        />
      )}
      {section === "settings" && (
        <SettingsView
          keyConfigured={Boolean(apiKey)}
          configuredKeyCount={keyPool.filter((slot) => slot.configured && slot.enabled).length}
          pollinationsConfigured={Boolean(POLLINATIONS_PUBLISHABLE_KEY)}
          pollinationsRunBudget={POLLINATIONS_RUN_BUDGET}
          cloudAvailable={cloudConfigured}
          userEmail={userEmail}
          sync={sync}
          recoveryCount={recoveryCount}
          migrationLabel={migrationLabel}
          onKey={() => setKeyModal(true)}
          onAccount={() => setAccountModal(true)}
          onSync={() => void handleCloudSync()}
          onExport={() =>
            void exportBackup().then((blob) =>
              downloadBlob(blob, `limitless-ai-backup-${new Date().toISOString().slice(0, 10)}.json`),
            )
          }
          onImport={() => {
            const chooser = document.createElement("input");
            chooser.type = "file";
            chooser.accept = "application/json,.json";
            chooser.onchange = () => {
              const file = chooser.files?.[0];
              if (!file) return;
              void importBackup(file)
                .then(async (result) => {
                  await refreshLocalState();
                  notify(
                    `Restored ${result.chats} conversations, ${result.media} jobs, ${result.assets} media assets, ${result.projects} media projects, ${result.versions} media versions, ${result.artifacts} artifacts, ${result.artifactVersions} artifact versions, ${result.artifactExports} exports, ${result.artifactAssets} artifact assets, and ${result.memory} memories${
                      result.conflicts ? `; recovered ${result.conflicts} conflicts` : ""
                    }.`,
                    "success",
                  );
                })
                .catch((error) =>
                  notify(error instanceof Error ? error.message : "Import failed.", "error"),
                );
            };
            chooser.click();
          }}
          qualityBoost={qualityBoost}
          onQualityBoost={(enabled) => {
            setQualityBoost(enabled);
            void setSetting("quality-boost", enabled);
          }}
          onDiagnostics={() => {
            const diagnostics = redactDiagnostics({
              format: "limitless-ai-diagnostics",
              version: 2,
              generatedAt: new Date().toISOString(),
              workspace: userEmail ? "authenticated" : "anonymous",
              records: {
                conversations: chats.length,
                jobs: jobs.length,
                assets: assets.length,
                projects: projects.length,
                artifacts: artifacts.length,
                memories: memory.length,
                recoverySnapshots: recoveryCount,
              },
              providerPool: keyPool.map((slot) => ({
                slot: slot.id,
                configured: slot.configured,
                enabled: slot.enabled,
                status: slot.status,
                failures: slot.failures,
                cooldownActive: Boolean(
                  slot.cooldownUntil && slot.cooldownUntil > Date.now(),
                ),
              })),
              configuration: {
                cloud: cloudConfigured,
                pollinationsConfigured: Boolean(POLLINATIONS_PUBLISHABLE_KEY),
                pollinationsRunBudget: POLLINATIONS_RUN_BUDGET,
                qualityBoost,
              },
              capabilities: {
                indexedDb: typeof indexedDB !== "undefined",
                webCrypto: Boolean(globalThis.crypto?.subtle),
                serviceWorker: "serviceWorker" in navigator,
                mediaRecorder: typeof MediaRecorder !== "undefined",
              },
              releaseFeatures: releaseFeatureSnapshot(),
            });
            downloadBlob(
              new Blob([JSON.stringify(diagnostics, null, 2)], {
                type: "application/json",
              }),
              `limitless-ai-diagnostics-${new Date().toISOString().slice(0, 10)}.json`,
            );
          }}
          memory={memory}
          onAddMemory={(text, category) => {
            const now = Date.now();
            const item: MemoryItem = {
              id: uid(),
              text,
              category,
              pinned: true,
              createdAt: now,
              updatedAt: now,
              revision: 1,
              deviceId,
            };
            void saveMemoryItem(item).then(() =>
              setMemory((current) => [item, ...current]),
            );
          }}
          onDeleteMemory={(item) => {
            void tombstoneMemoryItem(item, deviceId).then(() =>
              setMemory((current) => current.filter((entry) => entry.id !== item.id)),
            );
          }}
        />
      )}

      {keyModal && (
        <KeyModal
          slots={keyPool}
          onClose={() => setKeyModal(false)}
          onSave={async (id, value) => {
            await validateOpenRouterKey(value);
            const nextPool = await saveKeySlot(id, value);
            applyKeyPool(nextPool);
            const discoveryKey = readyKeySlots(nextPool)[0]?.key || value;
            const [images, videos] = await Promise.allSettled([
              discoverImageModels(discoveryKey),
              discoverVideoModels(discoveryKey),
            ]);
            if (images.status === "fulfilled") setImageModels(images.value);
            if (videos.status === "fulfilled") setVideoModels(videos.value);
            notify("OpenRouter key verified and encrypted in this workspace.", "success");
          }}
          onRemove={async (id) => {
            const nextPool = await removeKeySlot(id);
            applyKeyPool(nextPool);
            notify("Provider key removed from this workspace.", "success");
          }}
          onToggle={async (id, enabled) => {
            const nextPool = await setKeySlotEnabled(id, enabled);
            applyKeyPool(nextPool);
          }}
        />
      )}
      {accountModal && (
        <AccountModal
          configured={cloudConfigured}
          userEmail={userEmail}
          onClose={() => setAccountModal(false)}
          onMagicLink={requestMagicLink}
          onSignOut={async () => {
            await signOutCloud();
          }}
        />
      )}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast ${toast.type}`} key={toast.id}>
            {toast.type === "success" ? (
              <CheckCircle2 size={17} />
            ) : toast.type === "error" ? (
              <AlertCircle size={17} />
            ) : (
              <LoaderCircle size={17} />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() =>
                setToasts((current) => current.filter((item) => item.id !== toast.id))
              }
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
