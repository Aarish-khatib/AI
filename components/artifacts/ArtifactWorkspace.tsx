"use client";

import {
  ArchiveRestore,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Download,
  FileInput,
  FilePlus2,
  History,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Redo2,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { ArtifactEditor } from "@/components/artifacts/ArtifactEditors";
import {
  generateArtifactFile,
  queuedArtifactExport,
  supportedExportFormats,
  validateArtifactFile,
} from "@/lib/artifacts/exporters";
import { importArtifactFile } from "@/lib/artifacts/importers";
import {
  createArtifact,
  duplicateArtifact,
} from "@/lib/artifacts/model";
import type {
  Artifact,
  ArtifactAsset,
  ArtifactContent,
  ArtifactExport,
  ArtifactExportFormat,
  ArtifactType,
  ArtifactVersion,
} from "@/lib/artifacts/types";
import {
  checkpointArtifact,
  getActiveWorkspaceScope,
  loadArtifactExports,
  loadArtifactVersions,
  loadArtifacts,
  recoverArtifact,
  restoreArtifactVersion,
  saveArtifact,
  saveArtifactAsset,
  saveArtifactExport,
  tombstoneArtifact,
} from "@/lib/local-store";
import { uid } from "@/lib/types";

const creationTypes: Array<{
  type: ArtifactType;
  label: string;
  detail: string;
}> = [
  {
    type: "presentation",
    label: "Presentation",
    detail: "Editable slides with PPTX and PDF export",
  },
  {
    type: "document",
    label: "Document",
    detail: "Structured pages with DOCX, PDF, Markdown, and HTML export",
  },
  {
    type: "spreadsheet",
    label: "Spreadsheet",
    detail: "Sheets, formulas, formatting, charts, XLSX and CSV export",
  },
  {
    type: "canvas",
    label: "Canvas",
    detail: "Positioned text, shapes, and connectors",
  },
];

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function dataUrlBlob(dataUrl: string): Blob {
  const [header, encoded = ""] = dataUrl.split(",", 2);
  const mimeType =
    header.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
  const binary = header.includes(";base64")
    ? atob(encoded)
    : decodeURIComponent(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The asset could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function statusLabel(state: Artifact["autosaveState"]) {
  if (state === "dirty") return "Unsaved changes";
  if (state === "saving") return "Saving…";
  if (state === "error") return "Save failed";
  return "Saved locally";
}

export function ArtifactWorkspace({
  artifacts,
  requestedArtifactId,
  deviceId,
  onArtifactsChanged,
  onArtifactOpened,
  onAskAI,
  notify,
}: {
  artifacts: Artifact[];
  requestedArtifactId?: string;
  deviceId: string;
  onArtifactsChanged: (artifacts: Artifact[]) => void;
  onArtifactOpened: (artifactId?: string) => void;
  onAskAI: (artifact: Artifact) => void;
  notify: (message: string, type?: "info" | "success" | "error") => void;
}) {
  const [draft, setDraft] = useState<Artifact | null>(() => {
    const requested = artifacts.find(
      (artifact) => artifact.id === requestedArtifactId,
    );
    return requested ? structuredClone(requested) : null;
  });
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [exports, setExports] = useState<ArtifactExport[]>([]);
  const [deleted, setDeleted] = useState<Artifact[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExports, setShowExports] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ArtifactType | "all">("all");
  const [past, setPast] = useState<ArtifactContent[]>([]);
  const [future, setFuture] = useState<ArtifactContent[]>([]);
  const [exportFormat, setExportFormat] =
    useState<ArtifactExportFormat>("json");
  const [busy, setBusy] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const saveGeneration = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const revisionFloor = useRef(draft?.revision || 0);

  const refreshArtifacts = useCallback(async () => {
    const [live, all] = await Promise.all([
      loadArtifacts(),
      loadArtifacts({ includeDeleted: true }),
    ]);
    onArtifactsChanged(live);
    setDeleted(all.filter((artifact) => artifact.deletedAt));
    return live;
  }, [onArtifactsChanged]);

  const openArtifact = useCallback(
    async (artifact: Artifact) => {
      const [nextVersions, nextExports] = await Promise.all([
        loadArtifactVersions(artifact.id),
        loadArtifactExports({ artifactId: artifact.id }),
      ]);
      setDraft(structuredClone(artifact));
      setVersions(nextVersions);
      setExports(nextExports);
      setPast([]);
      setFuture([]);
      revisionFloor.current = artifact.revision;
      setShowCreate(false);
      setShowTrash(false);
      setShowHistory(false);
      setShowExports(false);
      onArtifactOpened(artifact.id);
      const formats = supportedExportFormats(artifact);
      setExportFormat(formats[0] || "json");
    },
    [onArtifactOpened],
  );

  useEffect(() => {
    void loadArtifacts({ includeDeleted: true }).then((all) =>
      setDeleted(all.filter((artifact) => artifact.deletedAt)),
    );
  }, [artifacts]);

  useEffect(() => {
    const artifactId = draft?.id;
    if (!artifactId) return;
    void Promise.all([
      loadArtifactVersions(artifactId),
      loadArtifactExports({ artifactId }),
    ]).then(([nextVersions, nextExports]) => {
      setVersions(nextVersions);
      setExports(nextExports);
    });
    // Reload only when the editor switches artifacts, not on each autosave.
  }, [draft?.id]);

  useEffect(() => {
    if (!draft || draft.autosaveState !== "dirty") return;
    const generation = ++saveGeneration.current;
    const pending = structuredClone(draft);
    const timer = window.setTimeout(() => {
      setDraft((current) =>
        current?.id === pending.id &&
        current.updatedAt === pending.updatedAt &&
        current.autosaveState === "dirty"
          ? { ...current, autosaveState: "saving" }
          : current,
      );
      saveQueue.current = saveQueue.current.then(async () => {
        const saved: Artifact = {
          ...pending,
          autosaveState: "saved",
          updatedAt: Date.now(),
          revision: Math.max(pending.revision, revisionFloor.current) + 1,
          deviceId,
        };
        try {
          await saveArtifact(saved);
          revisionFloor.current = saved.revision;
          setDraft((current) => {
            if (current?.id !== pending.id) return current;
            if (current.updatedAt === pending.updatedAt) return saved;
            return {
              ...current,
              revision: Math.max(current.revision, saved.revision),
              deviceId,
            };
          });
          if (generation === saveGeneration.current) await refreshArtifacts();
        } catch (error) {
          if (generation !== saveGeneration.current) return;
          setDraft((current) =>
            current?.id === pending.id
              ? { ...current, autosaveState: "error" }
              : current,
          );
          notify(
            error instanceof Error ? error.message : "Artifact autosave failed.",
            "error",
          );
        }
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [deviceId, draft, notify, refreshArtifacts]);

  const applyContent = (content: ArtifactContent) => {
    setDraft((current) => {
      if (!current) return current;
      setPast((history) => [...history.slice(-79), structuredClone(current.content)]);
      setFuture([]);
      return {
        ...current,
        content,
        updatedAt: Date.now(),
        autosaveState: "dirty",
        exportState: "idle",
      };
    });
  };

  const undo = () => {
    const content = past.at(-1);
    if (!content || !draft) return;
    setFuture((items) => [structuredClone(draft.content), ...items].slice(0, 80));
    setPast((items) => items.slice(0, -1));
    setDraft({
      ...draft,
      content: structuredClone(content),
      updatedAt: Date.now(),
      autosaveState: "dirty",
    });
  };

  const redo = () => {
    const content = future[0];
    if (!content || !draft) return;
    setPast((items) => [...items.slice(-79), structuredClone(draft.content)]);
    setFuture((items) => items.slice(1));
    setDraft({
      ...draft,
      content: structuredClone(content),
      updatedAt: Date.now(),
      autosaveState: "dirty",
    });
  };

  const createNew = async (type: ArtifactType) => {
    setBusy("create");
    try {
      const artifact = createArtifact({
        ownerId: getActiveWorkspaceScope(),
        deviceId,
        type,
      });
      const created = await checkpointArtifact(artifact, "created", "Created");
      await refreshArtifacts();
      await openArtifact(created.artifact);
      notify(`${creationTypes.find((item) => item.type === type)?.label || "Artifact"} created.`, "success");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Artifact creation failed.",
        "error",
      );
    } finally {
      setBusy("");
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      notify("Imports must be 50 MB or smaller.", "error");
      return;
    }
    setBusy("import");
    try {
      const artifact = await importArtifactFile({
        file,
        ownerId: getActiveWorkspaceScope(),
        deviceId,
      });
      const imported = await checkpointArtifact(
        artifact,
        "import",
        `Imported ${file.name}`,
      );
      await refreshArtifacts();
      await openArtifact(imported.artifact);
      notify(
        `Imported ${file.name}. Review the compatibility report before editing.`,
        "success",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Import failed.", "error");
    } finally {
      setBusy("");
    }
  };

  const duplicate = async (artifact: Artifact) => {
    const copy = duplicateArtifact(
      artifact,
      getActiveWorkspaceScope(),
      deviceId,
    );
    const saved = await checkpointArtifact(copy, "created", "Duplicated");
    await refreshArtifacts();
    await openArtifact(saved.artifact);
    notify("Artifact duplicated with an independent version history.", "success");
  };

  const remove = async (artifact: Artifact) => {
    await tombstoneArtifact(artifact, deviceId);
    if (draft?.id === artifact.id) {
      setDraft(null);
      onArtifactOpened(undefined);
    }
    await refreshArtifacts();
    notify("Artifact moved to recoverable trash.", "success");
  };

  const recover = async (artifact: Artifact) => {
    const restored = await recoverArtifact(artifact, deviceId);
    await refreshArtifacts();
    await openArtifact(restored);
    notify("Artifact recovered with its version history.", "success");
  };

  const saveVersion = async () => {
    if (!draft) return;
    setBusy("version");
    try {
      const result = await checkpointArtifact(
        {
          ...draft,
          autosaveState: "saved",
          updatedAt: Date.now(),
          revision: draft.revision + 1,
          deviceId,
        },
        "manual",
        `Checkpoint ${versions.length + 1}`,
      );
      setDraft(result.artifact);
      revisionFloor.current = result.artifact.revision;
      setVersions(await loadArtifactVersions(draft.id));
      await refreshArtifacts();
      notify("Version checkpoint saved.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Version save failed.", "error");
    } finally {
      setBusy("");
    }
  };

  const restoreVersion = async (version: ArtifactVersion) => {
    if (!draft) return;
    setBusy("restore");
    try {
      const restored = await restoreArtifactVersion(draft, version, deviceId);
      setDraft(restored.artifact);
      revisionFloor.current = restored.artifact.revision;
      setVersions(await loadArtifactVersions(draft.id));
      setPast([]);
      setFuture([]);
      await refreshArtifacts();
      notify(`Restored version ${version.versionNumber}.`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Restore failed.", "error");
    } finally {
      setBusy("");
    }
  };

  const exportArtifact = async () => {
    if (!draft) return;
    const format = exportFormat;
    const queued = queuedArtifactExport(draft, format);
    setBusy("export");
    setShowExports(true);
    setExports((items) => [queued, ...items]);
    await saveArtifactExport(queued);
    const processing: ArtifactExport = {
      ...queued,
      status: "processing",
      updatedAt: Date.now(),
      revision: queued.revision + 1,
    };
    setExports((items) =>
      items.map((item) => (item.id === processing.id ? processing : item)),
    );
    await saveArtifactExport(processing);
    try {
      const generated = await generateArtifactFile(draft, format);
      const validation = await validateArtifactFile(format, generated.blob);
      if (!validation.valid) {
        throw new Error(`Export validation failed: ${validation.detail}.`);
      }
      const completed: ArtifactExport = {
        ...processing,
        status: "completed",
        blob: generated.blob,
        fileName: generated.fileName,
        mimeType: generated.mimeType,
        size: generated.blob.size,
        checksum: generated.checksum,
        updatedAt: Date.now(),
        revision: processing.revision + 1,
      };
      await saveArtifactExport(completed);
      setExports((items) =>
        items.map((item) => (item.id === completed.id ? completed : item)),
      );
      downloadBlob(generated.blob, generated.fileName);
      notify(
        `${format.toUpperCase()} exported and validated locally.`,
        "success",
      );
    } catch (error) {
      const failed: ArtifactExport = {
        ...processing,
        status: "failed",
        error: error instanceof Error ? error.message : "Export failed.",
        updatedAt: Date.now(),
        revision: processing.revision + 1,
      };
      await saveArtifactExport(failed);
      setExports((items) =>
        items.map((item) => (item.id === failed.id ? failed : item)),
      );
      notify(failed.error || "Export failed.", "error");
    } finally {
      setBusy("");
    }
  };

  const downloadPrevious = (item: ArtifactExport) => {
    if (item.blob) downloadBlob(item.blob, item.fileName);
    else if (item.dataUrl) downloadBlob(dataUrlBlob(item.dataUrl), item.fileName);
    else if (item.downloadUrl) {
      const anchor = document.createElement("a");
      anchor.href = item.downloadUrl;
      anchor.download = item.fileName;
      anchor.rel = "noopener";
      anchor.click();
    } else {
      notify("This export has no offline file. Export it again.", "error");
    }
  };

  const storeAssetFile = async (file: File) => {
    if (!draft) throw new Error("Open an artifact before adding an asset.");
    const now = Date.now();
    const asset: ArtifactAsset = {
      id: uid(),
      artifactId: draft.id,
      ownerId: draft.ownerId,
      name: file.name,
      kind: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("audio/")
          ? "audio"
          : file.type.startsWith("video/")
            ? "video"
            : file.type.startsWith("font/")
              ? "font"
              : "attachment",
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      blob: file,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      deviceId,
    };
    await saveArtifactAsset(asset);
    const dataUrl = await blobDataUrl(file);
    setDraft((current) =>
      current?.id === draft.id
        ? {
            ...current,
            assetIds: [...new Set([...current.assetIds, asset.id])],
            updatedAt: Date.now(),
            autosaveState: "dirty",
          }
        : current,
    );
    return { id: asset.id, dataUrl };
  };

  const visible = useMemo(
    () =>
      artifacts.filter(
        (artifact) =>
          (filter === "all" || artifact.type === filter) &&
          artifact.title.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [artifacts, filter, search],
  );

  if (draft) {
    const formats = supportedExportFormats(draft);
    return (
      <section className="workspace artifact-workspace artifact-workspace-open">
        <header className="workspace-header artifact-workspace-header">
          <div>
            <button
              type="button"
              className="artifact-back"
              onClick={() => {
                setDraft(null);
                onArtifactOpened(undefined);
              }}
              aria-label="Back to artifacts"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="section-kicker">
                {draft.type.replace("-", " ").toUpperCase()}
              </span>
              <input
                className="artifact-title-input"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          title: event.target.value.slice(0, 120),
                          thumbnail: {
                            kind: "text",
                            value: event.target.value.slice(0, 120),
                          },
                          updatedAt: Date.now(),
                          autosaveState: "dirty",
                        }
                      : current,
                  )
                }
                aria-label="Artifact title"
              />
            </div>
          </div>
          <div className="artifact-header-actions">
            <span
              className={`artifact-save-status save-${draft.autosaveState}`}
              role="status"
            >
              {draft.autosaveState === "saving" ? (
                <LoaderCircle size={13} className="spin" />
              ) : (
                <Check size={13} />
              )}
              {statusLabel(draft.autosaveState)}
            </span>
            <span className="artifact-private">
              <LockKeyhole size={13} />
              Private
            </span>
            <button type="button" onClick={undo} disabled={!past.length} title="Undo">
              <Undo2 size={15} />
            </button>
            <button type="button" onClick={redo} disabled={!future.length} title="Redo">
              <Redo2 size={15} />
            </button>
            <button
              type="button"
              className={showHistory ? "active" : ""}
              onClick={() => setShowHistory((value) => !value)}
            >
              <History size={15} />
              History
            </button>
            <button
              type="button"
              onClick={() => onAskAI(draft)}
              title="Continue editing with AI in Chat"
            >
              <Sparkles size={15} />
              Ask AI
            </button>
            <div className="artifact-export-control">
              <select
                value={exportFormat}
                onChange={(event) =>
                  setExportFormat(event.target.value as ArtifactExportFormat)
                }
                aria-label="Export format"
              >
                {formats.map((format) => (
                  <option value={format} key={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void exportArtifact()}
                disabled={busy === "export"}
              >
                {busy === "export" ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Download size={15} />
                )}
                Export
              </button>
              <button
                type="button"
                onClick={() => setShowExports((value) => !value)}
                title="Previous exports"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </header>
        {draft.importReport && (
          <details className="compatibility-report">
            <summary>
              Import compatibility report · {draft.importReport.preserved.length} preserved ·{" "}
              {draft.importReport.converted.length} converted
            </summary>
            <div>
              {[
                ["Preserved", draft.importReport.preserved],
                ["Converted", draft.importReport.converted],
                ["Unsupported", draft.importReport.unsupported],
                ["Warnings", draft.importReport.warnings],
                ["Missing fonts/assets", draft.importReport.missingFontsOrAssets],
              ].map(([label, notices]) => (
                <section key={String(label)}>
                  <b>{String(label)}</b>
                  {(notices as Array<{ feature: string; detail: string }>).length ? (
                    <ul>
                      {(notices as Array<{ feature: string; detail: string }>).map(
                        (notice) => (
                          <li key={`${notice.feature}-${notice.detail}`}>
                            <strong>{notice.feature}:</strong> {notice.detail}
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p>None</p>
                  )}
                </section>
              ))}
            </div>
          </details>
        )}
        <ArtifactEditor
          content={draft.content}
          onChange={applyContent}
          onAssetFile={storeAssetFile}
        />
        {showHistory && (
          <aside className="artifact-drawer" aria-label="Version history">
            <header>
              <div>
                <span>VERSION HISTORY</span>
                <b>{versions.length} restore points</b>
              </div>
              <button type="button" onClick={() => setShowHistory(false)}>
                <X size={16} />
              </button>
            </header>
            <button
              type="button"
              className="drawer-primary"
              onClick={() => void saveVersion()}
              disabled={busy === "version"}
            >
              <Plus size={15} />
              Save checkpoint
            </button>
            <div className="artifact-version-list">
              {versions.map((version) => (
                <article key={version.id}>
                  <span>V{version.versionNumber}</span>
                  <div>
                    <b>{version.label || version.reason}</b>
                    <small>
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(version.createdAt)}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => void restoreVersion(version)}
                    disabled={busy === "restore"}
                  >
                    Restore
                  </button>
                </article>
              ))}
            </div>
          </aside>
        )}
        {showExports && (
          <aside className="artifact-drawer" aria-label="Export history">
            <header>
              <div>
                <span>EXPORT HISTORY</span>
                <b>{exports.length} files</b>
              </div>
              <button type="button" onClick={() => setShowExports(false)}>
                <X size={16} />
              </button>
            </header>
            <div className="artifact-version-list">
              {exports.length ? (
                exports.map((item) => (
                  <article key={item.id}>
                    <span>{item.format.toUpperCase()}</span>
                    <div>
                      <b>{item.fileName}</b>
                      <small>
                        {item.status}
                        {item.size
                          ? ` · ${Math.max(1, Math.round(item.size / 1024))} KB`
                          : ""}
                      </small>
                      {item.error && <em>{item.error}</em>}
                    </div>
                    {item.status === "completed" && (
                      <button type="button" onClick={() => downloadPrevious(item)}>
                        Download
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <p className="drawer-empty">No exports yet.</p>
              )}
            </div>
          </aside>
        )}
      </section>
    );
  }

  return (
    <section className="workspace artifact-workspace">
      <header className="workspace-header">
        <div>
          <span className="section-kicker">ARTIFACTS</span>
          <b>Structured workspace</b>
        </div>
        <div className="artifact-home-actions">
          <input
            ref={importRef}
            type="file"
            hidden
            accept=".pptx,.docx,.xlsx,.csv,.pdf,.md,.markdown,.html,.htm"
            onChange={(event) => void importFile(event)}
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            disabled={busy === "import"}
          >
            {busy === "import" ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <FileInput size={15} />
            )}
            Import
          </button>
          <button
            type="button"
            className={showTrash ? "active" : ""}
            onClick={() => setShowTrash((value) => !value)}
          >
            <Trash2 size={15} />
            Trash {deleted.length ? `(${deleted.length})` : ""}
          </button>
          <button
            type="button"
            className="artifact-create-button"
            onClick={() => setShowCreate((value) => !value)}
          >
            <Plus size={15} />
            New artifact
            <ChevronDown size={14} />
          </button>
          {showCreate && (
            <div className="artifact-create-menu">
              {creationTypes.map((item) => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => void createNew(item.type)}
                  disabled={busy === "create"}
                >
                  <FilePlus2 size={17} />
                  <span>
                    <b>{item.label}</b>
                    <small>{item.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <div className="artifact-home">
        <div className="artifact-home-intro">
          <div>
            <p>REAL, EDITABLE FILES</p>
            <h1>Create once. Edit, version, recover, and export anywhere.</h1>
            <span>
              Presentations, documents, spreadsheets, PDFs, and canvases remain
              structured—never flattened into a screenshot.
            </span>
          </div>
          <div className="artifact-home-security">
            <LockKeyhole size={20} />
            <b>Private by default</b>
            <span>
              Local-first storage, account isolation, recoverable deletion, and
              short-lived cloud downloads.
            </span>
          </div>
        </div>
        <div className="artifact-filter-row">
          <label>
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search artifacts"
            />
          </label>
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as ArtifactType | "all")
            }
            aria-label="Filter artifact type"
          >
            <option value="all">All types</option>
            {creationTypes.map((item) => (
              <option key={item.type} value={item.type}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {showTrash ? (
          <section className="artifact-section">
            <header>
              <div>
                <span>RECOVERABLE TRASH</span>
                <b>Nothing is permanently deleted here</b>
              </div>
              <ArchiveRestore size={18} />
            </header>
            {deleted.length ? (
              <div className="artifact-grid">
                {deleted.map((artifact) => (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    onOpen={() => undefined}
                    onRecover={() => void recover(artifact)}
                  />
                ))}
              </div>
            ) : (
              <div className="artifact-empty">
                <Trash2 size={24} />
                <h2>Trash is empty</h2>
                <p>Deleted artifacts appear here until they are recovered.</p>
              </div>
            )}
          </section>
        ) : visible.length ? (
          <section className="artifact-section">
            <header>
              <div>
                <span>YOUR WORK</span>
                <b>
                  {visible.length} artifact{visible.length === 1 ? "" : "s"}
                </b>
              </div>
              <Clock3 size={18} />
            </header>
            <div className="artifact-grid">
              {visible.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  onOpen={() => void openArtifact(artifact)}
                  onDuplicate={() => void duplicate(artifact)}
                  onDelete={() => void remove(artifact)}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="artifact-empty">
            <FilePlus2 size={28} />
            <h2>{search ? "No matching artifacts" : "Make your first artifact"}</h2>
            <p>
              {search
                ? "Try a different title or type filter."
                : "Start from a structured editor, import an Office file, or ask Chat to create one."}
            </p>
            {!search && (
              <button type="button" onClick={() => setShowCreate(true)}>
                <Plus size={15} />
                New artifact
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
