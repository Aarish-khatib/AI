export const RELEASE_FEATURES = Object.freeze({
  coreChat: { ready: true, enabledByDefault: true },
  mediaStudio: { ready: true, enabledByDefault: true },
  imageEditor: { ready: true, enabledByDefault: true },
  videoEditor: { ready: true, enabledByDefault: true },
  atomicCloudSync: { ready: true, enabledByDefault: true },
  providerKeyPool: { ready: true, enabledByDefault: true },
  appBuilder: { ready: true, enabledByDefault: true },
  providerMarketplace: { ready: true, enabledByDefault: true },
  remoteDesktop: { ready: false, enabledByDefault: false },
  officeArtifacts: { ready: true, enabledByDefault: true },
  documentStudio: { ready: true, enabledByDefault: true },
  intelligenceHub: { ready: true, enabledByDefault: true },
  securityCentre: { ready: true, enabledByDefault: true },
});

export function resolveReleaseFeature(name, explicitValue) {
  const feature = RELEASE_FEATURES[name];
  if (!feature?.ready) return false;
  if (feature.enabledByDefault) return explicitValue !== "false";
  return explicitValue === "true";
}

const PRIVATE_KEY = /(?:secret|token|password|credential|api[-_]?key|authorization|email)/i;
const PRIVATE_VALUE =
  /(?:sk-or-v1-[a-z0-9_-]{8,}|eyj[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}|bearer\s+\S+)/i;

export function redactDiagnostics(value) {
  if (Array.isArray(value)) return value.map(redactDiagnostics);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        PRIVATE_KEY.test(key) ? "[redacted]" : redactDiagnostics(entry),
      ]),
    );
  }
  if (typeof value === "string" && PRIVATE_VALUE.test(value)) return "[redacted]";
  return value;
}

export function releaseFeatureSnapshot(environment = {}) {
  return Object.fromEntries(
    Object.keys(RELEASE_FEATURES).map((name) => [
      name,
      resolveReleaseFeature(
        name,
        environment[`NEXT_PUBLIC_LIMITLESS_${name.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`],
      ),
    ]),
  );
}
