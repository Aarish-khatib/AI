"use client";

import {
  ArrowDown,
  ArrowUp,
  BoxSelect,
  Download,
  Eye,
  EyeOff,
  History,
  ImagePlus,
  Layers3,
  Lock,
  LockOpen,
  Maximize2,
  Paintbrush,
  Redo2,
  Save,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createAssetFromFile,
  loadProjectVersions,
  saveAsset,
  saveProject,
} from "@/lib/local-store";
import { createAssetUrl } from "@/lib/media-library";
import type {
  Attachment,
  ImageLayer,
  ImageProjectData,
  MediaAsset,
  MediaProject,
  ProjectVersion,
} from "@/lib/types";
import { uid } from "@/lib/types";

type Props = {
  deviceId: string;
  assets: MediaAsset[];
  projects: MediaProject[];
  onAssetSaved: (asset: MediaAsset) => void;
  onProjectSaved: (project: MediaProject) => void;
  onGenerate: (reference: Attachment, prompt: string) => void;
};

const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
};

function blankProject(deviceId: string): MediaProject {
  const now = Date.now();
  return {
    id: uid(),
    name: "Untitled image",
    kind: "image",
    data: {
      width: 1024,
      height: 1024,
      background: "#ffffff",
      layers: [],
      mask: [],
    },
    assetIds: [],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId,
  };
}

function imageData(project: MediaProject): ImageProjectData {
  return project.data as ImageProjectData;
}

function cloneProject(project: MediaProject): MediaProject {
  return structuredClone(project);
}

function stampProject(project: MediaProject, deviceId: string): MediaProject {
  return {
    ...project,
    updatedAt: Date.now(),
    revision: project.revision + 1,
    deviceId,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function loadCanvasImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("An image layer could not be rendered."));
    image.src = source;
  });
}

