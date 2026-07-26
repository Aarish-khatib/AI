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
import { artifactVersion } from "@/lib/artifacts/model";
import type {
  Artifact,
  ArtifactAsset,
  ArtifactExport,
  ArtifactType,
  ArtifactVersion,
} from "@/lib/artifacts/types";
import { createIntegrity, verifyIntegrity } from "@/lib/integrity.mjs";
import { decideRevisionMerge } from "@/lib/revision-protocol.mjs";
import {
  ANONYMOUS_WORKSPACE,
  databaseNameForWorkspace,
  settingMayCrossWorkspace,
  workspaceScopeForUser,
} from "@/lib/workspace-scope.mjs";

const DB_VERSION = 7;
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
  | "artifacts"
  | "artifactVersions"
  | "artifactExports"
  | "artifactAssets"
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
type IntegrityRecord = { algorithm: "SHA-256"; digest: string };

export type MigrationResult = {
  migratedChats: number;
  keySecured: boolean;
  recoveryId?: string;
  alreadyComplete: boolean;
};

let activeWorkspaceScope = ANONYMOUS_WORKSPACE;
const databasePromises = new Map<string, Promise<IDBDatabase>>();

function databaseForScope(scope: string): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support IndexedDB."));
  }
  const databaseName = databaseNameForWorkspace(scope);
  if (!databasePromises.has(databaseName)) {
    databasePromises.set(databaseName, new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, DB_VERSION);
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
        if (!db.objectStoreNames.contains("artifacts")) {
          const store = db.createObjectStore("artifacts", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("type", "type");
          store.createIndex("deletedAt", "deletedAt");
        }
        if (!db.objectStoreNames.contains("artifactVersions")) {
          const store = db.createObjectStore("artifactVersions", { keyPath: "id" });
          store.createIndex("artifactId", "artifactId");
          store.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("artifactExports")) {
          const store = db.createObjectStore("artifactExports", { keyPath: "id" });
          store.createIndex("artifactId", "artifactId");
          store.createIndex("status", "status");
          store.createIndex("updatedAt", "updatedAt");
          store.createIndex("deletedAt", "deletedAt");
        }
        if (!db.objectStoreNames.contains("artifactAssets")) {
          const store = db.createObjectStore("artifactAssets", { keyPath: "id" });
          store.createIndex("artifactId", "artifactId");
          store.createIndex("updatedAt", "updatedAt");
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
    }));
  }
  return databasePromises.get(databaseName)!;
}

function database(): Promise<IDBDatabase> {
  return databaseForScope(activeWorkspaceScope);
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void,
  scope = activeWorkspaceScope,
): Promise<T | undefined> {
  const db = await databaseForScope(scope);
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

async function getAllForScope<T>(scope: string, storeName: StoreName): Promise<T[]> {
  return (await withStore<T[]>(storeName, "readonly", (store) => store.getAll(), scope)) || [];
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

export function getActiveWorkspaceScope(): string {
  return activeWorkspaceScope;
}

async function saveMissingRecordsForScope<T extends { id: string }>(
  scope: string,
  storeName: Exclude<StoreName, "kv" | "vault" | "recovery" | "outbox">,
  records: T[],
): Promise<number> {
  if (!records.length) return 0;
  const existing = new Set(
    (await getAllForScope<T>(scope, storeName)).map((record) => record.id),
  );
  const missing = records.filter((record) => !existing.has(record.id));
  if (!missing.length) return 0;
  const db = await databaseForScope(scope);
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    missing.forEach((record) => store.put(record));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error(`Unable to import ${storeName}.`));
    transaction.onabort = () =>
      reject(transaction.error || new Error(`${storeName} import was cancelled.`));
  });
  return missing.length;
}

