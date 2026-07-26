"use client";

import {
  getActiveWorkspaceScope,
  getDeviceId,
  getSetting,
  loadSecret,
  removeSecret,
  saveSecret,
  setSetting,
} from "@/lib/local-store";
import { uid } from "@/lib/types";
import type {
  CodeProject,
  FinaleState,
  ProfessionalDocumentDraft,
  ProviderRecord,
} from "@/lib/finale/contracts";
import { createRepositoryIndex, DEFAULT_USAGE_MODE } from "@/lib/finale/policy.mjs";

const STATE_KEY = "finale:workspace-state:v10";

const starterFiles = {
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Limitless project</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; color: #f5f5f2; background: #101010; }
      main { width: min(760px, calc(100% - 32px)); padding: 48px; border: 1px solid #333; border-radius: 24px; background: #181818; }
      h1 { margin: 0 0 16px; font-size: clamp(2.4rem, 8vw, 5rem); letter-spacing: -.06em; }
      p { color: #b5b5ae; font-size: 1.1rem; line-height: 1.65; }
      button { border: 0; border-radius: 999px; padding: 12px 18px; font: inherit; font-weight: 700; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <small>LIMITLESS BUILD STUDIO</small>
      <h1>Real files. Safe preview.</h1>
      <p>Edit this project, create checkpoints, and export a validated ZIP. Preview networking is blocked by policy.</p>
      <button type="button" onclick="this.textContent='Interaction verified'">Test interaction</button>
    </main>
  </body>
</html>`,
};

export const BUILTIN_PROVIDERS: ProviderRecord[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    providerClass: "gateway",
    apiStyle: "openai-chat",
    baseUrl: "https://openrouter.ai/api/v1",
    costClass: "paid",
    status: "requires-key",
    configured: false,
    modelIds: [],
    capabilities: ["chat", "streaming", "tools", "images"],
    supports: { streaming: true, tools: true, images: true, cancellation: true },
    pricingConfidence: "provider-reported",
    privacyNote: "Requests follow the selected upstream provider policy.",
    catalogSource: "https://openrouter.ai/api/v1/models",
  },
  {
    id: "openai",
    name: "OpenAI",
    providerClass: "direct",
    apiStyle: "openai-responses",
    baseUrl: "https://api.openai.com/v1",
    costClass: "paid",
    status: "requires-key",
    configured: false,
    modelIds: [],
    capabilities: ["responses", "streaming", "tools", "images", "audio"],
    supports: { streaming: true, tools: true, images: true, audio: true, cancellation: true },
    pricingConfidence: "provider-reported",
    privacyNote: "Direct BYOK route. Provider billing and data controls apply.",
    catalogSource: "https://developers.openai.com/api/reference",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    providerClass: "direct",
    apiStyle: "anthropic-messages",
    baseUrl: "https://api.anthropic.com/v1",
    costClass: "paid",
    status: "requires-key",
    configured: false,
    modelIds: [],
    capabilities: ["messages", "streaming", "tools", "vision"],
    supports: { streaming: true, tools: true, images: true, cancellation: true },
    pricingConfidence: "provider-reported",
    privacyNote: "Direct BYOK route. Provider billing and data controls apply.",
    catalogSource: "https://docs.anthropic.com/en/api/messages",
  },
  {
    id: "gemini",
    name: "Google Gemini API",
    providerClass: "direct",
    apiStyle: "gemini-generate-content",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    costClass: "paid",
    status: "requires-key",
    configured: false,
    modelIds: [],
    capabilities: ["generate-content", "streaming", "tools", "multimodal"],
    supports: { streaming: true, tools: true, images: true, audio: true, cancellation: true },
    pricingConfidence: "provider-reported",
    privacyNote: "Direct BYOK route. Provider billing and data controls apply.",
    catalogSource: "https://ai.google.dev/api",
  },
  {
    id: "ollama-local",
    name: "Ollama local",
    providerClass: "local",
    apiStyle: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    costClass: "local",
    status: "available",
    configured: true,
    modelIds: [],
    capabilities: ["chat", "streaming", "openai-compatible"],
    supports: { streaming: true, tools: true, cancellation: true },
    pricingConfidence: "unknown",
    privacyNote: "Local endpoint. No cloud key is required.",
    catalogSource: "http://127.0.0.1:11434/api/tags",
  },
  {
    id: "browser-local",
    name: "Browser local",
    providerClass: "browser",
    apiStyle: "custom",
    baseUrl: "",
    costClass: "free",
    status: "available",
    configured: true,
    modelIds: [],
    capabilities: ["deterministic-tools", "offline-fallback"],
    supports: { structuredOutput: true },
    pricingConfidence: "verified",
    privacyNote: "Runs supported deterministic work on this device.",
    catalogSource: "bundled",
  },
];

function createStarterProject(ownerScope: string, deviceId: string): CodeProject {
  const now = Date.now();
  const index = createRepositoryIndex(starterFiles);
  const id = uid();
  return {
    id,
    ownerId: ownerScope,
    name: "First safe web project",
    stack: "static",
    packageManager: "none",
    files: structuredClone(starterFiles),
    entryFile: "index.html",
    selectedFile: "index.html",
    repositoryFingerprint: index.fingerprint,
    versions: [
      {
        id: uid(),
        projectId: id,
        label: "Initial project",
        files: structuredClone(starterFiles),
        repositoryFingerprint: index.fingerprint,
        createdAt: now,
      },
    ],
    buildStatus: "passed",
    buildLog: ["Static validation passed.", "Network-denied preview ready."],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId,
    sourceKind: "starter",
    projectIntent: "A safe local-first starter website.",
    verificationHistory: [],
    approvals: [],
  };
}

function defaultFeatureStatus(): FinaleState["featureStatus"] {
  return {
    core_platform: "production-functional",
    artifact_workspace: "locally-functional",
    build_studio: "locally-functional",
    intelligence_hub: "locally-functional",
    document_pdf_studio_v2: "locally-functional",
    universal_provider_hub: "locally-functional",
    limitless_free_mode: "production-functional",
    paid_byok_mode: "requires-credentials",
    coding_agent: "locally-functional",
    desktop_app: "ci-configured",
    mobile_companion: "ci-configured",
    passkeys: "requires-infrastructure",
    remote_desktop: "foundation-implemented",
    production_deployment: "requires-credentials",
  };
}

export async function createFinaleState(): Promise<FinaleState> {
  const ownerScope = getActiveWorkspaceScope();
  const deviceId = await getDeviceId();
  const now = Date.now();
  return {
    id: "workspace-state",
    schemaVersion: 10,
    ownerScope,
    deviceId,
    usageMode: structuredClone(DEFAULT_USAGE_MODE) as FinaleState["usageMode"],
    providers: structuredClone(BUILTIN_PROVIDERS),
    codeProjects: [createStarterProject(ownerScope, deviceId)],
    knowledge: [],
    automations: [],
    devices: [],
    remoteSessions: [],
    documents: [],
    costEvents: [],
    featureStatus: defaultFeatureStatus(),
    updatedAt: now,
    revision: 1,
  };
}

function sanitizeState(value: FinaleState, ownerScope: string, deviceId: string): FinaleState {
  return {
    ...value,
    id: "workspace-state",
    schemaVersion: 10,
    ownerScope,
    deviceId,
    usageMode: {
      ...(structuredClone(DEFAULT_USAGE_MODE) as FinaleState["usageMode"]),
      ...(value.usageMode || {}),
      limitlessFree: value.usageMode?.limitlessFree !== false,
      neverSpend:
        value.usageMode?.limitlessFree !== false ? true : value.usageMode?.neverSpend !== false,
    },
    providers: Array.isArray(value.providers)
      ? value.providers.map((provider) => ({
          ...provider,
          supports: provider.supports || {
            streaming: provider.capabilities.includes("streaming"),
            tools: provider.capabilities.includes("tools"),
            images:
              provider.capabilities.includes("images") ||
              provider.capabilities.includes("vision") ||
              provider.capabilities.includes("multimodal"),
            audio: provider.capabilities.includes("audio"),
            cancellation: provider.capabilities.includes("streaming"),
          },
          pricingConfidence: provider.pricingConfidence || "unknown",
          timeoutMs: provider.timeoutMs || 60_000,
          maxRetries: provider.maxRetries ?? 2,
        }))
      : structuredClone(BUILTIN_PROVIDERS),
    codeProjects: Array.isArray(value.codeProjects)
      ? value.codeProjects.map((project) => ({
          ...project,
          sourceKind: project.sourceKind || "starter",
          verificationHistory: Array.isArray(project.verificationHistory)
            ? project.verificationHistory
            : [],
          approvals: Array.isArray(project.approvals) ? project.approvals : [],
        }))
      : [],
    knowledge: Array.isArray(value.knowledge) ? value.knowledge : [],
    automations: Array.isArray(value.automations) ? value.automations : [],
    devices: Array.isArray(value.devices) ? value.devices : [],
    remoteSessions: Array.isArray(value.remoteSessions) ? value.remoteSessions : [],
    documents: Array.isArray(value.documents)
      ? value.documents.map((document) => ({
          ...document,
          page: {
            ...(document.page || {}),
            gutterMm: document.page?.gutterMm ?? 6,
            mirroredMargins: document.page?.mirroredMargins ?? false,
            baselineGridPt: document.page?.baselineGridPt ?? 12,
          },
          header: document.header ?? document.title,
          footer: document.footer ?? "Created in Limitless Document & PDF Studio",
          pageNumbers: document.pageNumbers !== false,
          citations: Array.isArray(document.citations) ? document.citations : [],
          footnotes: Array.isArray(document.footnotes) ? document.footnotes : [],
          bookmarks: Array.isArray(document.bookmarks) ? document.bookmarks : [],
          formFields: Array.isArray(document.formFields) ? document.formFields : [],
          exportProfile: document.exportProfile || "editable-docx",
        }))
      : [],
    costEvents: Array.isArray(value.costEvents) ? value.costEvents : [],
    featureStatus: { ...defaultFeatureStatus(), ...(value.featureStatus || {}) },
    updatedAt: Number(value.updatedAt || Date.now()),
    revision: Math.max(1, Number(value.revision || 1)),
  };
}

export async function loadFinaleState(): Promise<FinaleState> {
  const stored = await getSetting<FinaleState | null>(STATE_KEY, null);
  const ownerScope = getActiveWorkspaceScope();
  const deviceId = await getDeviceId();
  if (!stored) {
    const created = await createFinaleState();
    await setSetting(STATE_KEY, created);
    return created;
  }
  return sanitizeState(stored, ownerScope, deviceId);
}

export async function saveFinaleState(
  input: FinaleState,
  options: { preserveRevision?: boolean } = {},
): Promise<FinaleState> {
  const ownerScope = getActiveWorkspaceScope();
  const deviceId = await getDeviceId();
  const current = await getSetting<FinaleState | null>(STATE_KEY, null);
  const saved = sanitizeState(
    {
      ...structuredClone(input),
      updatedAt: Date.now(),
      revision: options.preserveRevision
        ? Math.max(1, Number(input.revision || 1))
        : Math.max(Number(current?.revision || 0), Number(input.revision || 0)) + 1,
    },
    ownerScope,
    deviceId,
  );
  await setSetting(STATE_KEY, saved);
  return saved;
}

export async function saveProviderCredential(providerId: string, secret: string): Promise<string> {
  const normalized = secret.trim();
  if (!normalized) throw new Error("Enter a provider API key.");
  await saveSecret(`provider:${providerId}`, normalized);
  const verified = await loadSecret(`provider:${providerId}`);
  if (verified !== normalized) throw new Error("The encrypted provider key could not be verified.");
  return normalized.slice(-4);
}

export function loadProviderCredential(providerId: string): Promise<string> {
  return loadSecret(`provider:${providerId}`);
}

export function removeProviderCredential(providerId: string): Promise<void> {
  return removeSecret(`provider:${providerId}`);
}

export function createProfessionalDraft(input: {
  title: string;
  templateId: string;
  audience: string;
  purpose: string;
}): ProfessionalDocumentDraft {
  const now = Date.now();
  const title = input.title.trim() || "Untitled professional report";
  return {
    id: uid(),
    title,
    templateId: input.templateId,
    audience: input.audience.trim() || "General reader",
    purpose: input.purpose.trim() || "Inform",
    sections: [
      { id: uid(), heading: "Executive summary", body: "Add the central finding and recommendation.", keepWithNext: true },
      { id: uid(), heading: "Context", body: "Describe the background, scope, and source material.", keepWithNext: true },
      { id: uid(), heading: "Findings", body: "Present verified findings with citations, tables, or figures.", keepWithNext: true },
      { id: uid(), heading: "Recommendations", body: "List practical next steps and ownership.", keepWithNext: true },
    ],
    page: {
      size: "A4",
      orientation: "portrait",
      marginMm: 20,
      columns: 1,
      gutterMm: 6,
      mirroredMargins: false,
      baselineGridPt: 12,
    },
    typography: { headingFont: "Aptos Display", bodyFont: "Aptos", baseSizePt: 11, lineHeight: 1.45 },
    accessibility: {
      language: "en",
      title,
      logicalHeadings: true,
      requiresAltTextReview: false,
    },
    header: title,
    footer: "Created in Limitless Document & PDF Studio",
    pageNumbers: true,
    citations: [],
    footnotes: [],
    bookmarks: [],
    formFields: [],
    exportProfile: "editable-docx",
    preflight: [],
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
}
