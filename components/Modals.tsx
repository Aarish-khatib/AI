"use client";

import {
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import type { KeySlot, KeySlotId } from "@/lib/key-pool";

function ModalShell({
  children,
  onClose,
  labelledBy,
}: {
  children: React.ReactNode;
  onClose: () => void;
  labelledBy: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function KeyModal({
  slots,
  onClose,
  onSave,
  onRemove,
  onToggle,
}: {
  slots: KeySlot[];
  onClose: () => void;
  onSave: (id: KeySlotId, value: string) => Promise<void>;
  onRemove: (id: KeySlotId) => Promise<void>;
  onToggle: (id: KeySlotId, enabled: boolean) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(slots.map((slot) => [slot.id, slot.key])),
  );
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  return (
    <ModalShell onClose={onClose} labelledBy="key-modal-title">
      <div className="modal-icon"><KeyRound size={21} /></div>
      <p className="modal-kicker">PROVIDER ACCESS</p>
      <h2 id="key-modal-title">OpenRouter key pool</h2>
      <p className="modal-copy">
        Add up to three keys. Limitless uses priority order, respects rate-limit
        cooldowns, and never mixes a failed partial response with a retry.
      </p>
      <div className="key-pool-list">
        {slots.map((slot, index) => (
          <div className="key-slot-card" key={slot.id}>
            <div className="key-slot-heading">
              <span>
                <b>{slot.label}</b>
                <small>
                  Priority {index + 1} · {slot.masked} · {slot.status}
                </small>
              </span>
              <button
                type="button"
                className={slot.enabled ? "slot-toggle enabled" : "slot-toggle"}
                disabled={working === slot.id || !slot.configured}
                onClick={async () => {
                  setWorking(slot.id);
                  setError("");
                  try {
                    await onToggle(slot.id, !slot.enabled);
                  } catch (caught) {
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : "The key state could not be changed.",
                    );
                  } finally {
                    setWorking("");
                  }
                }}
              >
                {slot.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <label className="secret-field">
              <span>{slot.label.toUpperCase()} KEY</span>
              <div>
                <input
                  autoFocus={index === 0}
                  type={visible[slot.id] ? "text" : "password"}
                  value={values[slot.id] || ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [slot.id]: event.target.value,
                    }))
                  }
                  placeholder="sk-or-v1-…"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  aria-label={`${visible[slot.id] ? "Hide" : "Show"} ${slot.label} key`}
                  onClick={() =>
                    setVisible((current) => ({
                      ...current,
                      [slot.id]: !current[slot.id],
                    }))
                  }
                >
                  {visible[slot.id] ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            <div className="key-slot-actions">
              <button
                type="button"
                className="secondary-action"
                disabled={working === slot.id || !(values[slot.id] || "").trim()}
                onClick={async () => {
                  setWorking(slot.id);
                  setError("");
                  try {
                    await onSave(slot.id, (values[slot.id] || "").trim());
                  } catch (caught) {
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : "The key could not be saved.",
                    );
                  } finally {
                    setWorking("");
                  }
                }}
              >
                {working === slot.id ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Verify and save
              </button>
              {slot.configured && (
                <button
                  type="button"
                  className="icon-danger-button"
                  aria-label={`Remove ${slot.label} key`}
                  disabled={working === slot.id}
                  onClick={async () => {
                    if (!window.confirm(`Remove the encrypted ${slot.label} key from this workspace?`)) {
                      return;
                    }
                    setWorking(slot.id);
                    setError("");
                    try {
                      await onRemove(slot.id);
                      setValues((current) => ({ ...current, [slot.id]: "" }));
                    } catch (caught) {
                      setError(
                        caught instanceof Error
                          ? caught.message
                          : "The key could not be removed.",
                      );
                    } finally {
                      setWorking("");
                    }
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="security-note">
        <ShieldCheck size={18} />
        <span>
          <b>Workspace-isolated and device-encrypted</b>
          <small>Keys are never synced, copied between accounts, included in backups, or packaged with source.</small>
        </span>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="primary-action modal-action" onClick={onClose}>
        Done
      </button>
      <a className="modal-link" href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">
        Create a key at OpenRouter ↗
      </a>
    </ModalShell>
  );
}

export function AccountModal({
  configured,
  userEmail,
  onClose,
  onMagicLink,
  onSignOut,
}: {
  configured: boolean;
  userEmail?: string;
  onClose: () => void;
  onMagicLink: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <ModalShell onClose={onClose} labelledBy="account-modal-title">
      <div className="modal-icon"><Cloud size={21} /></div>
      <p className="modal-kicker">OPTIONAL CLOUD SYNC</p>
      <h2 id="account-modal-title">{userEmail ? "Account connected" : "Take your work anywhere"}</h2>
      <p className="modal-copy">
        {userEmail
          ? "Your local-first workspace can now merge revisions with your private cloud records."
          : "Sign in by magic link. Local work remains available even when cloud sync is off."}
      </p>
      {!configured ? (
        <div className="configuration-box">
          <b>Supabase setup required</b>
          <p>Copy <code>.env.example</code>, add your public project URL and publishable key, then run the included SQL migration.</p>
        </div>
      ) : userEmail ? (
        <>
          <div className="signed-in-box"><CheckCircle2 size={19} /><span><b>{userEmail}</b><small>RLS-protected account</small></span></div>
          <button
            type="button"
            className="secondary-action"
            disabled={working}
            onClick={async () => {
              setWorking(true);
              try {
                await onSignOut();
                onClose();
              } finally {
                setWorking(false);
              }
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </>
      ) : sent ? (
        <div className="signed-in-box"><CheckCircle2 size={19} /><span><b>Check your inbox</b><small>The secure sign-in link expires automatically.</small></span></div>
      ) : (
        <>
          <label className="secret-field">
            <span>EMAIL</span>
            <div><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button
            type="button"
            className="primary-action modal-action"
            disabled={working || !email.includes("@")}
            onClick={async () => {
              setWorking(true);
              setError("");
              try {
                await onMagicLink(email);
                setSent(true);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "The sign-in link could not be sent.");
              } finally {
                setWorking(false);
              }
            }}
          >
            {working ? <LoaderCircle className="spin" size={16} /> : <Cloud size={16} />}
            {working ? "Sending…" : "Send magic link"}
          </button>
        </>
      )}
      <div className="security-note">
        <ShieldCheck size={18} />
        <span><b>Conflict-safe sync</b><small>Divergent revisions are recovered as copies instead of silently overwritten.</small></span>
      </div>
    </ModalShell>
  );
}
