"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  loadAllArtifactVersions,
  loadAssets,
  loadArtifactAssets,
  loadArtifactExports,
  loadArtifacts,
  loadAllProjectVersions,
  loadChats,
  loadMediaJobs,
  loadMemory,
  loadProjects,
  saveAsset,
  saveArtifact,
  saveArtifactAsset,
  saveArtifactExport,
  saveArtifactVersionRecord,
  saveChat,
  saveMediaJob,
  saveMemoryItem,
  saveProject,
  saveProjectVersionRecord,
  setSetting,
} from "@/lib/local-store";
import type {
  Artifact,
  ArtifactAsset,
  ArtifactExport,
  ArtifactVersion,
} from "@/lib/artifacts/types";
import type {
  Attachment,
  Chat,
  MediaAsset,
  MediaJob,
  MediaOutput,
  MediaProject,
  MemoryItem,
  ProjectVersion,
} from "@/lib/types";
import { uid } from "@/lib/types";
import type { FinaleState } from "@/lib/finale/contracts";
import { loadFinaleState, saveFinaleState } from "@/lib/finale/store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

let client: SupabaseClient | null = null;

export const cloudConfigured = Boolean(supabaseUrl && supabaseKey);

export function getCloudClient(): SupabaseClient | null {
  if (!cloudConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export async function getCloudUser(): Promise<User | null> {
  const supabase = getCloudClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw error;
  return data.user;
}

export async function requestMagicLink(email: string): Promise<void> {
  const supabase = getCloudClient();
  if (!supabase) throw new Error("Supabase is not configured for this deployment.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof location === "undefined" ? undefined : location.origin,
    },
  });
  if (error) throw error;
}

export async function signOutCloud(): Promise<void> {
  const supabase = getCloudClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",");
  const mime = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const bytes = Uint8Array.from(atob(encoded || ""), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}

async function signedUrl(supabase: SupabaseClient, storagePath: string): Promise<string | undefined> {
  const { data } = await supabase.storage.from("limitless-media").createSignedUrl(storagePath, 3600);
  return data?.signedUrl;
}

async function uploadAttachment(
  supabase: SupabaseClient,
  userId: string,
  ownerId: string,
  attachment: Attachment,
): Promise<Attachment> {
  if (!attachment.dataUrl || attachment.storagePath) return attachment;
  const storagePath = `${userId}/attachments/${ownerId}/${attachment.id}-${safeName(attachment.name)}`;
  const { error } = await supabase.storage
    .from("limitless-media")
    .upload(storagePath, dataUrlToBlob(attachment.dataUrl), {
      contentType: attachment.type,
      upsert: true,
    });
  if (error) throw error;
  return {
    ...attachment,
    dataUrl: undefined,
    storagePath,
    remoteUrl: await signedUrl(supabase, storagePath),
  };
}

async function uploadOutput(
  supabase: SupabaseClient,
  userId: string,
  ownerId: string,
  output: MediaOutput,
): Promise<MediaOutput> {
  if (!output.dataUrl || output.storagePath) return output;
  const extension = output.mimeType?.split("/")[1] || "webp";
  const storagePath = `${userId}/generations/${ownerId}/${output.id}.${extension}`;
  const { error } = await supabase.storage
    .from("limitless-media")
    .upload(storagePath, dataUrlToBlob(output.dataUrl), {
      contentType: output.mimeType || "image/webp",
      upsert: true,
    });
  if (error) throw error;
  return {
    ...output,
    dataUrl: undefined,
    storagePath,
    url: await signedUrl(supabase, storagePath),
  };
}

async function prepareChat(supabase: SupabaseClient, userId: string, chat: Chat): Promise<Chat> {
  const messages = await Promise.all(
    chat.messages.map(async (message) => ({
      ...message,
      attachments: message.attachments
        ? await Promise.all(
            message.attachments.map((attachment) =>
              uploadAttachment(supabase, userId, chat.id, attachment),
            ),
          )
        : undefined,
    })),
  );
  return { ...chat, messages };
}

async function prepareMedia(
  supabase: SupabaseClient,
  userId: string,
  job: MediaJob,
): Promise<MediaJob> {
  const inputs = job.inputs
    ? await Promise.all(
        job.inputs.map((attachment) => uploadAttachment(supabase, userId, job.id, attachment)),
      )
    : undefined;
  const outputs = await Promise.all(
    job.outputs.map((output) => uploadOutput(supabase, userId, job.id, output)),
  );
  return { ...job, inputs, outputs };
}

