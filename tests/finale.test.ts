import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { generateArtifactFile } from "../lib/artifacts/exporters";
import {
  authorizeRemoteAction,
  commandRisk,
  consumePairingChallenge,
  createPairingChallenge,
  createRepositoryIndex,
  DEFAULT_USAGE_MODE,
  emergencyStopSession,
  resolveUsageRoute,
  safeProviderHeaders,
  sandboxPreviewDocument,
  validateCompatibleEndpoint,
} from "../lib/finale/policy.mjs";
import {
  analyzeCodeProject,
  applyProjectVerification,
  checkpointCodeProject,
  createProjectApproval,
  createSpecialistPlan,
  duplicateCodeProject,
  exportCodeProjectZip,
  generateCodeProjectFromPrompt,
  importCodeProjectZip,
  importPublicGitRepository,
  parsePublicGitRepository,
  restoreCodeProject,
  runLocalProjectVerification,
  validateCodeProject,
} from "../lib/finale/build-studio";
import {
  DOCUMENT_TEMPLATES,
  preflightProfessionalDraft,
  professionalDraftToArtifact,
  redactDocumentText,
} from "../lib/finale/document-studio";
import {
  providerRequestShape,
} from "../lib/finale/provider-hub";
import {
  createCompatibleProvider,
  executeProviderWithPolicy,
  normalizeProviderStreamEvent,
  redactProviderMessage,
} from "../lib/finale/provider-runtime";
import { createProfessionalDraft } from "../lib/finale/store";
import type {
  CodeProject,
  ProviderRecord,
  RemoteSessionRecord,
  UsageMode,
} from "../lib/finale/contracts";

const paidProvider: ProviderRecord = {
  id: "openai",
  name: "OpenAI",
  providerClass: "direct",
  apiStyle: "openai-responses",
  baseUrl: "https://api.openai.com/v1",
  costClass: "paid",
  status: "healthy",
  configured: true,
  modelIds: ["test-model"],
  capabilities: ["responses"],
  privacyNote: "test",
  catalogSource: "official",
};

test("Limitless Free blocks paid and unknown-cost routes", () => {
  const result = resolveUsageRoute({
    mode: structuredClone(DEFAULT_USAGE_MODE) as UsageMode,
    provider: paidProvider,
    estimatedCostUsd: 0,
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason || "", /rejects paid/i);
});

test("paid BYOK requires verified credentials and every hard budget", () => {
  const mode = {
    ...(structuredClone(DEFAULT_USAGE_MODE) as UsageMode),
    limitlessFree: false,
    neverSpend: false,
    paidStatus: "active" as const,
    maxCostPerRequestUsd: 0.5,
    dailyBudgetUsd: 1,
    monthlyBudgetUsd: 5,
  };
  assert.equal(resolveUsageRoute({ mode, provider: paidProvider, estimatedCostUsd: 0.25 }).allowed, true);
  assert.equal(resolveUsageRoute({ mode, provider: paidProvider, estimatedCostUsd: 0.75 }).allowed, false);
  assert.equal(resolveUsageRoute({ mode, provider: { ...paidProvider, status: "untested" }, estimatedCostUsd: 0 }).allowed, false);
});

test("compatible endpoints and forwarded headers fail closed", () => {
  assert.equal(validateCompatibleEndpoint("http://169.254.169.254/latest").ok, false);
  assert.equal(validateCompatibleEndpoint("https://api.example.com/v1").ok, true);
  assert.equal(validateCompatibleEndpoint("http://127.0.0.1:11434", { allowLocal: true }).ok, true);
  const headers = safeProviderHeaders({
    authorization: "Bearer synthetic",
    cookie: "forbidden",
    "x-forwarded-host": "forbidden",
    "x-safe": "yes",
  }) as Record<string, string>;
  assert.equal(headers.cookie, undefined);
  assert.equal(headers["x-safe"], "yes");
});

test("pairing codes expire, lock, and cannot be reused", () => {
  const challenge = createPairingChallenge({ userId: "user", deviceName: "Desktop", now: 1_000 });
  assert.equal(consumePairingChallenge(challenge, challenge.displayCode, challenge.expiresAt + 1).ok, false);
  const consumed = consumePairingChallenge(challenge, challenge.displayCode, 2_000);
  assert.equal(consumed.ok, true);
  assert.equal(consumePairingChallenge(consumed.challenge!, challenge.displayCode, 2_001).ok, false);
});

test("remote permissions require live sessions and emergency stop revokes them", () => {
  const session: RemoteSessionRecord = {
    id: "session",
    deviceId: "device",
    status: "active",
    permissions: ["screen-view"],
    createdAt: 1_000,
    expiresAt: 10_000,
    idleExpiresAt: 5_000,
    credentialVersion: 1,
  };
  assert.equal(authorizeRemoteAction(session, "screen-view", 2_000), true);
  const stopped = emergencyStopSession(session, 2_100);
  assert.equal(authorizeRemoteAction(stopped, "screen-view", 2_101), false);
  assert.deepEqual(stopped.permissions, []);
  assert.equal(commandRisk("git push origin main").level, "blocked");
});

test("preview sandbox denies network and repository indexes exclude generated folders", () => {
  const html = sandboxPreviewDocument({ "index.html": "<HTML><HEAD></HEAD><body>Safe</body></HTML>" });
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /limitless-preview-v1/);
  const index = createRepositoryIndex({
    "src/app.ts": "export const ok = true;",
    "dist/bundle.js": "excluded",
  });
  assert.deepEqual(index.entries.map((entry) => entry.path), ["src/app.ts"]);
});

