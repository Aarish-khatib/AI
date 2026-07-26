"use client";

import {
  ArrowUp,
  Check,
  Copy,
  File,
  GitBranch,
  Image as ImageIcon,
  LoaderCircle,
  Paperclip,
  PanelsTopLeft,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Square,
  StepForward,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { cleanModelName } from "@/lib/openrouter";
import type { Artifact } from "@/lib/artifacts/types";
import type { Attachment, Chat, TextModel } from "@/lib/types";

const starters = [
  {
    eyebrow: "CREATE",
    title: "Design a launch page",
    prompt: "Design a polished launch page for a new productivity app. Start with the information architecture and sharp copy.",
  },
  {
    eyebrow: "REASON",
    title: "Pressure-test an idea",
    prompt: "Help me pressure-test a product idea. Ask the three highest-value questions first, then build a decision framework.",
  },
  {
    eyebrow: "CODE",
    title: "Build a working feature",
    prompt: "Help me build a production-quality feature. First clarify the goal, stack, constraints, and acceptance criteria.",
  },
];

function AttachmentPreview({
  attachment,
  removable,
  onRemove,
}: {
  attachment: Attachment;
  removable?: boolean;
  onRemove?: () => void;
}) {
  const source = attachment.remoteUrl || attachment.dataUrl;
  return (
    <div className="attachment-chip">
      {attachment.kind === "image" && source ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt="" />
      ) : attachment.kind === "image" ? (
        <ImageIcon size={16} />
      ) : (
        <File size={16} />
      )}
      <span>
        <b>{attachment.name}</b>
        <small>
          {attachment.kind} · {Math.max(1, Math.round(attachment.size / 1024))} KB
        </small>
      </span>
      {removable && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${attachment.name}`}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function MessageActions({
  text,
  onRegenerate,
  onEdit,
  onContinue,
  onBranch,
  onArtifact,
}: {
  text: string;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onContinue?: () => void;
  onBranch?: () => void;
  onArtifact?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="message-actions">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
        title="Copy"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {onEdit && (
        <button type="button" onClick={onEdit} title="Edit and resend">
          <Pencil size={14} />
        </button>
      )}
      {onRegenerate && (
        <button type="button" onClick={onRegenerate} title="Regenerate">
          <RefreshCw size={14} />
        </button>
      )}
      {onContinue && (
        <button type="button" onClick={onContinue} title="Continue saved response">
          <StepForward size={14} />
        </button>
      )}
      {onBranch && (
        <button type="button" onClick={onBranch} title="Branch conversation here">
          <GitBranch size={14} />
        </button>
      )}
      {onArtifact && (
        <button type="button" onClick={onArtifact} title="Create editable artifact">
          <PanelsTopLeft size={14} />
        </button>
      )}
    </div>
  );
}

export function ChatWorkspace({
  chat,
  input,
  setInput,
  attachments,
  onFiles,
  onRemoveAttachment,
  models,
  selectedModel,
  setSelectedModel,
  sending,
  stage,
  routeNote,
  keyConfigured,
  onOpenKey,
  onSend,
  onStop,
  onStarter,
  onRegenerate,
  onEdit,
  onContinue,
  onBranch,
  artifacts,
  onOpenArtifact,
  onCreateArtifact,
}: {
  chat?: Chat;
  input: string;
  setInput: (value: string) => void;
  attachments: Attachment[];
  onFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
  models: TextModel[];
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  sending: boolean;
  stage: string;
  routeNote: string;
  keyConfigured: boolean;
  onOpenKey: () => void;
  onSend: () => void;
  onStop: () => void;
  onStarter: (prompt: string) => void;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onContinue: (messageId: string) => void;
  onBranch: (messageId: string) => void;
  artifacts: Artifact[];
  onOpenArtifact: (artifactId: string) => void;
  onCreateArtifact: (messageId: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(120);
  const hasMessages = Boolean(chat?.messages.length);
  const visibleMessages = useMemo(
    () => chat?.messages.slice(-visibleLimit) || [],
    [chat?.messages, visibleLimit],
  );
  const hiddenMessages = Math.max(0, (chat?.messages.length || 0) - visibleMessages.length);
  const lastContent = chat?.messages.at(-1)?.content;

  useEffect(() => {
    if (!stickToBottom.current) return;
    const frame = requestAnimationFrame(() =>
      endRef.current?.scrollIntoView({ block: "end" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [lastContent, visibleMessages.length]);

  useEffect(() => {
    if (!sending) return;
    const frame = requestAnimationFrame(() => {
      stickToBottom.current = true;
      setShowJump(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [sending]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (sending) onStop();
    else onSend();
  };

  return (
    <section className="workspace chat-workspace">
      <header className="workspace-header">
        <div>
          <span className="section-kicker">CHAT</span>
          <b>{chat?.title || "Conversation"}</b>
        </div>
        <div className="header-status">
          <span className="status-dot" />
          {routeNote}
        </div>
      </header>

      <div
        ref={scrollRef}
        className={`chat-scroll ${hasMessages ? "" : "empty-chat"}`}
        onScroll={(event) => {
          const target = event.currentTarget;
          const nearBottom =
            target.scrollHeight - target.scrollTop - target.clientHeight < 120;
          stickToBottom.current = nearBottom;
          setShowJump(!nearBottom);
        }}
      >
        {!hasMessages ? (
          <div className="welcome">
            <div className="welcome-mark">L</div>
            <p className="eyebrow">ONE WORKSPACE · EVERY MEDIUM</p>
            <h1>What will we make today?</h1>
            <p className="welcome-copy">
              Think, write, code, research, and create visual work with intelligent model routing.
            </p>
            <div className="starter-grid">
              {starters.map((starter) => (
                <button
                  type="button"
                  key={starter.title}
                  onClick={() => onStarter(starter.prompt)}
                >
                  <small>{starter.eyebrow}</small>
                  <b>{starter.title}</b>
                  <span>Start with a structured brief →</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-column">
            {hiddenMessages > 0 && (
              <button
                type="button"
                className="load-earlier"
                onClick={() => setVisibleLimit((current) => current + 120)}
              >
                Show {Math.min(hiddenMessages, 120)} earlier messages
              </button>
            )}
            {visibleMessages.map((message, index) => {
              const absoluteIndex = hiddenMessages + index;
              const isLast = absoluteIndex === (chat?.messages.length || 0) - 1;
              return (
              <article className={`message-row ${message.role}`} key={message.id}>
                <div className="message-identity">
                  {message.role === "assistant" ? "L" : "YOU"}
                </div>
                <div className="message-body">
                  {message.attachments?.length ? (
                    <div className="message-attachments">
                      {message.attachments.map((attachment) => (
                        <AttachmentPreview key={attachment.id} attachment={attachment} />
                      ))}
                    </div>
                  ) : null}
                  {message.role === "assistant" ? (
                    message.content ? (
                      <Markdown>{message.content}</Markdown>
                    ) : (
                      <div className="response-thinking">
                        <LoaderCircle size={16} />
                        <span>{stage || "Thinking"}</span>
                      </div>
                    )
                  ) : (
                    <p className="user-copy">{message.content}</p>
                  )}
                  {message.artifactIds?.length ? (
                    <div className="message-artifacts">
                      {message.artifactIds
                        .map((artifactId) =>
                          artifacts.find((artifact) => artifact.id === artifactId),
                        )
                        .filter((artifact): artifact is Artifact => Boolean(artifact))
                        .map((artifact) => (
                          <ArtifactCard
                            key={artifact.id}
                            artifact={artifact}
                            compact
                            onOpen={() => onOpenArtifact(artifact.id)}
                          />
                        ))}
                    </div>
                  ) : null}
                  <div className="message-meta">
                    <span>
                      {message.model
                        ? cleanModelName(message.model)
                        : message.role === "assistant"
                          ? "Limitless"
                          : "You"}
                    </span>
                    <span>·</span>
                    <span>
                      {new Intl.DateTimeFormat(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(message.createdAt)}
                    </span>
                    {message.routed && <span className="routed-label">AUTO-ROUTED</span>}
                    {message.status === "stopped" && (
                      <span className="routed-label">STOPPED · SAVED</span>
                    )}
                    {message.status === "failed" && (
                      <span className="routed-label">INTERRUPTED · SAVED</span>
                    )}
                  </div>
                  <MessageActions
                    text={message.content}
                    onEdit={
                      message.role === "user"
                        ? () => onEdit(message.id, message.content)
                        : undefined
                    }
                    onRegenerate={
                      message.role === "assistant" && isLast
                        ? () => onRegenerate(message.id)
                        : undefined
                    }
                    onContinue={
                      message.role === "assistant" &&
                      isLast &&
                      Boolean(message.content) &&
                      (message.status === "stopped" || message.status === "failed")
                        ? () => onContinue(message.id)
                        : undefined
                    }
                    onBranch={() => onBranch(message.id)}
                    onArtifact={
                      message.role === "assistant" &&
                      Boolean(message.content) &&
                      !message.artifactIds?.length
                        ? () => onCreateArtifact(message.id)
                        : undefined
                    }
                  />
                </div>
              </article>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {showJump && hasMessages && (
        <button
          type="button"
          className="jump-latest"
          onClick={() => {
            stickToBottom.current = true;
            setShowJump(false);
            endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          }}
        >
          Jump to latest
        </button>
      )}

      <div className="composer-dock">
        {!keyConfigured && (
          <button type="button" className="key-notice" onClick={onOpenKey}>
            <ShieldCheck size={16} />
            Add your OpenRouter key to send messages
            <span>Configure →</span>
          </button>
        )}
        <form className="composer" onSubmit={submit}>
          {attachments.length > 0 && (
            <div className="composer-attachments">
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  removable
                  onRemove={() => onRemoveAttachment(attachment.id)}
                />
              ))}
            </div>
          )}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!sending) onSend();
              }
            }}
            placeholder="Ask anything, build anything…"
            rows={1}
            aria-label="Message"
          />
          <div className="composer-tools">
            <div className="composer-left">
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                accept="image/*,application/pdf,audio/*,video/*,text/*,.md,.json,.js,.ts,.tsx,.jsx,.css,.html,.py,.csv"
                onChange={(event) => {
                  if (event.target.files) onFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="composer-tool-button"
                onClick={() => fileRef.current?.click()}
                title="Attach images, PDFs, audio, video, or text"
              >
                <Paperclip size={17} />
                <span>Attach</span>
              </button>
              <label className="model-select">
                <span className="model-spark">✦</span>
                <select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  aria-label="Model"
                >
                  <option value="auto">Auto · best free model</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {cleanModelName(model)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="composer-right">
              <span>Enter to send</span>
              <button
                type="submit"
                className={`send-button ${sending ? "sending" : ""}`}
                disabled={!sending && (!input.trim() && !attachments.length)}
                aria-label={sending ? "Stop response" : "Send message"}
              >
                {sending ? <Square size={14} fill="currentColor" /> : <ArrowUp size={17} />}
              </button>
            </div>
          </div>
        </form>
        <p className="composer-footnote">
          Limitless can make mistakes. Important work deserves a quick review.
        </p>
      </div>
    </section>
  );
}
