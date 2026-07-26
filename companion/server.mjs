import http from "node:http";
import { exec } from "node:child_process";
import { spawn } from "node:child_process";
import { randomBytes, randomInt } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  ALWAYS_REVIEWED_TOOLS,
  MUTATING_TOOLS,
  actionPreview,
  canonicalWorkspace,
  createOriginPolicy,
  createApprovalGate,
  isSecretWorkspacePath,
  resolveDeletionTarget,
  resolveInsideWorkspace,
  safeCommandEnvironment,
} from "./security.mjs";

const HOST = "127.0.0.1";
const PORT = 4317;
const companionDir = path.dirname(fileURLToPath(import.meta.url));
const defaultAppUrl = "https://limitless-ai.professor-aarish-web.chatgpt.site";
let configuredAppUrl = process.env.LIMITLESS_APP_URL || defaultAppUrl;
try {
  const fromFile = (await fs.readFile(path.join(companionDir, "app-url.txt"), "utf8")).trim();
  if (/^https?:\/\//i.test(fromFile)) configuredAppUrl = fromFile;
} catch {
  // Use the environment or packaged default.
}
const originPolicy = createOriginPolicy([
  configuredAppUrl,
  defaultAppUrl,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
  ...(process.env.LIMITLESS_ALLOWED_ORIGINS || "").split(","),
]);
const pairingTtl = Math.min(
  Math.max(Number(process.env.LIMITLESS_PAIR_TTL_MS) || 10 * 60_000, 60_000),
  60 * 60_000,
);
const sessionTtl = Math.min(
  Math.max(Number(process.env.LIMITLESS_SESSION_TTL_MS) || 12 * 60 * 60_000, 5 * 60_000),
  24 * 60 * 60_000,
);
let pairCode =
  process.env.LIMITLESS_PAIR_CODE || String(randomInt(100000, 1_000_000));
let pairCodeExpiresAt = Date.now() + pairingTtl;
let pairCodeConsumed = false;
const executableName = path.basename(process.execPath).toLowerCase();
const standaloneDesktop =
  process.env.LIMITLESS_STANDALONE === "1" ||
  (os.platform() === "win32" && /^limitlessai.*\.exe$/.test(executableName));
let sessionToken = "";
let workspace = "";
let trusted = false;
let pairedOrigin = "";
let sessionExpiresAt = 0;
const pairAttempts = [];
const approvalGate = createApprovalGate({
  onCode: ({ code, action, expiresIn }) => {
    console.log(`\nLOCAL APPROVAL · ${action}`);
    console.log(`Code: ${code} · expires in ${expiresIn}s`);
  },
});

const json = (request, response, status, data) => {
  const origin = request.headers.origin;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Headers": "content-type,x-limitless-token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (originPolicy.allows(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  response.writeHead(status, headers);
  response.end(status === 204 ? undefined : JSON.stringify(data));
};

const readBody = async (request) => {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2_000_000) {
      const error = new Error("Request is too large.");
      error.status = 413;
      throw error;
    }
  }
  return body ? JSON.parse(body) : {};
};

const requireSession = (request) => {
  if (sessionToken && Date.now() > sessionExpiresAt) {
    sessionToken = "";
    workspace = "";
    trusted = false;
    pairedOrigin = "";
    approvalGate.clear();
  }
  if (!sessionToken || request.headers["x-limitless-token"] !== sessionToken) {
    const error = new Error("Not paired.");
    error.status = 401;
    throw error;
  }
  if (!request.headers.origin || request.headers.origin !== pairedOrigin) {
    const error = new Error("This session is paired with another app origin.");
    error.status = 403;
    throw error;
  }
};

const safePath = (requested = ".", options = {}) =>
  resolveInsideWorkspace(workspace, requested, options);

const compact = (value, limit = 120000) => {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit)}\n…output truncated` : text;
};

const listFiles = async (relativePath = ".", depth = 3) => {
  const root = await safePath(relativePath);
  const output = [];
  const walk = async (directory, level) => {
    if (output.length >= 600 || level > Math.min(Math.max(Number(depth) || 3, 1), 6)) return;
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (output.length >= 600 || [".git", "node_modules", "dist", ".next"].includes(entry.name)) {
        continue;
      }
      const full = path.join(directory, entry.name);
      const relative = path.relative(workspace, full).split(path.sep).join("/");
      if (isSecretWorkspacePath(relative)) continue;
      const type = entry.isSymbolicLink()
        ? "symlink"
        : entry.isDirectory()
          ? "directory"
          : "file";
      output.push({ path: relative, type });
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        const canonical = await safePath(relative);
        await walk(canonical, level + 1);
      }
    }
  };
  await walk(root, 1);
  return output;
};

const searchFiles = async (query, relativePath = ".", maxResults = 80) => {
  const needle = String(query || "").toLowerCase();
  if (!needle) throw new Error("Search query is required.");
  const entries = await listFiles(relativePath, 6);
  const results = [];
  const binaryExtensions = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip",
    ".exe", ".dll", ".woff", ".woff2", ".mp3", ".mp4",
  ]);
  const maximum = Math.min(Number(maxResults) || 80, 200);
  for (const entry of entries) {
    if (results.length >= maximum) break;
    if (entry.type !== "file") continue;
    if (entry.path.toLowerCase().includes(needle)) {
      results.push({ path: entry.path, line: 0, text: "Filename match" });
    }
    if (binaryExtensions.has(path.extname(entry.path).toLowerCase())) continue;
    try {
      const full = await safePath(entry.path);
      const stat = await fs.stat(full);
      if (stat.size > 1_000_000) continue;
      const lines = (await fs.readFile(full, "utf8")).split(/\r?\n/);
      for (let index = 0; index < lines.length && results.length < maximum; index += 1) {
        if (lines[index].toLowerCase().includes(needle)) {
          results.push({
            path: entry.path,
            line: index + 1,
            text: compact(lines[index].trim(), 300),
          });
        }
      }
    } catch {
      // Unreadable or non-text files are intentionally skipped.
    }
  }
  return results;
};

const runCommand = (command, timeout = 120000) =>
  new Promise((resolve) => {
    exec(
      String(command),
      {
        cwd: workspace,
        timeout: Math.min(Math.max(Number(timeout) || 120000, 1000), 300000),
        maxBuffer: 2_000_000,
        windowsHide: true,
        env: safeCommandEnvironment(process.env, workspace),
      },
      (error, stdout, stderr) =>
        resolve({
          ok: !error,
          exitCode: error?.code ?? 0,
          stdout: compact(stdout),
          stderr: compact(stderr || (error?.killed ? "Command timed out." : "")),
        }),
    );
  });

const tools = {
  list_files: async ({ path: target = ".", depth = 3 }) => ({
    entries: await listFiles(target, depth),
  }),
  search_files: async ({ query, path: target = ".", max_results: maxResults = 80 }) => ({
    results: await searchFiles(query, target, maxResults),
  }),
  read_file: async ({ path: target }) => {
    const full = await safePath(target);
    return { path: target, content: compact(await fs.readFile(full, "utf8"), 500000) };
  },
  read_files: async ({ paths = [] }) => {
    const selected = Array.isArray(paths) ? paths.slice(0, 25) : [];
    return {
      files: await Promise.all(
        selected.map(async (target) => {
          try {
            const full = await safePath(target);
            return { path: target, content: compact(await fs.readFile(full, "utf8"), 250000) };
          } catch (error) {
            return { path: target, error: error.message };
          }
        }),
      ),
    };
  },
  file_info: async ({ path: target }) => {
    const full = await safePath(target);
    const stat = await fs.stat(full);
    return {
      path: target,
      type: stat.isDirectory() ? "directory" : "file",
      bytes: stat.size,
      modified: stat.mtime.toISOString(),
    };
  },
  write_file: async ({ path: target, content = "" }) => {
    const full = await safePath(target, { allowMissing: true });
    await fs.mkdir(path.dirname(full), { recursive: true });
    await safePath(path.relative(workspace, path.dirname(full)));
    await fs.writeFile(full, String(content), { encoding: "utf8", flag: "w" });
    await safePath(target);
    return { path: target, bytes: Buffer.byteLength(String(content)), written: true };
  },
  replace_in_file: async ({ path: target, search, replace = "", all = false }) => {
    const full = await safePath(target);
    const original = await fs.readFile(full, "utf8");
    if (!original.includes(String(search))) throw new Error("Search text was not found.");
    const updated = all
      ? original.split(String(search)).join(String(replace))
      : original.replace(String(search), String(replace));
    await fs.writeFile(full, updated, "utf8");
    return {
      path: target,
      replacements: all ? original.split(String(search)).length - 1 : 1,
    };
  },
  make_directory: async ({ path: target }) => {
    const full = await safePath(target, { allowMissing: true });
    await fs.mkdir(full, { recursive: true });
    await safePath(target);
    return { path: target, created: true };
  },
  move_path: async ({ from, to }) => {
    const source = await safePath(from);
    const destination = await safePath(to, { allowMissing: true });
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await safePath(path.relative(workspace, path.dirname(destination)));
    await fs.rename(source, destination);
    await safePath(to);
    return { from, to, moved: true };
  },
  copy_path: async ({ from, to }) => {
    const source = await safePath(from);
    const destination = await safePath(to, { allowMissing: true });
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await safePath(path.relative(workspace, path.dirname(destination)));
    await fs.cp(source, destination, { recursive: true, force: false, dereference: false });
    await safePath(to);
    return { from, to, copied: true };
  },
  delete_path: async ({ path: target }) => {
    if (!target || target === ".") throw new Error("The workspace root cannot be deleted.");
    const full = await resolveDeletionTarget(workspace, target);
    await fs.rm(full, { recursive: true, force: false });
    return { path: target, deleted: true };
  },
  run_command: async ({ command, timeout }) => runCommand(command, timeout),
};

const requireApproval = (request, response, action, payload, approval) => {
  if (approval?.id && approval?.code) {
    approvalGate.verify({
      id: approval.id,
      code: approval.code,
      action,
      payload,
    });
    return false;
  }
  const requested = approvalGate.request(action, payload);
  const review = actionPreview(action, payload, workspace);
  console.log(`Review details: ${JSON.stringify(review)}`);
  json(request, response, 409, {
    approval_required: true,
    approval_id: requested.id,
    action,
    expires_in: requested.expiresIn,
    review,
  });
  return true;
};

const openDesktopWindow = async () => {
  if (!process.argv.includes("--desktop") && !standaloneDesktop) return;
  const appUrl = configuredAppUrl;
  const launch =
    os.platform() === "win32"
      ? { command: "cmd.exe", args: ["/c", "start", "", "msedge", `--app=${appUrl}`] }
      : os.platform() === "darwin"
        ? { command: "open", args: [appUrl] }
        : { command: "xdg-open", args: [appUrl] };
  try {
    const child = spawn(launch.command, launch.args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch {
    console.log(`Open Limitless AI: ${appUrl}`);
  }
};

const server = http.createServer(async (request, response) => {
  try {
    const requestOrigin = request.headers.origin;
    if (requestOrigin && !originPolicy.allows(requestOrigin)) {
      return json(request, response, 403, { error: "App origin is not allowed." });
    }
    if (request.method === "OPTIONS") return json(request, response, 204, {});
    const url = new URL(request.url, `http://${HOST}:${PORT}`);
    if (request.method === "GET" && url.pathname === "/health") {
      return json(request, response, 200, {
        ok: true,
        name: "Limitless Desktop",
        version: "2.0.0",
        paired: Boolean(sessionToken),
        standalone: standaloneDesktop,
        security: {
          realpathWorkspaceLock: true,
          localReviewApprovals: true,
          filteredCommandEnvironment: true,
          exactOriginBinding: true,
          expiringSessions: true,
          secretFileDenial: true,
          symlinkSafeDeletion: true,
        },
        capabilities: Object.keys(tools),
      });
    }
    if (request.method === "POST" && url.pathname === "/pair") {
      if (!requestOrigin || !originPolicy.allows(requestOrigin)) {
        return json(request, response, 403, { error: "Pairing requires an allowed app origin." });
      }
      const now = Date.now();
      while (pairAttempts.length && pairAttempts[0] < now - 60_000) pairAttempts.shift();
      if (pairAttempts.length >= 5) {
        return json(request, response, 429, { error: "Too many pairing attempts. Wait one minute." });
      }
      pairAttempts.push(now);
      if (pairCodeConsumed || now > pairCodeExpiresAt) {
        return json(request, response, 410, {
          error: "Pairing code expired or was already used. Restart the companion for a new code.",
        });
      }
      if (sessionToken && pairedOrigin && request.headers.origin !== pairedOrigin) {
        return json(request, response, 409, { error: "The companion is already paired with another app origin." });
      }
      const body = await readBody(request);
      if (String(body.code) !== pairCode) {
        return json(request, response, 403, { error: "Pairing code is incorrect." });
      }
      workspace = await canonicalWorkspace(String(body.workspace || ""));
      sessionToken = randomBytes(24).toString("hex");
      sessionExpiresAt = Date.now() + sessionTtl;
      trusted = false;
      pairedOrigin = requestOrigin;
      pairCodeConsumed = true;
      approvalGate.clear();
      console.log(`\nPaired with workspace: ${workspace}`);
      return json(request, response, 200, {
        token: sessionToken,
        workspace,
        trusted,
        expiresAt: sessionExpiresAt,
      });
    }

    requireSession(request);
    if (request.method === "GET" && url.pathname === "/status") {
      return json(request, response, 200, {
        ok: true,
        workspace,
        trusted,
        platform: os.platform(),
        expiresAt: sessionExpiresAt,
      });
    }
    if (request.method === "POST" && url.pathname === "/unpair") {
      const body = await readBody(request);
      const payload = { workspace, origin: pairedOrigin };
      if (requireApproval(request, response, "unpair device", payload, body.approval)) return;
      sessionToken = "";
      workspace = "";
      trusted = false;
      pairedOrigin = "";
      sessionExpiresAt = 0;
      pairCode = String(randomInt(100000, 1_000_000));
      pairCodeExpiresAt = Date.now() + pairingTtl;
      pairCodeConsumed = false;
      approvalGate.clear();
      console.log(`\nNew pairing code: ${pairCode}`);
      return json(request, response, 200, { ok: true, unpaired: true });
    }
    if (request.method === "POST" && url.pathname === "/mode") {
      const body = await readBody(request);
      const nextTrusted = Boolean(body.trusted);
      if (nextTrusted && !trusted) {
        const payload = { trusted: true, workspace };
        if (requireApproval(request, response, "enable trusted mode", payload, body.approval)) return;
      }
      trusted = nextTrusted;
      console.log(`Execution mode: ${trusted ? "TRUSTED" : "REVIEW"}`);
      return json(request, response, 200, { trusted });
    }
    if (request.method === "POST" && url.pathname === "/tool") {
      const body = await readBody(request);
      const tool = tools[body.name];
      if (!tool) return json(request, response, 400, { error: "Unknown tool." });
      const payload = { name: body.name, arguments: body.arguments || {} };
      if (
        ALWAYS_REVIEWED_TOOLS.has(body.name) ||
        (!trusted && MUTATING_TOOLS.has(body.name))
      ) {
        if (requireApproval(request, response, body.name, payload, body.approval)) return;
      }
      const result = await tool(body.arguments || {});
      return json(request, response, 200, { ok: true, result });
    }
    return json(request, response, 404, { error: "Not found." });
  } catch (error) {
    return json(request, response, error.status || 400, {
      error: error.message || "Companion error.",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.clear();
  console.log("╭──────────────────────────────────────────────╮");
  console.log("│        LIMITLESS AI DESKTOP COMPANION        │");
  console.log("╰──────────────────────────────────────────────╯");
  console.log(`\nPairing code: ${pairCode}`);
  console.log(`Companion: http://${HOST}:${PORT}`);
  console.log("\nReview mode is enforced by this local server.");
  console.log("Approval codes appear only in this window.");
  console.log("Keep this window open while using Agent mode.");
  openDesktopWindow();
});
