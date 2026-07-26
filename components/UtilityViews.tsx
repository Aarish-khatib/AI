"use client";

import {
  Bot,
  Brain,
  CheckCircle2,
  CircleAlert,
  Cloud,
  CloudOff,
  Download,
  ExternalLink,
  FileJson,
  Image as ImageIcon,
  KeyRound,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MonitorCog,
  Play,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ImageModel,
  MediaAsset,
  MediaJob,
  MediaProject,
  MemoryItem,
  SyncState,
  TextModel,
  VideoModel,
} from "@/lib/types";
import { createAssetUrl } from "@/lib/media-library";
import {
  cleanModelName,
  generationModelCostClass,
  modelHasTools,
  modelHasVision,
  modelIsCoder,
  modelIsReasoner,
} from "@/lib/openrouter";

function PageHeader({
  kicker,
  title,
  status,
}: {
  kicker: string;
  title: string;
  status?: string;
}) {
  return (
    <header className="workspace-header">
      <div>
        <span className="section-kicker">{kicker}</span>
        <b>{title}</b>
      </div>
      {status && (
        <div className="header-status">
          <span className="status-dot" />
          {status}
        </div>
      )}
    </header>
  );
}

function AssetMedia({
  asset,
  alt,
}: {
  asset?: MediaAsset;
  alt: string;
}) {
  const [source, setSource] = useState(asset?.dataUrl || asset?.remoteUrl || "");
  useEffect(() => {
    if (!asset) {
      queueMicrotask(() => setSource(""));
      return;
    }
    const result = createAssetUrl(asset);
    let active = true;
    queueMicrotask(() => {
      if (active) setSource(result.url || "");
    });
    return () => {
      active = false;
      result.revoke();
    };
  }, [asset]);
  if (!source) return <div className="media-placeholder"><ImageIcon size={24} /></div>;
  if (asset?.kind === "video") return <video src={source} controls playsInline />;
  if (asset?.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={source} alt={alt} />;
  }
  return <div className="media-placeholder"><FileJson size={24} /></div>;
}