export async function activateWorkspace(
  userId?: string | null,
  options: { importAnonymous?: boolean } = {},
): Promise<{ scope: string; imported: number; secretsCopied: false }> {
  const scope = workspaceScopeForUser(userId);
  await databaseForScope(scope);
  activeWorkspaceScope = scope;
  if (scope === ANONYMOUS_WORKSPACE || options.importAnonymous === false) {
    return { scope, imported: 0, secretsCopied: false };
  }

  const marker = await getSetting<{ completedAt: number } | false>(
    "anonymous-import-v2",
    false,
  );
  if (marker) return { scope, imported: 0, secretsCopied: false };

  const [
    chats,
    media,
    assets,
    projects,
    versions,
    memory,
    artifacts,
    artifactVersions,
    artifactExports,
    artifactAssets,
    sourceSettings,
  ] =
    await Promise.all([
      getAllForScope<Chat>(ANONYMOUS_WORKSPACE, "chats"),
      getAllForScope<MediaJob>(ANONYMOUS_WORKSPACE, "media"),
      getAllForScope<MediaAsset>(ANONYMOUS_WORKSPACE, "assets"),
      getAllForScope<MediaProject>(ANONYMOUS_WORKSPACE, "projects"),
      getAllForScope<ProjectVersion>(ANONYMOUS_WORKSPACE, "versions"),
      getAllForScope<MemoryItem>(ANONYMOUS_WORKSPACE, "memory"),
      getAllForScope<Artifact>(ANONYMOUS_WORKSPACE, "artifacts"),
      getAllForScope<ArtifactVersion>(ANONYMOUS_WORKSPACE, "artifactVersions"),
      getAllForScope<ArtifactExport>(ANONYMOUS_WORKSPACE, "artifactExports"),
      getAllForScope<ArtifactAsset>(ANONYMOUS_WORKSPACE, "artifactAssets"),
      getAllForScope<KeyValue>(ANONYMOUS_WORKSPACE, "kv"),
    ]);
  const counts = await Promise.all([
    saveMissingRecordsForScope(scope, "chats", chats),
    saveMissingRecordsForScope(scope, "media", media),
    saveMissingRecordsForScope(scope, "assets", assets),
    saveMissingRecordsForScope(scope, "projects", projects),
    saveMissingRecordsForScope(scope, "versions", versions),
    saveMissingRecordsForScope(scope, "memory", memory),
    saveMissingRecordsForScope(
      scope,
      "artifacts",
      artifacts.map((artifact) => ({ ...artifact, ownerId: scope })),
    ),
    saveMissingRecordsForScope(
      scope,
      "artifactVersions",
      artifactVersions.map((version) => ({ ...version, ownerId: scope })),
    ),
    saveMissingRecordsForScope(
      scope,
      "artifactExports",
      artifactExports.map((item) => ({ ...item, ownerId: scope })),
    ),
    saveMissingRecordsForScope(
      scope,
      "artifactAssets",
      artifactAssets.map((asset) => ({ ...asset, ownerId: scope })),
    ),
  ]);
  const targetSettings = new Set(
    (await getAllForScope<KeyValue>(scope, "kv")).map((entry) => entry.key),
  );
  for (const entry of sourceSettings) {
    if (!settingMayCrossWorkspace(entry.key) || targetSettings.has(entry.key)) continue;
    await withStore(
      "kv",
      "readwrite",
      (store) => store.put({ ...entry, updatedAt: Date.now() }),
      scope,
    );
  }
  const imported = counts.reduce((sum, count) => sum + count, 0);
  await setSetting("anonymous-import-v2", {
    completedAt: Date.now(),
    imported,
    source: ANONYMOUS_WORKSPACE,
    secretsCopied: false,
  });
  return { scope, imported, secretsCopied: false };
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

function assertArtifactOwner(ownerId: string): void {
  if (ownerId !== activeWorkspaceScope) {
    throw new Error("This artifact belongs to a different local workspace.");
  }
}

export async function loadArtifacts(options?: {
  includeDeleted?: boolean;
  type?: ArtifactType;
}): Promise<Artifact[]> {
  const artifacts = await getAll<Artifact>("artifacts");
  return artifacts
    .filter(
      (artifact) =>
        artifact.ownerId === activeWorkspaceScope &&
        (options?.includeDeleted || !artifact.deletedAt) &&
        (!options?.type || artifact.type === options.type),
    )
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getArtifact(id: string): Promise<Artifact | undefined> {
  const artifact = await withStore<Artifact>("artifacts", "readonly", (store) =>
    store.get(id),
  );
  return artifact?.ownerId === activeWorkspaceScope ? artifact : undefined;
}

export async function saveArtifact(artifact: Artifact): Promise<void> {
  assertArtifactOwner(artifact.ownerId);
  await withStore("artifacts", "readwrite", (store) => store.put(artifact));
}

export async function loadArtifactVersions(
  artifactId: string,
): Promise<ArtifactVersion[]> {
  return (await getAll<ArtifactVersion>("artifactVersions"))
    .filter(
      (version) =>
        version.artifactId === artifactId &&
        version.ownerId === activeWorkspaceScope,
    )
    .sort(
      (left, right) =>
        right.versionNumber - left.versionNumber ||
        right.createdAt - left.createdAt,
    );
}

export async function loadAllArtifactVersions(): Promise<ArtifactVersion[]> {
  return (await getAll<ArtifactVersion>("artifactVersions"))
    .filter((version) => version.ownerId === activeWorkspaceScope)
    .sort((left, right) => right.createdAt - left.createdAt);
}

export async function saveArtifactVersionRecord(
  version: ArtifactVersion,
): Promise<void> {
  assertArtifactOwner(version.ownerId);
  await withStore("artifactVersions", "readwrite", (store) =>
    store.put(version),
  );
}

export async function checkpointArtifact(
  source: Artifact,
  reason: ArtifactVersion["reason"],
  label?: string,
): Promise<{ artifact: Artifact; version: ArtifactVersion }> {
  assertArtifactOwner(source.ownerId);
  const previous = await loadArtifactVersions(source.id);
  const nextNumber = Math.max(0, ...previous.map((item) => item.versionNumber)) + 1;
  const version = artifactVersion(source, nextNumber, reason, label);
  const artifact: Artifact = {
    ...source,
    currentVersionId: version.id,
    autosaveState: "saved",
  };
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      ["artifacts", "artifactVersions"],
      "readwrite",
    );
    transaction.objectStore("artifacts").put(artifact);
    transaction.objectStore("artifactVersions").put(version);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("Unable to checkpoint the artifact."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("Artifact checkpoint cancelled."));
  });
  for (const old of previous.slice(99)) {
    await withStore("artifactVersions", "readwrite", (store) =>
      store.delete(old.id),
    );
  }
  return { artifact, version };
}

