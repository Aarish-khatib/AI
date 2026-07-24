"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  loadAssets,
  loadAllProjectVersions,
  loadChats,
  loadMediaJobs,
  loadMemory,
  loadProjects,
  saveAsset,
  saveChat,
  saveMediaJob,
  saveMemoryItem,
  saveProject,
  saveProjectVersionRecord,
  setSetting,
} from "@/lib/local-store";
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

type CloudRow<T> = {
  id: string;
  payload: T;
  revision: number;
  device_id: string;
  updated_at: string;
  deleted_at: string | null;
};

type VersionRow = {
  id: string;
  project_id: string;
  payload: ProjectVersion;
  created_at: string;
};

type Revisioned = {
  id: string;
  revision: number;
  deviceId: string;
  updatedAt: number;
  deletedAt?: number;
};

function localIsAhead(local: Revisioned, remote: CloudRow<unknown>): boolean {
  return (
    local.revision > remote.revision ||
    (local.revision === remote.revision &&
      local.updatedAt > Date.parse(remote.updated_at))
  );
}

function remoteIsAhead(remote: CloudRow<unknown>, local: Revisioned): boolean {
  return (
    remote.revision > local.revision ||
    (remote.revision === local.revision &&
      Date.parse(remote.updated_at) > local.updatedAt)
  );
}

async function syncRevisionedCollection<T extends Revisioned>({
  supabase,
  userId,
  table,
  localItems,
  remoteRows,
  prepare,
  hydrate,
  save,
  recoverConflict,
}: {
  supabase: SupabaseClient;
  userId: string;
  table: "media_assets" | "media_projects" | "memory_items";
  localItems: T[];
  remoteRows: CloudRow<T>[];
  prepare: (item: T) => Promise<unknown>;
  hydrate: (item: T) => Promise<T>;
  save: (item: T) => Promise<void>;
  recoverConflict?: (item: T) => T;
}): Promise<{ uploaded: number; downloaded: number; recovered: number }> {
  let uploaded = 0;
  let downloaded = 0;
  let recovered = 0;
  const resolvedConflicts = new Set<string>();
  const remoteMap = new Map(remoteRows.map((row) => [row.id, row]));
  for (const local of localItems) {
    const remote = remoteMap.get(local.id);
    if (
      remote &&
      recoverConflict &&
      local.revision === remote.revision &&
      local.deviceId !== remote.device_id &&
      !samePayload(local, remote.payload)
    ) {
      const copy = recoverConflict(local);
      await save(copy);
      const copyPayload = await prepare(copy);
      const { error } = await supabase.from(table).upsert({
        id: copy.id,
        user_id: userId,
        payload: copyPayload,
        revision: copy.revision,
        device_id: copy.deviceId,
        updated_at: new Date(copy.updatedAt).toISOString(),
        deleted_at: copy.deletedAt ? new Date(copy.deletedAt).toISOString() : null,
      });
      if (error) throw error;
      await save(await hydrate(remote.payload));
      resolvedConflicts.add(local.id);
      uploaded += 1;
      downloaded += 1;
      recovered += 1;
      continue;
    }
    if (!remote || localIsAhead(local, remote)) {
      const payload = await prepare(local);
      const { error } = await supabase.from(table).upsert({
        id: local.id,
        user_id: userId,
        payload,
        revision: local.revision,
        device_id: local.deviceId,
        updated_at: new Date(local.updatedAt).toISOString(),
        deleted_at: local.deletedAt ? new Date(local.deletedAt).toISOString() : null,
      });
      if (error) throw error;
      uploaded += 1;
    }
  }
  const localMap = new Map(localItems.map((item) => [item.id, item]));
  for (const remote of remoteRows) {
    if (resolvedConflicts.has(remote.id)) continue;
    const local = localMap.get(remote.id);
    if (!local || remoteIsAhead(remote, local)) {
      await save(await hydrate(remote.payload));
      downloaded += 1;
    }
  }
  return { uploaded, downloaded, recovered };
}

