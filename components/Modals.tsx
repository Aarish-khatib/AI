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
  X,
} from "lucide-react";
import { useState } from "react";

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
  current,
  onClose,
  onSave,
}: {
  current: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(current);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <ModalShell onClose={onClose} labelledBy="key-modal-title">
      <div className="modal-icon"><KeyRound size={21} /></div>
      <p className="modal-kicker">PROVIDER ACCESS</p>
      <h2 id="key-modal-title">Connect OpenRouter</h2>
      <p className="modal-copy">
        Limitless uses your key directly in this browser for chat and media generation.
      </p>
      <label className="secret-field">
        <span>OPENROUTER API KEY</span>
        <div>
          <input
            autoFocus
            type={visible ? "text" : "password"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="sk-or-v1-…"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setVisible((shown) => !shown)}>
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      <div className="security-note">
        <ShieldCheck size={18} />
        <span>
          <b>Device-encrypted</b>
          <small>Not synced to Supabase, not included in backups, and not packaged with the source.</small>
        </span>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button
        type="button"
        className="primary-action modal-action"
        disabled={saving || !value.trim()}
        onClick={async () => {
          setSaving(true);
          setError("");
          try {
            await onSave(value.trim());
            onClose();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "The key could not be saved.");
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
        {saving ? "Verifying…" : "Verify and save"}
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
