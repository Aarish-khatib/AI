"use client";

import {
  ArchiveRestore,
  BarChart3,
  Copy,
  FileText,
  LayoutDashboard,
  Presentation,
  Sheet,
  Trash2,
} from "lucide-react";
import type { Artifact } from "@/lib/artifacts/types";

function artifactIcon(type: Artifact["type"], size: number) {
  if (type === "presentation") return <Presentation size={size} strokeWidth={1.7} />;
  if (type === "spreadsheet" || type === "chart") {
    return <Sheet size={size} strokeWidth={1.7} />;
  }
  if (type === "canvas" || type === "diagram") {
    return <LayoutDashboard size={size} strokeWidth={1.7} />;
  }
  if (type === "report") return <BarChart3 size={size} strokeWidth={1.7} />;
  return <FileText size={size} strokeWidth={1.7} />;
}

export function ArtifactCard({
  artifact,
  onOpen,
  onDuplicate,
  onDelete,
  onRecover,
  compact = false,
}: {
  artifact: Artifact;
  onOpen: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onRecover?: () => void;
  compact?: boolean;
}) {
  return (
    <article className={`artifact-card ${compact ? "artifact-card-compact" : ""}`}>
      <button type="button" className="artifact-card-open" onClick={onOpen}>
        <span className="artifact-card-icon">
          {artifactIcon(artifact.type, compact ? 16 : 20)}
        </span>
        <span className="artifact-card-copy">
          <small>{artifact.type.replace("-", " ").toUpperCase()}</small>
          <b>{artifact.title}</b>
          <span>
            {artifact.deletedAt
              ? `Deleted ${new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                }).format(artifact.deletedAt)}`
              : `Edited ${new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(artifact.updatedAt)}`}
          </span>
        </span>
      </button>
      <div className="artifact-card-actions">
        {onDuplicate && !artifact.deletedAt && (
          <button type="button" onClick={onDuplicate} title="Duplicate artifact">
            <Copy size={14} />
          </button>
        )}
        {onDelete && !artifact.deletedAt && (
          <button type="button" onClick={onDelete} title="Move to recoverable trash">
            <Trash2 size={14} />
          </button>
        )}
        {onRecover && artifact.deletedAt && (
          <button type="button" onClick={onRecover} title="Recover artifact">
            <ArchiveRestore size={14} />
          </button>
        )}
      </div>
    </article>
  );
}
