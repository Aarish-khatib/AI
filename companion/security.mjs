import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export const MUTATING_TOOLS = new Set([
  "write_file",
  "replace_in_file",
  "make_directory",
  "move_path",
  "copy_path",
  "delete_path",
  "run_command",
]);

export const ALWAYS_REVIEWED_TOOLS = new Set(["delete_path", "run_command"]);

const within = (root, target) => target === root || target.startsWith(`${root}${path.sep}`);

export function createOriginPolicy(origins = []) {
  const allowed = new Set();
  for (const value of origins) {
    try {
      const url = new URL(String(value).trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      allowed.add(url.origin);
    } catch {
      // Invalid configuration never broadens access.
    }
  }
  return {
    values: [...allowed],
    allows(origin) {
      if (!origin || origin === "null") return false;
      try {
        return allowed.has(new URL(String(origin)).origin) &&
          new URL(String(origin)).origin === String(origin);
      } catch {
        return false;
      }
    },
  };
}

const SECRET_FILE_PATTERNS = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)\.(?:npmrc|pypirc|netrc)(?:$|\/)/i,
  /(^|\/)(?:id_rsa|id_ed25519)(?:\.pub)?$/i,
  /(^|\/)\.(?:ssh|aws|azure)(?:\/|$)/i,
  /(^|\/)\.config\/gcloud(?:\/|$)/i,
  /(^|\/)(?:credentials|service[-_]?account)(?:\.[^/]*)?$/i,
  /\.(?:pem|p12|pfx|key)$/i,
];

export function isSecretWorkspacePath(requested) {
  const normalized = String(requested || "")
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "");
  if (/^\.env\.(?:example|sample|template)$/i.test(normalized) ||
      /\/\.env\.(?:example|sample|template)$/i.test(normalized)) {
    return false;
  }
  return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function assertSafeWorkspacePath(requested) {
  if (isSecretWorkspacePath(requested)) {
    throw new Error("Secret-bearing workspace paths are blocked by the companion.");
  }
}

export async function canonicalWorkspace(directory) {
  const resolved = await fs.realpath(path.resolve(directory));
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error("Workspace must be a folder.");
  return resolved;
}

export async function resolveInsideWorkspace(root, requested = ".", options = {}) {
  assertSafeWorkspacePath(requested);
  const workspace = await fs.realpath(path.resolve(root));
  const lexicalTarget = path.resolve(workspace, String(requested || "."));
  if (!within(workspace, lexicalTarget)) {
    throw new Error("Path is outside the selected workspace.");
  }

  try {
    const realTarget = await fs.realpath(lexicalTarget);
    if (!within(workspace, realTarget)) {
      throw new Error("Path resolves outside the selected workspace.");
    }
    return realTarget;
  } catch (error) {
    if (error?.code !== "ENOENT" || !options.allowMissing) throw error;
  }

  let ancestor = lexicalTarget;
  while (ancestor !== path.dirname(ancestor)) {
    ancestor = path.dirname(ancestor);
    try {
      const realAncestor = await fs.realpath(ancestor);
      if (!within(workspace, realAncestor)) {
        throw new Error("Path resolves outside the selected workspace.");
      }
      return lexicalTarget;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("No safe existing parent was found inside the workspace.");
}

export async function resolveDeletionTarget(root, requested) {
  assertSafeWorkspacePath(requested);
  const workspace = await fs.realpath(path.resolve(root));
  const lexicalTarget = path.resolve(workspace, String(requested || "."));
  if (!within(workspace, lexicalTarget) || lexicalTarget === workspace) {
    throw new Error("The workspace root cannot be deleted.");
  }
  const stat = await fs.lstat(lexicalTarget);
  if (stat.isSymbolicLink()) {
    throw new Error("Deleting symbolic links is blocked.");
  }
  const realTarget = await fs.realpath(lexicalTarget);
  if (!within(workspace, realTarget)) {
    throw new Error("Path resolves outside the selected workspace.");
  }
  return realTarget;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

export function fingerprint(action, payload) {
  return createHash("sha256")
    .update(JSON.stringify({ action, payload: stable(payload) }))
    .digest("hex");
}

export function actionPreview(action, payload, workspace) {
  const args = payload?.arguments || payload || {};
  const targets = [
    args.path,
    args.from,
    args.to,
    ...(Array.isArray(args.paths) ? args.paths : []),
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => String(value));
  const contentParts = [args.content, args.search, args.replace].filter(
    (value) => typeof value === "string",
  );
  return {
    action,
    workspace,
    command: typeof args.command === "string" ? args.command : undefined,
    targets,
    contentHash: contentParts.length
      ? createHash("sha256").update(contentParts.join("\u0000")).digest("hex")
      : undefined,
    requestHash: fingerprint(action, payload),
  };
}

export function createApprovalGate({
  ttl = 90_000,
  maxAttempts = 3,
  onCode = () => undefined,
} = {}) {
  const approvals = new Map();
  return {
    request(action, payload) {
      const id = randomUUID();
      const code = String(randomInt(100000, 1_000_000));
      approvals.set(id, {
        code,
        fingerprint: fingerprint(action, payload),
        expiresAt: Date.now() + ttl,
        attempts: 0,
      });
      onCode({ id, code, action, expiresIn: Math.round(ttl / 1000) });
      return { id, expiresIn: Math.round(ttl / 1000) };
    },
    verify({ id, code, action, payload }) {
      const approval = approvals.get(String(id || ""));
      if (!approval) throw new Error("Approval request is missing or expired.");
      if (Date.now() > approval.expiresAt) {
        approvals.delete(id);
        throw new Error("Approval code expired.");
      }
      approval.attempts += 1;
      if (approval.attempts > maxAttempts) {
        approvals.delete(id);
        throw new Error("Too many approval attempts.");
      }
      const expectedFingerprint = fingerprint(action, payload);
      const suppliedCode = Buffer.from(String(code || "").padEnd(6, "\0"));
      const expectedCode = Buffer.from(approval.code.padEnd(6, "\0"));
      const codeMatches =
        suppliedCode.length === expectedCode.length && timingSafeEqual(suppliedCode, expectedCode);
      if (!codeMatches || expectedFingerprint !== approval.fingerprint) {
        throw new Error("Approval does not match this exact action.");
      }
      approvals.delete(id);
      return true;
    },
    clear() {
      approvals.clear();
    },
  };
}

export function safeCommandEnvironment(environment, workspace) {
  const allow = new Set([
    "PATH",
    "Path",
    "SystemRoot",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "TMP",
    "TEMP",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "TERM",
    "SHELL",
    "USER",
    "USERNAME",
    "USERPROFILE",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "PROGRAMDATA",
    "APPDATA",
    "LOCALAPPDATA",
  ]);
  const safe = Object.fromEntries(
    Object.entries(environment).filter(([key, value]) => allow.has(key) && typeof value === "string"),
  );
  safe.LIMITLESS_WORKSPACE = workspace;
  safe.NO_COLOR = "1";
  return safe;
}