async function hydrateChat(supabase: SupabaseClient, chat: Chat): Promise<Chat> {
  const messages = await Promise.all(
    chat.messages.map(async (message) => ({
      ...message,
      attachments: message.attachments
        ? await Promise.all(
            message.attachments.map(async (attachment) => ({
              ...attachment,
              remoteUrl:
                attachment.storagePath
                  ? await signedUrl(supabase, attachment.storagePath)
                  : attachment.remoteUrl,
            })),
          )
        : undefined,
    })),
  );
  return { ...chat, messages };
}

async function hydrateMedia(supabase: SupabaseClient, job: MediaJob): Promise<MediaJob> {
  const inputs = job.inputs
    ? await Promise.all(
        job.inputs.map(async (attachment) => ({
          ...attachment,
          remoteUrl:
            attachment.storagePath
              ? await signedUrl(supabase, attachment.storagePath)
              : attachment.remoteUrl,
        })),
      )
    : undefined;
  const outputs = await Promise.all(
    job.outputs.map(async (output) => ({
      ...output,
      url: output.storagePath ? await signedUrl(supabase, output.storagePath) : output.url,
    })),
  );
  return { ...job, inputs, outputs };
}

async function prepareAsset(
  supabase: SupabaseClient,
  userId: string,
  asset: MediaAsset,
): Promise<Omit<MediaAsset, "blob">> {
  const { blob, ...metadata } = asset;
  if ((!blob && !asset.dataUrl) || asset.storagePath) {
    return { ...metadata, dataUrl: undefined };
  }
  const extension =
    asset.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") ||
    asset.mimeType.split("/")[1] ||
    "bin";
  const storagePath = `${userId}/assets/${asset.id}-${safeName(asset.name)}.${extension}`;
  const body = blob || dataUrlToBlob(asset.dataUrl || "");
  const { error } = await supabase.storage
    .from("limitless-media")
    .upload(storagePath, body, {
      contentType: asset.mimeType,
      upsert: true,
    });
  if (error) throw error;
  return {
    ...metadata,
    dataUrl: undefined,
    storagePath,
    remoteUrl: undefined,
  };
}

async function hydrateAsset(
  supabase: SupabaseClient,
  asset: MediaAsset,
): Promise<MediaAsset> {
  if (!asset.storagePath) return asset;
  const remoteUrl = await signedUrl(supabase, asset.storagePath);
  const { data } = await supabase.storage.from("limitless-media").download(asset.storagePath);
  return {
    ...asset,
    blob: data || asset.blob,
    dataUrl: undefined,
    remoteUrl,
    size: data?.size || asset.size,
  };
}

async function shortSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | undefined> {
  const { data } = await supabase.storage
    .from("limitless-media")
    .createSignedUrl(storagePath, 600);
  return data?.signedUrl;
}

async function prepareArtifactExport(
  supabase: SupabaseClient,
  userId: string,
  item: ArtifactExport,
): Promise<Omit<ArtifactExport, "blob">> {
  const {
    blob,
    dataUrl,
    ...metadata
  } = item;
  if ((!blob && !dataUrl) || item.storagePath) {
    return { ...metadata, dataUrl: undefined, downloadUrl: undefined };
  }
  const storagePath = `${userId}/artifacts/${item.artifactId}/exports/${item.id}-${safeName(
    item.fileName,
  )}`;
  const body = blob || dataUrlToBlob(dataUrl || "");
  const { error } = await supabase.storage
    .from("limitless-media")
    .upload(storagePath, body, {
      contentType: item.mimeType,
      upsert: true,
    });
  if (error) throw error;
  return {
    ...metadata,
    dataUrl: undefined,
    downloadUrl: undefined,
    storagePath,
    size: body.size,
  };
}

async function hydrateArtifactExport(
  supabase: SupabaseClient,
  item: ArtifactExport,
): Promise<ArtifactExport> {
  if (!item.storagePath) return item;
  const { data, error } = await supabase.storage
    .from("limitless-media")
    .download(item.storagePath);
  if (error) throw error;
  return {
    ...item,
    blob: data || item.blob,
    dataUrl: undefined,
    downloadUrl: await shortSignedUrl(supabase, item.storagePath),
    size: data?.size || item.size,
  };
}

