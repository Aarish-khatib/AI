export type FinaleFeatureStatus =
  | "production-functional"
  | "locally-functional"
  | "foundation-implemented"
  | "ci-configured"
  | "requires-credentials"
  | "requires-infrastructure"
  | "not-verified"
  | "blocked";

export type UsageMode = {
  limitlessFree: boolean;
  neverSpend: boolean;
  paidStatus: "locked" | "ready" | "active";
  defaultProviderId: string;
  defaultModel: string;
  providerAllowlist: string[];
  providerBlocklist: string[];
  maxCostPerRequestUsd: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  maxPaidCandidateCalls: number;
  confirmAboveUsd: number;
  spentTodayUsd: number;
  spentThisMonthUsd: number;
  estimatedCostPerRequestUsd: number;
  revision: number;
};

export type CostEvent = {
  id: string;
  providerId: string;
  modelId: string;
  taskId: string;
  amountUsd: number;
  costKind: "estimated" | "actual";
  providerRequestId?: string;
  createdAt: number;
};

export type ProviderClass =
  | "free"
  | "local"
  | "browser"
  | "direct"
  | "gateway"
  | "compatible"
  | "media";

export type ProviderRecord = {
  id: string;
  name: string;
  providerClass: ProviderClass;
  apiStyle:
    | "openai-responses"
    | "openai-chat"
    | "anthropic-messages"
    | "gemini-generate-content"
    | "ollama"
    | "custom";
  baseUrl: string;
  costClass: "free" | "paid" | "local" | "unknown";
  status:
    | "available"
    | "requires-key"
    | "untested"
    | "healthy"
    | "degraded"
    | "rate-limited"
    | "cooling-down"
    | "disabled"
    | "blocked";
  configured: boolean;
  verifiedAt?: number;
  maskedSuffix?: string;
  modelIds: string[];
  capabilities: string[];
  privacyNote: string;
  catalogSource: string;
  catalogFetchedAt?: number;
  lastKnownGoodModelIds?: string[];
  modelsEndpoint?: string;
  chatEndpoint?: string;
  responsesEndpoint?: string;
  embeddingsEndpoint?: string;
  customHeaders?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  retryAfterUntil?: number;
  circuitOpenUntil?: number;
  consecutiveFailures?: number;
  latencyMs?: number;
  pricingConfidence?: "verified" | "provider-reported" | "estimated" | "unknown";
  dataRetention?: string;
  region?: string;
  supports?: {
    streaming?: boolean;
    tools?: boolean;
    structuredOutput?: boolean;
    images?: boolean;
    documents?: boolean;
    embeddings?: boolean;
    audio?: boolean;
    asyncJobs?: boolean;
    cancellation?: boolean;
  };
  lastError?: string;
};

export type CodeProjectVersion = {
  id: string;
  projectId: string;
  label: string;
  files: Record<string, string>;
  repositoryFingerprint: string;
  createdAt: number;
};

export type ProjectSourceKind = "starter" | "prompt" | "zip" | "git";

export type ProjectAnalysis = {
  stack: CodeProject["stack"];
  packageManager: CodeProject["packageManager"];
  routes: string[];
  dataLayers: string[];
  testCommands: string[];
  protectedFiles: string[];
  generatedAt: number;
  repositoryFingerprint: string;
};

export type ProjectVerification = {
  id: string;
  status: "passed" | "failed" | "requires-runtime" | "cancelled";
  checks: Array<{
    id: string;
    status: "passed" | "failed" | "warning" | "blocked";
    detail: string;
  }>;
  consoleErrors: string[];
  viewportEvidence: Array<{
    viewport: "mobile" | "tablet" | "desktop" | "wide";
    status: "passed" | "failed" | "not-run";
    detail: string;
  }>;
  startedAt: number;
  completedAt: number;
  repositoryFingerprint: string;
};

export type ProjectApproval = {
  id: string;
  action: "github-export" | "publish" | "command" | "destructive-edit";
  status: "required" | "approved" | "denied" | "expired" | "completed";
  exactTarget: string;
  requestedAt: number;
  resolvedAt?: number;
};