test("prompt-to-project creates real source, runs bounded verification, and preserves last-known-good", async () => {
  const generated = await generateCodeProjectFromPrompt({
    prompt: "Create an accessible monochrome student portfolio with a project grid.",
    ownerId: "owner",
    deviceId: "device",
  });
  assert.equal(generated.sourceKind, "prompt");
  assert.deepEqual(
    Object.keys(generated.files).sort(),
    ["README.md", "app.js", "index.html", "limitless.project.json", "styles.css"],
  );
  const verification = runLocalProjectVerification(generated);
  assert.equal(verification.status, "passed");
  const verified = applyProjectVerification(generated, verification);
  assert.equal(verified.buildStatus, "passed");
  assert.equal(verified.lastKnownGoodVersionId, verified.versions[0].id);
  assert.equal(verified.verificationHistory?.[0].checks.every((check) => check.status !== "failed"), true);

  const broken: CodeProject = {
    ...verified,
    files: { ...verified.files, "app.js": "(() => {" },
  };
  const failed = applyProjectVerification(broken, runLocalProjectVerification(broken));
  assert.equal(failed.buildStatus, "failed");
  assert.equal(failed.lastKnownGoodVersionId, verified.lastKnownGoodVersionId);
});

test("public repository import is host-restricted, strips archive root, and builds a warm index", async () => {
  assert.equal(
    parsePublicGitRepository("https://github.com/openai/example/tree/dev").archiveUrl,
    "https://codeload.github.com/openai/example/zip/refs/heads/dev",
  );
  assert.throws(() => parsePublicGitRepository("http://127.0.0.1/repo"), /public HTTPS GitHub/i);
  const archive = new JSZip();
  archive.file("example-main/index.html", "<!doctype html><html lang=\"en\"><head><meta name=\"viewport\" content=\"width=device-width\"><title>Repo</title></head><body><h1>Repo</h1></body></html>");
  archive.file("example-main/package.json", JSON.stringify({ scripts: { test: "node --test" } }));
  const bytes = await archive.generateAsync({ type: "uint8array" });
  const responseBody = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const imported = await importPublicGitRepository({
    repositoryUrl: "https://github.com/openai/example",
    ownerId: "owner",
    deviceId: "device",
    fetchImpl: async () => new Response(responseBody, {
      status: 200,
      headers: { "content-type": "application/zip" },
    }),
  });
  assert.equal(imported.sourceKind, "git");
  assert.ok(imported.files["index.html"]);
  assert.equal(imported.analysis?.testCommands[0], "test: node --test");
  assert.equal(imported.sourceLocator, "https://github.com/openai/example");
});

test("Build Studio specialist roles and external actions remain approval-bounded", async () => {
  const generated = await generateCodeProjectFromPrompt({
    prompt: "Build a responsive product information page with no external network calls.",
    ownerId: "owner",
    deviceId: "device",
  });
  const plan = createSpecialistPlan(generated);
  assert.equal(plan.every((role) => role.maximumAttempts <= 2), true);
  assert.equal(plan.some((role) => role.role === "Security reviewer"), true);
  const approval = createProjectApproval("publish", "project:production");
  assert.equal(approval.status, "required");
  const duplicate = duplicateCodeProject(generated, "other-owner", "other-device");
  assert.notEqual(duplicate.id, generated.id);
  assert.equal(duplicate.ownerId, "other-owner");
  assert.equal(duplicate.approvals?.length, 0);
  const analysis = analyzeCodeProject(generated);
  assert.equal(analysis.routes.includes("/"), true);
});

