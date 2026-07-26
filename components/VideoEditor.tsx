"use client";

import {
  Captions,
  ChevronDown,
  ChevronUp,
  Download,
  Film,
  History,
  Image as ImageIcon,
  Pause,
  Play,
  Plus,
  Redo2,
  Save,
  Scissors,
  Trash2,
  Undo2,
  Upload,
  Volume2,
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
  MediaAsset,
  MediaProject,
  ProjectVersion,
  TimelineCaption,
  TimelineClip,
  VideoProjectData,
} from "@/lib/types";
import { uid } from "@/lib/types";

type Props = {
  deviceId: string;
  assets: MediaAsset[];
  projects: MediaProject[];
  onAssetSaved: (asset: MediaAsset) => void;
  onProjectSaved: (project: MediaProject) => void;
};

type LoadedMedia =
  | { kind: "image"; element: HTMLImageElement }
  | { kind: "video"; element: HTMLVideoElement };

function blankProject(deviceId: string): MediaProject {
  const now = Date.now();
  return {
    id: uid(),
    name: "Untitled video",
    kind: "video",
    data: {
      width: 1280,
      height: 720,
      fps: 30,
      background: "#050505",
      clips: [],
      captions: [],
    },
    assetIds: [],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    deviceId,
  };
}

function videoData(project: MediaProject): VideoProjectData {
  return project.data as VideoProjectData;
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

function clipLength(clip: TimelineClip) {
  return Math.max(0.1, (clip.trimEnd - clip.trimStart) / Math.max(clip.speed, 0.1));
}

function projectLength(data: VideoProjectData) {
  return data.clips.reduce((sum, clip) => sum + clipLength(clip), 0);
}

function clipAtTime(data: VideoProjectData, time: number) {
  let cursor = 0;
  for (let index = 0; index < data.clips.length; index += 1) {
    const clip = data.clips[index];
    const length = clipLength(clip);
    if (time <= cursor + length || index === data.clips.length - 1) {
      return {
        clip,
        index,
        start: cursor,
        local: Math.max(0, time - cursor),
        length,
      };
    }
    cursor += length;
  }
  return undefined;
}

function filterValue(filter: TimelineClip["filter"]) {
  if (filter === "mono") return "grayscale(1) contrast(1.05)";
  if (filter === "warm") return "sepia(.18) saturate(1.12)";
  if (filter === "cool") return "hue-rotate(175deg) saturate(.8)";
  if (filter === "high-contrast") return "contrast(1.35) saturate(.9)";
  return "none";
}

function drawContained(
  context: CanvasRenderingContext2D,
  media: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  context.drawImage(
    media,
    (targetWidth - width) / 2,
    (targetHeight - height) / 2,
    width,
    height,
  );
}

function blobFromRecorder(chunks: Blob[], type: string) {
  return new Blob(chunks, { type });
}

export function VideoEditor({
  deviceId,
  assets,
  projects,
  onAssetSaved,
  onProjectSaved,
}: Props) {
  const videoProjects = useMemo(
    () => projects.filter((project) => project.kind === "video" && !project.deletedAt),
    [projects],
  );
  const [project, setProject] = useState<MediaProject>(() => videoProjects[0] || blankProject(deviceId));
  const [selectedClipId, setSelectedClipId] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [undoStack, setUndoStack] = useState<MediaProject[]>([]);
  const [redoStack, setRedoStack] = useState<MediaProject[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [status, setStatus] = useState("Autosaved locally");
  const [captionText, setCaptionText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const mediaCache = useRef(new Map<string, LoadedMedia>());
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  const animationFrame = useRef(0);
  const playStarted = useRef({ clock: 0, timeline: 0 });
  const currentTimeRef = useRef(currentTime);
  const data = videoData(project);
  const duration = projectLength(data);
  const selected = data.clips.find((clip) => clip.id === selectedClipId);

  useEffect(() => {
    const revokers: Array<() => void> = [];
    const next = new Map<string, string>();
    assets.forEach((asset) => {
      const result = createAssetUrl(asset);
      if (result.url) next.set(asset.id, result.url);
      revokers.push(result.revoke);
    });
    mediaCache.current.clear();
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
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    void loadProjectVersions(project.id).then(setVersions);
  }, [project.id, project.revision]);

  const loadMedia = async (clip: TimelineClip): Promise<LoadedMedia | undefined> => {
    const cached = mediaCache.current.get(clip.assetId);
    if (cached) return cached;
    const source = urls.get(clip.assetId);
    if (!source) return undefined;
    if (clip.kind === "image") {
      const image = new Image();
      image.src = source;
      await image.decode();
      const loaded: LoadedMedia = { kind: "image", element: image };
      mediaCache.current.set(clip.assetId, loaded);
      return loaded;
    }
    const video = document.createElement("video");
    video.src = source;
    video.preload = "auto";
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("A video clip could not be loaded."));
    });
    const loaded: LoadedMedia = { kind: "video", element: video };
    mediaCache.current.set(clip.assetId, loaded);
    return loaded;
  };

  const renderFrame = async (
    time: number,
    targetCanvas = canvasRef.current,
    options?: { exporting?: boolean },
  ) => {
    if (!targetCanvas) return;
    targetCanvas.width = data.width;
    targetCanvas.height = data.height;
    const context = targetCanvas.getContext("2d");
    if (!context) return;
    context.fillStyle = data.background;
    context.fillRect(0, 0, data.width, data.height);
    const active = clipAtTime(data, time);
    if (active) {
      if (options?.exporting) {
        mediaCache.current.forEach((loaded, assetId) => {
          if (loaded.kind === "video" && assetId !== active.clip.assetId) {
            loaded.element.pause();
          }
        });
      }
      const loaded = await loadMedia(active.clip);
      if (loaded) {
        context.save();
        context.filter = filterValue(active.clip.filter);
        let alpha = 1;
        const transition = Math.min(active.clip.transitionDuration, active.length / 2);
        if (active.clip.transition !== "cut" && transition > 0 && active.local < transition) {
          alpha = active.local / transition;
        }
        context.globalAlpha = Math.max(0.02, Math.min(1, alpha));
        if (active.clip.transition === "slide" && alpha < 1) {
          context.translate((1 - alpha) * data.width, 0);
        }
        if (loaded.kind === "image") {
          drawContained(
            context,
            loaded.element,
            loaded.element.naturalWidth,
            loaded.element.naturalHeight,
            data.width,
            data.height,
          );
        } else {
          const sourceTime =
            active.clip.trimStart + Math.min(active.clip.trimEnd - active.clip.trimStart, active.local * active.clip.speed);
          if (Math.abs(loaded.element.currentTime - sourceTime) > (options?.exporting ? 0.1 : 0.35)) {
            try {
              loaded.element.currentTime = sourceTime;
            } catch {
              // The nearest decoded frame is still useful while seeking.
            }
          }
          loaded.element.volume = Math.min(1, Math.max(0, active.clip.volume));
          loaded.element.muted = Boolean(options?.exporting);
          loaded.element.playbackRate = Math.min(4, Math.max(0.25, active.clip.speed));
          if ((options?.exporting || playing) && loaded.element.paused) {
            void loaded.element.play().catch(() => undefined);
          }
          if (loaded.element.videoWidth) {
            drawContained(
              context,
              loaded.element,
              loaded.element.videoWidth,
              loaded.element.videoHeight,
              data.width,
              data.height,
            );
          }
        }
        context.restore();
      }
    }
    data.captions
      .filter((caption) => time >= caption.start && time <= caption.end)
      .forEach((caption) => {
        const y =
          caption.position === "top"
            ? data.height * 0.12
            : caption.position === "center"
              ? data.height * 0.5
              : data.height * 0.86;
        context.save();
        context.font = `700 ${caption.size}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineWidth = Math.max(3, caption.size * 0.09);
        context.strokeStyle = "rgba(0,0,0,.9)";
        context.fillStyle = "#fff";
        context.strokeText(caption.text, data.width / 2, y, data.width * 0.85);
        context.fillText(caption.text, data.width / 2, y, data.width * 0.85);
        context.restore();
      });
  };

  useEffect(() => {
    void renderFrame(currentTime);
    // renderFrame intentionally tracks the serialized editor state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, project, assets]);

  useEffect(() => {
    if (!playing) {
      mediaCache.current.forEach((loaded) => {
        if (loaded.kind === "video") loaded.element.pause();
      });
      return;
    }
    playStarted.current = { clock: performance.now(), timeline: currentTimeRef.current };
    const tick = () => {
      const elapsed = (performance.now() - playStarted.current.clock) / 1_000;
      const next = playStarted.current.timeline + elapsed;
      if (next >= duration) {
        setCurrentTime(duration);
        setPlaying(false);
        return;
      }
      setCurrentTime(next);
      animationFrame.current = requestAnimationFrame(tick);
    };
    animationFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame.current);
  }, [duration, playing]);

  const commit = async (
    next: MediaProject,
    options?: { history?: boolean; snapshot?: boolean },
  ) => {
    const updated = stampProject(next, deviceId);
    if (options?.history !== false) {
      setUndoStack((current) => [...current.slice(-39), cloneProject(project)]);
      setRedoStack([]);
    }
    setProject(updated);
    setStatus("Saving…");
    await saveProject(updated, options?.snapshot);
    onProjectSaved(updated);
    setStatus(options?.snapshot ? "Version saved" : "Autosaved locally");
  };

  const mutateData = (mutate: (value: VideoProjectData) => VideoProjectData) =>
    void commit({ ...project, data: mutate(cloneProject(project).data as VideoProjectData) });

  const updateClip = (id: string, patch: Partial<TimelineClip>) =>
    mutateData((value) => ({
      ...value,
      clips: value.clips.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)),
    }));

  const addFile = async (file: File) => {
    const asset = await createAssetFromFile(file, deviceId);
    await saveAsset(asset);
    onAssetSaved(asset);
    const source = URL.createObjectURL(file);
    let sourceDuration = 5;
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = source;
      sourceDuration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration : 5);
        video.onerror = () => resolve(5);
      });
    }
    URL.revokeObjectURL(source);
    const clip: TimelineClip = {
      id: uid(),
      assetId: asset.id,
      name: file.name,
      kind: file.type.startsWith("video/") ? "video" : "image",
      duration: sourceDuration,
      trimStart: 0,
      trimEnd: sourceDuration,
      speed: 1,
      volume: 1,
      transition: data.clips.length ? "fade" : "cut",
      transitionDuration: data.clips.length ? 0.35 : 0,
      filter: "none",
    };
    setSelectedClipId(clip.id);
    await commit({
      ...project,
      assetIds: [...new Set([...project.assetIds, asset.id])],
      data: { ...data, clips: [...data.clips, clip] },
    });
  };

  const undo = async () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, cloneProject(project)]);
    const restored = stampProject({ ...previous, revision: project.revision }, deviceId);
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
    setProject(restored);
    await saveProject(restored);
    onProjectSaved(restored);
  };

  const addCaption = () => {
    if (!captionText.trim()) return;
    const start = Math.min(currentTime, Math.max(0, duration - 0.1));
    const caption: TimelineCaption = {
      id: uid(),
      text: captionText.trim(),
      start,
      end: Math.min(duration || start + 3, start + 3),
      position: "bottom",
      size: 46,
    };
    setCaptionText("");
    mutateData((value) => ({ ...value, captions: [...value.captions, caption] }));
  };

  const exportVideo = async () => {
    if (!data.clips.length || exporting) return;
    if (!("MediaRecorder" in window) || !canvasRef.current?.captureStream) {
      setStatus("This browser cannot encode a local timeline. Try current Chrome or Edge.");
      return;
    }
    setPlaying(false);
    setExporting(true);
    setExportProgress(0);
    setStatus("Rendering timeline in real time…");
    let audioContext: AudioContext | undefined;
    let audioDestination: MediaStreamAudioDestinationNode | undefined;
    let stream: MediaStream | undefined;
    let recorder: MediaRecorder | undefined;
    const audioElements = new Map<
      string,
      { element: HTMLVideoElement; gain: GainNode }
    >();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = data.width;
      canvas.height = data.height;
      const canvasStream = canvas.captureStream(data.fps);
      try {
        audioContext = new AudioContext();
        audioDestination = audioContext.createMediaStreamDestination();
        const videoClips = data.clips.filter((clip) => clip.kind === "video");
        for (const clip of videoClips) {
          if (audioElements.has(clip.assetId)) continue;
          const sourceUrl = urls.get(clip.assetId);
          if (!sourceUrl) continue;
          const element = document.createElement("video");
          element.src = sourceUrl;
          element.preload = "auto";
          element.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            element.onloadeddata = () => resolve();
            element.onerror = () => resolve();
          });
          if (!element.readyState) continue;
          const source = audioContext.createMediaElementSource(element);
          const gain = audioContext.createGain();
          source.connect(gain);
          gain.connect(audioDestination);
          audioElements.set(clip.assetId, { element, gain });
        }
        await audioContext.resume();
      } catch {
        audioElements.clear();
        await audioContext?.close().catch(() => undefined);
        audioContext = undefined;
        audioDestination = undefined;
      }
    stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(audioDestination?.stream.getAudioTracks() || []),
    ]);
    const preferred = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    const activeRecorder = new MediaRecorder(
      stream,
      preferred ? { mimeType: preferred } : undefined,
    );
    recorder = activeRecorder;
    const chunks: Blob[] = [];
    activeRecorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const completed = new Promise<Blob>((resolve, reject) => {
      activeRecorder.onerror = () => reject(new Error("The browser video encoder failed."));
      activeRecorder.onstop = () =>
        resolve(blobFromRecorder(chunks, activeRecorder.mimeType || "video/webm"));
    });
    activeRecorder.start(1_000);
    const start = performance.now();
    while (true) {
      const elapsed = (performance.now() - start) / 1_000;
      if (elapsed >= duration) break;
      const active = clipAtTime(data, elapsed);
      audioElements.forEach(({ element, gain }, assetId) => {
        if (active?.clip.kind === "video" && active.clip.assetId === assetId) {
          const sourceTime =
            active.clip.trimStart +
            Math.min(
              active.clip.trimEnd - active.clip.trimStart,
              active.local * active.clip.speed,
            );
          if (Math.abs(element.currentTime - sourceTime) > 0.35) {
            try {
              element.currentTime = sourceTime;
            } catch {
              // The audio element will continue from its nearest decoded point.
            }
          }
          element.playbackRate = Math.min(4, Math.max(0.25, active.clip.speed));
          gain.gain.value = Math.min(1, Math.max(0, active.clip.volume));
          if (element.paused) void element.play().catch(() => undefined);
        } else {
          element.pause();
          gain.gain.value = 0;
        }
      });
      await renderFrame(elapsed, canvas, { exporting: true });
      setExportProgress(Math.round((elapsed / duration) * 100));
      await new Promise((resolve) => window.setTimeout(resolve, 1_000 / data.fps));
    }
    await renderFrame(duration, canvas, { exporting: true });
    audioElements.forEach(({ element }) => element.pause());
    activeRecorder.stop();
    const blob = await completed;
    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    const file = new File(
      [blob],
      `${project.name.replace(/\W+/g, "-") || "timeline"}.${extension}`,
      { type: blob.type },
    );
    const asset = await createAssetFromFile(file, deviceId, { name: file.name });
    await saveAsset(asset);
    onAssetSaved(asset);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setExportProgress(100);
    setStatus(
      `${extension.toUpperCase()} exported and saved${
        audioDestination?.stream.getAudioTracks().length ? " with source audio" : " (video only)"
      }`,
    );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Export stopped: ${error.message}`
          : "Export stopped because this browser encoder failed.",
      );
    } finally {
      audioElements.forEach(({ element }) => element.pause());
      mediaCache.current.forEach((loaded) => {
        if (loaded.kind === "video") loaded.element.pause();
      });
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // The encoder may already be shutting down after an error.
        }
      }
      stream?.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== "closed") {
        await audioContext.close().catch(() => undefined);
      }
      setExporting(false);
    }
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
            aria-label="Open video project"
            onChange={(event) => {
              const selectedProject = videoProjects.find((item) => item.id === event.target.value);
              if (selectedProject) {
                setProject(selectedProject);
                setUndoStack([]);
                setRedoStack([]);
                setCurrentTime(0);
              }
            }}
          >
            <option value={project.id}>{project.name}</option>
            {videoProjects
              .filter((item) => item.id !== project.id)
              .map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              const next = blankProject(deviceId);
              setProject(next);
              setCurrentTime(0);
              setUndoStack([]);
              setRedoStack([]);
              void saveProject(next, true);
              onProjectSaved(next);
            }}
          >New</button>
        </div>
        <span className="editor-save-state"><i />{status}</span>
        <div className="editor-actions">
          <button type="button" title="Undo" onClick={() => void undo()} disabled={!undoStack.length}><Undo2 size={16} /></button>
          <button type="button" title="Redo" onClick={() => void redo()} disabled={!redoStack.length}><Redo2 size={16} /></button>
          <button type="button" onClick={() => void commit(project, { history: false, snapshot: true })}><Save size={15} /> Version</button>
          <button type="button" className="editor-primary" disabled={exporting || !data.clips.length} onClick={() => void exportVideo()}>
            <Download size={15} /> {exporting ? `${exportProgress}%` : "Export video"}
          </button>
        </div>
      </div>

      <div className="video-editor-body">
        <main className="video-preview-panel">
          <div className="video-preview">
            <canvas ref={canvasRef} aria-label="Video timeline preview" />
            {!data.clips.length && (
              <div className="video-preview-empty">
                <Film size={28} />
                <b>Build your first timeline</b>
                <span>Add generated or uploaded images and video.</span>
              </div>
            )}
          </div>
          <div className="transport">
            <button
              type="button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => {
                if (currentTime >= duration) setCurrentTime(0);
                setPlaying((value) => !value);
              }}
              disabled={!data.clips.length}
            >{playing ? <Pause size={17} /> : <Play size={17} />}</button>
            <span>{currentTime.toFixed(1)}s</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.01}
              value={Math.min(currentTime, duration)}
              onChange={(event) => {
                setPlaying(false);
                setCurrentTime(Number(event.target.value));
              }}
            />
            <span>{duration.toFixed(1)}s</span>
            <select
              aria-label="Project resolution"
              value={`${data.width}x${data.height}`}
              onChange={(event) => {
                const [width, height] = event.target.value.split("x").map(Number);
                mutateData((value) => ({ ...value, width, height }));
              }}
            >
              <option value="1280x720">720p</option>
              <option value="1920x1080">1080p</option>
              <option value="1080x1920">Vertical</option>
              <option value="1080x1080">Square</option>
            </select>
          </div>
        </main>

        <aside className="video-inspector">
          <input
            ref={uploadRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(event) => {
              [...(event.target.files || [])].forEach((file) => void addFile(file));
              event.target.value = "";
            }}
          />
          <button className="add-media-button" type="button" onClick={() => uploadRef.current?.click()}>
            <Upload size={16} /> Add media
          </button>
          {selected ? (
            <section className="clip-properties">
              <div className="inspector-heading"><Scissors size={15} /><b>Clip</b></div>
              <input value={selected.name} onChange={(event) => void updateClip(selected.id, { name: event.target.value })} />
              <div className="property-grid">
                <label className="editor-number"><span>In</span><input type="number" min={0} max={selected.trimEnd - 0.1} step={0.1} value={selected.trimStart} onChange={(event) => void updateClip(selected.id, { trimStart: Number(event.target.value) })} /></label>
                <label className="editor-number"><span>Out</span><input type="number" min={selected.trimStart + 0.1} max={selected.duration} step={0.1} value={selected.trimEnd} onChange={(event) => void updateClip(selected.id, { trimEnd: Number(event.target.value) })} /></label>
                <label className="editor-number"><span>Speed</span><input type="number" min={0.25} max={4} step={0.25} value={selected.speed} onChange={(event) => void updateClip(selected.id, { speed: Number(event.target.value) })} /></label>
                <label className="editor-number"><span>Volume</span><input type="number" min={0} max={1} step={0.1} value={selected.volume} onChange={(event) => void updateClip(selected.id, { volume: Number(event.target.value) })} /></label>
              </div>
              <label className="select-property">Transition
                <select value={selected.transition} onChange={(event) => void updateClip(selected.id, { transition: event.target.value as TimelineClip["transition"] })}>
                  <option value="cut">Cut</option>
                  <option value="fade">Fade</option>
                  <option value="dissolve">Dissolve</option>
                  <option value="slide">Slide</option>
                </select>
              </label>
              <label className="select-property">Effect
                <select value={selected.filter} onChange={(event) => void updateClip(selected.id, { filter: event.target.value as TimelineClip["filter"] })}>
                  <option value="none">None</option>
                  <option value="mono">Monochrome</option>
                  <option value="warm">Warm</option>
                  <option value="cool">Cool</option>
                  <option value="high-contrast">High contrast</option>
                </select>
              </label>
              <p className="audio-note"><Volume2 size={13} /> Source audio, speed, and volume are mixed into export when this browser exposes a compatible encoder.</p>
            </section>
          ) : (
            <div className="inspector-empty"><Scissors size={18} /><p>Select a timeline clip to trim, speed up, transition, filter, or change volume.</p></div>
          )}
          <section>
            <div className="inspector-heading"><Captions size={15} /><b>Captions</b><span>{data.captions.length}</span></div>
            <div className="caption-add">
              <input value={captionText} onChange={(event) => setCaptionText(event.target.value)} placeholder="Caption at playhead…" />
              <button type="button" aria-label="Add caption" onClick={addCaption}><Plus size={14} /></button>
            </div>
            <div className="caption-list">
              {data.captions.map((caption) => (
                <div key={caption.id}>
                  <span>{caption.start.toFixed(1)}–{caption.end.toFixed(1)}s</span>
                  <b>{caption.text}</b>
                  <button type="button" onClick={() => mutateData((value) => ({ ...value, captions: value.captions.filter((item) => item.id !== caption.id) }))}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="inspector-heading"><History size={15} /><b>Versions</b><span>{versions.length}</span></div>
            <div className="version-list">
              {versions.slice(0, 4).map((version) => (
                <button type="button" key={version.id} onClick={() => void commit({ ...version.project, revision: project.revision }, { snapshot: true })}>
                  <History size={13} />
                  {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(version.createdAt)}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="timeline-panel">
        <div className="timeline-heading">
          <span><Film size={15} /> Timeline</span>
          <small>{data.clips.length} clips · {duration.toFixed(1)} seconds</small>
        </div>
        <div className="timeline-ruler">
          {Array.from({ length: Math.max(2, Math.ceil(duration) + 1) }, (_, index) => <i key={index} style={{ left: `${(index / Math.max(duration, 1)) * 100}%` }}>{index}s</i>)}
          <span style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
        </div>
        <div className="timeline-track">
          {data.clips.map((clip, index) => (
            <button
              type="button"
              key={clip.id}
              className={selectedClipId === clip.id ? "selected" : ""}
              style={{ flexGrow: clipLength(clip) }}
              onClick={() => {
                setSelectedClipId(clip.id);
                setCurrentTime(data.clips.slice(0, index).reduce((sum, item) => sum + clipLength(item), 0));
              }}
            >
              {clip.kind === "image" ? <ImageIcon size={14} /> : <Film size={14} />}
              <span><b>{clip.name}</b><small>{clipLength(clip).toFixed(1)}s · {clip.transition}</small></span>
              <i>
                <span role="button" tabIndex={0} aria-label={`Move ${clip.name} earlier`} onClick={(event) => {
                  event.stopPropagation();
                  if (index <= 0) return;
                  mutateData((value) => {
                    const clips = [...value.clips];
                    [clips[index], clips[index - 1]] = [clips[index - 1], clips[index]];
                    return { ...value, clips };
                  });
                }} onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.currentTarget.click();
                }}><ChevronUp size={13} /></span>
                <span role="button" tabIndex={0} aria-label={`Move ${clip.name} later`} onClick={(event) => {
                  event.stopPropagation();
                  if (index >= data.clips.length - 1) return;
                  mutateData((value) => {
                    const clips = [...value.clips];
                    [clips[index], clips[index + 1]] = [clips[index + 1], clips[index]];
                    return { ...value, clips };
                  });
                }} onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.currentTarget.click();
                }}><ChevronDown size={13} /></span>
                <span role="button" tabIndex={0} aria-label={`Remove ${clip.name}`} onClick={(event) => {
                  event.stopPropagation();
                  setSelectedClipId("");
                  mutateData((value) => ({ ...value, clips: value.clips.filter((item) => item.id !== clip.id) }));
                }} onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.currentTarget.click();
                }}><Trash2 size={13} /></span>
              </i>
            </button>
          ))}
          {!data.clips.length && <button type="button" className="timeline-empty" onClick={() => uploadRef.current?.click()}><Plus size={16} /> Add media to timeline</button>}
        </div>
      </section>
    </div>
  );
}
