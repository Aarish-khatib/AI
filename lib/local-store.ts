"use client";

import {
  type Chat,
  type MediaAsset,
  type MediaJob,
  type MediaProject,
  type MemoryItem,
  type Message,
  type ProjectVersion,
  newChat,
  uid,
} from "@/lib/types";

const DB_NAME = "limitless-ai";
const DB_VERSION = 5;
const LEGACY = {
  key: "limitless-openrouter-key",
  chats: "limitless-chats-v1",
  health: "limitless-health-v1",
  models: "limitless-free-models-v2",
};

type StoreName =
  | "chats"
  | "media"
  | "assets"
  | "projects"
  | "versions"
  | "memory"
  | "kv"
  | "vault"
  | "recovery"
  | "outbox";
type KeyValue<T = unknown> = { key: string; value: T; updatedAt: number };
type VaultRecord = {
  key: string;
  iv: number[];
  cipher: ArrayBuffer;
  updatedAt: number;
};
type RecoveryRecord = {
  id: string;
  kind: string;
  createdAt: number;
  checksum: string;
  payload: unknown;
};

export type MigrationResult = {
  migratedChats: number;
  keySecured: boolean;
  recoveryId?: string;
  alreadyComplete: boolean;
};

let databasePromise: Promise<IDBDatabase> | undefined;