export async function restoreArtifactVersion(
  current: Artifact,
  source: ArtifactVersion,
  deviceId: string,
): Promise<{ artifact: Artifact; version: ArtifactVersion }> {
  assertArtifactOwner(current.ownerId);
  if (
    source.ownerId !== current.ownerId ||
    source.artifactId !== current.id
  ) {
    throw new Error("The selected version does not belong to this artifact.");
  }
  const restored: Artifact = {
    ...current,
    title: source.title,
    type: source.type,
    content: structuredClone(source.content),
    thumbnail: source.thumbnail
      ? structuredClone(source.thumbnail)
      : current.thumbnail,
    importReport: source.importReport
      ? structuredClone(source.importReport)
      : undefined,
    assetIds: [...source.assetIds],
    updatedAt: Date.now(),
    revision: current.revision + 1,
    deviceId,
    deletedAt: undefined,
    autosaveState: "saved",
    exportState: "idle",
  };
  return checkpointArtifact(
    restored,
    "restore",
    `Restored version ${source.versionNumber}`,
  );
}

export async function tombstoneArtifact(
  artifact: Artifact,
  deviceId: string,
): Promise<Artifact> {
  assertArtifactOwner(artifact.ownerId);
  const removed: Artifact = {
    ...artifact,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    revision: artifact.revision + 1,
    deviceId,
    autosaveState: "saved",
  };
  return (await checkpointArtifact(removed, "manual", "Moved to recovery"))
    .artifact;
}

