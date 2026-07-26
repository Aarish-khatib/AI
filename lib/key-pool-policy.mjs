export const KEY_SLOT_IDS = ["primary", "backup-1", "backup-2"];

export function maskProviderKey(value) {
  const key = String(value || "");
  if (!key) return "Not configured";
  const suffix = key.slice(-4);
  return `${key.slice(0, Math.min(7, Math.max(0, key.length - 4)))}••••${suffix}`;
}

export function parseRetryAfter(value, now = Date.now()) {
  if (!value) return 60_000;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(1_000, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1_000, date - now) : 60_000;
}

export function availableKeySlots(slots, now = Date.now()) {
  return [...slots]
    .filter((slot) => slot.enabled !== false && slot.configured && (slot.cooldownUntil || 0) <= now)
    .sort(
      (left, right) =>
        (left.priority || 99) - (right.priority || 99) ||
        (left.failures || 0) - (right.failures || 0),
    );
}

export function createTaskDeduplicator() {
  const active = new Set();
  return {
    begin(taskId) {
      if (active.has(taskId)) return false;
      active.add(taskId);
      return true;
    },
    finish(taskId) {
      active.delete(taskId);
    },
    has(taskId) {
      return active.has(taskId);
    },
  };
}
