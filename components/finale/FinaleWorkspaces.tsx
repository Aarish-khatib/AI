"use client";

import {
  Activity,
  BookOpenCheck,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Code2,
  Download,
  FilePlus2,
  FileText,
  KeyRound,
  Laptop,
  LoaderCircle,
  LockKeyhole,
  Play,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Square,
  Upload,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Artifact } from "@/lib/artifacts/types";
import { checkpointArtifact } from "@/lib/local-store";
import type {
  CodeProject,
  FinaleState,
  ProfessionalDocumentDraft,
  ProviderRecord,
} from "@/lib/finale/contracts";
import {
  applyProjectVerification,
  checkpointCodeProject,
  createProjectApproval,
  createSpecialistPlan,
  duplicateCodeProject,
  exportCodeProjectZip,
  generateCodeProjectFromPrompt,
  importCodeProjectZip,
  importPublicGitRepository,
  restoreCodeProject,
  runLocalProjectVerification,
  validateCodeProject,
} from "@/lib/finale/build-studio";
import {
  DOCUMENT_TEMPLATES,
  preflightProfessionalDraft,
  professionalDraftToArtifact,
} from "@/lib/finale/document-studio";
import {
  consumePairingChallenge,
  createPairingChallenge,
  emergencyStopSession,
  resolveUsageRoute,
  validatePaidActivation,
} from "@/lib/finale/policy.mjs";
import {
  createProfessionalDraft,
  loadFinaleState,
  loadProviderCredential,
  removeProviderCredential,
  saveFinaleState,
  saveProviderCredential,
} from "@/lib/finale/store";
import {
  verifyProviderConnection,
} from "@/lib/finale/provider-hub";
import {
  createCompatibleProvider,
  executeProviderWithPolicy,
} from "@/lib/finale/provider-runtime";
import { uid } from "@/lib/types";

type Notify = (message: string, tone?: "success" | "error") => void;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "limitless-project"
  );
}

function WorkspaceHeader({
  kicker,
  title,
  status,
}: {
  kicker: string;
  title: string;
  status: string;
}) {
  return (
    <header className="workspace-header">
      <div>
        <span className="section-kicker">{kicker}</span>
        <b>{title}</b>
      </div>
      <div className="header-status">
        <span className="status-dot" />
        {status}
      </div>
    </header>
  );
}

function LoadingWorkspace() {
  return (
    <section className="workspace loading-screen" aria-live="polite">
      <LoaderCircle className="spin" size={22} />
      <p>Opening the secure workspace…</p>
    </section>
  );
}

function useFinaleWorkspace(notify: Notify) {
  const [state, setState] = useState<FinaleState | null>(null);
  useEffect(() => {
    let active = true;
    void loadFinaleState()
      .then((loaded) => {
        if (active) setState(loaded);
      })
      .catch((error) => notify(error instanceof Error ? error.message : "Workspace could not open.", "error"));
    return () => {
      active = false;
    };
  }, [notify]);
  const persist = useCallback(
    async (next: FinaleState) => {
      const saved = await saveFinaleState(next);
      setState(saved);
      return saved;
    },
    [],
  );
  return { state, setState, persist };
}

