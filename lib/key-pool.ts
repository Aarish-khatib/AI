"use client";

import {
  availableKeySlots,
  KEY_SLOT_IDS,
  maskProviderKey,
  parseRetryAfter,
} from "@/lib/key-pool-policy.mjs";
import {
  getSetting,
  loadSecret,
  removeSecret,
  saveSecret,
  setSetting,
} from "@/lib/local-store";

export type KeySlotId = (typeof KEY_SLOT_IDS)[number];

export type KeySlotMetadata = {
  id: KeySlotId;
  label: string;
  priority: number;
  enabled: boolean;
  configured: boolean;
  masked: string;
  failures: number;
  lastTestedAt?: number;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  cooldownUntil?: number;
  status: "empty" | "ready" | "cooldown" | "invalid" | "disabled";
};

export type KeySlot = KeySlotMetadata & { key: string };

const METADATA_SETTING = "key-pool-metadata";
const LEGACY_SECRET = "openrouter-api-key";
const secretName = (id: KeySlotId) => `openrouter-api-key:${id}`;

const defaults = (): KeySlotMetadata[] =>
  KEY_SLOT_IDS.map((id, index) => ({
    id,
    label: index === 0 ? "Primary" : `Backup ${index}`,
    priority: index + 1,
    enabled: true,
    configured: false,
    masked: "Not configured",
    failures: 0,
    status: "empty",
  }));

async function saveMetadata(slots: KeySlotMetadata[]): Promise<void> {
  await setSetting(
    METADATA_SETTING,
    slots.map(({ id, label, priority, enabled, configured, masked, failures, lastTestedAt, lastSuccessAt, lastFailureAt, cooldownUntil, status }) => ({
      id,
      label,
      priority,
      enabled,
      configured,
      masked,
      failures,
      lastTestedAt,
      lastSuccessAt,
      lastFailureAt,
      cooldownUntil,
      status,
    })),
  );
}

function normalizeMetadata(value: unknown): KeySlotMetadata[] {
  const stored = Array.isArray(value) ? value : [];
  return defaults().map((fallback) => {
    const candidate = stored.find((item) => item?.id === fallback.id);
    if (!candidate) return fallback;
    const enabled = candidate.enabled !== false;
    const cooldownUntil = Number(candidate.cooldownUntil) || undefined;
    return {
      ...fallback,
      ...candidate,
      id: fallback.id,
      label: String(candidate.label || fallback.label).slice(0, 40),
      priority: Math.min(Math.max(Number(candidate.priority) || fallback.priority, 1), 3),
      enabled,
      configured: Boolean(candidate.configured),
      masked: String(candidate.masked || fallback.masked),
      failures: Math.max(0, Number(candidate.failures) || 0),
      cooldownUntil,
      status: candidate.status === "invalid"
        ? "invalid"
        : !enabled
        ? "disabled"
        : cooldownUntil && cooldownUntil > Date.now()
          ? "cooldown"
          : candidate.configured
            ? candidate.status === "invalid"
              ? "invalid"
              : "ready"
            : "empty",
    } satisfies KeySlotMetadata;
  });
}

export async function loadKeyPool(): Promise<KeySlot[]> {
  const metadata = normalizeMetadata(
    await getSetting<KeySlotMetadata[]>(METADATA_SETTING, []),
  );
  const keys = await Promise.all(
    KEY_SLOT_IDS.map((id) => loadSecret(secretName(id)).catch(() => "")),
  );
  if (!keys[0]) {
    const legacy = await loadSecret(LEGACY_SECRET).catch(() => "");
    if (legacy) {
      await saveSecret(secretName("primary"), legacy);
      if ((await loadSecret(secretName("primary"))) === legacy) keys[0] = legacy;
    }
  }
  const pool = metadata.map((slot, index) => {
    const key = keys[index] || "";
    const configured = Boolean(key);
    return {
      ...slot,
      key,
      configured,
      masked: configured ? maskProviderKey(key) : "Not configured",
      status: !slot.enabled
        ? slot.status === "invalid"
          ? "invalid"
          : "disabled"
        : slot.cooldownUntil && slot.cooldownUntil > Date.now()
          ? "cooldown"
          : configured
            ? slot.status === "invalid"
              ? "invalid"
              : "ready"
            : "empty",
    } satisfies KeySlot;
  });
  await saveMetadata(pool);
  return pool;
}

