import { sha256Hex } from "../integrity.mjs";

export const PAID_PROVIDER_CLASSES = new Set([
  "direct",
  "gateway",
  "compatible",
  "media",
]);

export const FREE_PROVIDER_CLASSES = new Set(["free", "local", "browser"]);

export const DEFAULT_USAGE_MODE = Object.freeze({
  limitlessFree: true,
  neverSpend: true,
  paidStatus: "locked",
  defaultProviderId: "",
  defaultModel: "",
  providerAllowlist: [],
  providerBlocklist: [],
  maxCostPerRequestUsd: 0,
  dailyBudgetUsd: 0,
  monthlyBudgetUsd: 0,
  maxPaidCandidateCalls: 1,
  confirmAboveUsd: 0,
  spentTodayUsd: 0,
  spentThisMonthUsd: 0,
  estimatedCostPerRequestUsd: 0,
  revision: 1,
});

export function validatePaidActivation(mode, provider) {
  const reasons = [];
  if (mode.limitlessFree !== false) reasons.push("Turn off Use Limitless Free.");
  if (mode.neverSpend !== false) reasons.push("Turn off Never Spend with explicit confirmation.");
  if (!provider?.configured || provider?.status !== "healthy") {
    reasons.push("Connect and verify a paid provider key.");
  }
  if (!Number.isFinite(mode.maxCostPerRequestUsd) || mode.maxCostPerRequestUsd <= 0) {
    reasons.push("Set a positive per-request budget.");
  }
  if (!Number.isFinite(mode.dailyBudgetUsd) || mode.dailyBudgetUsd <= 0) {
    reasons.push("Set a positive daily budget.");
  }
  if (!Number.isFinite(mode.monthlyBudgetUsd) || mode.monthlyBudgetUsd <= 0) {
    reasons.push("Set a positive monthly budget.");
  }
  return { ok: reasons.length === 0, reasons };
}

export function resolveUsageRoute({ mode, provider, estimatedCostUsd = 0, taskId = "" }) {
  if (!mode || mode.limitlessFree !== false) {
    if (provider?.costClass !== "free" && provider?.costClass !== "local") {
      return { allowed: false, reason: "Free mode rejects paid and unknown-cost routes." };
    }
    if (!FREE_PROVIDER_CLASSES.has(provider.providerClass)) {
      return { allowed: false, reason: "This provider is not a verified free or local route." };
    }
    return {
      allowed: true,
      route: "free",
      providerId: provider.id,
      taskId,
      costLabel: "free",
    };
  }

  const activation = validatePaidActivation(mode, provider);
  if (!activation.ok) return { allowed: false, reason: activation.reasons.join(" ") };
  if (!PAID_PROVIDER_CLASSES.has(provider.providerClass) || provider.costClass !== "paid") {
    return { allowed: false, reason: "Paid mode never falls back to free or unknown-cost routes." };
  }
  if (mode.providerBlocklist?.includes(provider.id)) {
    return { allowed: false, reason: "This provider is blocked by your policy." };
  }
  if (mode.providerAllowlist?.length && !mode.providerAllowlist.includes(provider.id)) {
    return { allowed: false, reason: "This provider is not in your allowlist." };
  }
  if (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd <= 0) {
    return { allowed: false, reason: "Enter a positive verified cost estimate before a paid request." };
  }
  if (estimatedCostUsd > mode.maxCostPerRequestUsd) {
    return { allowed: false, reason: "The request exceeds the per-request budget." };
  }
  if (mode.spentTodayUsd + estimatedCostUsd > mode.dailyBudgetUsd) {
    return { allowed: false, reason: "The request exceeds the daily budget." };
  }
  if (mode.spentThisMonthUsd + estimatedCostUsd > mode.monthlyBudgetUsd) {
    return { allowed: false, reason: "The request exceeds the monthly budget." };
  }
  return {
    allowed: true,
    route: "paid",
    providerId: provider.id,
    taskId,
    estimatedCostUsd,
    costLabel: "estimated",
    requiresConfirmation: estimatedCostUsd >= Number(mode.confirmAboveUsd || 0),
  };
}

const PRIVATE_HOST = /^(?:localhost|0\.0\.0\.0|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|::1|\[::1\])$/i;

export function validateCompatibleEndpoint(value, { allowLocal = false } = {}) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return { ok: false, reason: "Enter a valid endpoint URL." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Credentials cannot be embedded in the endpoint URL." };
  }
  if (url.search) {
    return { ok: false, reason: "Put provider options in the connector settings, not the endpoint query string." };
  }
  if (url.protocol !== "https:" && !(allowLocal && url.protocol === "http:")) {
    return { ok: false, reason: "Remote endpoints must use HTTPS." };
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const privateIpv4 =
    PRIVATE_HOST.test(hostname) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(hostname);
  if (privateIpv4 && !allowLocal) {
    return { ok: false, reason: "Cloud execution blocks private and loopback targets." };
  }
  if (url.protocol === "http:" && !privateIpv4) {
    return { ok: false, reason: "Plain HTTP is allowed only for explicit local endpoints." };
  }
  url.hash = "";
  return { ok: true, normalized: url.toString().replace(/\/$/, "") };
}

export function safeProviderHeaders(headers = {}) {
  const blocked = /^(?:host|origin|referer|cookie|set-cookie|content-length|transfer-encoding|proxy-|sec-|x-forwarded-)/i;
  const output = {};
  for (const [name, value] of Object.entries(headers)) {
    const normalized = String(name || "").trim();
    if (!normalized || blocked.test(normalized)) continue;
    if (!/^[a-z0-9-]{1,64}$/i.test(normalized)) continue;
    const text = String(value ?? "");
    if (/[\r\n]/.test(text) || text.length > 2048) continue;
    output[normalized] = text;
  }
  return output;
}