async function drawProject(
  canvas: HTMLCanvasElement,
  project: MediaProject,
  assetUrls: Map<string, string>,
  options?: { applyMask?: boolean; showMask?: boolean },
) {
  const data = imageData(project);
  canvas.width = data.width;
  canvas.height = data.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, data.width, data.height);
  context.fillStyle = data.background;
  context.fillRect(0, 0, data.width, data.height);

  for (const layer of data.layers) {
    if (!layer.visible) continue;
    context.save();
    context.globalAlpha = layer.opacity;
    context.globalCompositeOperation = layer.blendMode;
    context.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    context.rotate((layer.rotation * Math.PI) / 180);
    context.translate(-layer.width / 2, -layer.height / 2);
    if (layer.type === "image" && layer.assetId) {
      const source = assetUrls.get(layer.assetId);
      if (source) {
        try {
          const image = await loadCanvasImage(source);
          const filters = layer.filters || DEFAULT_FILTERS;
          context.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%)`;
          context.drawImage(image, 0, 0, layer.width, layer.height);
        } catch {
          context.strokeStyle = "#808080";
          context.strokeRect(0, 0, layer.width, layer.height);
        }
      }
    } else if (layer.type === "text") {
      context.fillStyle = layer.color || "#111111";
      context.font = `${layer.fontWeight || 600} ${layer.fontSize || 64}px ${layer.fontFamily || "Arial"}`;
      context.textBaseline = "top";
      context.fillText(layer.text || "Text", 0, 0, layer.width);
    } else if (layer.type === "shape") {
      context.fillStyle = layer.fill || "#111111";
      if (layer.shape === "ellipse") {
        context.beginPath();
        context.ellipse(
          layer.width / 2,
          layer.height / 2,
          layer.width / 2,
          layer.height / 2,
          0,
          0,
          Math.PI * 2,
        );
        context.fill();
      } else {
        context.fillRect(0, 0, layer.width, layer.height);
      }
    }
    context.restore();
  }

  if ((options?.applyMask || options?.showMask) && data.mask.length) {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    if (options.applyMask) {
      context.globalCompositeOperation = "destination-out";
      context.strokeStyle = "#000";
    } else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = "rgba(255,255,255,.68)";
    }
    for (const stroke of data.mask) {
      if (stroke.points.length < 2) continue;
      context.lineWidth = stroke.size;
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    }
    context.restore();
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The canvas could not be exported."))),
      type,
      0.95,
    );
  });
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="editor-number">
      <span>{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function ImageEditor({
  deviceId,
  assets,
  projects,
  onAssetSaved,
  onProjectSaved,
  onGenerate,
}: Props) {
  const imageProjects = useMemo(
    () => projects.filter((project) => project.kind === "image" && !project.deletedAt),
    [projects],
  );
  const [project, setProject] = useState<MediaProject>(() => imageProjects[0] || blankProject(deviceId));
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [maskMode, setMaskMode] = useState(false);
  const [maskSize, setMaskSize] = useState(72);
  const [aiPrompt, setAiPrompt] = useState("");
  const [undoStack, setUndoStack] = useState<MediaProject[]>([]);
  const [redoStack, setRedoStack] = useState<MediaProject[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [status, setStatus] = useState("Autosaved locally");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const pointerStroke = useRef<string | null>(null);
  const projectRef = useRef(project);
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  const data = imageData(project);
  const selected = data.layers.find((layer) => layer.id === selectedLayerId);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    const revokers: Array<() => void> = [];
    const next = new Map<string, string>();
    assets.forEach((asset) => {
      const result = createAssetUrl(asset);
      if (result.url) next.set(asset.id, result.url);
      revokers.push(result.revoke);
    });
    let active = true;
    queueMicrotask(() => {
      if (active) setUrls(next);
    });
    return () => {
      active = false;
      revokers.forEach((revoke) => revoke());
    };
  }, [assets]);

  useEffect(() => {
    if (canvasRef.current) {
      void drawProject(canvasRef.current, project, urls, { showMask: maskMode });
    }
  }, [maskMode, project, urls]);

  useEffect(() => {
    void loadProjectVersions(project.id).then(setVersions);
  }, [project.id, project.revision]);

  const commit = async (
    next: MediaProject,
    options?: { history?: boolean; snapshot?: boolean },
  ) => {
    const updated = stampProject(next, deviceId);
    if (options?.history !== false) {
      setUndoStack((current) => [...current.slice(-39), cloneProject(project)]);
      setRedoStack([]);
    }
    projectRef.current = updated;
    setProject(updated);
    setStatus("Saving…");
    await saveProject(updated, options?.snapshot);
    onProjectSaved(updated);
    setStatus(options?.snapshot ? "Version saved" : "Autosaved locally");
  };

  const mutateData = (
    mutate: (value: ImageProjectData) => ImageProjectData,
    options?: { history?: boolean; snapshot?: boolean },
  ) => void commit({ ...project, data: mutate(cloneProject(project).data as ImageProjectData) }, options);

  const updateLayer = (id: string, patch: Partial<ImageLayer>) =>
    mutateData((value) => ({
      ...value,
      layers: value.layers.map((layer) =>
        layer.id === id &&
        (!layer.locked || "locked" in patch || "visible" in patch)
          ? { ...layer, ...patch }
          : layer,
      ),
    }));

  const addLayer = (layer: ImageLayer) => {
    setSelectedLayerId(layer.id);
    mutateData((value) => ({ ...value, layers: [...value.layers, layer] }));
  };

  const addImage = async (file: File) => {
    const asset = await createAssetFromFile(file, deviceId);
    const source = URL.createObjectURL(file);
    let width = Math.round(data.width * 0.7);
    let height = Math.round(data.height * 0.7);
    try {
      const image = await loadCanvasImage(source);
      const scale = Math.min(data.width / image.width, data.height / image.height, 1);
      width = Math.round(image.width * scale);
      height = Math.round(image.height * scale);
    } finally {
      URL.revokeObjectURL(source);
    }
    await saveAsset(asset);
    onAssetSaved(asset);
    addLayer({
      id: uid(),
      name: file.name,
      type: "image",
      assetId: asset.id,
      x: Math.round((data.width - width) / 2),
      y: Math.round((data.height - height) / 2),
      width,
      height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      blendMode: "source-over",
      filters: { ...DEFAULT_FILTERS },
    });
  };

  const undo = async () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, cloneProject(project)]);
    const restored = stampProject({ ...previous, revision: project.revision }, deviceId);
    projectRef.current = restored;
    setProject(restored);
    await saveProject(restored);
    onProjectSaved(restored);
  };

  const redo = async () => {
    const next = redoStack.at(-1);
    if (!next) return;
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, cloneProject(project)]);
    const restored = stampProject({ ...next, revision: project.revision }, deviceId);
    projectRef.current = restored;
    setProject(restored);
    await saveProject(restored);
    onProjectSaved(restored);
  };

  const renderExport = async (applyMask: boolean) => {
    const canvas = document.createElement("canvas");
    await drawProject(canvas, project, urls, { applyMask });
    return canvas;
  };

  const exportImage = async () => {
    const canvas = await renderExport(true);
    const blob = await canvasBlob(canvas);
    const file = new File([blob], `${project.name.replace(/\W+/g, "-") || "image"}.png`, {
      type: "image/png",
    });
    const asset = await createAssetFromFile(file, deviceId, { name: file.name });
    await saveAsset(asset);
    onAssetSaved(asset);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setStatus("PNG exported and saved");
  };

  const generateFill = async () => {
    if (!aiPrompt.trim()) {
      setStatus("Describe the fill or outpaint result first");
      return;
    }
    const canvas = await renderExport(true);
    const blob = await canvasBlob(canvas);
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error("The editor preview could not be prepared."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
    onGenerate(
      {
        id: uid(),
        name: `${project.name}-masked.png`,
        type: "image/png",
        kind: "image",
        size: blob.size,
        dataUrl,
      },
      `Fill transparent or expanded areas according to this direction: ${aiPrompt.trim()}. Preserve all visible image content outside the edited area.`,
    );
  };

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  return (
    <div className="editor-shell">
      <div className="editor-topbar">
        <div className="editor-project-switcher">
          <input
            value={project.name}
            aria-label="Project name"
            onChange={(event) => setProject((current) => ({ ...current, name: event.target.value }))}
            onBlur={() => void commit(project, { history: false })}
          />
          <select
            value={project.id}
            aria-label="Open image project"
            onChange={(event) => {
              const selectedProject = imageProjects.find((item) => item.id === event.target.value);
              if (selectedProject) {
                setProject(selectedProject);
                setUndoStack([]);
                setRedoStack([]);
              }
            }}
          >
            <option value={project.id}>{project.name}</option>
            {imageProjects
              .filter((item) => item.id !== project.id)
              .map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              const next = blankProject(deviceId);
              setProject(next);
              setUndoStack([]);
              setRedoStack([]);
              void saveProject(next, true);
              onProjectSaved(next);
            }}
          >
            New
          </button>
        </div>
        <span className="editor-save-state"><i />{status}</span>
        <div className="editor-actions">
          <button type="button" title="Undo" onClick={() => void undo()} disabled={!undoStack.length}><Undo2 size={16} /></button>
          <button type="button" title="Redo" onClick={() => void redo()} disabled={!redoStack.length}><Redo2 size={16} /></button>
          <button type="button" onClick={() => void commit(project, { history: false, snapshot: true })}><Save size={15} /> Version</button>
          <button type="button" className="editor-primary" onClick={() => void exportImage()}><Download size={15} /> Export PNG</button>
        </div>
      </div>

      <div className="image-editor-grid">
        <aside className="editor-toolbar" aria-label="Image editor tools">
          <input
            ref={uploadRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void addImage(file);
              event.target.value = "";
            }}
          />
          <button type="button" title="Add image" onClick={() => uploadRef.current?.click()}><ImagePlus size={19} /><span>Image</span></button>
          <button
            type="button"
            title="Add text"
            onClick={() => addLayer({
              id: uid(), name: "Text", type: "text", text: "Your text", x: 100, y: 100,
              width: 600, height: 100, rotation: 0, opacity: 1, visible: true, locked: false,
              blendMode: "source-over", color: "#111111", fontSize: 64, fontWeight: 700,
            })}
          ><Type size={19} /><span>Text</span></button>
          <button
            type="button"
            title="Add shape"
            onClick={() => addLayer({
              id: uid(), name: "Shape", type: "shape", shape: "rectangle", fill: "#111111",
              x: 120, y: 120, width: 280, height: 180, rotation: 0, opacity: 1,
              visible: true, locked: false, blendMode: "source-over",
            })}
          ><Shapes size={19} /><span>Shape</span></button>
          <button type="button" className={maskMode ? "active" : ""} onClick={() => setMaskMode((value) => !value)}><Paintbrush size={19} /><span>Mask</span></button>
          <button
            type="button"
            title="Expand canvas"
            onClick={() => mutateData((value) => ({
              ...value,
              width: clamp(value.width + 256, 256, 4096),
              height: clamp(value.height + 256, 256, 4096),
            }))}
          ><Maximize2 size={19} /><span>Outpaint</span></button>
        </aside>

        <main className="editor-stage">
          <div className="canvas-frame">
            <canvas
              ref={canvasRef}
              className={maskMode ? "mask-cursor" : ""}
              onPointerDown={(event) => {
                if (!maskMode) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                const id = uid();
                pointerStroke.current = id;
                const point = canvasPoint(event);
                void mutateData(
                  (value) => ({
                    ...value,
                    mask: [...value.mask, { id, erase: true, size: maskSize, points: [point] }],
                  }),
                  { history: true },
                );
              }}
              onPointerMove={(event) => {
                if (!maskMode || !pointerStroke.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
                const id = pointerStroke.current;
                const point = canvasPoint(event);
                setProject((current) => ({
                  ...(() => {
                    const next = {
                      ...current,
                      data: {
                        ...imageData(current),
                        mask: imageData(current).mask.map((stroke) =>
                          stroke.id === id ? { ...stroke, points: [...stroke.points, point] } : stroke,
                        ),
                      },
                    };
                    projectRef.current = next;
                    return next;
                  })(),
                }));
              }}
              onPointerUp={() => {
                pointerStroke.current = null;
                const current = projectRef.current;
                const updated = stampProject(current, deviceId);
                projectRef.current = updated;
                setProject(updated);
                void saveProject(updated).then(() => onProjectSaved(updated));
              }}
              aria-label="Image editing canvas"
            />
          </div>
          {maskMode && (
            <div className="mask-controls">
              <Paintbrush size={15} />
              <label>Mask size <input type="range" min={12} max={240} value={maskSize} onChange={(event) => setMaskSize(Number(event.target.value))} /></label>
              <button type="button" onClick={() => mutateData((value) => ({ ...value, mask: [] }))}>Clear mask</button>
              <span>White overlay becomes transparent for AI fill or export.</span>
            </div>
          )}
          <div className="ai-fill-bar">
            <Sparkles size={17} />
            <input
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="Describe what should fill the mask or expanded canvas…"
            />
            <button type="button" onClick={() => void generateFill()}>Send to AI fill</button>
          </div>
        </main>

        <aside className="editor-inspector">
          <section>
            <div className="inspector-heading"><Layers3 size={15} /><b>Layers</b><span>{data.layers.length}</span></div>
            <div className="layer-list">
              {[...data.layers].reverse().map((layer) => (
                <button
                  type="button"
                  className={selectedLayerId === layer.id ? "selected" : ""}
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <span>{layer.type === "image" ? <ImagePlus size={14} /> : layer.type === "text" ? <Type size={14} /> : <BoxSelect size={14} />}</span>
                  <b>{layer.name}</b>
                  <i
                    role="button"
                    tabIndex={0}
                    aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`}
                    title={`${layer.visible ? "Hide" : "Show"} layer`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void updateLayer(layer.id, { visible: !layer.visible });
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      void updateLayer(layer.id, { visible: !layer.visible });
                    }}
                  >{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</i>
                </button>
              ))}
              {!data.layers.length && <p>Add an image, text, or shape to begin.</p>}
            </div>
          </section>

          {selected && (
            <section className="layer-properties">
              <div className="inspector-heading"><BoxSelect size={15} /><b>Properties</b></div>
              <input disabled={selected.locked} value={selected.name} onChange={(event) => void updateLayer(selected.id, { name: event.target.value })} />
              <div className="property-grid">
                <NumberField disabled={selected.locked} label="X" value={selected.x} onChange={(value) => void updateLayer(selected.id, { x: value })} />
                <NumberField disabled={selected.locked} label="Y" value={selected.y} onChange={(value) => void updateLayer(selected.id, { y: value })} />
                <NumberField disabled={selected.locked} label="W" min={1} value={selected.width} onChange={(value) => void updateLayer(selected.id, { width: Math.max(1, value) })} />
                <NumberField disabled={selected.locked} label="H" min={1} value={selected.height} onChange={(value) => void updateLayer(selected.id, { height: Math.max(1, value) })} />
                <NumberField disabled={selected.locked} label="Rotate" value={selected.rotation} onChange={(value) => void updateLayer(selected.id, { rotation: value })} />
                <NumberField disabled={selected.locked} label="Opacity %" min={0} max={100} value={selected.opacity * 100} onChange={(value) => void updateLayer(selected.id, { opacity: clamp(value / 100, 0, 1) })} />
              </div>
              {selected.type === "text" && (
                <>
                  <textarea disabled={selected.locked} value={selected.text} onChange={(event) => void updateLayer(selected.id, { text: event.target.value })} />
                  <NumberField disabled={selected.locked} label="Text size" min={8} max={400} value={selected.fontSize || 64} onChange={(value) => void updateLayer(selected.id, { fontSize: value })} />
                </>
              )}
              {selected.type === "image" && (
                <div className="filter-stack">
                  {(["brightness", "contrast", "saturation", "blur", "grayscale"] as const).map((key) => (
                    <label key={key}>
                      <span>{key}</span>
                      <input
                        type="range"
                        min={key === "blur" ? 0 : 0}
                        max={key === "blur" ? 24 : key === "grayscale" ? 100 : 200}
                        value={selected.filters?.[key] ?? DEFAULT_FILTERS[key]}
                        disabled={selected.locked}
                        onChange={(event) => void updateLayer(selected.id, {
                          filters: {
                            ...(selected.filters || DEFAULT_FILTERS),
                            [key]: Number(event.target.value),
                          },
                        })}
                      />
                    </label>
                  ))}
                </div>
              )}
              <label className="select-property">
                Blend
                <select disabled={selected.locked} value={selected.blendMode} onChange={(event) => void updateLayer(selected.id, { blendMode: event.target.value as ImageLayer["blendMode"] })}>
                  <option value="source-over">Normal</option>
                  <option value="multiply">Multiply</option>
                  <option value="screen">Screen</option>
                  <option value="overlay">Overlay</option>
                  <option value="darken">Darken</option>
                  <option value="lighten">Lighten</option>
                </select>
              </label>
              <div className="layer-action-row">
                <button type="button" title="Move up" disabled={selected.locked} onClick={() => mutateData((value) => {
                  const index = value.layers.findIndex((layer) => layer.id === selected.id);
                  if (index >= value.layers.length - 1) return value;
                  const layers = [...value.layers];
                  [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
                  return { ...value, layers };
                })}><ArrowUp size={15} /></button>
                <button type="button" title="Move down" disabled={selected.locked} onClick={() => mutateData((value) => {
                  const index = value.layers.findIndex((layer) => layer.id === selected.id);
                  if (index <= 0) return value;
                  const layers = [...value.layers];
                  [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
                  return { ...value, layers };
                })}><ArrowDown size={15} /></button>
                <button type="button" title="Lock layer" onClick={() => void updateLayer(selected.id, { locked: !selected.locked })}>{selected.locked ? <Lock size={15} /> : <LockOpen size={15} />}</button>
                <button type="button" title="Delete layer" disabled={selected.locked} onClick={() => {
                  setSelectedLayerId("");
                  void mutateData((value) => ({ ...value, layers: value.layers.filter((layer) => layer.id !== selected.id) }));
                }}><Trash2 size={15} /></button>
              </div>
            </section>
          )}

          <section>
            <div className="inspector-heading"><History size={15} /><b>Version history</b><span>{versions.length}</span></div>
            <div className="version-list">
              {versions.slice(0, 5).map((version) => (
                <button
                  type="button"
                  key={version.id}
                  onClick={() => void commit({ ...version.project, revision: project.revision }, { snapshot: true })}
                >
                  <History size={13} />
                  {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }).format(version.createdAt)}
                </button>
              ))}
              {!versions.length && <p>Save a version before a major edit.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