export async function saveKeySlot(
  id: KeySlotId,
  key: string,
  label?: string,
): Promise<KeySlot[]> {
  if (!KEY_SLOT_IDS.includes(id)) throw new Error("Unknown key slot.");
  const clean = key.trim();
  if (!clean) throw new Error("Enter an OpenRouter key.");
  await saveSecret(secretName(id), clean);
  if ((await loadSecret(secretName(id))) !== clean) {
    throw new Error("The encrypted key could not be verified.");
  }
  const pool = await loadKeyPool();
  const now = Date.now();
  const updated = pool.map((slot) =>
    slot.id === id
      ? {
          ...slot,
          key: clean,
          label: label?.trim().slice(0, 40) || slot.label,
          configured: true,
          enabled: true,
          masked: maskProviderKey(clean),
          failures: 0,
          cooldownUntil: undefined,
          lastTestedAt: now,
          lastSuccessAt: now,
          status: "ready" as const,
        }
      : slot,
  );
  await saveMetadata(updated);
  return updated;
}

export async function removeKeySlot(id: KeySlotId): Promise<KeySlot[]> {
  await removeSecret(secretName(id));
  const pool = await loadKeyPool();
  const updated = pool.map((slot) =>
    slot.id === id
      ? {
          ...slot,
          key: "",
          configured: false,
          masked: "Not configured",
          failures: 0,
          cooldownUntil: undefined,
          status: "empty" as const,
        }
      : slot,
  );
  await saveMetadata(updated);
  return updated;
}

export async function setKeySlotEnabled(
  id: KeySlotId,
  enabled: boolean,
): Promise<KeySlot[]> {
  const pool = await loadKeyPool();
  const selected = pool.find((slot) => slot.id === id);
  if (enabled && selected?.status === "invalid") {
    throw new Error("Replace and verify this rejected key before enabling it.");
  }
  const updated = pool.map((slot) =>
    slot.id === id
      ? {
          ...slot,
          enabled,
          status: enabled ? (slot.configured ? "ready" as const : "empty" as const) : "disabled" as const,
        }
      : slot,
  );
  await saveMetadata(updated);
  return updated;
}

export async function recordKeyResult(
  id: KeySlotId,
  result: { ok: boolean; status?: number; retryAfter?: string | null },
): Promise<KeySlot[]> {
  const pool = await loadKeyPool();
  const now = Date.now();
  const updated = pool.map((slot) => {
    if (slot.id !== id) return slot;
    if (result.ok) {
      return {
        ...slot,
        failures: Math.max(0, slot.failures - 1),
        lastTestedAt: now,
        lastSuccessAt: now,
        cooldownUntil: undefined,
        status: "ready" as const,
      };
    }
    const unauthorized = result.status === 401 || result.status === 403;
    const rateLimited = result.status === 429;
    return {
      ...slot,
      enabled: unauthorized ? false : slot.enabled,
      failures: slot.failures + 1,
      lastTestedAt: now,
      lastFailureAt: now,
      cooldownUntil: rateLimited
        ? now + parseRetryAfter(result.retryAfter, now)
        : slot.cooldownUntil,
      status: unauthorized
        ? "invalid" as const
        : rateLimited
          ? "cooldown" as const
          : slot.status,
    };
  });
  await saveMetadata(updated);
  return updated;
}

export function readyKeySlots(pool: KeySlot[]): KeySlot[] {
  return availableKeySlots(pool);
}