async function prepareArtifactAsset(
  supabase: SupabaseClient,
  userId: string,
  item: ArtifactAsset,
): Promise<Omit<ArtifactAsset, "blob">> {
  const {
    blob,
    dataUrl,
    ...metadata
  } = item;
  if ((!blob && !dataUrl) || item.storagePath) {
    return { ...metadata, dataUrl: undefined, downloadUrl: undefined };
  }
  const storagePath = `${userId}/artifacts/${item.artifactId}/assets/${item.id}-${safeName(
    item.name,
  )}`;
  const body = blob || dataUrlToBlob(dataUrl || "");
  const { error } = await supabase.storage
    .from("limitless-media")
    .upload(storagePath, body, {
      contentType: item.mimeType,
      upsert: true,
    });
  if (error) throw error;
  return {
    ...metadata,
    dataUrl: undefined,
    downloadUrl: undefined,
    storagePath,
    size: body.size,
  };
}

async function hydrateArtifactAsset(
  supabase: SupabaseClient,
  item: ArtifactAsset,
): Promise<ArtifactAsset> {
  if (!item.storagePath) return item;
  const { data, error } = await supabase.storage
    .from("limitless-media")
    .download(item.storagePath);
  if (error) throw error;
  return {
    ...item,
    blob: data || item.blob,
    dataUrl: undefined,
    downloadUrl: await shortSignedUrl(supabase, item.storagePath),
    size: data?.size || item.size,
  };
}

type CloudRow<T> = {
  id: string;
  payload: T;
  revision: number;
  device_id: string;
  updated_at: string;
  deleted_at: string | null;
};

type AtomicCloudRow<T> = CloudRow<T> & { applied: boolean };

type VersionRow = {
  id: string;
  project_id: string;
  payload: ProjectVersion;
  created_at: string;
};

type ArtifactVersionRow = {
  id: string;
  artifact_id: string;
  payload: ArtifactVersion;
  created_at: string;
};

type Revisioned = {
  id: string;
  revision: number;
  deviceId: string;
  updatedAt: number;
  deletedAt?: number;
};

type RevisionedTable =
  | "chats"
  | "media_jobs"
  | "media_assets"
  | "media_projects"
  | "memory_items"
  | "artifacts"
  | "artifact_exports"
  | "artifact_assets"
  | "platform_records";

async function atomicWrite<T extends Revisioned>(
  supabase: SupabaseClient,
  table: RevisionedTable,
  item: T,
  payload: unknown,
  expectedRevision: number | null,
): Promise<AtomicCloudRow<T>> {
  const { data, error } = await supabase.rpc("limitless_write_revisioned", {
    p_table: table,
    p_id: item.id,
    p_expected_revision: expectedRevision,
    p_payload: payload,
    p_revision: item.revision,
    p_device_id: item.deviceId,
    p_updated_at: new Date(item.updatedAt).toISOString(),
    p_deleted_at: item.deletedAt ? new Date(item.deletedAt).toISOString() : null,
  });
  if (error) {
    if (
      error.code === "PGRST202" ||
      /limitless_write_revisioned|schema cache|function/i.test(error.message || "")
    ) {
      throw new Error(
        "Cloud sync is locked until the required Limitless AI v2 migrations are installed.",
      );
    }
    throw error;
  }
  const row = (Array.isArray(data) ? data[0] : data) as AtomicCloudRow<T> | undefined;
  if (!row) throw new Error("The cloud revision check returned no authoritative record.");
  return row;
}