test("framework source never receives fabricated preview success without connected runtime evidence", () => {
  const project: CodeProject = {
    id: "framework",
    ownerId: "owner",
    name: "Framework",
    stack: "next",
    packageManager: "npm",
    files: {
      "app/page.tsx": "export default function Page(){return <main>Real source</main>}",
      "package.json": JSON.stringify({ scripts: { build: "next build" } }),
    },
    entryFile: "app/page.tsx",
    selectedFile: "app/page.tsx",
    repositoryFingerprint: "fingerprint",
    versions: [],
    buildStatus: "idle",
    buildLog: [],
    createdAt: 1,
    updatedAt: 1,
    revision: 1,
    deviceId: "device",
  };
  assert.equal(runLocalProjectVerification(project).status, "requires-runtime");
  assert.equal(
    runLocalProjectVerification(project, {
      runtimeEvidence: { passed: true, detail: "Connected runtime build passed." },
    }).status,
    "passed",
  );
});

test("Build Studio imports, checkpoints, restores, previews, and exports real ZIPs", async () => {
  const sourceZip = new JSZip();
  sourceZip.file("index.html", "<!doctype html><html><body>Build test</body></html>");
  sourceZip.file("src/app.js", "document.body.dataset.ready = 'yes';");
  const bytes = await sourceZip.generateAsync({ type: "uint8array" });
  const archiveBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const project = await importCodeProjectZip(
    new File([archiveBuffer], "build-test.zip", { type: "application/zip" }),
    { ownerId: "owner", deviceId: "device" },
  );
  const validation = validateCodeProject(project);
  assert.equal(validation.passed, true);
  const edited: CodeProject = {
    ...project,
    files: { ...project.files, "index.html": "<!doctype html><html><body>Changed</body></html>" },
  };
  const checkpoint = checkpointCodeProject(edited, "Changed");
  const restored = restoreCodeProject(checkpoint, project.versions[0].id);
  assert.match(restored.files["index.html"], /Build test/);
  const exported = await exportCodeProjectZip(checkpoint);
  const exportedZip = await JSZip.loadAsync(await exported.arrayBuffer(), { checkCRC32: true });
  assert.ok(exportedZip.file("limitless-project.json"));
  assert.ok(exportedZip.file("index.html"));
});

test("professional document source is editable, preflighted, redacted, and uses real provider shapes", () => {
  assert.equal(DOCUMENT_TEMPLATES.length, 21);
  const draft = createProfessionalDraft({
    title: "Final report",
    templateId: DOCUMENT_TEMPLATES[0],
    audience: "Reviewers",
    purpose: "Verify the release",
  });
  assert.equal(preflightProfessionalDraft(draft).every((item) => item.severity !== "error"), true);
  const artifact = professionalDraftToArtifact({ draft, ownerId: "owner", deviceId: "device" });
  assert.equal(artifact.type, "document");
  assert.equal(artifact.content.kind, "document");
  assert.equal(redactDocumentText("Key ABC-123", ["ABC-123"]).text, "Key [REDACTED]");
  const shaped = providerRequestShape({
    provider: paidProvider,
    key: "synthetic",
    model: "test-model",
    prompt: "Hello",
  });
  assert.equal(shaped.url, "https://api.openai.com/v1/responses");
  assert.equal(JSON.parse(String(shaped.init.body)).input, "Hello");
});

test("provider runtime applies budgets, retries bounded failures, records reported cost, and redacts secrets", async () => {
  const mode: UsageMode = {
    ...(structuredClone(DEFAULT_USAGE_MODE) as UsageMode),
    limitlessFree: false,
    neverSpend: false,
    paidStatus: "active",
    maxCostPerRequestUsd: 1,
    dailyBudgetUsd: 5,
    monthlyBudgetUsd: 20,
    maxPaidCandidateCalls: 3,
    confirmAboveUsd: 1,
  };
  let calls = 0;
  const result = await executeProviderWithPolicy({
    mode,
    provider: { ...paidProvider, maxRetries: 3 },
    key: "sk-synthetic-secret-value",
    model: "test-model",
    prompt: "Hello",
    taskId: "provider-retry-test",
    estimatedCostUsd: 0.01,
    sleepImpl: async () => undefined,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: { message: "temporary" } }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "0" },
        });
      }
      return new Response(JSON.stringify({
        output_text: "Verified response",
        usage: { total_cost: 0.004 },
      }), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "request-1" },
      });
    },
  });
  assert.equal(result.text, "Verified response");
  assert.equal(result.attempts, 2);
  assert.equal(result.actualCostUsd, 0.004);
  assert.equal(result.requestId, "request-1");
  assert.doesNotMatch(redactProviderMessage("Authorization: Bearer sk-synthetic-secret-value"), /synthetic-secret/);
});