export async function recoverArtifact(
  artifact: Artifact,
  deviceId: string,
): Promise<Artifact> {
  assertArtifactOwner(artifact.ownerId);
  const recovered: Artifact = {
    ...artifact,
    deletedAt: undefined,
    updatedAt: Date.now(),
    revision: artifact.revision + 1,
    deviceId,
    autosaveState: "saved",
  };
  return (await checkpointArtifact(recovered, "restore", "Recovered from trash"))
    .artifact;
}

export async function loadArtifactExports(options?: {
  artifactId?: string;
  includeDeleted?: boolean;
}): Promise<ArtifactExport[]> {
  return (await getAll<ArtifactExport>("artifactExports"))
    .filter(
      (item) =>
        item.ownerId === activeWorkspaceScope &&
        (!options?.artifactId || item.artifactId === options.artifactId) &&
        (options?.includeDeleted || !item.deletedAt),
    )
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function saveArtifactExport(item: ArtifactExport): Promise<void> {
  assertArtifactOwner(item.ownerId);
  await withStore("artifactExports", "readwrite", (store) => store.put(item));
}

export async function loadArtifactAssets(options?: {
  artifactId?: string;
  includeDeleted?: boolean;
}): Promise<ArtifactAsset[]> {
  return (await getAll<ArtifactAsset>("artifactAssets"))
    .filter(
      (asset) =>
        asset.ownerId === activeWorkspaceScope &&
        (!options?.artifactId || asset.artifactId === options.artifactId) &&
        (options?.includeDeleted || !asset.deletedAt),
    )
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function saveArtifactAsset(asset: ArtifactAsset): Promise<void> {
  assertArtifactOwner(asset.ownerId);
  await withStore("artifactAssets", "readwrite", (store) => store.put(asset));
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
  if (activeWorkspaceScope !== ANONYMOUS_WORKSPACE) {
    return { migratedChats: 0, keySecured: false, alreadyComplete: true };
  }
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
type BackupArtifactAsset = Omit<ArtifactAsset, "blob"> & { dataUrl?: string };
type BackupArtifactExport = Omit<ArtifactExport, "blob"> & { dataUrl?: string };

type Backup = {
  format: "limitless-ai-backup";
  version: 4 | 5 | 6 | 7 | 10;
  exportedAt: string;
  workspaceScope?: string;
  chats: Chat[];
  media: MediaJob[];
  assets?: BackupAsset[];
  projects?: MediaProject[];
  versions?: ProjectVersion[];
  memory?: MemoryItem[];
  artifacts?: Artifact[];
  artifactVersions?: ArtifactVersion[];
  artifactExports?: BackupArtifactExport[];
  artifactAssets?: BackupArtifactAsset[];
  settings: Record<string, unknown>;
  note: string;
  integrity?: IntegrityRecord;
};

export async function exportBackup(): Promise<Blob> {
  const [
    chats,
    media,
    storedAssets,
    projects,
    versions,
    memory,
    artifacts,
    artifactVersions,
    storedArtifactExports,
    storedArtifactAssets,
  ] = await Promise.all([
    loadChats({ includeDeleted: true }),
    loadMediaJobs({ includeDeleted: true }),
    loadAssets({ includeDeleted: true }),
    loadProjects({ includeDeleted: true }),
    getAll<ProjectVersion>("versions"),
    loadMemory({ includeDeleted: true }),
    loadArtifacts({ includeDeleted: true }),
    loadAllArtifactVersions(),
    loadArtifactExports({ includeDeleted: true }),
    loadArtifactAssets({ includeDeleted: true }),
  ]);
  const assets: BackupAsset[] = [];
  for (const asset of storedAssets) {
    const { blob, ...metadata } = asset;
    assets.push({
      ...metadata,
      dataUrl: blob ? await blobToDataUrl(blob) : asset.dataUrl,
    });
  }
  const artifactExports: BackupArtifactExport[] = [];
  for (const item of storedArtifactExports) {
    const { blob, ...metadata } = item;
    artifactExports.push({
      ...metadata,
      downloadUrl: undefined,
      dataUrl: blob ? await blobToDataUrl(blob) : item.dataUrl,
    });
  }
  const artifactAssets: BackupArtifactAsset[] = [];
  for (const item of storedArtifactAssets) {
    const { blob, ...metadata } = item;
    artifactAssets.push({
      ...metadata,
      downloadUrl: undefined,
      dataUrl: blob ? await blobToDataUrl(blob) : item.dataUrl,
    });
  }
  const settingsEntries = await getAll<KeyValue>("kv");
  const settings = Object.fromEntries(
    settingsEntries
      .filter((entry) => settingMayCrossWorkspace(entry.key))
      .map((entry) => [entry.key, entry.value]),
  );
  const unsigned: Backup = {
    format: "limitless-ai-backup",
    version: 10,
    exportedAt: new Date().toISOString(),
    workspaceScope:
      activeWorkspaceScope === ANONYMOUS_WORKSPACE ? "anonymous" : "authenticated",
    chats,
    media,
    assets,
    projects,
    versions,
    memory,
    artifacts,
    artifactVersions,
    artifactExports,
    artifactAssets,
    settings,
    note: "Encrypted API keys and device-vault data are intentionally excluded.",
  };
  const backup: Backup = {
    ...unsigned,
    integrity: createIntegrity(unsigned) as IntegrityRecord,
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
  artifacts: number;
  artifactVersions: number;
  artifactExports: number;
  artifactAssets: number;
  conflicts: number;
}> {
  const parsed = JSON.parse(await file.text()) as Partial<Backup>;
  if (
    parsed.format !== "limitless-ai-backup" ||
    ![4, 5, 6, 7, 10].includes(Number(parsed.version)) ||
    !Array.isArray(parsed.chats)
  ) {
    throw new Error("This is not a valid Limitless AI backup.");
  }
  if (parsed.version === 6 || parsed.version === 7 || parsed.version === 10) {
    const { integrity, ...unsigned } = parsed;
    if (!verifyIntegrity(unsigned, integrity)) {
      throw new Error("Backup integrity verification failed. Nothing was changed.");
    }
  }
  const deviceId = await getDeviceId();
  const existingChats = await loadChats({ includeDeleted: true });
  const existingMap = new Map(existingChats.map((chat) => [chat.id, chat]));
  let conflicts = 0;
  const incomingChats: Chat[] = [];
  parsed.chats.forEach((raw, index) => {
    const incoming = normalizeLegacyChat(raw, index, deviceId);
    const current = existingMap.get(incoming.id);
    const decision = decideRevisionMerge(
      current,
      incoming,
      (left, right) =>
        JSON.stringify((left as Chat).messages) === JSON.stringify((right as Chat).messages),
    );
    if (decision === "insert") {
      incomingChats.push(incoming);
      return;
    }
    if (decision === "replace-and-recover-local" && current) {
      conflicts += 1;
      incomingChats.push({
        ...current,
        id: uid(),
        title: `${current.title} (Recovered before import)`,
        recoveredFrom: current.id,
        deviceId,
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      incomingChats.push(incoming);
      return;
    }
    if (decision === "preserve-branch") {
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

  const media = Array.isArray(parsed.media) ? parsed.media : [];
  const existingMedia = new Map(
    (await loadMediaJobs({ includeDeleted: true })).map((job) => [job.id, job]),
  );
  let importedMedia = 0;
  for (const raw of media) {
    const job = { ...raw, deviceId: raw.deviceId || deviceId };
    const current = existingMedia.get(job.id);
    const decision = decideRevisionMerge(current, job);
    if (decision === "preserve-branch") {
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
    } else if (decision === "replace-and-recover-local" && current) {
      await saveMediaJob({
        ...current,
        id: uid(),
        routeLabel: `${current.routeLabel || current.provider} · recovered before import`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await saveMediaJob(job);
      importedMedia += 2;
      conflicts += 1;
    } else if (decision === "insert") {
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
    const decision = decideRevisionMerge(current, asset);
    if (decision === "preserve-branch") {
      await saveAsset({
        ...asset,
        id: uid(),
        name: `${asset.name} (Recovered import)`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      importedAssets += 1;
      conflicts += 1;
    } else if (decision === "replace-and-recover-local" && current) {
      await saveAsset({
        ...current,
        id: uid(),
        name: `${current.name} (Recovered before import)`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await saveAsset({
        ...asset,
        blob: asset.blob || current?.blob,
        remoteUrl: asset.remoteUrl || current?.remoteUrl,
        size: asset.blob?.size || current?.blob?.size || asset.size,
      });
      importedAssets += 2;
      conflicts += 1;
    } else if (decision === "insert") {
      await saveAsset(asset);
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
    const decision = decideRevisionMerge(current, project);
    if (decision === "preserve-branch") {
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
    } else if (decision === "replace-and-recover-local" && current) {
      const recoveredId = uid();
      await saveProject({
        ...current,
        id: recoveredId,
        name: `${current.name} (Recovered before import)`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await saveProject(project);
      importedProjects += 2;
      conflicts += 1;
    } else if (decision === "insert") {
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
    const decision = decideRevisionMerge(current, item);
    if (decision === "preserve-branch") {
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
    } else if (decision === "replace-and-recover-local" && current) {
      await saveMemoryItem({
        ...current,
        id: uid(),
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await saveMemoryItem(item);
      importedMemory += 2;
      conflicts += 1;
    } else if (decision === "insert") {
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

  const importedArtifactRecords = Array.isArray(parsed.artifacts)
    ? parsed.artifacts
    : [];
  const existingArtifacts = new Map(
    (await loadArtifacts({ includeDeleted: true })).map((artifact) => [
      artifact.id,
      artifact,
    ]),
  );
  const artifactIdRemap = new Map<string, string>();
  let importedArtifacts = 0;
  for (const raw of importedArtifactRecords) {
    const artifact: Artifact = {
      ...raw,
      ownerId: activeWorkspaceScope,
      deviceId: raw.deviceId || deviceId,
    };
    const current = existingArtifacts.get(artifact.id);
    const decision = decideRevisionMerge(
      current,
      artifact,
      (left, right) =>
        JSON.stringify({
          title: (left as Artifact).title,
          content: (left as Artifact).content,
        }) ===
        JSON.stringify({
          title: (right as Artifact).title,
          content: (right as Artifact).content,
        }),
    );
    if (decision === "preserve-branch") {
      const recoveredId = uid();
      artifactIdRemap.set(artifact.id, recoveredId);
      const recovered: Artifact = {
        ...artifact,
        id: recoveredId,
        title: `${artifact.title} (Recovered import)`,
        currentVersionId: undefined,
        recoveredFrom: artifact.id,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await checkpointArtifact(recovered, "import", "Recovered import branch");
      importedArtifacts += 1;
      conflicts += 1;
    } else if (decision === "replace-and-recover-local" && current) {
      const recovered: Artifact = {
        ...current,
        id: uid(),
        title: `${current.title} (Recovered before import)`,
        currentVersionId: undefined,
        recoveredFrom: current.id,
        ownerId: activeWorkspaceScope,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await checkpointArtifact(recovered, "import", "Recovered before import");
      await saveArtifact(artifact);
      importedArtifacts += 2;
      conflicts += 1;
    } else if (decision === "insert") {
      await saveArtifact(artifact);
      importedArtifacts += 1;
    }
  }

  const importedArtifactVersionRecords = Array.isArray(parsed.artifactVersions)
    ? parsed.artifactVersions
    : [];
  const existingArtifactVersionIds = new Set(
    (await loadAllArtifactVersions()).map((version) => version.id),
  );
  let importedArtifactVersions = 0;
  for (const raw of importedArtifactVersionRecords) {
    const remappedArtifactId = artifactIdRemap.get(raw.artifactId);
    const version: ArtifactVersion = {
      ...raw,
      id: remappedArtifactId ? uid() : raw.id,
      artifactId: remappedArtifactId || raw.artifactId,
      ownerId: activeWorkspaceScope,
      deviceId: raw.deviceId || deviceId,
    };
    if (!existingArtifactVersionIds.has(version.id)) {
      await saveArtifactVersionRecord(version);
      existingArtifactVersionIds.add(version.id);
      importedArtifactVersions += 1;
    }
  }

  const importedArtifactExportRecords = Array.isArray(parsed.artifactExports)
    ? parsed.artifactExports
    : [];
  const existingArtifactExports = new Map(
    (
      await loadArtifactExports({
        includeDeleted: true,
      })
    ).map((item) => [item.id, item]),
  );
  let importedArtifactExports = 0;
  for (const raw of importedArtifactExportRecords) {
    const blob = raw.dataUrl ? dataUrlToBlob(raw.dataUrl) : undefined;
    const item: ArtifactExport = {
      ...raw,
      id: raw.id,
      artifactId: artifactIdRemap.get(raw.artifactId) || raw.artifactId,
      ownerId: activeWorkspaceScope,
      dataUrl: undefined,
      downloadUrl: undefined,
      blob,
      size: blob?.size || raw.size || 0,
      deviceId: raw.deviceId || deviceId,
    };
    const current = existingArtifactExports.get(item.id);
    const decision = decideRevisionMerge(current, item);
    if (decision === "preserve-branch") {
      await saveArtifactExport({
        ...item,
        id: uid(),
        fileName: `${item.fileName} (Recovered import)`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      importedArtifactExports += 1;
      conflicts += 1;
    } else if (decision === "replace-and-recover-local" && current) {
      await saveArtifactExport({
        ...current,
        id: uid(),
        fileName: `${current.fileName} (Recovered before import)`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await saveArtifactExport({
        ...item,
        blob: item.blob || current.blob,
        size: item.blob?.size || current.blob?.size || item.size,
      });
      importedArtifactExports += 2;
      conflicts += 1;
    } else if (decision === "insert") {
      await saveArtifactExport(item);
      importedArtifactExports += 1;
    }
  }

  const importedArtifactAssetRecords = Array.isArray(parsed.artifactAssets)
    ? parsed.artifactAssets
    : [];
  const existingArtifactAssets = new Map(
    (
      await loadArtifactAssets({
        includeDeleted: true,
      })
    ).map((item) => [item.id, item]),
  );
  let importedArtifactAssets = 0;
  for (const raw of importedArtifactAssetRecords) {
    const blob = raw.dataUrl ? dataUrlToBlob(raw.dataUrl) : undefined;
    const item: ArtifactAsset = {
      ...raw,
      artifactId: artifactIdRemap.get(raw.artifactId) || raw.artifactId,
      ownerId: activeWorkspaceScope,
      dataUrl: undefined,
      downloadUrl: undefined,
      blob,
      size: blob?.size || raw.size || 0,
      deviceId: raw.deviceId || deviceId,
    };
    const current = existingArtifactAssets.get(item.id);
    const decision = decideRevisionMerge(current, item);
    if (decision === "preserve-branch") {
      await saveArtifactAsset({
        ...item,
        id: uid(),
        name: `${item.name} (Recovered import)`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      importedArtifactAssets += 1;
      conflicts += 1;
    } else if (decision === "replace-and-recover-local" && current) {
      await saveArtifactAsset({
        ...current,
        id: uid(),
        name: `${current.name} (Recovered before import)`,
        revision: 1,
        deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await saveArtifactAsset({
        ...item,
        blob: item.blob || current.blob,
        size: item.blob?.size || current.blob?.size || item.size,
      });
      importedArtifactAssets += 2;
      conflicts += 1;
    } else if (decision === "insert") {
      await saveArtifactAsset(item);
      importedArtifactAssets += 1;
    }
  }

  if (parsed.settings && typeof parsed.settings === "object") {
    for (const [key, value] of Object.entries(parsed.settings)) {
      if (settingMayCrossWorkspace(key)) await setSetting(key, value);
    }
  }
  return {
    chats: incomingChats.length,
    media: importedMedia,
    assets: importedAssets,
    projects: importedProjects,
    versions: importedVersions,
    memory: importedMemory,
    artifacts: importedArtifacts,
    artifactVersions: importedArtifactVersions,
    artifactExports: importedArtifactExports,
    artifactAssets: importedArtifactAssets,
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