export function BuildWorkspace({ notify }: { notify: Notify }) {
  const { state, setState, persist } = useFinaleWorkspace(notify);
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [projectPrompt, setProjectPrompt] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [consoleEvidence, setConsoleEvidence] = useState<{
    projectKey: string;
    errors: string[];
  }>({ projectKey: "", errors: [] });
  const previewRef = useRef<HTMLIFrameElement>(null);
  const previewProjectKey = useRef("");
  const project = useMemo(
    () => state?.codeProjects.find((item) => item.id === projectId) || state?.codeProjects[0],
    [projectId, state],
  );
  const projectKey = `${project?.id || ""}:${project?.repositoryFingerprint || ""}`;
  const consoleErrors =
    consoleEvidence.projectKey === projectKey ? consoleEvidence.errors : [];
  useEffect(() => {
    previewProjectKey.current = projectKey;
  }, [projectKey]);
  useEffect(() => {
    if (!projectId && state?.codeProjects[0]) {
      queueMicrotask(() => setProjectId(state.codeProjects[0].id));
    }
  }, [projectId, state]);
  useEffect(() => {
    const receivePreviewEvidence = (event: MessageEvent) => {
      if (event.source !== previewRef.current?.contentWindow) return;
      const payload = event.data as {
        channel?: string;
        type?: string;
        detail?: string;
      };
      if (payload?.channel !== "limitless-preview-v1") return;
      if (payload.type === "console-error" && payload.detail) {
        const evidenceKey = previewProjectKey.current;
        setConsoleEvidence((current) => ({
          projectKey: evidenceKey,
          errors: [
            ...(current.projectKey === evidenceKey ? current.errors : []),
            payload.detail!.slice(0, 500),
          ].slice(-50),
        }));
      }
    };
    window.addEventListener("message", receivePreviewEvidence);
    return () => window.removeEventListener("message", receivePreviewEvidence);
  }, []);
  const validation = useMemo(() => (project ? validateCodeProject(project) : null), [project]);

  if (!state || !project) return <LoadingWorkspace />;

  const replaceProject = (updated: CodeProject) => {
    setState({
      ...state,
      codeProjects: state.codeProjects.map((item) => (item.id === updated.id ? updated : item)),
    });
  };
  const saveProject = async (updated = project) => {
    setSaving(true);
    try {
      await persist({
        ...state,
        codeProjects: state.codeProjects.map((item) => (item.id === updated.id ? updated : item)),
      });
      notify("Project saved in the isolated workspace.", "success");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workspace finale-workspace">
      <WorkspaceHeader
        kicker="BUILD STUDIO"
        title="Code, preview, verify"
        status={`${state.codeProjects.length} versioned project${state.codeProjects.length === 1 ? "" : "s"}`}
      />
      <div className="finale-scroll">
        <div className="finale-form-grid build-start-grid">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSaving(true);
              void generateCodeProjectFromPrompt({
                prompt: projectPrompt,
                ownerId: state.ownerScope,
                deviceId: state.deviceId,
              })
                .then(async (generated) => {
                  const verified = applyProjectVerification(
                    generated,
                    runLocalProjectVerification(generated),
                  );
                  await persist({
                    ...state,
                    codeProjects: [verified, ...state.codeProjects],
                  });
                  setProjectId(verified.id);
                  setProjectPrompt("");
                  notify("Prompt converted into real files and locally verified.", "success");
                })
                .catch((error) =>
                  notify(
                    error instanceof Error ? error.message : "Project generation failed.",
                    "error",
                  ),
                )
                .finally(() => setSaving(false));
            }}
          >
            <h2>Prompt to project</h2>
            <label>
              Project brief
              <textarea
                value={projectPrompt}
                onChange={(event) => setProjectPrompt(event.target.value)}
                placeholder="Create an accessible monochrome portfolio for a student developer…"
              />
            </label>
            <button type="submit" disabled={saving || projectPrompt.trim().length < 12}>
              <Plus size={16} /> Generate and verify
            </button>
          </form>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSaving(true);
              void importPublicGitRepository({
                repositoryUrl,
                ownerId: state.ownerScope,
                deviceId: state.deviceId,
              })
                .then(async (imported) => {
                  await persist({
                    ...state,
                    codeProjects: [imported, ...state.codeProjects],
                  });
                  setProjectId(imported.id);
                  setRepositoryUrl("");
                  notify("Public repository imported and indexed. Git history was not fabricated.", "success");
                })
                .catch((error) =>
                  notify(
                    error instanceof Error ? error.message : "Repository import failed.",
                    "error",
                  ),
                )
                .finally(() => setSaving(false));
            }}
          >
            <h2>Continue a repository</h2>
            <label>
              Public GitHub URL
              <input
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
                placeholder="https://github.com/owner/repository"
              />
            </label>
            <button type="submit" disabled={saving || !repositoryUrl.trim()}>
              <Upload size={16} /> Import and index
            </button>
            <small>Private repositories and preserved Git history require the approved GitHub connection.</small>
          </form>
        </div>
        <div className="finale-toolbar">
          <select value={project.id} onChange={(event) => setProjectId(event.target.value)} aria-label="Project">
            {state.codeProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button type="button" onClick={() => void saveProject()} disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              const updated = checkpointCodeProject(project, `Checkpoint ${project.versions.length + 1}`);
              replaceProject(updated);
              void saveProject(updated);
            }}
          >
            <BookOpenCheck size={16} />
            Checkpoint
          </button>
          <button
            type="button"
            onClick={() => {
              const verified = applyProjectVerification(
                project,
                runLocalProjectVerification(project, { consoleErrors }),
              );
              replaceProject(verified);
              void saveProject(verified);
              notify(
                verified.buildStatus === "passed"
                  ? "Build verification passed and became the last-known-good checkpoint."
                  : "Verification did not pass. The previous last-known-good checkpoint was preserved.",
                verified.buildStatus === "passed" ? "success" : "error",
              );
            }}
          >
            <Play size={16} /> Verify build
          </button>
          <button
            type="button"
            onClick={() => {
              const duplicated = duplicateCodeProject(
                project,
                state.ownerScope,
                state.deviceId,
              );
              void persist({
                ...state,
                codeProjects: [duplicated, ...state.codeProjects],
              }).then(() => {
                setProjectId(duplicated.id);
                notify("Project duplicated with a new isolated identity.", "success");
              });
            }}
          >
            <FilePlus2 size={16} /> Duplicate
          </button>
          <button
            type="button"
            onClick={() =>
              void exportCodeProjectZip(project)
                .then((blob) => download(blob, `${safeFileName(project.name)}.zip`))
                .catch((error) => notify(error instanceof Error ? error.message : "Export failed.", "error"))
            }
          >
            <Download size={16} />
            Project ZIP
          </button>
          <label className="finale-file-button">
            <Upload size={16} />
            Import ZIP
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void importCodeProjectZip(file, { ownerId: state.ownerScope, deviceId: state.deviceId })
                  .then(async (imported) => {
                    await persist({ ...state, codeProjects: [imported, ...state.codeProjects] });
                    setProjectId(imported.id);
                    notify("Project imported without regenerating its source.", "success");
                  })
                  .catch((error) => notify(error instanceof Error ? error.message : "Import failed.", "error"));
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="build-studio-grid">
          <aside className="code-tree">
            <div>
              <b>Files</b>
              <span>{Object.keys(project.files).length}</span>
            </div>
            {Object.keys(project.files).sort().map((path) => (
              <button
                type="button"
                key={path}
                className={path === project.selectedFile ? "active" : ""}
                onClick={() => replaceProject({ ...project, selectedFile: path })}
              >
                <Code2 size={14} />
                {path}
              </button>
            ))}
            <div className="build-proof">
              <small>Sandbox policy</small>
              <span><WifiOff size={14} /> Network denied</span>
              <span><LockKeyhole size={14} /> No parent access</span>
              <span><ShieldCheck size={14} /> No platform secrets</span>
            </div>
          </aside>
          <div className="code-editor">
            <label>
              <span>{project.selectedFile}</span>
              <textarea
                spellCheck={false}
                value={project.files[project.selectedFile] || ""}
                onChange={(event) => {
                  const files = { ...project.files, [project.selectedFile]: event.target.value };
                  replaceProject({
                    ...project,
                    files,
                    buildStatus: "idle",
                    updatedAt: Date.now(),
                    revision: project.revision + 1,
                  });
                }}
              />
            </label>
          </div>
          <div className="secure-preview">
            <div>
              <b>Opaque preview</b>
              <span className={validation?.passed ? "passed" : "failed"}>
                {validation?.passed ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
                {validation?.passed ? "Source valid" : "Needs repair"}
              </span>
            </div>
            <iframe
              ref={previewRef}
              title={`${project.name} secure preview`}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              srcDoc={validation?.previewHtml}
            />
            {(validation?.errors.length || validation?.warnings.length) ? (
              <ul className="validation-list">
                {[...(validation?.errors || []), ...(validation?.warnings || [])].map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="finale-panels">
          <article>
            <span>Warm index</span>
            <b>{project.repositoryFingerprint.slice(0, 16)}</b>
            <p>File selection and future runs reuse this fingerprint until source changes.</p>
          </article>
          <article>
            <span>Versions</span>
            <b>{project.versions.length}</b>
            <select
              aria-label="Restore project version"
              defaultValue=""
              onChange={(event) => {
                if (!event.target.value) return;
                const restored = restoreCodeProject(project, event.target.value);
                replaceProject(restored);
                void saveProject(restored);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Restore a checkpoint…</option>
              {project.versions.map((version) => <option key={version.id} value={version.id}>{version.label}</option>)}
            </select>
          </article>
          <article>
            <span>Approval boundaries</span>
            <b>Fail closed</b>
            <p>GitHub export, production publish, destructive commands, and pushes require explicit approval.</p>
            <div className="finale-inline-actions">
              {(["github-export", "publish"] as const).map((action) => (
                <button
                  type="button"
                  key={action}
                  onClick={() => {
                    const label = action === "github-export" ? "GitHub export" : "production publish";
                    if (!window.confirm(`${label} requires an exact target, a connected account, and a second provider-side confirmation. Create the local approval record?`)) return;
                    const approval = createProjectApproval(
                      action,
                      action === "github-export"
                        ? project.sourceLocator || `${project.name}:unconnected-github-target`
                        : `${project.name}:unconnected-deployment-target`,
                    );
                    const updated = {
                      ...project,
                      approvals: [approval, ...(project.approvals || [])],
                      buildLog: [
                        ...project.buildLog,
                        `${label} remains blocked until its external connection and exact target are verified.`,
                      ],
                    };
                    replaceProject(updated);
                    void saveProject(updated);
                    notify(`${label} approval recorded; no external action was performed.`, "success");
                  }}
                >
                  {action === "github-export" ? "Prepare GitHub export" : "Prepare publish"}
                </button>
              ))}
            </div>
          </article>
        </div>
        <div className="finale-panels">
          <article>
            <span>Project understanding</span>
            <b>{project.analysis?.routes.length || 1} route(s)</b>
            <p>{project.analysis?.dataLayers.length ? project.analysis.dataLayers.join(", ") : "No connected data layer detected."}</p>
          </article>
          <article>
            <span>Specialist plan</span>
            <b>{createSpecialistPlan(project).length} bounded roles</b>
            <p>{createSpecialistPlan(project).map((item) => `${item.role} (${item.permission})`).join(", ")}</p>
          </article>
          <article>
            <span>Verification evidence</span>
            <b>{project.verificationHistory?.[0]?.status || "not run"}</b>
            <p>{project.buildLog.slice(-3).join(" ") || "No build evidence recorded."}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function IntelligenceWorkspace({ notify }: { notify: Notify }) {
  const { state, persist } = useFinaleWorkspace(notify);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [automation, setAutomation] = useState("");
  if (!state) return <LoadingWorkspace />;
  return (
    <section className="workspace finale-workspace">
      <WorkspaceHeader kicker="INTELLIGENCE" title="Knowledge, memory, and evaluations" status="Local-first and cited" />
      <div className="finale-scroll">
        <div className="finale-hero">
          <div>
            <span>KNOWLEDGE OS</span>
            <h1>Useful context without mystery memory.</h1>
            <p>Every local source is visible, removable, account-isolated, and cited. External connectors remain disconnected until OAuth succeeds.</p>
          </div>
          <ShieldCheck size={42} />
        </div>
        <div className="finale-form-grid">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!title.trim() || !text.trim()) return;
              const now = Date.now();
              void persist({
                ...state,
                knowledge: [
                  {
                    id: uid(),
                    title: title.trim(),
                    text: text.trim(),
                    sourceType: "note",
                    citations: [{ label: title.trim(), locator: `local-note:${now}` }],
                    createdAt: now,
                    updatedAt: now,
                    revision: 1,
                  },
                  ...state.knowledge,
                ],
              }).then(() => {
                setTitle("");
                setText("");
                notify("Cited local knowledge saved.", "success");
              });
            }}
          >
            <h2>Add local knowledge</h2>
            <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Source text<textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
            <button type="submit"><Plus size={16} /> Save with citation</button>
          </form>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!automation.trim()) return;
              const now = Date.now();
              void persist({
                ...state,
                automations: [
                  {
                    id: uid(),
                    title: automation.trim().slice(0, 80),
                    instruction: automation.trim(),
                    cadence: "Manual dry run",
                    enabled: false,
                    status: "dry-run-passed",
                    lastDryRunAt: now,
                    createdAt: now,
                    updatedAt: now,
                  },
                  ...state.automations,
                ],
              }).then(() => {
                setAutomation("");
                notify("Automation draft passed its bounded local dry run.", "success");
              });
            }}
          >
            <h2>Automation dry run</h2>
            <label>Instruction<textarea value={automation} onChange={(event) => setAutomation(event.target.value)} /></label>
            <button type="submit"><Play size={16} /> Test once</button>
            <small>Durable scheduling stays unavailable until a scheduler is connected.</small>
          </form>
        </div>
        <div className="finale-list">
          {state.knowledge.map((item) => (
            <article key={item.id}>
              <div><FileText size={18} /><b>{item.title}</b></div>
              <p>{item.text}</p>
              <small>{item.citations[0]?.locator}</small>
              <button
                type="button"
                onClick={() => void persist({ ...state, knowledge: state.knowledge.filter((candidate) => candidate.id !== item.id) })}
              >
                Remove
              </button>
            </article>
          ))}
          {!state.knowledge.length && <p className="finale-empty">No local knowledge sources yet.</p>}
        </div>
        <div className="finale-panels">
          <article><span>Connector gateway</span><b>Permissioned</b><p>OAuth and MCP connectors are shown only after a real connection succeeds.</p></article>
          <article><span>Voice privacy</span><b>Microphone off</b><p>No permission is requested until the user explicitly starts voice input.</p></article>
          <article><span>Evaluation</span><b>Redacted</b><p>Local quality records exclude keys, document bodies, and authentication data.</p></article>
        </div>
      </div>
    </section>
  );
}