test("provider runtime deduplicates identical live requests and normalizes streaming tool events", async () => {
  const localProvider: ProviderRecord = {
    ...paidProvider,
    id: "local-test",
    name: "Local test",
    providerClass: "local",
    apiStyle: "openai-chat",
    baseUrl: "http://127.0.0.1:11434",
    costClass: "local",
    configured: true,
    status: "healthy",
  };
  let calls = 0;
  const execute = () => executeProviderWithPolicy({
    mode: structuredClone(DEFAULT_USAGE_MODE) as UsageMode,
    provider: localProvider,
    model: "local-model",
    prompt: "Deduplicate",
    taskId: "same-task",
    fetchImpl: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return new Response(JSON.stringify({
        choices: [{ message: { content: "One response" } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const [first, second] = await Promise.all([execute(), execute()]);
  assert.equal(calls, 1);
  assert.equal(first.text, "One response");
  assert.equal(second.deduplicated, true);
  assert.deepEqual(normalizeProviderStreamEvent(localProvider, {
    choices: [{
      delta: {
        content: "delta",
        tool_calls: [{ id: "call-1", function: { name: "lookup", arguments: "{}" } }],
      },
    }],
  }).map((event) => event.type), ["response.delta", "tool.call"]);
});

test("compatible providers reject unsafe endpoints and start unverified", () => {
  assert.throws(() => createCompatibleProvider({
    id: "unsafe",
    name: "Unsafe",
    baseUrl: "http://169.254.169.254/latest",
    costClass: "paid",
    privacyNote: "test",
  }), /endpoint/i);
  const provider = createCompatibleProvider({
    id: "example-compatible",
    name: "Example compatible",
    baseUrl: "https://provider.example/v1",
    costClass: "paid",
    privacyNote: "Provider policy applies.",
  });
  assert.equal(provider.status, "untested");
  assert.equal(provider.configured, false);
});

test("local Ollama NDJSON streaming is normalized without an SSE wrapper", async () => {
  const provider: ProviderRecord = {
    ...paidProvider,
    id: "ollama-stream",
    name: "Ollama",
    providerClass: "local",
    apiStyle: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    costClass: "local",
    status: "healthy",
    configured: true,
    supports: { streaming: true, cancellation: true },
  };
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(
        `${JSON.stringify({ message: { content: "Local " }, done: false })}\n${JSON.stringify({ message: { content: "stream" }, done: true, prompt_eval_count: 2, eval_count: 1 })}\n`,
      ));
      controller.close();
    },
  });
  const result = await executeProviderWithPolicy({
    mode: structuredClone(DEFAULT_USAGE_MODE) as UsageMode,
    provider,
    model: "local-model",
    prompt: "Hello",
    taskId: "ollama-stream-test",
    stream: true,
    fetchImpl: async () => new Response(stream, {
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
    }),
  });
  assert.equal(result.text, "Local stream");
  assert.equal(result.events.filter((event) => event.type === "response.delta").length, 2);
});

test("professional page setup reaches DOCX and fillable PDF exports", async () => {
  const draft = createProfessionalDraft({
    title: "Structured export proof",
    templateId: "Fillable application form",
    audience: "Reviewers",
    purpose: "Verify page layout and fields",
  });
  draft.page = {
    ...draft.page,
    size: "Letter",
    orientation: "landscape",
    columns: 2,
    gutterMm: 9,
  };
  draft.header = "Verified header";
  draft.footer = "Verified footer";
  draft.exportProfile = "fillable-pdf";
  draft.citations = [{
    id: "citation-1",
    key: "ref-1",
    title: "Official reference",
    url: "https://example.com/reference",
  }];
  draft.formFields = [{
    id: "name",
    label: "Full name",
    type: "text",
    required: true,
  }, {
    id: "accepted",
    label: "Accepted",
    type: "checkbox",
    required: false,
  }];
  const artifact = professionalDraftToArtifact({
    draft,
    ownerId: "owner",
    deviceId: "device",
  });
  const docx = await generateArtifactFile(artifact, "docx");
  const docxArchive = await JSZip.loadAsync(await docx.blob.arrayBuffer(), { checkCRC32: true });
  const sectionXml = await docxArchive.file("word/document.xml")?.async("text");
  assert.match(sectionXml || "", /w:orient="landscape"/);
  assert.match(sectionXml || "", /w:num="2"/);
  const pdfFile = await generateArtifactFile(artifact, "pdf");
  const pdf = await PDFDocument.load(await pdfFile.blob.arrayBuffer());
  assert.ok(pdf.getPage(0).getWidth() > pdf.getPage(0).getHeight());
  assert.deepEqual(
    pdf.getForm().getFields().map((field) => field.getName()).sort(),
    ["limitless.1.name", "limitless.2.accepted"],
  );
});
