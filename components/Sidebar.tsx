"use client";

import {
  Bot,
  Boxes,
  ChevronsLeft,
  CircleUserRound,
  ImagePlus,
  MessageSquare,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { AppSection, Chat } from "@/lib/types";

const navigation: Array<{
  id: AppSection;
  label: string;
  icon: typeof MessageSquare;
}> = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "create", label: "Create", icon: ImagePlus },
  { id: "library", label: "Library", icon: Boxes },
  { id: "models", label: "Models", icon: Sparkles },
  { id: "agent", label: "Agent", icon: Bot },
];

export function Sidebar({
  section,
  setSection,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  search,
  setSearch,
  open,
  onClose,
  onOpen,
  userEmail,
  syncing,
  onAccount,
}: {
  section: AppSection;
  setSection: (section: AppSection) => void;
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  search: string;
  setSearch: (value: string) => void;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  userEmail?: string;
  syncing: boolean;
  onAccount: () => void;
}) {
  return (
    <>
      <button className="mobile-menu-button" type="button" onClick={onOpen} aria-label="Open menu">
        <PanelLeftOpen size={19} />
      </button>
      {open && <button type="button" className="sidebar-scrim" onClick={onClose} aria-label="Close menu" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <button
            className="brand"
            type="button"
            onClick={() => {
              setSection("chat");
              onClose();
            }}
            aria-label="Limitless AI home"
          >
            <span className="brand-mark">L</span>
            <span>Limitless</span>
          </button>
          <button className="icon-button sidebar-close" type="button" onClick={onClose} aria-label="Collapse menu">
            <ChevronsLeft size={17} />
          </button>
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={() => {
            onNewChat();
            onClose();
          }}
        >
          <Plus size={16} />
          New conversation
          <kbd>⌘ K</kbd>
        </button>

        <nav className="primary-nav" aria-label="Primary">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => {
                setSection(id);
                onClose();
              }}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {id === "create" && <small>NEW</small>}
            </button>
          ))}
        </nav>

        <div className="conversation-label">
          <span>Conversations</span>
          <span>{chats.length}</span>
        </div>
        <label className="sidebar-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search conversations"
          />
        </label>
        <div className="conversation-list">
          {chats
            .filter((chat) => chat.title.toLowerCase().includes(search.toLowerCase()))
            .map((chat) => (
              <div
                className={`conversation-item ${
                  activeChatId === chat.id && section === "chat" ? "selected" : ""
                }`}
                key={chat.id}
              >
                <button
                  type="button"
                  className="conversation-select"
                  onClick={() => {
                    onSelectChat(chat.id);
                    setSection("chat");
                    onClose();
                  }}
                >
                  <span>{chat.title}</span>
                  <small>
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                    }).format(chat.updatedAt)}
                  </small>
                </button>
                <button
                  type="button"
                  className="conversation-delete"
                  onClick={() => onDeleteChat(chat.id)}
                  title="Move to recoverable deleted items"
                  aria-label={`Delete ${chat.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            onClick={() => {
              setSection("settings");
              onClose();
            }}
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            type="button"
            className="account-button"
            onClick={() => {
              onClose();
              onAccount();
            }}
          >
            <span className="account-avatar">
              <CircleUserRound size={18} />
            </span>
            <span>
              <b>{userEmail ? userEmail.split("@")[0] : "Local workspace"}</b>
              <small>
                <i className={syncing ? "sync-pulse" : ""} />
                {userEmail ? (syncing ? "Syncing…" : "Cloud ready") : "Private on this device"}
              </small>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