export function LibraryView({
  jobs,
  assets,
  projects,
}: {
  jobs: MediaJob[];
  assets: MediaAsset[];
  projects: MediaProject[];
}) {
  const completed = jobs.filter((job) => job.status === "completed").length;
  const [tab, setTab] = useState<"assets" | "projects" | "jobs">("assets");
  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );
  return (
    <section className="workspace utility-workspace">
      <PageHeader kicker="LIBRARY" title="Your visual work" status={`${assets.length} durable assets`} />
      <div className="utility-scroll">
        <div className="page-intro">
          <div>
            <p>MEDIA WORKSPACE</p>
            <h1>Every asset, project, and generation.</h1>
          </div>
          <span>{completed} completed jobs</span>
        </div>
        <nav className="library-tabs" aria-label="Library sections">
          <button type="button" className={tab === "assets" ? "active" : ""} onClick={() => setTab("assets")}>
            Assets <span>{assets.length}</span>
          </button>
          <button type="button" className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>
            Projects <span>{projects.length}</span>
          </button>
          <button type="button" className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}>
            Jobs <span>{jobs.length}</span>
          </button>
        </nav>

        {tab === "assets" && !assets.length ? (
          <div className="library-empty">
            <span><WandSparkles size={25} /></span>
            <h2>No assets yet</h2>
            <p>Generated and imported media is copied here for offline access and editing.</p>
          </div>
        ) : tab === "assets" ? (
          <div className="library-grid">
            {assets.map((asset) => (
              <article className="library-card" key={asset.id}>
                <div className="library-media">
                  <AssetMedia asset={asset} alt={asset.name} />
                  <span className="job-state completed"><i />{asset.kind}</span>
                </div>
                <div className="library-card-copy">
                  <span>{asset.mimeType}</span>
                  <p>{asset.name}</p>
                  <small>{asset.blob ? "Available offline" : "Provider link"} · {(asset.size / 1024 / 1024).toFixed(1)} MB</small>
                </div>
              </article>
            ))}
          </div>
        ) : tab === "projects" ? (
          projects.length ? (
            <div className="project-library-grid">
              {projects.map((project) => (
                <article key={project.id}>
                  <span>{project.kind === "image" ? <Layers3 size={18} /> : <Video size={18} />}</span>
                  <div>
                    <b>{project.name}</b>
                    <small>
                      {project.assetIds.length} linked assets · revision {project.revision}
                    </small>
                  </div>
                  <time>
                    {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(project.updatedAt)}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <div className="library-empty">
              <span><Layers3 size={25} /></span>
              <h2>No editable projects yet</h2>
              <p>Open Image canvas or Video editor in Create to start a versioned project.</p>
            </div>
          )
        ) : !jobs.length ? (
          <div className="library-empty">
            <span><WandSparkles size={25} /></span>
            <h2>No generation jobs yet</h2>
            <p>Queued, running, completed, cancelled, and failed work appears here.</p>
          </div>
        ) : (
          <div className="library-grid">
            {jobs.map((job) => {
              const output = job.outputs[0];
              const asset = output?.assetId ? assetsById.get(output.assetId) : undefined;
              const fallbackAsset: MediaAsset | undefined =
                !asset && (output?.url || output?.dataUrl)
                  ? {
                      id: output.id,
                      name: job.prompt,
                      kind: job.kind === "video" || job.kind === "animate" ? "video" : "image",
                      mimeType: output.mimeType || "application/octet-stream",
                      size: 0,
                      dataUrl: output.dataUrl,
                      remoteUrl: output.url,
                      createdAt: job.createdAt,
                      updatedAt: job.updatedAt,
                      revision: 1,
                      deviceId: job.deviceId,
                    }
                  : undefined;
              return (
                <article className="library-card" key={job.id}>
                  <div className="library-media">
                    {asset || fallbackAsset ? (
                      <AssetMedia asset={asset || fallbackAsset} alt={job.prompt} />
                    ) : (
                      <div className="media-placeholder">
                        {job.status === "processing" || job.status === "queued" ? (
                          <LoaderCircle className="spin" size={24} />
                        ) : job.status === "failed" ? (
                          <CircleAlert size={24} />
                        ) : <ImageIcon size={24} />}
                      </div>
                    )}
                    <span className={`job-state ${job.status}`}><i />{job.status}</span>
                  </div>
                  <div className="library-card-copy">
                    <span>{job.kind.replace("-", " ")}</span>
                    <p>{job.prompt || "Untitled generation"}</p>
                    <small>
                      {job.routeLabel || cleanModelName(job.model)} ·{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      }).format(job.updatedAt)}
                    </small>
                    {job.error && <em>{job.error}</em>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export function ModelsView({
  textModels,
  imageModels,
  videoModels,
}: {
  textModels: TextModel[];
  imageModels: ImageModel[];
  videoModels: VideoModel[];
}) {
  const freeImageModels = imageModels.filter(
    (model) => generationModelCostClass(model) === "free",
  );
  const freeVideoModels = videoModels.filter(
    (model) => generationModelCostClass(model) === "free",
  );
  return (
    <section className="workspace utility-workspace">
      <PageHeader
        kicker="MODELS"
        title="Live model fleet"
        status={`${textModels.length + imageModels.length + videoModels.length} discovered`}
      />
      <div className="utility-scroll">
        <div className="page-intro">
          <div>
            <p>ROUTING INTELLIGENCE</p>
            <h1>The right model for each medium.</h1>
          </div>
        </div>
        <div className="model-stat-grid">
          <div><Sparkles size={18} /><b>{textModels.length}</b><span>Free chat models</span></div>
          <div><ImageIcon size={18} /><b>{freeImageModels.length}</b><span>Free image models</span></div>
          <div><Video size={18} /><b>{freeVideoModels.length}</b><span>Free video models</span></div>
          <div><ShieldCheck size={18} /><b>2</b><span>Always-free fallback engines</span></div>
        </div>
        <section className="model-section">
          <div className="model-section-heading">
            <span>FREE CHAT MODELS</span>
            <small>Auto-ranked by task, capability, context, latency, and recent failures</small>
          </div>
          <div className="model-table">
            {textModels.map((model) => {
              const tags = [
                modelHasTools(model) ? "Tools" : "",
                modelHasVision(model) ? "Vision" : "",
                modelIsCoder(model) ? "Code" : "",
                modelIsReasoner(model) ? "Reasoning" : "",
              ].filter(Boolean);
              return (
                <div className="model-row" key={model.id}>
                  <span className="model-avatar">{cleanModelName(model).slice(0, 1).toUpperCase()}</span>
                  <span className="model-name">
                    <b>{cleanModelName(model)}</b>
                    <small>{model.id}</small>
                  </span>
                  <span className="model-tags">
                    {tags.map((tag) => <i key={tag}>{tag}</i>)}
                  </span>
                  <span className="model-context">
                    {model.context_length
                      ? `${Math.round(model.context_length / 1_000)}K context`
                      : "Dynamic context"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        <div className="generation-model-columns">
          <section className="model-section">
            <div className="model-section-heading"><span>IMAGE</span><small>{imageModels.length} live</small></div>
            <div className="compact-model-list">
              {imageModels.map((model) => (
                <div key={model.id}><ImageIcon size={15} /><span><b>{model.name || cleanModelName(model)}</b><small>{generationModelCostClass(model).toUpperCase()} · {model.id}</small></span></div>
              ))}
              {!imageModels.length && <p>Discovery will retry when OpenRouter is reachable.</p>}
            </div>
          </section>
          <section className="model-section">
            <div className="model-section-heading"><span>VIDEO</span><small>{videoModels.length} live</small></div>
            <div className="compact-model-list">
              {videoModels.map((model) => (
                <div key={model.id}><Video size={15} /><span><b>{model.name || cleanModelName(model)}</b><small>{generationModelCostClass(model).toUpperCase()} · {model.id}</small></span></div>
              ))}
              {!videoModels.length && <p>Discovery will retry when OpenRouter is reachable.</p>}
            </div>
          </section>
        </div>
        <section className="model-section">
          <div className="model-section-heading">
            <span>FALLBACK ROUTES</span>
            <small>Every route keeps its real cost and consent boundary visible</small>
          </div>
          <div className="model-table">
            <div className="model-row">
              <span className="model-avatar">P</span>
              <span className="model-name"><b>Pollinations AI video</b><small>Optional text-to-video and image-to-video using a finite publishable-key budget</small></span>
              <span className="model-tags"><i>Budgeted</i><i>AI video</i></span>
              <span className="model-context">Per-run approval</span>
            </div>
            <div className="model-row">
              <span className="model-avatar">H</span>
              <span className="model-name"><b>AI Horde community GPUs</b><small>Text-to-image, image-to-image, upscaling, and background isolation</small></span>
              <span className="model-tags"><i>Free</i><i>Queue</i></span>
              <span className="model-context">No account required</span>
            </div>
            <div className="model-row">
              <span className="model-avatar">L</span>
              <span className="model-name"><b>Limitless local motion</b><small>Turns references or generated keyframes into downloadable motion video</small></span>
              <span className="model-tags"><i>Free</i><i>Private</i></span>
              <span className="model-context">Runs in browser</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

export type AgentActivity = {
  id: string;
  label: string;
  state: "running" | "done" | "error";
};

export function AgentView({
  online,
  paired,
  workspace,
  trusted,
  pairCode,
  setPairCode,
  workspaceInput,
  setWorkspaceInput,
  onPair,
  onUnpair,
  onMode,
  task,
  setTask,
  onRun,
  running,
  activities,
  error,
  result,
}: {
  online: boolean;
  paired: boolean;
  workspace: string;
  trusted: boolean;
  pairCode: string;
  setPairCode: (value: string) => void;
  workspaceInput: string;
  setWorkspaceInput: (value: string) => void;
  onPair: () => void;
  onUnpair: () => void;
  onMode: (trusted: boolean) => void;
  task: string;
  setTask: (value: string) => void;
  onRun: () => void;
  running: boolean;
  activities: AgentActivity[];
  error?: string;
  result?: string;
}) {
  return (
    <section className="workspace utility-workspace">
      <PageHeader
        kicker="AGENT"
        title="Local project agent"
        status={online ? (paired ? "Workspace paired" : "Companion online") : "Companion offline"}
      />
      <div className="utility-scroll agent-scroll">
        <div className="page-intro">
          <div>
            <p>YOUR COMPUTER · YOUR CONTROL</p>
            <h1>Build in a locked workspace.</h1>
          </div>
          <span className={online ? "online-badge" : "offline-badge"}>
            {online ? <CheckCircle2 size={15} /> : <CloudOff size={15} />}
            {online ? "Online" : "Offline"}
          </span>
        </div>
        <div className="agent-grid">
          <div className="agent-panel">
            <div className="panel-heading">
              <MonitorCog size={19} />
              <span><b>Desktop companion</b><small>Runs only on 127.0.0.1</small></span>
            </div>
            {!paired ? (
              <>
                <p className="panel-copy">
                  Start the included companion, then enter its one-time pairing code and an absolute project folder.
                </p>
                <label className="stack-field">
                  <span>PAIRING CODE</span>
                  <input value={pairCode} onChange={(event) => setPairCode(event.target.value)} placeholder="000000" inputMode="numeric" />
                </label>
                <label className="stack-field">
                  <span>WORKSPACE PATH</span>
                  <input value={workspaceInput} onChange={(event) => setWorkspaceInput(event.target.value)} placeholder="/Users/you/project" />
                </label>
                <button type="button" className="primary-action" onClick={onPair} disabled={!online}>
                  <LockKeyhole size={16} /> Pair workspace
                </button>
              </>
            ) : (
              <>
                <div className="workspace-lock">
                  <ShieldCheck size={19} />
                  <span><b>Workspace locked</b><small>{workspace}</small></span>
                </div>
                <div className="mode-selector">
                  <button type="button" className={!trusted ? "selected" : ""} onClick={() => onMode(false)}>
                    <Shield size={17} /><span><b>Review</b><small>Local approval for every change</small></span>
                  </button>
                  <button type="button" className={trusted ? "selected" : ""} onClick={() => onMode(true)}>
                    <Sparkles size={17} /><span><b>Trusted</b><small>Fewer prompts; terminal and delete still reviewed</small></span>
                  </button>
                </div>
                <button type="button" className="secondary-action" onClick={onUnpair}>
                  <LogOut size={16} /> Unpair this workspace
                </button>
              </>
            )}
          </div>
          <div className="agent-panel agent-task-panel">
            <div className="panel-heading">
              <Bot size={19} />
              <span><b>Agent task</b><small>Read, plan, act, verify</small></span>
            </div>
            <textarea
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="Inspect this project, fix the failing tests, and explain every change…"
              rows={7}
              disabled={!paired || running}
            />
            <button type="button" className="primary-action" onClick={onRun} disabled={!paired || running || !task.trim()}>
              {running ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />}
              {running ? "Agent working…" : "Run agent"}
            </button>
            {error && <p className="form-error">{error}</p>}
          </div>
        </div>
        <section className="agent-activity">
          <div className="model-section-heading"><span>ACTIVITY</span><small>{activities.length || "Ready"}</small></div>
          {!activities.length ? (
            <div className="activity-empty"><Bot size={20} /><span>No actions yet. Review mode is recommended for unfamiliar projects.</span></div>
          ) : activities.map((activity) => (
            <div className="activity-row" key={activity.id}>
              {activity.state === "running" ? <LoaderCircle className="spin" size={16} /> : activity.state === "done" ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
              <span>{activity.label}</span>
              <small>{activity.state}</small>
            </div>
          ))}
          {result && (
            <div className="agent-result">
              <span>RESULT</span>
              <p>{result}</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export function SettingsView({
  keyConfigured,
  configuredKeyCount,
  pollinationsConfigured,
  pollinationsRunBudget,
  cloudAvailable,
  userEmail,
  sync,
  recoveryCount,
  migrationLabel,
  onKey,
  onAccount,
  onSync,
  onExport,
  onImport,
  qualityBoost,
  onQualityBoost,
  onDiagnostics,
  memory,
  onAddMemory,
  onDeleteMemory,
}: {
  keyConfigured: boolean;
  configuredKeyCount: number;
  pollinationsConfigured: boolean;
  pollinationsRunBudget: number;
  cloudAvailable: boolean;
  userEmail?: string;
  sync: SyncState;
  recoveryCount: number;
  migrationLabel: string;
  onKey: () => void;
  onAccount: () => void;
  onSync: () => void;
  onExport: () => void;
  onImport: () => void;
  qualityBoost: boolean;
  onQualityBoost: (enabled: boolean) => void;
  onDiagnostics: () => void;
  memory: MemoryItem[];
  onAddMemory: (text: string, category: MemoryItem["category"]) => void;
  onDeleteMemory: (item: MemoryItem) => void;
}) {
  const [memoryText, setMemoryText] = useState("");
  const [memoryCategory, setMemoryCategory] = useState<MemoryItem["category"]>("preference");
  return (
    <section className="workspace utility-workspace">
      <PageHeader kicker="SETTINGS" title="Privacy and data" status="Local-first" />
      <div className="utility-scroll settings-scroll">
        <div className="page-intro">
          <div>
            <p>CONTROL CENTER</p>
            <h1>Your data stays yours.</h1>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-heading"><span>AI PROVIDER</span><small>Bring your own key</small></div>
          <div className="setting-row static">
            <span className="setting-icon"><ShieldCheck size={18} /></span>
            <span><b>Zero-cost creation engine</b><small>AI Horde community images and local motion work without an OpenRouter key. Never-spend is enabled by default.</small></span>
            <em className="good">Ready</em>
          </div>
          <div className="setting-row static">
            <span className="setting-icon"><Video size={18} /></span>
            <span><b>Budgeted AI video route</b><small>{pollinationsConfigured && pollinationsRunBudget > 0 ? `Pollinations can run only after per-run consent, up to ${pollinationsRunBudget} configured browser run${pollinationsRunBudget === 1 ? "" : "s"}.` : "Add a client-safe publishable key and a finite run budget to enable Pollinations. Local video remains available."}</small></span>
            <em className={pollinationsConfigured && pollinationsRunBudget > 0 ? "good" : ""}>{pollinationsConfigured && pollinationsRunBudget > 0 ? "Guarded" : "Off"}</em>
          </div>
          <button type="button" className="setting-row" onClick={onKey}>
            <span className="setting-icon"><KeyRound size={18} /></span>
            <span><b>OpenRouter key pool</b><small>Up to three workspace-isolated encrypted keys with priority, health, cooldown, disable, replace, and remove controls.</small></span>
            <em className={keyConfigured ? "good" : ""}>{keyConfigured ? `${configuredKeyCount} active` : "Add key"}</em>
          </button>
          <button
            type="button"
            className="setting-row"
            onClick={() => onQualityBoost(!qualityBoost)}
          >
            <span className="setting-icon"><Sparkles size={18} /></span>
            <span><b>Quality Boost</b><small>Optionally checks a completed answer with a second available free chat route. The original answer is kept if review fails.</small></span>
            <em className={qualityBoost ? "good" : ""}>{qualityBoost ? "On" : "Off"}</em>
          </button>
        </div>
        <div className="settings-section">
          <div className="settings-heading"><span>MEMORY & CONTEXT</span><small>User controlled</small></div>
          <div className="setting-row static">
            <span className="setting-icon"><Brain size={18} /></span>
            <span><b>Long-chat compression</b><small>Older messages are summarized only when a conversation grows large. Recent messages and the original conversation remain stored intact.</small></span>
            <em className="good">Automatic</em>
          </div>
          <div className="memory-manager">
            <div className="memory-compose">
              <select value={memoryCategory} onChange={(event) => setMemoryCategory(event.target.value as MemoryItem["category"])}>
                <option value="preference">Preference</option>
                <option value="profile">Profile</option>
                <option value="project">Project</option>
                <option value="instruction">Instruction</option>
                <option value="other">Other</option>
              </select>
              <input
                value={memoryText}
                maxLength={500}
                onChange={(event) => setMemoryText(event.target.value)}
                placeholder="Add a fact Limitless should remember across chats…"
              />
              <button
                type="button"
                disabled={!memoryText.trim()}
                onClick={() => {
                  onAddMemory(memoryText.trim(), memoryCategory);
                  setMemoryText("");
                }}
              ><Plus size={15} /> Remember</button>
            </div>
            <div className="memory-list">
              {memory.map((item) => (
                <div key={item.id}>
                  <span>{item.category}</span>
                  <p>{item.text}</p>
                  <button type="button" aria-label="Forget memory" onClick={() => onDeleteMemory(item)}><Trash2 size={14} /></button>
                </div>
              ))}
              {!memory.length && <p className="memory-empty">Nothing is remembered across chats until you add it here.</p>}
            </div>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-heading"><span>IDENTITY & SYNC</span><small>Optional</small></div>
          <button type="button" className="setting-row" onClick={onAccount}>
            <span className="setting-icon"><Cloud size={18} /></span>
            <span><b>{userEmail || "Cloud account"}</b><small>{cloudAvailable ? "Magic-link sign in with private RLS-protected records." : "Add Supabase public project values to enable account sync."}</small></span>
            <em>{userEmail ? "Signed in" : cloudAvailable ? "Sign in" : "Not configured"}</em>
          </button>
          {userEmail && (
            <button type="button" className="setting-row" onClick={onSync} disabled={sync.syncing}>
              <span className="setting-icon"><RefreshCw className={sync.syncing ? "spin" : ""} size={18} /></span>
              <span><b>Sync now</b><small>{sync.error || (sync.lastSyncedAt ? `Last synced ${new Date(sync.lastSyncedAt).toLocaleString()}` : "Merge this device with your account without silent overwrites.")}</small></span>
              <em>{sync.syncing ? "Syncing" : "Run"}</em>
            </button>
          )}
        </div>
        <div className="settings-section">
          <div className="settings-heading"><span>RECOVERY</span><small>{recoveryCount} protected snapshot{recoveryCount === 1 ? "" : "s"}</small></div>
          <div className="setting-row static">
            <span className="setting-icon"><ShieldCheck size={18} /></span>
            <span><b>Legacy data migration</b><small>{migrationLabel}</small></span>
            <em className="good">Verified</em>
          </div>
          <button type="button" className="setting-row" onClick={onExport}>
            <span className="setting-icon"><FileJson size={18} /></span>
            <span><b>Export complete backup</b><small>Conversations, assets, editable projects, versions, memory, jobs, settings, and deleted-item markers. Secrets excluded.</small></span>
            <em><Download size={15} /></em>
          </button>
          <button type="button" className="setting-row" onClick={onImport}>
            <span className="setting-icon"><Upload size={18} /></span>
            <span><b>Import or restore</b><small>Newer revisions win; divergent conversations become recovered copies.</small></span>
            <em>Choose file</em>
          </button>
        </div>
        <div className="settings-section">
          <div className="settings-heading"><span>SUPPORT</span><small>Secret-safe</small></div>
          <button type="button" className="setting-row" onClick={onDiagnostics}>
            <span className="setting-icon"><MonitorCog size={18} /></span>
            <span><b>Export diagnostics</b><small>Downloads redacted configuration and record counts. Provider keys, tokens, prompts, files, and account identifiers are excluded.</small></span>
            <em><Download size={15} /></em>
          </button>
          <a className="setting-row" href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">
            <span className="setting-icon"><ExternalLink size={18} /></span>
            <span><b>OpenRouter dashboard</b><small>Review model spending, quotas, and keys directly with the provider.</small></span>
            <em>Open</em>
          </a>
        </div>
      </div>
    </section>
  );
}
