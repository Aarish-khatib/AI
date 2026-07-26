import type { ProviderRecord, RemoteSessionRecord, UsageMode } from "./contracts";

export const DEFAULT_USAGE_MODE: Readonly<UsageMode>;
export function validatePaidActivation(
  mode: UsageMode,
  provider?: ProviderRecord,
): { ok: boolean; reasons: string[] };
export function resolveUsageRoute(input: {
  mode: UsageMode;
  provider: ProviderRecord;
  estimatedCostUsd?: number;
  taskId?: string;
}): {
  allowed: boolean;
  reason?: string;
  route?: "free" | "paid";
  providerId?: string;
  taskId?: string;
  costLabel?: "free" | "estimated";
  estimatedCostUsd?: number;
  requiresConfirmation?: boolean;
};
export function validateCompatibleEndpoint(
  value: string,
  options?: { allowLocal?: boolean },
): { ok: boolean; reason?: string; normalized?: string };
export function safeProviderHeaders(headers?: Record<string, unknown>): Record<string, string>;
export function createPairingChallenge(input: {
  userId: string;
  deviceName: string;
  now?: number;
  ttlMs?: number;
}): {
  id: string;
  codeHash: string;
  displayCode: string;
  deviceName: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  consumedAt: number | null;
  approvedAt: number | null;
};
export function consumePairingChallenge(
  challenge: ReturnType<typeof createPairingChallenge>,
  code: string,
  now?: number,
): {
  ok: boolean;
  reason?: string;
  challenge?: ReturnType<typeof createPairingChallenge>;
};
export function authorizeRemoteAction(
  session: RemoteSessionRecord,
  permission: string,
  now?: number,
): boolean;
export function emergencyStopSession(
  session: RemoteSessionRecord,
  now?: number,
): RemoteSessionRecord;
export function commandRisk(command: string): {
  level: "approval" | "blocked";
  reason: string;
};
export function sandboxPreviewDocument(
  files: Record<string, string>,
  entry?: string,
): string;
export function createRepositoryIndex(files: Record<string, string>): {
  entries: Array<{ path: string; bytes: number; hash: string; kind: string }>;
  fingerprint: string;
  generatedAt: number;
};
