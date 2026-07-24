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

export async function canonicalWorkspace(directory) {
  const resolved = await fs.realpath(path.resolve(directory));
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error("Workspace must be a folder.");
  return resolved;
}

export async function resolveInsideWorkspace(root, requested = ".", options = {}) {
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

function fingerprint(action, payload) {
  return createHash("sha256")
    .update(JSON.stringify({ action, payload: stable(payload) }))
    .digest("hex");
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