function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support IndexedDB."));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("chats")) {
          const store = db.createObjectStore("chats", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("deletedAt", "deletedAt");
        }
        if (!db.objectStoreNames.contains("media")) {
          const store = db.createObjectStore("media", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("status", "status");
        }
        if (!db.objectStoreNames.contains("assets")) {
          const store = db.createObjectStore("assets", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("kind", "kind");
          store.createIndex("deletedAt", "deletedAt");
        }
        if (!db.objectStoreNames.contains("projects")) {
          const store = db.createObjectStore("projects", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("kind", "kind");
          store.createIndex("deletedAt", "deletedAt");
        }
        if (!db.objectStoreNames.contains("versions")) {
          const store = db.createObjectStore("versions", { keyPath: "id" });
          store.createIndex("projectId", "projectId");
          store.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("memory")) {
          const store = db.createObjectStore("memory", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("category", "category");
          store.createIndex("deletedAt", "deletedAt");
        }
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("vault")) {
          db.createObjectStore("vault", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("recovery")) {
          const store = db.createObjectStore("recovery", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("outbox")) {
          const store = db.createObjectStore("outbox", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Unable to open local database."));
      request.onblocked = () => reject(new Error("A previous Limitless AI tab is blocking the database upgrade."));
    });
  }
  return databasePromise;
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let request: IDBRequest<T> | void;
    try {
      request = operation(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () =>
      reject(transaction.error || request?.error || new Error(`Unable to update ${storeName}.`));
    transaction.onabort = () =>
      reject(transaction.error || new Error(`The ${storeName} update was cancelled.`));
  });
}

async function getAll<T>(storeName: StoreName): Promise<T[]> {
  return (await withStore<T[]>(storeName, "readonly", (store) => store.getAll())) || [];
}

async function digest(value: unknown): Promise<string> {
  const serialized = JSON.stringify(value);
  const bytes = new TextEncoder().encode(serialized);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const hash = await subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, "0")).join("");
  }

  // Recovery checksums are an accidental-corruption signal, not an authentication
  // mechanism. Keep local HTTP development usable when Web Crypto is unavailable.
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (const byte of bytes) {
    left = Math.imul(left ^ byte, 0x01000193);
    right = Math.imul(right ^ byte, 0x85ebca6b);
  }
  return `local-${(left >>> 0).toString(16).padStart(8, "0")}${(right >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const record = await withStore<KeyValue<T>>("kv", "readonly", (store) => store.get(key));
  return record?.value ?? fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await withStore("kv", "readwrite", (store) =>
    store.put({ key, value, updatedAt: Date.now() } satisfies KeyValue<T>),
  );
}

export async function getDeviceId(): Promise<string> {
  let deviceId = await getSetting("device-id", "");
  if (!deviceId) {
    deviceId = uid();
    await setSetting("device-id", deviceId);
  }
  return deviceId;
}

export async function loadChats(options?: { includeDeleted?: boolean }): Promise<Chat[]> {
  const chats = await getAll<Chat>("chats");
  return chats
    .filter((chat) => options?.includeDeleted || !chat.deletedAt)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function saveChat(chat: Chat): Promise<void> {
  await withStore("chats", "readwrite", (store) => store.put(chat));
}

export async function saveChats(chats: Chat[]): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("chats", "readwrite");
    const store = transaction.objectStore("chats");
    chats.forEach((chat) => store.put(chat));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Unable to save conversations."));
    transaction.onabort = () => reject(transaction.error || new Error("Conversation save cancelled."));
  });
}

export async function tombstoneChat(chat: Chat, deviceId: string): Promise<Chat> {
  const removed: Chat = {
    ...chat,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    revision: chat.revision + 1,
    deviceId,
  };
  await saveChat(removed);
  return removed;
}

export async function loadMediaJobs(options?: { includeDeleted?: boolean }): Promise<MediaJob[]> {
  const jobs = await getAll<MediaJob>("media");
  return jobs
    .filter((job) => options?.includeDeleted || !job.deletedAt)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function saveMediaJob(job: MediaJob): Promise<void> {
  await withStore("media", "readwrite", (store) => store.put(job));
}

export async function loadAssets(options?: { includeDeleted?: boolean }): Promise<MediaAsset[]> {
  const assets = await getAll<MediaAsset>("assets");
  return assets
    .filter((asset) => options?.includeDeleted || !asset.deletedAt)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getAsset(id: string): Promise<MediaAsset | undefined> {
  return withStore<MediaAsset>("assets", "readonly", (store) => store.get(id));
}

export async function saveAsset(asset: MediaAsset): Promise<void> {
  await withStore("assets", "readwrite", (store) => store.put(asset));
}

export async function saveAssets(assets: MediaAsset[]): Promise<void> {
  if (!assets.length) return;
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("assets", "readwrite");
    const store = transaction.objectStore("assets");
    assets.forEach((asset) => store.put(asset));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Unable to save media assets."));
    transaction.onabort = () => reject(transaction.error || new Error("Media asset save cancelled."));
  });
}

export async function tombstoneAsset(asset: MediaAsset, deviceId: string): Promise<MediaAsset> {
  const removed: MediaAsset = {
    ...asset,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    revision: asset.revision + 1,
    deviceId,
  };
  await saveAsset(removed);
  return removed;
}

export async function loadProjects(options?: {
  includeDeleted?: boolean;
}): Promise<MediaProject[]> {
  const projects = await getAll<MediaProject>("projects");
  return projects
    .filter((project) => options?.includeDeleted || !project.deletedAt)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getProject(id: string): Promise<MediaProject | undefined> {
  return withStore<MediaProject>("projects", "readonly", (store) => store.get(id));
}

export async function saveProject(project: MediaProject, snapshot = false): Promise<void> {
  await withStore("projects", "readwrite", (store) => store.put(project));
  if (snapshot) await saveProjectVersion(project);
}

export async function tombstoneProject(
  project: MediaProject,
  deviceId: string,
): Promise<MediaProject> {
  const removed: MediaProject = {
    ...project,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    revision: project.revision + 1,
    deviceId,
  };
  await saveProject(removed, true);
  return removed;
}

export async function saveProjectVersion(project: MediaProject): Promise<ProjectVersion> {
  const version: ProjectVersion = {
    id: uid(),
    projectId: project.id,
    project: structuredClone(project),
    createdAt: Date.now(),
  };
  await saveProjectVersionRecord(version);
  const versions = (await getAll<ProjectVersion>("versions"))
    .filter((item) => item.projectId === project.id)
    .sort((left, right) => right.createdAt - left.createdAt);
  for (const old of versions.slice(30)) {
    await withStore("versions", "readwrite", (store) => store.delete(old.id));
  }
  return version;
}

export async function saveProjectVersionRecord(version: ProjectVersion): Promise<void> {
  await withStore("versions", "readwrite", (store) => store.put(version));
}

export async function loadProjectVersions(projectId: string): Promise<ProjectVersion[]> {
  const versions = await getAll<ProjectVersion>("versions");
  return versions
    .filter((version) => version.projectId === projectId)
    .sort((left, right) => right.createdAt - left.createdAt);
}

export async function loadAllProjectVersions(): Promise<ProjectVersion[]> {
  return (await getAll<ProjectVersion>("versions")).sort(
    (left, right) => right.createdAt - left.createdAt,
  );
}

export async function loadMemory(options?: {
  includeDeleted?: boolean;
}): Promise<MemoryItem[]> {
  const items = await getAll<MemoryItem>("memory");
  return items
    .filter((item) => options?.includeDeleted || !item.deletedAt)
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt - left.updatedAt);
}

export async function saveMemoryItem(item: MemoryItem): Promise<void> {
  await withStore("memory", "readwrite", (store) => store.put(item));
}

export async function tombstoneMemoryItem(
  item: MemoryItem,
  deviceId: string,
): Promise<MemoryItem> {
  const removed: MemoryItem = {
    ...item,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    revision: item.revision + 1,
    deviceId,
  };
  await saveMemoryItem(removed);
  return removed;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded = ""] = dataUrl.split(",", 2);
  const mimeType = header.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
  const binary = header.includes(";base64")
    ? atob(encoded)
    : decodeURIComponent(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("A media file could not be added to the backup."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function createAssetFromFile(
  file: File,
  deviceId: string,
  options?: { name?: string; sourceJobId?: string },
): Promise<MediaAsset> {
  const now = Date.now();
  return {
    id: uid(),
    name: options?.name || file.name || "Untitled asset",
    kind: file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : file.type.includes("pdf") || file.type.startsWith("text/")
            ? "document"
            : "other",
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    blob: file,
    sourceJobId: options?.sourceJobId,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId,
  };
}

export async function createAssetFromSource(
  source: string,
  deviceId: string,
  options: {
    name: string;
    mimeType: string;
    kind: MediaAsset["kind"];
    sourceJobId?: string;
  },
): Promise<MediaAsset> {
  let blob: Blob | undefined;
  let remoteUrl: string | undefined;
  if (source.startsWith("data:")) {
    blob = dataUrlToBlob(source);
  } else {
    remoteUrl = source;
    try {
      const response = await fetch(source);
      if (response.ok) blob = await response.blob();
    } catch {
      // Keep the provider URL if its CORS policy prevents an offline copy.
    }
  }
  const now = Date.now();
  return {
    id: uid(),
    name: options.name,
    kind: options.kind,
    mimeType: blob?.type || options.mimeType,
    size: blob?.size || 0,
    blob,
    remoteUrl,
    sourceJobId: options.sourceJobId,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId,
  };
}

async function getVaultKey(): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Encrypted key storage needs HTTPS or a secure local browser context.");
  }
  const existing = await withStore<KeyValue<CryptoKey>>("vault", "readonly", (store) =>
    store.get("__device_key__"),
  );
  if (existing?.value) return existing.value;
  const key = await subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  await withStore("vault", "readwrite", (store) =>
    store.put({ key: "__device_key__", value: key, updatedAt: Date.now() }),
  );
  return key;
}

export async function saveSecret(name: string, value: string): Promise<void> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Encrypted key storage needs HTTPS or a secure local browser context.");
  }
  const key = await getVaultKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );
  await withStore("vault", "readwrite", (store) =>
    store.put({
      key: name,
      iv: [...iv],
      cipher,
      updatedAt: Date.now(),
    } satisfies VaultRecord),
  );
}

export async function loadSecret(name: string): Promise<string> {
  const record = await withStore<VaultRecord>("vault", "readonly", (store) => store.get(name));
  if (!record) {
    // During an HTTPS migration failure, keep the original key usable in memory
    // without deleting or rewriting its legacy recovery copy.
    return name === "openrouter-api-key" ? localStorage.getItem(LEGACY.key) || "" : "";
  }
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Encrypted key storage needs HTTPS or a secure local browser context.");
  }
  const key = await getVaultKey();
  try {
    const clear = await subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(record.iv) },
      key,
      record.cipher,
    );
    return new TextDecoder().decode(clear);
  } catch {
    throw new Error("The encrypted key could not be opened on this device.");
  }
}

export async function removeSecret(name: string): Promise<void> {
  await withStore("vault", "readwrite", (store) => store.delete(name));
}

function normalizeLegacyMessage(raw: Partial<Message>, index: number): Message {
  return {
    id: raw.id || `legacy-message-${index}-${uid()}`,
    role: raw.role === "assistant" || raw.role === "system" ? raw.role : "user",
    content: typeof raw.content === "string" ? raw.content : "",
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now() + index,
    model: raw.model,
    routed: raw.routed,
    attachments: Array.isArray(raw.attachments) ? raw.attachments : undefined,
  };
}

function normalizeLegacyChat(
  raw: Partial<Chat> & { messages?: Partial<Message>[] },
  index: number,
  deviceId: string,
): Chat {
  const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now() - index;
  return {
    id: raw.id || `legacy-chat-${index}-${uid()}`,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "Recovered conversation",
    messages: Array.isArray(raw.messages)
      ? raw.messages.map((message, messageIndex) => normalizeLegacyMessage(message, messageIndex))
      : [],
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : updatedAt,
    updatedAt,
    revision: Math.max(Number(raw.revision) || 1, 1),
    deviceId: raw.deviceId || deviceId,
    deletedAt: raw.deletedAt,
    recoveredFrom: raw.recoveredFrom,
  };
}

export async function migrateLegacyStorage(): Promise<MigrationResult> {
  const complete = await getSetting("legacy-migration-v4", false);
  if (complete) {
    return { migratedChats: 0, keySecured: false, alreadyComplete: true };
  }

  const rawChats = localStorage.getItem(LEGACY.chats);
  const legacyKey = localStorage.getItem(LEGACY.key) || "";
  const rawHealth = localStorage.getItem(LEGACY.health);
  const rawModels = localStorage.getItem(LEGACY.models);
  const recoveryPayload = {
    source: "localStorage-v1",
    chats: rawChats,
    health: rawHealth,
    models: rawModels,
    hadOpenRouterKey: Boolean(legacyKey),
  };
  const recoveryId = `legacy-${Date.now()}-${uid()}`;
  await withStore("recovery", "readwrite", (store) =>
    store.put({
      id: recoveryId,
      kind: "legacy-local-storage",
      createdAt: Date.now(),
      checksum: "",
      payload: recoveryPayload,
    } satisfies RecoveryRecord),
  );
  const checksum = await digest(recoveryPayload);
  await withStore("recovery", "readwrite", (store) =>
    store.put({
      id: recoveryId,
      kind: "legacy-local-storage",
      createdAt: Date.now(),
      checksum,
      payload: recoveryPayload,
    } satisfies RecoveryRecord),
  );

  const deviceId = await getDeviceId();
  let parsedChats: Array<Partial<Chat> & { messages?: Partial<Message>[] }> = [];
  if (rawChats) {
    try {
      const parsed = JSON.parse(rawChats);
      if (Array.isArray(parsed)) parsedChats = parsed;
    } catch {
      // The exact unreadable value remains in the recovery snapshot.
    }
  }
  const existing = await loadChats({ includeDeleted: true });
  const existingIds = new Set(existing.map((chat) => chat.id));
  const migrated = parsedChats
    .map((chat, index) => normalizeLegacyChat(chat, index, deviceId))
    .filter((chat) => !existingIds.has(chat.id));
  if (migrated.length) await saveChats(migrated);

  let keySecured = false;
  if (legacyKey) {
    await saveSecret("openrouter-api-key", legacyKey);
    const verified = await loadSecret("openrouter-api-key");
    if (verified !== legacyKey) {
      throw new Error("The API key migration could not be verified. The original was kept.");
    }
    localStorage.removeItem(LEGACY.key);
    keySecured = true;
  }
  if (rawHealth) {
    try {
      await setSetting("model-health", JSON.parse(rawHealth));
    } catch {
      // Recovery snapshot is authoritative when JSON is damaged.
    }
  }
  if (rawModels) {
    try {
      await setSetting("cached-text-models", JSON.parse(rawModels));
    } catch {
      // Recovery snapshot is authoritative when JSON is damaged.
    }
  }
  await setSetting("legacy-migration-v4", {
    completedAt: Date.now(),
    recoveryId,
    migratedChats: migrated.length,
    keySecured,
  });

  // The old conversation entry deliberately stays in localStorage as an emergency fallback.
  return {
    migratedChats: migrated.length,
    keySecured,
    recoveryId,
    alreadyComplete: false,
  };
}

type BackupAsset = Omit<MediaAsset, "blob"> & { dataUrl?: string };

type Backup = {
  format: "limitless-ai-backup";
  version: 4 | 5;
  exportedAt: string;
  chats: Chat[];
  media: MediaJob[];
  assets?: BackupAsset[];
  projects?: MediaProject[];
  versions?: ProjectVersion[];
  memory?: MemoryItem[];
  settings: Record<string, unknown>;
  note: string;
};

export async function exportBackup(): Promise<Blob> {
  const [chats, media, storedAssets, projects, versions, memory] = await Promise.all([
    loadChats({ includeDeleted: true }),
    loadMediaJobs({ includeDeleted: true }),
    loadAssets({ includeDeleted: true }),
    loadProjects({ includeDeleted: true }),
    getAll<ProjectVersion>("versions"),
    loadMemory({ includeDeleted: true }),
  ]);
  const assets: BackupAsset[] = [];
  for (const asset of storedAssets) {
    const { blob, ...metadata } = asset;
    assets.push({
      ...metadata,
      dataUrl: blob ? await blobToDataUrl(blob) : asset.dataUrl,
    });
  }
  const settingsEntries = await getAll<KeyValue>("kv");
  const excluded = new Set(["legacy-migration-v4"]);
  const settings = Object.fromEntries(
    settingsEntries.filter((entry) => !excluded.has(entry.key)).map((entry) => [entry.key, entry.value]),
  );
  const backup: Backup = {
    format: "limitless-ai-backup",
    version: 5,
    exportedAt: new Date().toISOString(),
    chats,
    media,
    assets,
    projects,
    versions,
    memory,
    settings,
    note: "Encrypted API keys and device-vault data are intentionally excluded.",
  };
  return new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
}

export async function importBackup(file: File): Promise<{
  chats: number;
  media: number;
  assets: number;
  projects: number;
  versions: number;
  memory: number;
  conflicts: number;
}> {
  const parsed = JSON.parse(await file.text()) as Partial<Backup>;
  if (parsed.format !== "limitless-ai-backup" || !Array.isArray(parsed.chats)) {
    throw new Error("This is not a valid Limitless AI backup.");
  }
  const deviceId = await getDeviceId();
  const existingChats = await loadChats({ includeDeleted: true });
  const existingMap = new Map(existingChats.map((chat) => [chat.id, chat]));
  let conflicts = 0;
  const incomingChats: Chat[] = [];
  parsed.chats.forEach((raw, index) => {
    const incoming = normalizeLegacyChat(raw, index, deviceId);
    const current = existingMap.get(incoming.id);
    if (
      !current ||
      incoming.revision > current.revision ||
      (incoming.revision === current.revision &&
        incoming.updatedAt > current.updatedAt &&
        JSON.stringify(current.messages) === JSON.stringify(incoming.messages))
    ) {
      incomingChats.push(incoming);
      return;
    }
    if (
      incoming.revision === current.revision &&
      JSON.stringify(current.messages) !== JSON.stringify(incoming.messages)
    ) {
      conflicts += 1;
      incomingChats.push({
        ...incoming,
        id: uid(),
        title: `${incoming.title} (Recovered import)`,
        recoveredFrom: incoming.id,
        deviceId,
        revision: 1,
        updatedAt: Date.now(),
      });
    }
  });
  if (incomingChats.length) await saveChats(incomingChats);

  const incomingWins = (
    current: { revision: number; updatedAt: number } | undefined,
    incoming: { revision: number; updatedAt: number },
  ) =>
    !current ||
    incoming.revision > current.revision ||
    (incoming.revision === current.revision && incoming.updatedAt > current.updatedAt);

  const media = Array.isArray(parsed.media) ? parsed.media : [];
  const existingMedia = new Map(
    (await loadMediaJobs({ includeDeleted: true })).map((job) => [job.id, job]),
  );
  let importedMedia = 0;
  for (const raw of media) {
    const job = { ...raw, deviceId: raw.deviceId || deviceId };
    const current = existingMedia.get(job.id);
    if (
      current &&
      job.revision === current.revision &&
      JSON.stringify(job) !== JSON.stringify(current)
    ) {
      await saveMediaJob({
        ...job,
        id: uid(),
        routeLabel: `${job.routeLabel || job.provider} · recovered import`,
        revision: 1,
        deviceId,
        updatedAt: Date.now(),
      });
      importedMedia += 1;
      conflicts += 1;
    } else if (incomingWins(current, job)) {
      await saveMediaJob(job);
      importedMedia += 1;
    }
  }

  const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
  const existingAssets = new Map(
    (await loadAssets({ includeDeleted: true })).map((asset) => [asset.id, asset]),
  );
  let importedAssets = 0;
  for (const raw of assets) {
    const blob = raw.dataUrl ? dataUrlToBlob(raw.dataUrl) : undefined;
    const asset: MediaAsset = {
      ...raw,
      dataUrl: undefined,
      blob,
      deviceId: raw.deviceId || deviceId,
      size: blob?.size || raw.size || 0,
    };
    const current = existingAssets.get(asset.id);
    if (incomingWins(current, asset)) {
      await saveAsset({
        ...asset,
        blob: asset.blob || current?.blob,
        remoteUrl: asset.remoteUrl || current?.remoteUrl,
        size: asset.blob?.size || current?.blob?.size || asset.size,
      });
      importedAssets += 1;
    }
  }

  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const existingProjects = new Map(
    (await loadProjects({ includeDeleted: true })).map((project) => [project.id, project]),
  );
  const projectIdRemap = new Map<string, string>();
  let importedProjects = 0;
  for (const raw of projects) {
    const project = { ...raw, deviceId: raw.deviceId || deviceId };
    const current = existingProjects.get(project.id);
    if (
      current &&
      project.revision === current.revision &&
      JSON.stringify({
        name: project.name,
        data: project.data,
        assetIds: project.assetIds,
        deletedAt: project.deletedAt,
      }) !==
        JSON.stringify({
          name: current.name,
          data: current.data,
          assetIds: current.assetIds,
          deletedAt: current.deletedAt,
        })
    ) {
      const recoveredId = uid();
      projectIdRemap.set(project.id, recoveredId);
      await saveProject({
        ...project,
        id: recoveredId,
        name: `${project.name} (Recovered import)`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      importedProjects += 1;
      conflicts += 1;
    } else if (incomingWins(current, project)) {
      await saveProject(project);
      importedProjects += 1;
    }
  }

  const memory = Array.isArray(parsed.memory) ? parsed.memory : [];
  const existingMemory = new Map(
    (await loadMemory({ includeDeleted: true })).map((item) => [item.id, item]),
  );
  let importedMemory = 0;
  for (const raw of memory) {
    const item = { ...raw, deviceId: raw.deviceId || deviceId };
    const current = existingMemory.get(item.id);
    if (
      current &&
      item.revision === current.revision &&
      JSON.stringify({
        text: item.text,
        category: item.category,
        pinned: item.pinned,
        deletedAt: item.deletedAt,
      }) !==
        JSON.stringify({
          text: current.text,
          category: current.category,
          pinned: current.pinned,
          deletedAt: current.deletedAt,
        })
    ) {
      await saveMemoryItem({
        ...item,
        id: uid(),
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      importedMemory += 1;
      conflicts += 1;
    } else if (incomingWins(current, item)) {
      await saveMemoryItem(item);
      importedMemory += 1;
    }
  }

  const versions = Array.isArray(parsed.versions) ? parsed.versions : [];
  const existingVersionIds = new Set(
    (await loadAllProjectVersions()).map((version) => version.id),
  );
  let importedVersions = 0;
  for (const raw of versions) {
    const remappedProjectId = projectIdRemap.get(raw.projectId);
    const version = remappedProjectId
      ? {
          ...raw,
          id: uid(),
          projectId: remappedProjectId,
          project: {
            ...raw.project,
            id: remappedProjectId,
            name: `${raw.project.name} (Recovered import)`,
            deviceId,
          },
        }
      : raw;
    if (!existingVersionIds.has(version.id)) {
      await saveProjectVersionRecord(version);
      existingVersionIds.add(version.id);
      importedVersions += 1;
    }
  }
  if (parsed.settings && typeof parsed.settings === "object") {
    for (const [key, value] of Object.entries(parsed.settings)) {
      if (key !== "device-id") await setSetting(key, value);
    }
  }
  return {
    chats: incomingChats.length,
    media: importedMedia,
    assets: importedAssets,
    projects: importedProjects,
    versions: importedVersions,
    memory: importedMemory,
    conflicts,
  };
}

export async function ensureFirstChat(): Promise<Chat[]> {
  const chats = await loadChats();
  if (chats.length) return chats;
  const chat = newChat(await getDeviceId());
  await saveChat(chat);
  return [chat];
}

export async function recoverySnapshotCount(): Promise<number> {
  return (await getAll<RecoveryRecord>("recovery")).length;
}