async function syncRevisionedCollection<T extends Revisioned>({
  supabase,
  table,
  localItems,
  remoteRows,
  prepare,
  hydrate,
  save,
  recoverConflict,
}: {
  supabase: SupabaseClient;
  table: RevisionedTable;
  localItems: T[];
  remoteRows: CloudRow<T>[];
  prepare: (item: T) => Promise<unknown>;
  hydrate: (item: T) => Promise<T>;
  save: (item: T) => Promise<void>;
  recoverConflict: (item: T) => T;
}): Promise<{ uploaded: number; downloaded: number; recovered: number }> {
  let uploaded = 0;
  let downloaded = 0;
  let recovered = 0;
  const handled = new Set<string>();
  const remoteMap = new Map(remoteRows.map((row) => [row.id, row]));
  for (const local of localItems) {
    const remote = remoteMap.get(local.id);
    if (
      remote &&
      local.revision === remote.revision &&
      !samePayload(local, remote.payload)
    ) {
      const copy = recoverConflict(local);
      await save(copy);
      const copyPayload = await prepare(copy);
      const copyResult = await atomicWrite(supabase, table, copy, copyPayload, null);
      if (!copyResult.applied) {
        throw new Error("A recovered conflict copy could not be stored safely.");
      }
      await save(await hydrate(remote.payload));
      handled.add(local.id);
      uploaded += 1;
      downloaded += 1;
      recovered += 1;
      continue;
    }
    if (!remote || local.revision > remote.revision) {
      const payload = await prepare(local);
      let result = await atomicWrite(
        supabase,
        table,
        local,
        payload,
        remote?.revision ?? null,
      );
      if (!result.applied && result.revision < local.revision) {
        result = await atomicWrite(supabase, table, local, payload, result.revision);
      }
      if (result.applied) {
        uploaded += 1;
      } else if (
        result.revision === local.revision &&
        !samePayload(local, result.payload)
      ) {
        const copy = recoverConflict(local);
        await save(copy);
        const copyResult = await atomicWrite(
          supabase,
          table,
          copy,
          await prepare(copy),
          null,
        );
        if (!copyResult.applied) {
          throw new Error("A concurrent conflict copy could not be stored safely.");
        }
        await save(await hydrate(result.payload));
        uploaded += 1;
        downloaded += 1;
        recovered += 1;
      } else if (result.revision >= local.revision) {
        await save(await hydrate(result.payload));
        downloaded += 1;
      } else {
        throw new Error("Cloud data changed repeatedly. Sync stopped without overwriting it.");
      }
      handled.add(local.id);
    }
  }
  const localMap = new Map(localItems.map((item) => [item.id, item]));
  for (const remote of remoteRows) {
    if (handled.has(remote.id)) continue;
    const local = localMap.get(remote.id);
    if (!local || remote.revision > local.revision) {
      await save(await hydrate(remote.payload));
      downloaded += 1;
    }
  }
  return { uploaded, downloaded, recovered };
}

function samePayload(left: unknown, right: unknown): boolean {
  const omitEphemeral = (_key: string, value: unknown) =>
    ["blob", "dataUrl", "remoteUrl", "downloadUrl", "url"].includes(_key)
      ? undefined
      : value;
  return JSON.stringify(left, omitEphemeral) === JSON.stringify(right, omitEphemeral);
}