export function createPairingChallenge({ userId, deviceName, now = Date.now(), ttlMs = 300_000 }) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure device pairing requires Web Crypto.");
  }
  const random = new Uint32Array(4);
  globalThis.crypto.getRandomValues(random);
  const seed = `${userId}:${deviceName}:${now}:${Array.from(random, (value) => value.toString(16)).join("")}`;
  const digest = sha256Hex(seed);
  const code = String(Number.parseInt(digest.slice(0, 12), 16) % 1_000_000).padStart(6, "0");
  return {
    id: digest.slice(0, 32),
    codeHash: sha256Hex(code),
    displayCode: code,
    deviceName: String(deviceName || "Limitless Desktop").slice(0, 80),
    createdAt: now,
    expiresAt: now + Math.min(Math.max(ttlMs, 60_000), 600_000),
    attempts: 0,
    consumedAt: null,
    approvedAt: null,
  };
}

export function consumePairingChallenge(challenge, code, now = Date.now()) {
  if (!challenge || challenge.consumedAt) {
    return { ok: false, reason: "Pairing code was already used." };
  }
  if (now > challenge.expiresAt) return { ok: false, reason: "Pairing code expired." };
  const attempts = Number(challenge.attempts || 0) + 1;
  if (attempts > 5) return { ok: false, reason: "Too many pairing attempts." };
  if (sha256Hex(String(code || "")) !== challenge.codeHash) {
    return { ok: false, reason: "Pairing code is incorrect.", challenge: { ...challenge, attempts } };
  }
  return {
    ok: true,
    challenge: { ...challenge, attempts, consumedAt: now, approvedAt: now },
  };
}

export function authorizeRemoteAction(session, permission, now = Date.now()) {
  if (!session || session.status !== "active") return false;
  if (session.revokedAt || session.stoppedAt) return false;
  if (now > session.expiresAt || now > session.idleExpiresAt) return false;
  return Array.isArray(session.permissions) && session.permissions.includes(permission);
}

export function emergencyStopSession(session, now = Date.now()) {
  return {
    ...session,
    status: "stopped",
    stoppedAt: now,
    permissions: [],
    credentialVersion: Number(session?.credentialVersion || 0) + 1,
  };
}

export function commandRisk(command) {
  const normalized = String(command || "").trim().toLowerCase();
  if (!normalized) return { level: "blocked", reason: "Command is empty." };
  const blocked = [
    /\brm\s+-rf\s+(?:\/|~|\$home)\b/,
    /\bformat\b/,
    /\bmkfs\b/,
    /\bdd\s+if=/,
    /\bgit\s+(?:push|reset\s+--hard|clean\s+-[a-z]*f)/,
    /\b(?:sudo|runas)\b/,
    /\b(?:reg\s+add|defaults\s+write).*(?:run|login)/,
  ];
  if (blocked.some((pattern) => pattern.test(normalized))) {
    return { level: "blocked", reason: "Destructive, privileged, persistence, or remote-push command." };
  }
  const reviewed = /\b(?:npm|pnpm|yarn|bun|cargo|git|python|node|deno|docker)\b/.test(normalized);
  return reviewed
    ? { level: "approval", reason: "Show the exact command and require explicit approval." }
    : { level: "approval", reason: "Unknown commands always require explicit approval." };
}

export function sandboxPreviewDocument(files, entry = "index.html") {
  const source = String(files?.[entry] || "");
  const csp = [
    "default-src 'none'",
    "img-src data: blob:",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "font-src data:",
    "connect-src 'none'",
    "media-src data: blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  const bridge = `<script>(()=>{const send=(type,detail)=>parent.postMessage({channel:"limitless-preview-v1",type,detail:String(detail||"").slice(0,500)},"*");window.addEventListener("error",event=>send("console-error",event.message||"Script error"));window.addEventListener("unhandledrejection",event=>send("console-error",event.reason?.message||event.reason||"Unhandled rejection"));window.addEventListener("DOMContentLoaded",()=>send("ready",document.title||"Preview ready"),{once:true});})();</script>`;
  if (!source.trim()) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">${bridge}</head><body><p>No preview entry was found.</p></body></html>`;
  }
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">${bridge}`;
  if (/<head(?:\s[^>]*)?>/i.test(source)) {
    return source.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${meta}`);
  }
  if (/<html(?:\s[^>]*)?>/i.test(source)) {
    return source.replace(/<html(?:\s[^>]*)?>/i, (match) => `${match}<head>${meta}</head>`);
  }
  return `<!doctype html><html><head>${meta}</head><body>${source}</body></html>`;
}

export function createRepositoryIndex(files = {}) {
  const entries = Object.entries(files)
    .filter(([path]) => !/(^|\/)(?:node_modules|\.git|dist|\.next)(\/|$)/.test(path))
    .map(([path, content]) => ({
      path,
      bytes: new TextEncoder().encode(String(content)).byteLength,
      hash: sha256Hex(String(content)),
      kind: /\.(?:tsx?|jsx?)$/.test(path)
        ? "code"
        : /\.(?:css|scss)$/.test(path)
          ? "style"
          : /\.(?:json|ya?ml|toml)$/.test(path)
            ? "config"
            : "asset",
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    entries,
    fingerprint: sha256Hex(entries.map((entry) => `${entry.path}:${entry.hash}`).join("\n")),
    generatedAt: Date.now(),
  };
}