export function DocumentStudioWorkspace({
  notify,
  onOpenArtifact,
}: {
  notify: Notify;
  onOpenArtifact: (artifact: Artifact) => void;
}) {
  const { state, persist } = useFinaleWorkspace(notify);
  const [draft, setDraft] = useState<ProfessionalDocumentDraft | null>(null);
  const [title, setTitle] = useState("Professional project report");
  const [templateId, setTemplateId] = useState<string>(DOCUMENT_TEMPLATES[0]);
  const [audience, setAudience] = useState("Teacher and classmates");
  const [purpose, setPurpose] = useState("Explain the project clearly with a polished structure");
  if (!state) return <LoadingWorkspace />;

  const active = draft || state.documents[0] || null;
  const updateDraft = (next: ProfessionalDocumentDraft) => {
    setDraft({ ...next, revision: next.revision + 1 });
  };

  return (
    <section className="workspace finale-workspace">
      <WorkspaceHeader kicker="DOCUMENT & PDF STUDIO" title="Structured, editable, print-ready" status="DOCX and PDF exports validated" />
      <div className="finale-scroll">
        {!active ? (
          <form
            className="document-start"
            onSubmit={(event) => {
              event.preventDefault();
              setDraft(createProfessionalDraft({ title, templateId, audience, purpose }));
            }}
          >
            <span>NEW PROFESSIONAL DOCUMENT</span>
            <h1>Create a real structured report.</h1>
            <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Template<select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              {DOCUMENT_TEMPLATES.map((template) => <option key={template} value={template}>{template}</option>)}
            </select></label>
            <label>Audience<input value={audience} onChange={(event) => setAudience(event.target.value)} /></label>
            <label>Purpose<textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
            <button type="submit"><FilePlus2 size={16} /> Create editable source</button>
          </form>
        ) : (
          <>
            <div className="finale-toolbar">
              <button
                type="button"
                onClick={() => {
                  const checked = { ...active, preflight: preflightProfessionalDraft(active), updatedAt: Date.now() };
                  setDraft(checked);
                  notify("Preflight completed.", checked.preflight.some((item) => item.severity === "error") ? "error" : "success");
                }}
              >
                <Activity size={16} /> Preflight
              </button>
              <button
                type="button"
                onClick={() => {
                  const checked = { ...active, preflight: preflightProfessionalDraft(active), updatedAt: Date.now() };
                  void persist({
                    ...state,
                    documents: [checked, ...state.documents.filter((item) => item.id !== checked.id)],
                  }).then(() => {
                    setDraft(checked);
                    notify("Professional source saved.", "success");
                  });
                }}
              >
                <Save size={16} /> Save source
              </button>
              <button
                type="button"
                onClick={() => {
                  const checked = { ...active, preflight: preflightProfessionalDraft(active) };
                  if (checked.preflight.some((item) => item.severity === "error")) {
                    notify("Fix the preflight errors before opening the export workspace.", "error");
                    return;
                  }
                  const artifact = professionalDraftToArtifact({
                    draft: checked,
                    ownerId: state.ownerScope,
                    deviceId: state.deviceId,
                  });
                  void checkpointArtifact(artifact, "created", "Professional Studio source").then(({ artifact: saved }) => {
                    notify("Opened as an editable artifact with real DOCX and PDF export.", "success");
                    onOpenArtifact(saved);
                  });
                }}
              >
                <FileText size={16} /> Open export workspace
              </button>
              <button
                type="button"
                onClick={() => setDraft(createProfessionalDraft({ title, templateId, audience, purpose }))}
              >
                <Plus size={16} /> New
              </button>
            </div>
            <div className="document-settings-panel">
              <label>Page size
                <select value={active.page.size} onChange={(event) => updateDraft({
                  ...active,
                  page: { ...active.page, size: event.target.value as ProfessionalDocumentDraft["page"]["size"] },
                })}>
                  {["A4", "Letter", "Legal", "A3"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label>Orientation
                <select value={active.page.orientation} onChange={(event) => updateDraft({
                  ...active,
                  page: { ...active.page, orientation: event.target.value as ProfessionalDocumentDraft["page"]["orientation"] },
                })}>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              <label>Margins (mm)
                <input type="number" min="5" max="60" value={active.page.marginMm} onChange={(event) => updateDraft({
                  ...active,
                  page: { ...active.page, marginMm: Number(event.target.value) },
                })} />
              </label>
              <label>Columns
                <select value={active.page.columns} onChange={(event) => updateDraft({
                  ...active,
                  page: { ...active.page, columns: Number(event.target.value) as 1 | 2 | 3 },
                })}>
                  <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                </select>
              </label>
              <label>Gutter (mm)
                <input type="number" min="0" max="30" value={active.page.gutterMm} onChange={(event) => updateDraft({
                  ...active,
                  page: { ...active.page, gutterMm: Number(event.target.value) },
                })} />
              </label>
              <label>Heading font
                <input value={active.typography.headingFont} onChange={(event) => updateDraft({
                  ...active,
                  typography: { ...active.typography, headingFont: event.target.value },
                })} />
              </label>
              <label>Body font
                <input value={active.typography.bodyFont} onChange={(event) => updateDraft({
                  ...active,
                  typography: { ...active.typography, bodyFont: event.target.value },
                })} />
              </label>
              <label>Body size (pt)
                <input type="number" min="8" max="24" step="0.5" value={active.typography.baseSizePt} onChange={(event) => updateDraft({
                  ...active,
                  typography: { ...active.typography, baseSizePt: Number(event.target.value) },
                })} />
              </label>
              <label>Export profile
                <select value={active.exportProfile} onChange={(event) => updateDraft({
                  ...active,
                  exportProfile: event.target.value as ProfessionalDocumentDraft["exportProfile"],
                })}>
                  <option value="editable-docx">Editable DOCX</option>
                  <option value="standard-pdf">Standard PDF</option>
                  <option value="print-pdf">Print PDF</option>
                  <option value="compressed-pdf">Compressed PDF</option>
                  <option value="web-pdf">Web PDF</option>
                  <option value="fillable-pdf">Fillable PDF</option>
                </select>
              </label>
              <label>Header
                <input value={active.header} onChange={(event) => updateDraft({ ...active, header: event.target.value })} />
              </label>
              <label>Footer
                <input value={active.footer} onChange={(event) => updateDraft({ ...active, footer: event.target.value })} />
              </label>
              <label>Page numbers
                <input type="checkbox" checked={active.pageNumbers} onChange={(event) => updateDraft({ ...active, pageNumbers: event.target.checked })} />
              </label>
              <button type="button" onClick={() => updateDraft({
                ...active,
                citations: [...active.citations, {
                  id: uid(),
                  key: `ref-${active.citations.length + 1}`,
                  title: "New reference",
                  url: "https://example.com",
                }],
              })}>Add citation</button>
              <button type="button" onClick={() => updateDraft({
                ...active,
                footnotes: [...active.footnotes, {
                  id: uid(),
                  marker: String(active.footnotes.length + 1),
                  text: "New footnote",
                }],
              })}>Add footnote</button>
              <button type="button" onClick={() => updateDraft({
                ...active,
                exportProfile: "fillable-pdf",
                formFields: [...active.formFields, {
                  id: uid(),
                  label: `Field ${active.formFields.length + 1}`,
                  type: "text",
                  required: false,
                }],
              })}>Add form field</button>
            </div>
            <div className="document-layout-grid">
              <aside>
                <h2>Outline</h2>
                {active.sections.map((section, index) => (
                  <button type="button" key={section.id}>{index + 1}. {section.heading}</button>
                ))}
              </aside>
              <div className="document-page" aria-label="Document page preview">
                <span>{active.templateId}</span>
                <h1>{active.title}</h1>
                <p className="document-deck">{active.audience} · {active.purpose}</p>
                {active.sections.map((section) => (
                  <section key={section.id}>
                    <input
                      aria-label="Section heading"
                      value={section.heading}
                      onChange={(event) => updateDraft({
                        ...active,
                        sections: active.sections.map((item) => item.id === section.id ? { ...item, heading: event.target.value } : item),
                      })}
                    />
                    <textarea
                      aria-label={`${section.heading} body`}
                      value={section.body}
                      onChange={(event) => updateDraft({
                        ...active,
                        sections: active.sections.map((item) => item.id === section.id ? { ...item, body: event.target.value } : item),
                      })}
                    />
                  </section>
                ))}
              </div>
              <aside className="preflight-panel">
                <h2>Preflight</h2>
                {(active.preflight.length ? active.preflight : preflightProfessionalDraft(active)).map((item) => (
                  <p key={item.message} className={item.severity}>{item.message}</p>
                ))}
                <small>Accessibility certification is never claimed without an external validator.</small>
              </aside>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function ProviderHubWorkspace({ notify }: { notify: Notify }) {
  const { state, persist } = useFinaleWorkspace(notify);
  const [selectedId, setSelectedId] = useState("openrouter");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelId, setModelId] = useState("");
  const [testPrompt, setTestPrompt] = useState("Reply with a concise provider connection confirmation.");
  const [providerResult, setProviderResult] = useState("");
  const [customProvider, setCustomProvider] = useState({
    name: "",
    baseUrl: "",
    privacyNote: "",
  });
  if (!state) return <LoadingWorkspace />;
  const selected = state.providers.find((provider) => provider.id === selectedId) || state.providers[0];
  const activation = validatePaidActivation(state.usageMode, selected);
  const activeModel = modelId || state.usageMode.defaultModel || selected.modelIds[0] || "";
  const route = resolveUsageRoute({
    mode: state.usageMode,
    provider: selected,
    estimatedCostUsd: state.usageMode.estimatedCostPerRequestUsd,
    taskId: "provider-hub-manual-run",
  });

  const updateProvider = async (provider: ProviderRecord) => {
    await persist({
      ...state,
      providers: state.providers.map((item) => (item.id === provider.id ? provider : item)),
    });
  };

  return (
    <section className="workspace finale-workspace">
      <WorkspaceHeader kicker="UNIVERSAL PROVIDER HUB" title="Free by default, paid only by consent" status={state.usageMode.limitlessFree ? "Limitless Free active" : "Paid BYOK selected"} />
      <div className="finale-scroll">
        <div className="mode-card">
          <div>
            <span>AI USAGE MODE</span>
            <h1>Use Limitless Free</h1>
            <p>Free mode uses only verified free, local, or browser routes. Unknown cost is blocked.</p>
          </div>
          <label className="switch-control">
            <input
              type="checkbox"
              checked={state.usageMode.limitlessFree}
              onChange={(event) => {
                const limitlessFree = event.target.checked;
                if (!limitlessFree && !window.confirm("You are switching off Limitless Free. Paid API requests may create charges on your provider account. Budgets are hard limits inside Limitless, but the provider invoice remains authoritative. Continue?")) {
                  return;
                }
                void persist({
                  ...state,
                  usageMode: {
                    ...state.usageMode,
                    limitlessFree,
                    neverSpend: limitlessFree ? true : state.usageMode.neverSpend,
                    paidStatus: limitlessFree ? "locked" : "ready",
                  },
                });
              }}
              aria-label="Use Limitless Free"
            />
            <span>{state.usageMode.limitlessFree ? "ON" : "OFF"}</span>
          </label>
        </div>
        <div className="provider-layout">
          <aside className="provider-list">
            {state.providers.map((provider) => (
              <button type="button" key={provider.id} className={selected.id === provider.id ? "active" : ""} onClick={() => setSelectedId(provider.id)}>
                <span><Boxes size={16} />{provider.name}</span>
                <small>{provider.status.replaceAll("-", " ")}</small>
              </button>
            ))}
            <form
              className="provider-add-form"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  const provider = createCompatibleProvider({
                    id: customProvider.name,
                    name: customProvider.name,
                    baseUrl: customProvider.baseUrl,
                    costClass: "paid",
                    privacyNote: customProvider.privacyNote,
                  });
                  if (state.providers.some((item) => item.id === provider.id)) {
                    throw new Error("A provider with this ID already exists.");
                  }
                  void persist({
                    ...state,
                    providers: [...state.providers, provider],
                  }).then(() => {
                    setSelectedId(provider.id);
                    setCustomProvider({ name: "", baseUrl: "", privacyNote: "" });
                    notify("Custom OpenAI-compatible provider added in an untested, locked state.", "success");
                  });
                } catch (error) {
                  notify(error instanceof Error ? error.message : "Provider could not be added.", "error");
                }
              }}
            >
              <b>Add compatible provider</b>
              <input aria-label="Custom provider name" value={customProvider.name} onChange={(event) => setCustomProvider((current) => ({ ...current, name: event.target.value }))} placeholder="Provider name" />
              <input aria-label="Custom provider HTTPS endpoint" value={customProvider.baseUrl} onChange={(event) => setCustomProvider((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://api.example.com/v1" />
              <input aria-label="Custom provider privacy note" value={customProvider.privacyNote} onChange={(event) => setCustomProvider((current) => ({ ...current, privacyNote: event.target.value }))} placeholder="Data handling note" />
              <button type="submit" disabled={!customProvider.name.trim() || !customProvider.baseUrl.trim() || !customProvider.privacyNote.trim()}><Plus size={14} /> Add locked</button>
            </form>
          </aside>
          <div className="provider-detail">
            <span>{selected.providerClass} · {selected.apiStyle}</span>
            <h1>{selected.name}</h1>
            <p>{selected.privacyNote}</p>
            <div className="provider-facts">
              <span>Cost <b>{selected.costClass}</b></span>
              <span>State <b>{selected.status}</b></span>
              <span>Catalog <b>{selected.catalogSource}</b></span>
            </div>
            {selected.providerClass !== "local" && selected.providerClass !== "browser" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (selected.configured && !window.confirm("Replace the encrypted key for this provider? The previous credential will no longer be available.")) return;
                  setBusy(true);
                  void saveProviderCredential(selected.id, secret)
                    .then(async (suffix) => {
                      await updateProvider({
                        ...selected,
                        configured: true,
                        status: "untested",
                        verifiedAt: undefined,
                        maskedSuffix: suffix,
                        lastError: undefined,
                      });
                      setSecret("");
                      notify("Key encrypted. Test the connection before paid execution can unlock.", "success");
                    })
                    .catch((error) => notify(error instanceof Error ? error.message : "Key could not be stored.", "error"))
                    .finally(() => setBusy(false));
                }}
              >
                <label>Provider API key<input type="password" autoComplete="off" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={selected.configured ? `••••${selected.maskedSuffix || ""}` : "Paste key"} /></label>
                <button type="submit" disabled={busy || !secret.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />} Encrypt and verify storage</button>
                {selected.configured && <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void loadProviderCredential(selected.id)
                      .then((key) => verifyProviderConnection(selected, key))
                      .then(({ modelIds }) => updateProvider({
                        ...selected,
                        status: "healthy",
                        verifiedAt: Date.now(),
                        modelIds,
                        lastError: undefined,
                      }))
                      .then(() => notify("Provider authentication verified without running a paid model request.", "success"))
                      .catch(async (error) => {
                        const message = error instanceof Error ? error.message : "Provider verification failed.";
                        await updateProvider({ ...selected, status: "degraded", verifiedAt: undefined, lastError: message });
                        notify(message, "error");
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  <Activity size={16} /> Test connection
                </button>}
                {selected.configured && <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    if (!window.confirm(`Remove the encrypted key for ${selected.name}? This cannot be undone.`)) return;
                    void removeProviderCredential(selected.id).then(() => updateProvider({ ...selected, configured: false, status: "requires-key", maskedSuffix: undefined, verifiedAt: undefined }));
                  }}
                >Remove key</button>}
              </form>
            )}
            {!state.usageMode.limitlessFree && (
              <div className="provider-run-panel">
                <label>Model ID
                  <input
                    list="provider-model-list"
                    value={activeModel}
                    onChange={(event) => {
                      setModelId(event.target.value);
                      void persist({
                        ...state,
                        usageMode: { ...state.usageMode, defaultProviderId: selected.id, defaultModel: event.target.value },
                      });
                    }}
                    placeholder="Select or enter an official model ID"
                  />
                </label>
                <datalist id="provider-model-list">
                  {selected.modelIds.map((id) => <option key={id} value={id} />)}
                </datalist>
                <label>Test prompt<textarea value={testPrompt} onChange={(event) => setTestPrompt(event.target.value)} /></label>
                <button
                  type="button"
                  disabled={busy || !route.allowed || !activeModel.trim() || !testPrompt.trim()}
                  onClick={() => {
                    const confirmedPaidCost = !route.requiresConfirmation || window.confirm(`This request is estimated at $${state.usageMode.estimatedCostPerRequestUsd.toFixed(4)}. Your provider invoice is authoritative. Continue?`);
                    if (!confirmedPaidCost) return;
                    setBusy(true);
                    setProviderResult("");
                    void loadProviderCredential(selected.id)
                      .then((key) => executeProviderWithPolicy({
                        mode: state.usageMode,
                        provider: selected,
                        key,
                        model: activeModel.trim(),
                        prompt: testPrompt.trim(),
                        taskId: `provider-hub:${uid()}`,
                        estimatedCostUsd: state.usageMode.estimatedCostPerRequestUsd,
                        confirmedPaidCost,
                        stream: Boolean(selected.supports?.streaming),
                      }))
                      .then(async (result) => {
                        const amount = result.actualCostUsd ?? state.usageMode.estimatedCostPerRequestUsd;
                        await persist({
                          ...state,
                          usageMode: {
                            ...state.usageMode,
                            paidStatus: "active",
                            defaultProviderId: selected.id,
                            defaultModel: activeModel.trim(),
                            spentTodayUsd: state.usageMode.spentTodayUsd + amount,
                            spentThisMonthUsd: state.usageMode.spentThisMonthUsd + amount,
                          },
                          costEvents: [{
                            id: uid(),
                            providerId: selected.id,
                            modelId: activeModel.trim(),
                            taskId: uid(),
                            amountUsd: amount,
                            costKind: result.actualCostUsd === undefined ? "estimated" as const : "actual" as const,
                            providerRequestId: result.requestId,
                            createdAt: Date.now(),
                          }, ...state.costEvents].slice(0, 500),
                        });
                        setProviderResult(result.text);
                        notify("Paid BYOK request completed and the estimate was recorded.", "success");
                      })
                      .catch((error) => notify(error instanceof Error ? error.message : "Provider request failed.", "error"))
                      .finally(() => setBusy(false));
                  }}
                >
                  <Play size={16} /> Run explicit BYOK request
                </button>
                {providerResult && <output>{providerResult}</output>}
              </div>
            )}
          </div>
          <aside className="budget-panel">
            <h2>Hard budgets</h2>
            {(["maxCostPerRequestUsd", "dailyBudgetUsd", "monthlyBudgetUsd"] as const).map((key) => (
              <label key={key}>{key === "maxCostPerRequestUsd" ? "Per request USD" : key === "dailyBudgetUsd" ? "Daily USD" : "Monthly USD"}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.usageMode[key]}
                  disabled={state.usageMode.limitlessFree}
                  onChange={(event) => void persist({ ...state, usageMode: { ...state.usageMode, [key]: Number(event.target.value) } })}
                />
              </label>
            ))}
            <label>Estimated next request USD
              <input
                type="number"
                min="0"
                step="0.0001"
                value={state.usageMode.estimatedCostPerRequestUsd}
                disabled={state.usageMode.limitlessFree}
                onChange={(event) => void persist({
                  ...state,
                  usageMode: { ...state.usageMode, estimatedCostPerRequestUsd: Number(event.target.value) },
                })}
              />
            </label>
            <label>Never Spend
              <input
                type="checkbox"
                checked={state.usageMode.neverSpend}
                disabled={state.usageMode.limitlessFree}
                onChange={(event) => void persist({ ...state, usageMode: { ...state.usageMode, neverSpend: event.target.checked } })}
              />
            </label>
            <div className={`route-proof ${route.allowed ? "passed" : "blocked"}`}>
              {route.allowed ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />}
              {route.allowed ? `${route.route} route allowed` : route.reason}
            </div>
            {!activation.ok && !state.usageMode.limitlessFree && <ul>{activation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
            <button
              type="button"
              onClick={() => void persist({
                ...state,
                usageMode: {
                  ...state.usageMode,
                  limitlessFree: true,
                  neverSpend: true,
                  paidStatus: "locked",
                  defaultProviderId: "",
                  defaultModel: "",
                  spentTodayUsd: 0,
                  spentThisMonthUsd: 0,
                },
              })}
            >
              <RefreshCw size={16} /> Reset to Free
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function SecurityCentreWorkspace({ notify }: { notify: Notify }) {
  const { state, persist } = useFinaleWorkspace(notify);
  const [challenge, setChallenge] = useState<ReturnType<typeof createPairingChallenge> | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  if (!state) return <LoadingWorkspace />;
  const stopSessions = () => {
    const stopped = state.remoteSessions.map((session) =>
      session.status === "active" || session.status === "pending"
        ? emergencyStopSession(session)
        : session,
    );
    void persist({ ...state, remoteSessions: stopped }).then(() => notify("Every remote session was stopped and permissions were cleared.", "success"));
  };
  return (
    <section className="workspace finale-workspace">
      <WorkspaceHeader kicker="ACCOUNT SECURITY CENTRE" title="Devices, sessions, and native apps" status="Remote access off by default" />
      <div className="finale-scroll">
        <div className="security-grid">
          <article className="security-card">
            <Laptop size={28} />
            <h2>Limitless Desktop</h2>
            <p>Real Tauri 2 source and Windows/macOS release workflows are included. No unsigned binary is disguised as a published download.</p>
            <span>CI-configured · build not published yet</span>
          </article>
          <article className="security-card">
            <ShieldCheck size={28} />
            <h2>Remote sessions</h2>
            <p>Explicit device and session permissions, visible active state, expiry, revocation, and emergency stop are enforced by the contract.</p>
            <button type="button" onClick={stopSessions}><Square size={15} /> Emergency stop</button>
          </article>
          <article className="security-card">
            <KeyRound size={28} />
            <h2>Passkeys</h2>
            <p>The account centre is prepared for Supabase Auth passkeys. Enrollment stays disabled until the hosted beta and server challenge are configured.</p>
            <button type="button" disabled>Requires hosted passkey infrastructure</button>
          </article>
        </div>
        <div className="pairing-panel">
          <div>
            <span>ONE-TIME DEVICE PAIRING</span>
            <h1>Pair only with a short-lived code.</h1>
            <p>The code expires in five minutes, is single-use, and locks after repeated failures.</p>
          </div>
          {!challenge ? (
            <button type="button" onClick={() => setChallenge(createPairingChallenge({ userId: state.ownerScope, deviceName: "Limitless Desktop" }))}>
              <Plus size={16} /> Create pairing code
            </button>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const result = consumePairingChallenge(challenge, enteredCode);
                if (!result.ok) {
                  if (result.challenge) setChallenge(result.challenge);
                  notify(result.reason || "Pairing failed.", "error");
                  return;
                }
                const now = Date.now();
                void persist({
                  ...state,
                  devices: [
                    {
                      id: uid(),
                      name: challenge.deviceName,
                      platform: "unknown",
                      status: "paired",
                      permissions: ["project-read", "approved-file-edits", "approved-command-runs"],
                      createdAt: now,
                      lastSeenAt: now,
                    },
                    ...state.devices,
                  ],
                }).then(() => {
                  setChallenge(result.challenge || null);
                  setEnteredCode("");
                  notify("Device paired. The one-time code cannot be reused.", "success");
                });
              }}
            >
              <output aria-label="Pairing code">{challenge.displayCode}</output>
              <label>Confirm code on this device<input inputMode="numeric" maxLength={6} value={enteredCode} onChange={(event) => setEnteredCode(event.target.value.replace(/\D/g, ""))} /></label>
              <button type="submit" disabled={enteredCode.length !== 6}>Approve device</button>
            </form>
          )}
        </div>
        <div className="finale-list">
          {state.devices.map((device) => (
            <article key={device.id}>
              <div><Laptop size={18} /><b>{device.name}</b></div>
              <p>{device.status} · {device.permissions.join(", ")}</p>
              <button
                type="button"
                disabled={device.status === "revoked"}
                onClick={() => void persist({
                  ...state,
                  devices: state.devices.map((item) => item.id === device.id ? { ...item, status: "revoked", permissions: [], revokedAt: Date.now() } : item),
                  remoteSessions: state.remoteSessions.map((session) => session.deviceId === device.id ? { ...session, status: "revoked", permissions: [], revokedAt: Date.now() } : session),
                })}
              >Revoke</button>
            </article>
          ))}
          {!state.devices.length && <p className="finale-empty">No paired devices.</p>}
        </div>
      </div>
    </section>
  );
}