async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(start, start + pageSize - 1);
    if (error) throw error;
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function syncCloudData(): Promise<{
  uploaded: number;
  downloaded: number;
  recovered: number;
}> {
  const supabase = getCloudClient();
  if (!supabase) throw new Error("Supabase is not configured for this deployment.");
  const user = await getCloudUser();
  if (!user) throw new Error("Sign in before syncing.");

  const [
    localChats,
    localMedia,
    localAssets,
    localProjects,
    localMemory,
    localVersions,
    localArtifacts,
    localArtifactVersions,
    localArtifactExports,
    localArtifactAssets,
    localFinaleState,
    remoteChats,
    remoteMedia,
    remoteAssets,
    remoteProjects,
    remoteMemory,
    remoteVersions,
    remoteArtifacts,
    remoteArtifactVersions,
    remoteArtifactExports,
    remoteArtifactAssets,
    remoteFinaleStates,
  ] = await Promise.all([
    loadChats({ includeDeleted: true }),
    loadMediaJobs({ includeDeleted: true }),
    loadAssets({ includeDeleted: true }),
    loadProjects({ includeDeleted: true }),
    loadMemory({ includeDeleted: true }),
    loadAllProjectVersions(),
    loadArtifacts({ includeDeleted: true }),
    loadAllArtifactVersions(),
    loadArtifactExports({ includeDeleted: true }),
    loadArtifactAssets({ includeDeleted: true }),
    loadFinaleState(),
    fetchAllRows<CloudRow<Chat>>(
      supabase,
      "chats",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
    fetchAllRows<CloudRow<MediaJob>>(
      supabase,
      "media_jobs",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
    fetchAllRows<CloudRow<MediaAsset>>(
      supabase,
      "media_assets",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
    fetchAllRows<CloudRow<MediaProject>>(
      supabase,
      "media_projects",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
    fetchAllRows<CloudRow<MemoryItem>>(
      supabase,
      "memory_items",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
    fetchAllRows<VersionRow>(
      supabase,
      "project_versions",
      "id,project_id,payload,created_at",
    ),
    fetchAllRows<CloudRow<Artifact>>(
      supabase,
      "artifacts",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
    fetchAllRows<ArtifactVersionRow>(
      supabase,
      "artifact_versions",
      "id,artifact_id,payload,created_at",
    ),
    fetchAllRows<CloudRow<ArtifactExport>>(
      supabase,
      "artifact_exports",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
    fetchAllRows<CloudRow<ArtifactAsset>>(
      supabase,
      "artifact_assets",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
    fetchAllRows<CloudRow<FinaleState>>(
      supabase,
      "platform_records",
      "id,payload,revision,device_id,updated_at,deleted_at",
    ),
  ]);

  let uploaded = 0;
  let downloaded = 0;
  let recovered = 0;
  const chatSync = await syncRevisionedCollection<Chat>({
    supabase,
    table: "chats",
    localItems: localChats,
    remoteRows: remoteChats,
    prepare: (chat) => prepareChat(supabase, user.id, chat),
    hydrate: (chat) => hydrateChat(supabase, chat),
    save: saveChat,
    recoverConflict: (chat) => ({
      ...chat,
      id: uid(),
      title: `${chat.title} (Recovered conflict)`,
      recoveredFrom: chat.id,
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  });
  uploaded += chatSync.uploaded;
  downloaded += chatSync.downloaded;
  recovered += chatSync.recovered;

  const mediaSync = await syncRevisionedCollection<MediaJob>({
    supabase,
    table: "media_jobs",
    localItems: localMedia,
    remoteRows: remoteMedia,
    prepare: (job) => prepareMedia(supabase, user.id, job),
    hydrate: (job) => hydrateMedia(supabase, job),
    save: saveMediaJob,
    recoverConflict: (job) => ({
      ...job,
      id: uid(),
      routeLabel: `${job.routeLabel || job.provider} · recovered conflict`,
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  });
  uploaded += mediaSync.uploaded;
  downloaded += mediaSync.downloaded;
  recovered += mediaSync.recovered;

  const assetSync = await syncRevisionedCollection<MediaAsset>({
    supabase,
    table: "media_assets",
    localItems: localAssets,
    remoteRows: remoteAssets,
    prepare: (asset) => prepareAsset(supabase, user.id, asset),
    hydrate: (asset) => hydrateAsset(supabase, asset),
    save: saveAsset,
    recoverConflict: (asset) => ({
      ...asset,
      id: uid(),
      name: `${asset.name} (Recovered conflict)`,
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  });
  uploaded += assetSync.uploaded;
  downloaded += assetSync.downloaded;
  recovered += assetSync.recovered;

  const projectSync = await syncRevisionedCollection<MediaProject>({
    supabase,
    table: "media_projects",
    localItems: localProjects,
    remoteRows: remoteProjects,
    prepare: async (project) => project,
    hydrate: async (project) => project,
    save: (project) => saveProject(project),
    recoverConflict: (project) => ({
      ...project,
      id: uid(),
      name: `${project.name} (Recovered conflict)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      revision: 1,
    }),
  });
  uploaded += projectSync.uploaded;
  downloaded += projectSync.downloaded;
  recovered += projectSync.recovered;

  const memorySync = await syncRevisionedCollection<MemoryItem>({
    supabase,
    table: "memory_items",
    localItems: localMemory,
    remoteRows: remoteMemory,
    prepare: async (item) => item,
    hydrate: async (item) => item,
    save: saveMemoryItem,
    recoverConflict: (item) => ({
      ...item,
      id: uid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      revision: 1,
    }),
  });
  uploaded += memorySync.uploaded;
  downloaded += memorySync.downloaded;
  recovered += memorySync.recovered;

  const remoteVersionIds = new Set(remoteVersions.map((version) => version.id));
  for (const version of localVersions) {
    if (remoteVersionIds.has(version.id)) continue;
    const { error } = await supabase.from("project_versions").insert({
      id: version.id,
      user_id: user.id,
      project_id: version.projectId,
      payload: version,
      created_at: new Date(version.createdAt).toISOString(),
    });
    if (error && error.code !== "23505") throw error;
    if (!error) uploaded += 1;
  }
  const localVersionIds = new Set(localVersions.map((version) => version.id));
  for (const remote of remoteVersions) {
    if (localVersionIds.has(remote.id)) continue;
    await saveProjectVersionRecord(remote.payload);
    downloaded += 1;
  }

  const artifactSync = await syncRevisionedCollection<Artifact>({
    supabase,
    table: "artifacts",
    localItems: localArtifacts,
    remoteRows: remoteArtifacts,
    prepare: async (artifact) => artifact,
    hydrate: async (artifact) => artifact,
    save: saveArtifact,
    recoverConflict: (artifact) => ({
      ...artifact,
      id: uid(),
      title: `${artifact.title} (Recovered conflict)`,
      currentVersionId: undefined,
      recoveredFrom: artifact.id,
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  });
  uploaded += artifactSync.uploaded;
  downloaded += artifactSync.downloaded;
  recovered += artifactSync.recovered;

  const artifactExportSync = await syncRevisionedCollection<ArtifactExport>({
    supabase,
    table: "artifact_exports",
    localItems: localArtifactExports,
    remoteRows: remoteArtifactExports,
    prepare: async (item) => {
      const prepared = await prepareArtifactExport(supabase, user.id, item);
      if (prepared.storagePath && prepared.storagePath !== item.storagePath) {
        await saveArtifactExport({
          ...item,
          storagePath: prepared.storagePath,
          size: prepared.size,
          downloadUrl: undefined,
        });
      }
      return prepared;
    },
    hydrate: (item) => hydrateArtifactExport(supabase, item),
    save: saveArtifactExport,
    recoverConflict: (item) => ({
      ...item,
      id: uid(),
      fileName: `${item.fileName} (Recovered conflict)`,
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  });
  uploaded += artifactExportSync.uploaded;
  downloaded += artifactExportSync.downloaded;
  recovered += artifactExportSync.recovered;

  const artifactAssetSync = await syncRevisionedCollection<ArtifactAsset>({
    supabase,
    table: "artifact_assets",
    localItems: localArtifactAssets,
    remoteRows: remoteArtifactAssets,
    prepare: async (item) => {
      const prepared = await prepareArtifactAsset(supabase, user.id, item);
      if (prepared.storagePath && prepared.storagePath !== item.storagePath) {
        await saveArtifactAsset({
          ...item,
          storagePath: prepared.storagePath,
          size: prepared.size,
          downloadUrl: undefined,
        });
      }
      return prepared;
    },
    hydrate: (item) => hydrateArtifactAsset(supabase, item),
    save: saveArtifactAsset,
    recoverConflict: (item) => ({
      ...item,
      id: uid(),
      name: `${item.name} (Recovered conflict)`,
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  });
  uploaded += artifactAssetSync.uploaded;
  downloaded += artifactAssetSync.downloaded;
  recovered += artifactAssetSync.recovered;

  const remoteArtifactVersionIds = new Set(
    remoteArtifactVersions.map((version) => version.id),
  );
  for (const version of localArtifactVersions) {
    if (remoteArtifactVersionIds.has(version.id)) continue;
    const { error } = await supabase.from("artifact_versions").insert({
      id: version.id,
      user_id: user.id,
      artifact_id: version.artifactId,
      payload: version,
      created_at: new Date(version.createdAt).toISOString(),
    });
    if (error && error.code !== "23505") throw error;
    if (!error) uploaded += 1;
  }
  const localArtifactVersionIds = new Set(
    localArtifactVersions.map((version) => version.id),
  );
  for (const remote of remoteArtifactVersions) {
    if (localArtifactVersionIds.has(remote.id)) continue;
    await saveArtifactVersionRecord(remote.payload);
    downloaded += 1;
  }

  const remoteFinale = remoteFinaleStates.find((row) => row.id === localFinaleState.id);
  if (!remoteFinale || localFinaleState.revision > remoteFinale.revision) {
    const result = await atomicWrite(
      supabase,
      "platform_records",
      localFinaleState,
      localFinaleState,
      remoteFinale?.revision ?? null,
    );
    if (result.applied) {
      uploaded += 1;
    } else {
      await setSetting(`finale:recovered-state:${Date.now()}`, localFinaleState);
      await saveFinaleState(result.payload, { preserveRevision: true });
      downloaded += 1;
      recovered += 1;
    }
  } else if (remoteFinale.revision > localFinaleState.revision) {
    await saveFinaleState(remoteFinale.payload, { preserveRevision: true });
    downloaded += 1;
  } else if (!samePayload(localFinaleState, remoteFinale.payload)) {
    await setSetting(`finale:recovered-state:${Date.now()}`, localFinaleState);
    await saveFinaleState(remoteFinale.payload, { preserveRevision: true });
    downloaded += 1;
    recovered += 1;
  }

  await setSetting("last-cloud-sync", Date.now());
  return { uploaded, downloaded, recovered };
}

export function subscribeToAuth(onChange: (user: User | null) => void): () => void {
  const supabase = getCloudClient();
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user || null);
  });
  return () => data.subscription.unsubscribe();
}
