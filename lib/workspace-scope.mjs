export const ANONYMOUS_WORKSPACE = "anonymous";

export function workspaceScopeForUser(userId) {
  const normalized = String(userId || "").trim().toLowerCase();
  return normalized ? `user:${normalized}` : ANONYMOUS_WORKSPACE;
}

export function databaseNameForWorkspace(scope) {
  if (!scope || scope === ANONYMOUS_WORKSPACE) return "limitless-ai";
  return `limitless-ai:${String(scope).replace(/[^a-z0-9:_-]/gi, "_")}`;
}

const PRIVATE_SETTING_NAMES = new Set([
  "device-id",
  "legacy-migration-v4",
  "key-pool-metadata",
  "pollinations-budget",
  "pollinations-runs-used",
  "last-cloud-sync",
  "anonymous-import-v2",
]);

export function settingMayCrossWorkspace(key) {
  const normalized = String(key || "").toLowerCase();
  if (!normalized || PRIVATE_SETTING_NAMES.has(normalized)) return false;
  return !/(?:secret|token|credential|password|passphrase|private[-_]?key|api[-_]?key|auth|bearer|vault|session|pollinations[-_])/i.test(
    normalized,
  );
}

export function copySafeWorkspaceData(source) {
  return {
    chats: structuredClone(source.chats || []),
    media: structuredClone(source.media || []),
    assets: structuredClone(source.assets || []),
    projects: structuredClone(source.projects || []),
    versions: structuredClone(source.versions || []),
    memory: structuredClone(source.memory || []),
    artifacts: structuredClone(source.artifacts || []),
    artifactVersions: structuredClone(source.artifactVersions || []),
    artifactExports: structuredClone(source.artifactExports || []),
    artifactAssets: structuredClone(source.artifactAssets || []),
    settings: Object.fromEntries(
      Object.entries(source.settings || {}).filter(([key]) => settingMayCrossWorkspace(key)),
    ),
  };
}
