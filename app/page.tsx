"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import { AccountModal, KeyModal } from "@/components/Modals";
import { Sidebar } from "@/components/Sidebar";
import { Studio } from "@/components/Studio";
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
import { generatePollinationsVideo } from "@/lib/pollinations";
import {
  ensureFirstChat,
  exportBackup,
  getDeviceId,
  getSetting,
  importBackup,
  loadAssets,
  loadMemory,
  loadMediaJobs,
  loadProjects,
  loadSecret,
  migrateLegacyStorage,
  recoverySnapshotCount,
  saveChat,
  saveMediaJob,
  saveMemoryItem,
  saveSecret,
  setSetting,
  tombstoneChat,
  tombstoneMemoryItem,
} from "@/lib/local-store";
import { materializeJobOutputs } from "@/lib/media-library";
import {
  discoverImageModels,
  discoverTextModels,
  discoverVideoModels,
  FALLBACK_TEXT_MODELS,
  getVideoJob,
  modelHasTools,
  modelHasTextOutput,
  rankTextModels,
  readAttachment,
  streamChat,
  summarizeConversation,
  validateOpenRouterKey,
} from "@/lib/openrouter";
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

const COMPANION = "http://127.0.0.1:4317";
const POLLINATIONS_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY?.trim().startsWith("pk_")
    ? process.env.NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY.trim()
    : "";
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
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [apiKey, setApiKey] = useState("");
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
  const activeChat = chats.find((chat) => chat.id === activeId);

  const notify = useCallback((message: string, type: Toast["type"] = "info") => {
    const toast = { id: uid(), type, message };
    setToasts((current) => [...current, toast]);
    window.setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== toast.id)),
      4_500,
    );
  }, []);

  const refreshLocalState = useCallback(async () => {
    const [nextChats, nextJobs, nextAssets, nextProjects, nextMemory] = await Promise.all([
      ensureFirstChat(),
      loadMediaJobs(),
      loadAssets(),
      loadProjects(),
      loadMemory(),
    ]);
    setChats(nextChats);
    setJobs(nextJobs);
    setAssets(nextAssets);
    setProjects(nextProjects);
    setMemory(nextMemory);
    setActiveId((current) =>
      nextChats.some((chat) => chat.id === current) ? current : nextChats[0]?.id || "",
    );
  }, []);

  useEffect(() => {
    let alive = true;
    const initialize = async () => {
      let discoveryKey = "";
      try {
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
          encryptedKey,
          storedHealth,
          storedModels,
          storedSelected,
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
            readOptional(loadSecret("openrouter-api-key"), "", "Encrypted key vault"),
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
          ]);
        if (!alive) return;
        setDeviceId(localDeviceId);
        setChats(initialChats);
        setActiveId(initialChats[0]?.id || "");
        setJobs(initialJobs);
        setAssets(initialAssets);
        setProjects(initialProjects);
        setMemory(initialMemory);
        setApiKey(encryptedKey);
        discoveryKey = encryptedKey;
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

    getCloudUser()
      .then((user) => {
        if (alive) setUserEmail(user?.email || "");
      })
      .catch(() => undefined);
    const unsubscribe = subscribeToAuth((user) => setUserEmail(user?.email || ""));

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
  }, [notify]);

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
          (job.providerJobId || job.provider === "local" || job.provider === "pollinations") &&
          (job.status === "queued" || job.status === "processing") &&
          (job.attempts || 0) < 5 &&
          (!job.nextRetryAt || job.nextRetryAt <= Date.now()) &&
          !resumedJobs.current.has(job.id) &&
          (
            job.provider === "ai-horde" ||
            job.provider === "local" ||
            job.provider === "pollinations" ||
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
            if (job.provider === "pollinations") {
              if (!POLLINATIONS_PUBLISHABLE_KEY) {
                throw new Error("The Pollinations publishable key is not configured.");
              }
              const output = await generatePollinationsVideo(POLLINATIONS_PUBLISHABLE_KEY, {
                prompt: job.prompt,
                negativePrompt: job.negativePrompt,
                duration: Number(job.options.duration || 5),
                aspectRatio: String(job.options.aspectRatio || "16:9"),
                audio: Boolean(job.options.audio),
                reference: job.inputs?.find((input) => input.kind === "image"),
              });
              await storeUpdate({
                status: "completed",
                progress: 100,
                model: `pollinations/${output.model}`,
                error: undefined,
                nextRetryAt: undefined,
                outputs: [{ id: uid(), dataUrl: output.dataUrl, mimeType: output.mimeType }],
              });
              return;
            }

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
    async (baseChat: Chat) => {
      if (!apiKey || sending) return;
      setSending(true);
      setStage("Routing the request");
      const controller = new AbortController();
      abortRef.current = controller;
      let contextChat = baseChat;
      const summarizedCount = baseChat.summarizedMessageCount || 0;
      const summaryBoundary = Math.max(0, baseChat.messages.length - 16);
      if (
        baseChat.messages.length >= 32 &&
        summaryBoundary - summarizedCount >= 16
      ) {
        try {
          setStage("Compressing older context");
          const summary = await summarizeConversation(
            apiKey,
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
          setStage("Routing the request");
        } catch {
          // Compression is an optimization. The original messages remain authoritative.
        }
      }
      const placeholder: Message = {
        id: uid(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        routed: selectedModel === "auto",
      };
      const withPlaceholder: Chat = {
        ...contextChat,
        messages: [...contextChat.messages, placeholder],
        updatedAt: Date.now(),
      };
      setChats((current) =>
        current.map((chat) => (chat.id === baseChat.id ? withPlaceholder : chat)),
      );
      const lastUser = [...contextChat.messages].reverse().find((message) => message.role === "user");
      const prompt = lastUser?.content || "";
      const hasImages = Boolean(
        lastUser?.attachments?.some((attachment) => attachment.kind === "image"),
      );
      const hasFiles = Boolean(
        lastUser?.attachments?.some((attachment) =>
          attachment.kind === "pdf" || attachment.kind === "file" || attachment.kind === "text",
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
      });
      const selected = textModels.find((model) => model.id === selectedModel);
      const candidates =
        selectedModel !== "auto" && selected
          ? [selected, ...ranked.filter((model) => model.id !== selected.id).slice(0, 3)]
          : ranked.slice(0, 5);
      let finalError: Error = new Error("No available model completed the response.");

      for (const model of candidates) {
        const started = performance.now();
        try {
          setRouteNote(`Routing to ${model.name || model.id}`);
          setStage("Thinking and responding");
          const complete = await streamChat({
            apiKey,
            model,
            messages: contextChat.messages,
            summary: contextChat.summary,
            memory,
            signal: controller.signal,
            onToken: (content) => {
              setStage("Writing the answer");
              setChats((current) =>
                current.map((chat) =>
                  chat.id === baseChat.id
                    ? {
                        ...chat,
                        messages: chat.messages.map((message) =>
                          message.id === placeholder.id
                            ? { ...message, content, model: model.id }
                            : message,
                        ),
                      }
                    : chat,
                ),
              );
            },
          });
          const completed: Chat = {
            ...contextChat,
            messages: [
              ...contextChat.messages,
              { ...placeholder, content: complete, model: model.id },
            ],
            updatedAt: Date.now(),
            revision: contextChat.revision + 1,
            deviceId,
          };
          setChats((current) => [
            completed,
            ...current.filter((chat) => chat.id !== completed.id),
          ]);
          await saveChat(completed);
          await updateHealth(model.id, true, performance.now() - started);
          setRouteNote(`${model.name || model.id} completed`);
          setStage("");
          setSending(false);
          abortRef.current = null;
          return;
        } catch (caught) {
          if (controller.signal.aborted) {
            finalError = new Error("Response stopped.");
            break;
          }
          finalError = caught instanceof Error ? caught : new Error("Model request failed.");
          await updateHealth(model.id, false, performance.now() - started);
          setStage("Trying a healthy fallback");
        }
      }

      const failed: Chat = {
        ...contextChat,
        messages: [
          ...contextChat.messages,
          {
            ...placeholder,
            content: `I couldn't complete that request. ${finalError.message}`,
          },
        ],
        updatedAt: Date.now(),
        revision: contextChat.revision + 1,
        deviceId,
      };
      setChats((current) => [failed, ...current.filter((chat) => chat.id !== failed.id)]);
      await saveChat(failed);
      setRouteNote("Ready to retry");
      setStage("");
      setSending(false);
      abortRef.current = null;
    },
    [apiKey, deviceId, health, memory, selectedModel, sending, textModels, updateHealth],
  );

  const sendMessage = useCallback(
    async (promptOverride?: string) => {
      if (sending) return;
      if (!apiKey) {
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
      await saveChat(next);
      await runAssistant(next);
    },
    [activeChat, apiKey, attachments, deviceId, input, runAssistant, sending],
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
        const code = window.prompt(
          `Review required for ${result.data.action || "this action"}.\nEnter the one-time code shown in the Limitless companion window:`,
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
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": location.origin,
            "X-Title": "Limitless AI",
          },
          body: JSON.stringify({ model: model.id, messages, tools: AGENT_TOOLS }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || "Agent model request failed.");
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
    companionRequest,
    companionToken,
    health,
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
        />
      )}
      {section === "create" && (
        <Studio
          apiKey={apiKey}
          pollinationsKey={POLLINATIONS_PUBLISHABLE_KEY}
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
          pollinationsConfigured={Boolean(POLLINATIONS_PUBLISHABLE_KEY)}
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
                    `Restored ${result.chats} conversations, ${result.media} jobs, ${result.assets} assets, ${result.projects} projects, ${result.versions} versions, and ${result.memory} memories${
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
          current={apiKey}
          onClose={() => setKeyModal(false)}
          onSave={async (value) => {
            await validateOpenRouterKey(value);
            await saveSecret("openrouter-api-key", value);
            const verified = await loadSecret("openrouter-api-key");
            if (verified !== value) throw new Error("Encryption verification failed.");
            setApiKey(value);
            const [images, videos] = await Promise.allSettled([
              discoverImageModels(value),
              discoverVideoModels(value),
            ]);
            if (images.status === "fulfilled") setImageModels(images.value);
            if (videos.status === "fulfilled") setVideoModels(videos.value);
            notify("OpenRouter key encrypted and saved on this device.", "success");
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
            setUserEmail("");
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