export type CodeProject = {
  id: string;
  ownerId: string;
  name: string;
  stack: "static" | "react" | "next" | "full-stack" | "webgl";
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "none";
  files: Record<string, string>;
  entryFile: string;
  selectedFile: string;
  repositoryFingerprint: string;
  versions: CodeProjectVersion[];
  lastKnownGoodVersionId?: string;
  buildStatus: "idle" | "building" | "passed" | "failed" | "cancelled";
  buildLog: string[];
  createdAt: number;
  updatedAt: number;
  revision: number;
  deviceId: string;
  sourceKind?: ProjectSourceKind;
  sourceLocator?: string;
  projectIntent?: string;
  analysis?: ProjectAnalysis;
  verificationHistory?: ProjectVerification[];
  approvals?: ProjectApproval[];
  deletedAt?: number;
};

export type KnowledgeRecord = {
  id: string;
  title: string;
  sourceType: "note" | "file" | "url" | "artifact" | "project";
  text: string;
  citations: Array<{ label: string; locator: string }>;
  createdAt: number;
  updatedAt: number;
  revision: number;
};

export type AutomationDraft = {
  id: string;
  title: string;
  instruction: string;
  cadence: string;
  enabled: boolean;
  status: "draft" | "dry-run-passed" | "requires-scheduler";
  lastDryRunAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type DeviceRecord = {
  id: string;
  name: string;
  platform: "windows" | "macos" | "linux" | "android" | "ios" | "unknown";
  status: "pending" | "paired" | "revoked" | "offline";
  permissions: string[];
  createdAt: number;
  lastSeenAt?: number;
  revokedAt?: number;
};

export type RemoteSessionRecord = {
  id: string;
  deviceId: string;
  status: "pending" | "active" | "stopped" | "expired" | "revoked";
  permissions: string[];
  createdAt: number;
  expiresAt: number;
  idleExpiresAt: number;
  credentialVersion: number;
  stoppedAt?: number;
  revokedAt?: number;
};

export type ProfessionalDocumentDraft = {
  id: string;
  artifactId?: string;
  title: string;
  templateId: string;
  audience: string;
  purpose: string;
  sections: Array<{
    id: string;
    heading: string;
    body: string;
    keepWithNext: boolean;
  }>;
  page: {
    size: "A4" | "Letter" | "Legal" | "A3";
    orientation: "portrait" | "landscape";
    marginMm: number;
    columns: 1 | 2 | 3;
    gutterMm: number;
    mirroredMargins: boolean;
    baselineGridPt: number;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSizePt: number;
    lineHeight: number;
  };
  accessibility: {
    language: string;
    title: string;
    logicalHeadings: boolean;
    requiresAltTextReview: boolean;
  };
  header: string;
  footer: string;
  pageNumbers: boolean;
  citations: Array<{
    id: string;
    key: string;
    title: string;
    author?: string;
    url?: string;
    accessedAt?: string;
  }>;
  footnotes: Array<{
    id: string;
    marker: string;
    text: string;
  }>;
  bookmarks: Array<{
    id: string;
    label: string;
    sectionId: string;
  }>;
  formFields: Array<{
    id: string;
    label: string;
    type: "text" | "checkbox" | "date" | "signature";
    required: boolean;
  }>;
  exportProfile:
    | "editable-docx"
    | "standard-pdf"
    | "print-pdf"
    | "compressed-pdf"
    | "web-pdf"
    | "fillable-pdf";
  preflight: Array<{ severity: "info" | "warning" | "error"; message: string }>;
  createdAt: number;
  updatedAt: number;
  revision: number;
};

export type FinaleState = {
  id: "workspace-state";
  schemaVersion: 10;
  ownerScope: string;
  deviceId: string;
  usageMode: UsageMode;
  providers: ProviderRecord[];
  codeProjects: CodeProject[];
  knowledge: KnowledgeRecord[];
  automations: AutomationDraft[];
  devices: DeviceRecord[];
  remoteSessions: RemoteSessionRecord[];
  documents: ProfessionalDocumentDraft[];
  costEvents: CostEvent[];
  featureStatus: Record<string, FinaleFeatureStatus>;
  updatedAt: number;
  revision: number;
};