function samePayload(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
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
    remoteChats,
    remoteMedia,
    remoteAssets,
    remoteProjects,
    remoteMemory,
    remoteVersions,
  ] = await Promise.all([
    loadChats({ includeDeleted: true }),
    loadMediaJobs({ includeDeleted: true }),
    loadAssets({ includeDeleted: true }),
    loadProjects({ includeDeleted: true }),
    loadMemory({ includeDeleted: true }),
    loadAllProjectVersions(),
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
  ]);

  let uploaded = 0;
  let downloaded = 0;
  let recovered = 0;
  const remoteChatMap = new Map(remoteChats.map((row) => [row.id, row]));
  const resolvedChatConflicts = new Set<string>();

  for (const local of localChats) {
    const remote = remoteChatMap.get(local.id);
    if (
      remote &&
      remote.revision === local.revision &&
      remote.device_id !== local.deviceId &&
      !samePayload(remote.payload.messages, local.messages)
    ) {
      const recoveredChat: Chat = {
        ...local,
        id: uid(),
        title: `${local.title} (Recovered conflict)`,
        recoveredFrom: local.id,
        revision: 1,
        deviceId: local.deviceId,
        updatedAt: Date.now(),
      };
      await saveChat(recoveredChat);
      const prepared = await prepareChat(supabase, user.id, recoveredChat);
      const { error } = await supabase.from("chats").upsert({
        id: prepared.id,
        user_id: user.id,
        payload: prepared,
        revision: prepared.revision,
        device_id: prepared.deviceId,
        updated_at: new Date(prepared.updatedAt).toISOString(),
        deleted_at: prepared.deletedAt ? new Date(prepared.deletedAt).toISOString() : null,
      });
      if (error) throw error;
      await saveChat(await hydrateChat(supabase, remote.payload));
      resolvedChatConflicts.add(local.id);
      uploaded += 1;
      downloaded += 1;
      recovered += 1;
      continue;
    }
    if (!remote || localIsAhead(local, remote)) {
      const prepared = await prepareChat(supabase, user.id, local);
      const { error } = await supabase.from("chats").upsert({
        id: prepared.id,
        user_id: user.id,
        payload: prepared,
        revision: prepared.revision,
        device_id: prepared.deviceId,
        updated_at: new Date(prepared.updatedAt).toISOString(),
        deleted_at: prepared.deletedAt ? new Date(prepared.deletedAt).toISOString() : null,
      });
      if (error) throw error;
      uploaded += 1;
    }
  }

  const localChatMap = new Map(localChats.map((chat) => [chat.id, chat]));
  for (const remote of remoteChats) {
    if (resolvedChatConflicts.has(remote.id)) continue;
    const local = localChatMap.get(remote.id);
    if (!local || remoteIsAhead(remote, local)) {
      await saveChat(await hydrateChat(supabase, remote.payload));
      downloaded += 1;
    }
  }

  const remoteMediaMap = new Map(remoteMedia.map((row) => [row.id, row]));
  const resolvedMediaConflicts = new Set<string>();
  for (const local of localMedia) {
    const remote = remoteMediaMap.get(local.id);
    if (
      remote &&
      local.revision === remote.revision &&
      local.deviceId !== remote.device_id &&
      !samePayload(local, remote.payload)
    ) {
      const recoveredJob: MediaJob = {
        ...local,
        id: uid(),
        routeLabel: `${local.routeLabel || local.provider} · recovered conflict`,
        revision: 1,
        updatedAt: Date.now(),
      };
      await saveMediaJob(recoveredJob);
      const prepared = await prepareMedia(supabase, user.id, recoveredJob);
      const { error } = await supabase.from("media_jobs").upsert({
        id: prepared.id,
        user_id: user.id,
        payload: prepared,
        revision: prepared.revision,
        device_id: prepared.deviceId,
        updated_at: new Date(prepared.updatedAt).toISOString(),
        deleted_at: prepared.deletedAt ? new Date(prepared.deletedAt).toISOString() : null,
      });
      if (error) throw error;
      await saveMediaJob(await hydrateMedia(supabase, remote.payload));
      resolvedMediaConflicts.add(local.id);
      uploaded += 1;
      downloaded += 1;
      recovered += 1;
      continue;
    }
    if (!remote || localIsAhead(local, remote)) {
      const prepared = await prepareMedia(supabase, user.id, local);
      const { error } = await supabase.from("media_jobs").upsert({
        id: prepared.id,
        user_id: user.id,
        payload: prepared,
        revision: prepared.revision,
        device_id: prepared.deviceId,
        updated_at: new Date(prepared.updatedAt).toISOString(),
        deleted_at: prepared.deletedAt ? new Date(prepared.deletedAt).toISOString() : null,
      });
      if (error) throw error;
      uploaded += 1;
    }
  }
  const localMediaMap = new Map(localMedia.map((job) => [job.id, job]));
  for (const remote of remoteMedia) {
    if (resolvedMediaConflicts.has(remote.id)) continue;
    const local = localMediaMap.get(remote.id);
    if (!local || remoteIsAhead(remote, local)) {
      await saveMediaJob(await hydrateMedia(supabase, remote.payload));
      downloaded += 1;
    }
  }

  const assetSync = await syncRevisionedCollection<MediaAsset>({
    supabase,
    userId: user.id,
    table: "media_assets",
    localItems: localAssets,
    remoteRows: remoteAssets,
    prepare: (asset) => prepareAsset(supabase, user.id, asset),
    hydrate: (asset) => hydrateAsset(supabase, asset),
    save: saveAsset,
  });
  uploaded += assetSync.uploaded;
  downloaded += assetSync.downloaded;
  recovered += assetSync.recovered;

  const projectSync = await syncRevisionedCollection<MediaProject>({
    supabase,
    userId: user.id,
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
    userId: user.id,
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
