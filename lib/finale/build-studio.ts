"use client";

import JSZip from "jszip";
import type {
  CodeProject,
  ProjectAnalysis,
  ProjectApproval,
  ProjectVerification,
} from "@/lib/finale/contracts";
import {
  commandRisk,
  createRepositoryIndex,
  sandboxPreviewDocument,
} from "@/lib/finale/policy.mjs";
import { uid } from "@/lib/types";

const BLOCKED_PATH = /(^|\/)(?:node_modules|\.git|dist|\.next|\.env(?:\.|$)|id_rsa|id_ed25519)(\/|$)/i;
const SAFE_TEXT_EXTENSIONS = new Set([
  ".html", ".css", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".txt",
  ".svg", ".yml", ".yaml", ".toml", ".sql", ".mjs", ".cjs",
]);

function normalizePath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.split("/").some((part) => part === ".." || part === ".") ||
    BLOCKED_PATH.test(normalized)
  ) {
    throw new Error(`Unsafe project path: ${value}`);
  }
  return normalized;
}

function extension(path: string): string {
  const index = path.lastIndexOf(".");
  return index < 0 ? "" : path.slice(index).toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function titleFromPrompt(prompt: string): string {
  const firstLine = prompt.trim().split(/\r?\n/)[0] || "New project";
  return firstLine
    .replace(/^(?:build|create|make|design)\s+(?:me\s+)?/i, "")
    .replace(/[.!?]+$/, "")
    .slice(0, 72) || "New project";
}

function balanced(source: string, open: string, close: string): boolean {
  let count = 0;
  let quote = "";
  let escaped = false;
  for (const character of source) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === open) count += 1;
    if (character === close) count -= 1;
    if (count < 0) return false;
  }
  return count === 0;
}

