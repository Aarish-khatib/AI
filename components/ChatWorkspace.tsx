"use client";

import {
  ArrowUp,
  Check,
  Copy,
  File,
  Image as ImageIcon,
  LoaderCircle,
  Paperclip,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { cleanModelName } from "@/lib/openrouter";
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
}: {
  text: string;
  onRegenerate?: () => void;
  onEdit?: () => void;
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
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const hasMessages = Boolean(chat?.messages.length);
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

      <div className={`chat-scroll ${hasMessages ? "" : "empty-chat"}`}>
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
            {chat?.messages.map((message, index) => (
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
                  </div>
                  <MessageActions
                    text={message.content}
                    onEdit={
                      message.role === "user"
                        ? () => onEdit(message.id, message.content)
                        : undefined
                    }
                    onRegenerate={
                      message.role === "assistant" && index === chat.messages.length - 1
                        ? () => onRegenerate(message.id)
                        : undefined
                    }
                  />
                </div>
              </article>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

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