function packageMetadata(files: Record<string, string>): {
  scripts: Record<string, string>;
  dependencies: string[];
} {
  try {
    const value = JSON.parse(files["package.json"] || "{}") as {
      scripts?: Record<string, unknown>;
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
    return {
      scripts: Object.fromEntries(
        Object.entries(value.scripts || {}).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      dependencies: [
        ...Object.keys(value.dependencies || {}),
        ...Object.keys(value.devDependencies || {}),
      ],
    };
  } catch {
    return { scripts: {}, dependencies: [] };
  }
}

export function analyzeCodeProject(project: Pick<CodeProject, "files" | "stack" | "packageManager">): ProjectAnalysis {
  const paths = Object.keys(project.files);
  const metadata = packageMetadata(project.files);
  const routes = paths
    .filter((path) =>
      /^(?:app|pages|src\/pages)\/.+\.(?:tsx?|jsx?|html)$/.test(path) ||
      /^(?:index|about|contact)\.html$/.test(path),
    )
    .map((path) =>
      path
        .replace(/^(?:app|pages|src\/pages)\//, "/")
        .replace(/\/(?:page|index)\.(?:tsx?|jsx?|html)$/, "")
        .replace(/\.(?:tsx?|jsx?|html)$/, "")
        .replace(/^index$/, "/") || "/",
    )
    .filter((path, index, all) => all.indexOf(path) === index)
    .sort();
  const joined = Object.values(project.files).join("\n");
  const dataLayers = [
    ["Supabase", /@supabase\/|supabase\./i],
    ["Prisma", /@prisma\/|prisma\./i],
    ["Drizzle", /drizzle-orm/i],
    ["IndexedDB", /\bindexedDB\b|idb\//i],
    ["REST/HTTP", /\bfetch\s*\(|axios\./i],
  ]
    .filter(([, pattern]) => (pattern as RegExp).test(joined))
    .map(([label]) => label as string);
  const testCommands = Object.entries(metadata.scripts)
    .filter(([name]) => /test|lint|typecheck|check|build/.test(name))
    .map(([name, command]) => `${name}: ${command}`);
  const protectedFiles = paths.filter((path) =>
    /(^|\/)(?:\.env(?:\.|$)|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|supabase\/migrations\/|\.github\/workflows\/)/i.test(path),
  );
  const index = createRepositoryIndex(project.files);
  return {
    stack: project.stack,
    packageManager: project.packageManager,
    routes: routes.length ? routes : ["/"],
    dataLayers,
    testCommands,
    protectedFiles,
    generatedAt: Date.now(),
    repositoryFingerprint: index.fingerprint,
  };
}

export async function generateCodeProjectFromPrompt(input: {
  prompt: string;
  ownerId: string;
  deviceId: string;
}): Promise<CodeProject> {
  const prompt = input.prompt.trim();
  if (prompt.length < 12) {
    throw new Error("Describe the project in at least 12 characters.");
  }
  const name = titleFromPrompt(prompt);
  const safeName = escapeHtml(name);
  const safePrompt = escapeHtml(prompt.slice(0, 1_200));
  const files: Record<string, string> = {
    "index.html": `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${safeName}">
  <title>${safeName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header><span>LIMITLESS BUILD STUDIO</span><button id="theme" type="button" aria-pressed="false">Toggle contrast</button></header>
  <main id="main">
    <p class="eyebrow">ORIGINAL LOCAL PROJECT</p>
    <h1>${safeName}</h1>
    <p class="lede">${safePrompt}</p>
    <section aria-labelledby="features"><h2 id="features">What this project includes</h2><div class="grid">
      <article><h3>Responsive</h3><p>Mobile-first layout with clear focus states and reduced-motion support.</p></article>
      <article><h3>Editable</h3><p>Real HTML, CSS, and JavaScript files with portable checkpoints.</p></article>
      <article><h3>Private preview</h3><p>The preview blocks network access and receives no platform credentials.</p></article>
    </div></section>
  </main>
  <footer><span id="status" role="status">Ready</span></footer>
  <script src="app.js"></script>
</body>
</html>`,
    "styles.css": `:root{color-scheme:dark;--bg:#0b0b0b;--panel:#151515;--text:#f5f5f0;--muted:#aaa;--line:#363636}*{box-sizing:border-box}html{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:var(--bg);color:var(--text)}body{margin:0;min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}.skip-link{position:fixed;left:12px;top:-60px;background:#fff;color:#000;padding:10px;z-index:10}.skip-link:focus{top:12px}header,footer{display:flex;justify-content:space-between;align-items:center;padding:18px clamp(18px,5vw,72px);border-bottom:1px solid var(--line)}footer{border-top:1px solid var(--line);border-bottom:0}button{font:inherit;border:1px solid var(--line);background:var(--text);color:var(--bg);padding:10px 14px;border-radius:999px;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #fff;outline-offset:3px}main{width:min(1100px,calc(100% - 36px));margin:auto;padding:clamp(56px,10vw,140px) 0}.eyebrow{letter-spacing:.16em;font-size:.75rem;color:var(--muted)}h1{max-width:14ch;font-size:clamp(3rem,10vw,7rem);line-height:.92;letter-spacing:-.065em;margin:.2em 0}.lede{max-width:68ch;color:var(--muted);font-size:clamp(1rem,2.4vw,1.3rem);line-height:1.65}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:24px}.grid article{padding:24px;background:var(--panel);border:1px solid var(--line);border-radius:18px}.high-contrast{--bg:#000;--panel:#000;--text:#fff;--muted:#fff;--line:#fff}@media(max-width:720px){.grid{grid-template-columns:1fr}header{align-items:flex-start;gap:16px}}@media(prefers-reduced-motion:no-preference){button{transition:transform .15s ease}button:hover{transform:translateY(-1px)}}`,
    "app.js": `const button=document.querySelector("#theme");const status=document.querySelector("#status");button?.addEventListener("click",()=>{const active=document.documentElement.classList.toggle("high-contrast");button.setAttribute("aria-pressed",String(active));status.textContent=active?"High contrast enabled":"Standard contrast enabled";});`,
    "README.md": `# ${name}\n\nGenerated from an explicit user prompt by Limitless Build Studio. The project is dependency-free and runs by opening \`index.html\` or serving the folder with any static server.\n\n## Original request\n\n${prompt}\n`,
    "limitless.project.json": JSON.stringify(
      {
        format: "limitless-project",
        version: 1,
        intent: prompt,
        source: "prompt",
        networkRequired: false,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  };
  const now = Date.now();
  const id = uid();
  const index = createRepositoryIndex(files);
  const project: CodeProject = {
    id,
    ownerId: input.ownerId,
    name,
    stack: "static",
    packageManager: "none",
    files,
    entryFile: "index.html",
    selectedFile: "index.html",
    repositoryFingerprint: index.fingerprint,
    versions: [],
    buildStatus: "idle",
    buildLog: ["Generated five real source files from the project brief."],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId: input.deviceId,
    sourceKind: "prompt",
    projectIntent: prompt,
    verificationHistory: [],
    approvals: [],
  };
  project.analysis = analyzeCodeProject(project);
  project.versions = [{
    id: uid(),
    projectId: id,
    label: "Prompt-generated source",
    files: structuredClone(files),
    repositoryFingerprint: index.fingerprint,
    createdAt: now,
  }];
  return project;
}

export async function importCodeProjectZip(
  file: File,
  input: { ownerId: string; deviceId: string; maxBytes?: number },
): Promise<CodeProject> {
  const maxBytes = Math.min(Math.max(input.maxBytes || 25_000_000, 1_000_000), 100_000_000);
  if (file.size > maxBytes) throw new Error("Project archive exceeds the configured size limit.");
  const zip = await JSZip.loadAsync(await file.arrayBuffer(), {
    checkCRC32: true,
    createFolders: false,
  });
  const files: Record<string, string> = {};
  let expanded = 0;
  const entries = Object.values(zip.files);
  if (entries.length > 2_000) throw new Error("Project archive contains too many entries.");
  for (const entry of entries) {
    if (entry.dir) continue;
    const path = normalizePath(entry.name);
    if (!SAFE_TEXT_EXTENSIONS.has(extension(path))) continue;
    const bytes = await entry.async("uint8array");
    expanded += bytes.byteLength;
    if (expanded > maxBytes * 4) throw new Error("Project archive expands beyond the safe limit.");
    files[path] = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  if (!Object.keys(files).length) throw new Error("No supported project source files were found.");
  const entryFile =
    ["index.html", "app/page.tsx", "src/App.tsx", "src/main.tsx"].find((path) => files[path]) ||
    Object.keys(files)[0];
  const now = Date.now();
  const id = uid();
  const index = createRepositoryIndex(files);
  const project: CodeProject = {
    id,
    ownerId: input.ownerId,
    name: file.name.replace(/\.zip$/i, "") || "Imported project",
    stack: files["next.config.ts"] || files["next.config.js"] ? "next" : files["src/App.tsx"] ? "react" : "static",
    packageManager: files["pnpm-lock.yaml"]
      ? "pnpm"
      : files["yarn.lock"]
        ? "yarn"
        : files["bun.lockb"]
          ? "bun"
          : files["package.json"]
            ? "npm"
            : "none",
    files,
    entryFile,
    selectedFile: entryFile,
    repositoryFingerprint: index.fingerprint,
    versions: [
      {
        id: uid(),
        projectId: id,
        label: "Imported source",
        files: structuredClone(files),
        repositoryFingerprint: index.fingerprint,
        createdAt: now,
      },
    ],
    lastKnownGoodVersionId: undefined,
    buildStatus: "idle",
    buildLog: [`Imported ${Object.keys(files).length} safe text files.`, "Binary and secret-shaped files were excluded."],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId: input.deviceId,
    sourceKind: "zip",
    sourceLocator: file.name,
    verificationHistory: [],
    approvals: [],
  };
  project.analysis = analyzeCodeProject(project);
  return project;
}

export function parsePublicGitRepository(value: string): {
  archiveUrl: string;
  sourceLocator: string;
  name: string;
} {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid public GitHub repository URL.");
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("Browser repository import currently supports public HTTPS GitHub URLs only.");
  }
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 2 || !/^[A-Za-z0-9_.-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(parts[1])) {
    throw new Error("The repository URL must include an owner and repository.");
  }
  const repository = parts[1].replace(/\.git$/i, "");
  const branch =
    parts[2] === "tree" && parts[3]
      ? parts.slice(3).join("/")
      : "main";
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes("..")) {
    throw new Error("The repository branch is invalid.");
  }
  return {
    archiveUrl: `https://codeload.github.com/${parts[0]}/${repository}/zip/refs/heads/${branch}`,
    sourceLocator: `https://github.com/${parts[0]}/${repository}${branch === "main" ? "" : `/tree/${branch}`}`,
    name: repository,
  };
}

export async function importPublicGitRepository(input: {
  repositoryUrl: string;
  ownerId: string;
  deviceId: string;
  fetchImpl?: typeof fetch;
}): Promise<CodeProject> {
  const parsed = parsePublicGitRepository(input.repositoryUrl);
  const response = await (input.fetchImpl || fetch)(parsed.archiveUrl, {
    method: "GET",
    credentials: "omit",
    redirect: "error",
    cache: "no-store",
    headers: { accept: "application/zip" },
  });
  if (!response.ok) {
    throw new Error(`Repository archive could not be fetched (HTTP ${response.status}).`);
  }
  const length = Number(response.headers.get("content-length") || 0);
  if (length > 100_000_000) throw new Error("Repository archive exceeds the safe import limit.");
  const file = new File([await response.arrayBuffer()], `${parsed.name}.zip`, {
    type: "application/zip",
  });
  const imported = await importCodeProjectZip(file, input);
  const commonRoot = Object.keys(imported.files)
    .map((path) => path.split("/")[0])
    .filter((root, index, roots) => root && roots.every((candidate) => candidate === root))[0];
  if (commonRoot) {
    imported.files = Object.fromEntries(
      Object.entries(imported.files).map(([path, content]) => [
        path.slice(commonRoot.length + 1),
        content,
      ]),
    );
    imported.entryFile =
      ["index.html", "app/page.tsx", "src/App.tsx", "src/main.tsx"].find((path) => imported.files[path]) ||
      Object.keys(imported.files)[0];
    imported.selectedFile = imported.entryFile;
  }
  imported.name = parsed.name;
  imported.sourceKind = "git";
  imported.sourceLocator = parsed.sourceLocator;
  imported.repositoryFingerprint = createRepositoryIndex(imported.files).fingerprint;
  imported.analysis = analyzeCodeProject(imported);
  imported.buildLog = [
    `Imported ${Object.keys(imported.files).length} safe text files from a public repository archive.`,
    "Git history and private repositories require the approved GitHub connection.",
  ];
  return imported;
}

export function checkpointCodeProject(project: CodeProject, label: string): CodeProject {
  const now = Date.now();
  const index = createRepositoryIndex(project.files);
  const version = {
    id: uid(),
    projectId: project.id,
    label: label.trim() || `Checkpoint ${project.versions.length + 1}`,
    files: structuredClone(project.files),
    repositoryFingerprint: index.fingerprint,
    createdAt: now,
  };
  return {
    ...project,
    repositoryFingerprint: index.fingerprint,
    versions: [version, ...project.versions].slice(0, 100),
    lastKnownGoodVersionId: project.buildStatus === "passed" ? version.id : project.lastKnownGoodVersionId,
    updatedAt: now,
    revision: project.revision + 1,
  };
}

export function restoreCodeProject(project: CodeProject, versionId: string): CodeProject {
  const version = project.versions.find((candidate) => candidate.id === versionId);
  if (!version) throw new Error("Project checkpoint was not found.");
  return checkpointCodeProject(
    {
      ...project,
      files: structuredClone(version.files),
      selectedFile: version.files[project.selectedFile] ? project.selectedFile : Object.keys(version.files)[0],
      buildStatus: "idle",
      buildLog: [`Restored ${version.label}.`],
    },
    `Restore of ${version.label}`,
  );
}

export function duplicateCodeProject(project: CodeProject, ownerId: string, deviceId: string): CodeProject {
  const now = Date.now();
  const id = uid();
  const files = structuredClone(project.files);
  const index = createRepositoryIndex(files);
  const duplicate: CodeProject = {
    ...structuredClone(project),
    id,
    ownerId,
    deviceId,
    name: `${project.name} copy`,
    files,
    repositoryFingerprint: index.fingerprint,
    versions: [{
      id: uid(),
      projectId: id,
      label: "Duplicated source",
      files: structuredClone(files),
      repositoryFingerprint: index.fingerprint,
      createdAt: now,
    }],
    lastKnownGoodVersionId: undefined,
    buildStatus: "idle",
    buildLog: ["Duplicated into an isolated project identity."],
    approvals: [],
    verificationHistory: [],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deletedAt: undefined,
  };
  duplicate.analysis = analyzeCodeProject(duplicate);
  return duplicate;
}

export function createProjectApproval(
  action: ProjectApproval["action"],
  exactTarget: string,
  now = Date.now(),
): ProjectApproval {
  if (!exactTarget.trim()) throw new Error("An exact approval target is required.");
  return {
    id: uid(),
    action,
    status: "required",
    exactTarget: exactTarget.trim(),
    requestedAt: now,
  };
}

export function createSpecialistPlan(project: CodeProject): Array<{
  role: string;
  purpose: string;
  permission: "read" | "approval";
  maximumAttempts: number;
}> {
  const analysis = analyzeCodeProject(project);
  const roles = [
    { role: "Project scout", purpose: `Inspect ${Object.keys(project.files).length} indexed files and select relevant context.`, permission: "read" as const, maximumAttempts: 1 },
    { role: "Test runner", purpose: analysis.testCommands.length ? `Run ${analysis.testCommands.join(", ")} through an approved runtime.` : "Run the local structural verification suite.", permission: analysis.testCommands.length ? "approval" as const : "read" as const, maximumAttempts: 2 },
    { role: "Accessibility reviewer", purpose: "Check document language, labels, focusable controls, viewport metadata, and reduced-motion behavior.", permission: "read" as const, maximumAttempts: 2 },
    { role: "Security reviewer", purpose: "Check protected paths, preview policy, secrets, and outbound network use.", permission: "read" as const, maximumAttempts: 1 },
    { role: "Diff reviewer", purpose: "Compare the candidate source with the last known good checkpoint.", permission: "read" as const, maximumAttempts: 1 },
  ];
  return roles;
}

export function projectCommandPlan(commands: string[]): Array<{
  command: string;
  risk: ReturnType<typeof commandRisk>;
}> {
  return commands.map((command) => ({ command, risk: commandRisk(command) }));
}

export function validateCodeProject(project: CodeProject): {
  passed: boolean;
  errors: string[];
  warnings: string[];
  previewHtml: string;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const paths = Object.keys(project.files);
  if (!paths.length) errors.push("Project has no source files.");
  for (const path of paths) {
    try {
      normalizePath(path);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unsafe project path.");
    }
    if (project.files[path].length > 2_000_000) errors.push(`${path} exceeds the per-file limit.`);
  }
  if (!project.files[project.entryFile]) errors.push("Preview entry file is missing.");
  if (project.entryFile !== "index.html") {
    warnings.push("Interactive preview for framework projects requires the connected build runtime.");
  }
  const previewHtml =
    project.entryFile === "index.html"
      ? sandboxPreviewDocument(project.files, project.entryFile)
      : sandboxPreviewDocument(
          {
            "index.html": `<!doctype html><html><body><main><h1>${project.name}</h1><p>Source is preserved. Connect the build runtime to render this ${project.stack} project.</p></main></body></html>`,
          },
          "index.html",
        );
  return { passed: errors.length === 0, errors, warnings, previewHtml };
}

export function runLocalProjectVerification(
  project: CodeProject,
  options: {
    consoleErrors?: string[];
    runtimeEvidence?: { passed: boolean; detail: string };
    now?: number;
  } = {},
): ProjectVerification {
  const startedAt = options.now || Date.now();
  const checks: ProjectVerification["checks"] = [];
  const base = validateCodeProject(project);
  checks.push({
    id: "safe-paths",
    status: base.errors.length ? "failed" : "passed",
    detail: base.errors.length ? base.errors.join(" ") : "Every project path passed traversal and protected-path checks.",
  });
  const html = project.files[project.entryFile] || "";
  if (project.stack === "static") {
    checks.push({
      id: "html-document",
      status: /<!doctype html>/i.test(html) && /<html[^>]*\blang=/i.test(html) ? "passed" : "failed",
      detail: "Static entry must contain a doctype and document language.",
    });
    checks.push({
      id: "responsive-viewport",
      status: /<meta[^>]+name=["']viewport["']/i.test(html) ? "passed" : "failed",
      detail: "Responsive viewport metadata is required.",
    });
    checks.push({
      id: "accessible-name",
      status: /<title>[^<]+<\/title>/i.test(html) && /<h1(?:\s[^>]*)?>[^<]+/i.test(html) ? "passed" : "failed",
      detail: "A real page title and primary heading are required.",
    });
    const localReferences = [
      ...html.matchAll(/(?:src|href)=["'](?!https?:|data:|blob:|#|mailto:)([^"'?]+)[^"']*["']/gi),
    ].map((match) => match[1].replace(/^\.\//, ""));
    const missingReferences = localReferences.filter((path) => !project.files[path]);
    checks.push({
      id: "local-references",
      status: missingReferences.length ? "failed" : "passed",
      detail: missingReferences.length
        ? `Missing referenced files: ${missingReferences.join(", ")}.`
        : "Every local script and stylesheet reference resolves.",
    });
    const scripts = Object.entries(project.files).filter(([path]) => /\.(?:js|mjs)$/.test(path));
    const unbalanced = scripts
      .filter(([, source]) =>
        !balanced(source, "{", "}") ||
        !balanced(source, "(", ")") ||
        !balanced(source, "[", "]"),
      )
      .map(([path]) => path);
    checks.push({
      id: "script-syntax",
      status: unbalanced.length ? "failed" : "passed",
      detail: unbalanced.length
        ? `Unbalanced JavaScript delimiters: ${unbalanced.join(", ")}.`
        : "JavaScript delimiter and string structure passed the local parser.",
    });
  } else if (options.runtimeEvidence) {
    checks.push({
      id: "connected-runtime",
      status: options.runtimeEvidence.passed ? "passed" : "failed",
      detail: options.runtimeEvidence.detail,
    });
  } else {
    checks.push({
      id: "connected-runtime",
      status: "blocked",
      detail: "Framework projects require the paired local coding runtime to install dependencies, build, and serve the preview.",
    });
  }
  const consoleErrors = (options.consoleErrors || [])
    .map((value) => value.replace(/(?:bearer|sk-[a-z0-9_-]+)\s*\S*/gi, "[redacted]").slice(0, 500))
    .slice(0, 50);
  checks.push({
    id: "preview-console",
    status: consoleErrors.length ? "failed" : "passed",
    detail: consoleErrors.length ? `${consoleErrors.length} preview error(s) captured.` : "No preview-origin console errors were captured.",
  });
  const hasFailure = checks.some((check) => check.status === "failed");
  const needsRuntime = checks.some((check) => check.status === "blocked");
  const completedAt = Math.max(startedAt, Date.now());
  return {
    id: uid(),
    status: hasFailure ? "failed" : needsRuntime ? "requires-runtime" : "passed",
    checks,
    consoleErrors,
    viewportEvidence: [
      { viewport: "mobile", status: "not-run", detail: "Run the interactive viewport pass in the connected browser verifier." },
      { viewport: "tablet", status: "not-run", detail: "Run the interactive viewport pass in the connected browser verifier." },
      { viewport: "desktop", status: project.stack === "static" && !hasFailure ? "passed" : "not-run", detail: project.stack === "static" && !hasFailure ? "Secure preview source passed local checks." : "Not run." },
      { viewport: "wide", status: "not-run", detail: "Run the interactive viewport pass in the connected browser verifier." },
    ],
    startedAt,
    completedAt,
    repositoryFingerprint: createRepositoryIndex(project.files).fingerprint,
  };
}

export function applyProjectVerification(
  project: CodeProject,
  verification: ProjectVerification,
): CodeProject {
  const now = Date.now();
  const updated: CodeProject = {
    ...project,
    analysis: analyzeCodeProject(project),
    repositoryFingerprint: verification.repositoryFingerprint,
    verificationHistory: [verification, ...(project.verificationHistory || [])].slice(0, 50),
    buildStatus:
      verification.status === "passed"
        ? "passed"
        : verification.status === "cancelled"
          ? "cancelled"
          : "failed",
    buildLog: verification.checks.map((check) => `${check.status.toUpperCase()} ${check.id}: ${check.detail}`),
    updatedAt: now,
    revision: project.revision + 1,
  };
  if (verification.status !== "passed") return updated;
  const checkpointed = checkpointCodeProject(updated, "Verified build");
  return {
    ...checkpointed,
    lastKnownGoodVersionId: checkpointed.versions[0].id,
  };
}

export async function exportCodeProjectZip(project: CodeProject): Promise<Blob> {
  const validation = validateCodeProject(project);
  if (!validation.passed) throw new Error(validation.errors.join(" "));
  const zip = new JSZip();
  for (const [path, content] of Object.entries(project.files).sort(([a], [b]) => a.localeCompare(b))) {
    zip.file(normalizePath(path), content, { date: new Date(0) });
  }
  zip.file(
    "limitless-project.json",
    JSON.stringify(
      {
        format: "limitless-code-project",
        version: 1,
        projectId: project.id,
        name: project.name,
        stack: project.stack,
        repositoryFingerprint: createRepositoryIndex(project.files).fingerprint,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { date: new Date(0) },
  );
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "UNIX",
  });
}
