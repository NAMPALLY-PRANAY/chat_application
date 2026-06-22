import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import {
  FiChevronRight,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiPlus,
  FiSearch,
  FiSettings,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

const resolvePeer = (chat, myId) => chat.participants.find((participant) => participant._id !== myId);

const resolveTitle = (chat, myId) =>
  chat.isGroup ? chat.groupName : resolvePeer(chat, myId)?.username || "Unknown";

const resolveSubtitle = (chat, myId) => {
  if (chat.lastMessage?.content) return chat.lastMessage.content;
  if (chat.lastMessage?.attachments?.length) {
    return `${chat.lastMessage.attachments.length} attachment${chat.lastMessage.attachments.length > 1 ? "s" : ""}`;
  }
  if (chat.isGroup) return `${chat.participants.length} members`;
  const peer = resolvePeer(chat, myId);
  if (!peer) return "No messages yet";
  return peer.isOnline ? "Online now" : "Tap to start chatting";
};

export default function Sidebar({ isOpen, onClose, onOpenGroupModal, onOpenSettings }) {
  const { user, logout } = useAuth();
  const { users, chats, currentChat, openChat, createDirectChat, refreshUsers } = useChat();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let active = true;

    const runSearch = async () => {
      if (!search.trim()) {
        refreshUsers("").catch(() => {});
        return;
      }

      setSearching(true);
      try {
        await refreshUsers(search.trim());
      } finally {
        if (active) setSearching(false);
      }
    };

    const timer = setTimeout(runSearch, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, refreshUsers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chatIdsByPeer = useMemo(() => {
    const map = new Map();
    chats.forEach((chat) => {
      if (!chat.isGroup) {
        const peer = resolvePeer(chat, user?._id);
        if (peer?._id) map.set(peer._id, chat._id);
      }
    });
    return map;
  }, [chats, user?._id]);

  const handleOpenChat = async (chat) => {
    await openChat(chat);
    onClose();
  };

  const handleCreateDirectChat = async (userId) => {
    await createDirectChat(userId);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`absolute inset-0 z-30 bg-slate-950/45 backdrop-blur-sm transition md:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`absolute left-0 top-0 z-40 flex h-full w-[390px] max-w-[92vw] flex-col border-r border-[var(--line-strong)] bg-[linear-gradient(180deg,var(--sidebar-top),var(--sidebar-bottom))] shadow-[0_30px_60px_rgba(2,6,23,0.32)] transition-transform duration-300 md:static md:z-10 md:max-w-none md:translate-x-0 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-[var(--line-strong)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="grid h-14 w-14 place-items-center rounded-[22px] border border-[var(--line-strong)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm"
              >
                {menuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
              </button>

              {menuOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-60 rounded-[28px] border border-[var(--line-strong)] bg-[var(--surface-card)] p-2 shadow-[0_30px_60px_rgba(2,6,23,0.22)]">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings("account");
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
                  >
                    <FiUser />
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings("chat");
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
                  >
                    <FiSettings />
                    Chat Settings
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenGroupModal();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
                  >
                    <FiPlus />
                    New Group
                  </button>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
                  >
                    <FiLogOut />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-[var(--text-primary)]">{user?.username}</p>
              <p className="truncate text-sm text-[var(--text-secondary)]">{user?.email}</p>
            </div>

            <button
              onClick={onOpenGroupModal}
              className="grid h-12 w-12 place-items-center rounded-[18px] bg-[var(--accent)] text-white shadow-[0_18px_30px_var(--accent-shadow)] transition hover:-translate-y-0.5"
            >
              <FiPlus className="text-xl" />
            </button>
          </div>

          <div className="relative mt-4">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by username"
              className="w-full rounded-[26px] border border-[var(--search-border)] bg-[var(--search-bg)] py-3 pl-12 pr-4 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="border-b border-[var(--line-strong)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[var(--text-muted)]">Discover People</p>
          {searching ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Searching MongoDB users...</p>
          ) : search.trim() ? (
            <div className="mt-3 space-y-2">
              {users.length ? (
                users.map((person) => {
                  const existingChatId = chatIdsByPeer.get(person._id);
                  return (
                    <button
                      key={person._id}
                      onClick={() => handleCreateDirectChat(person._id)}
                      className="flex w-full items-center gap-3 rounded-[24px] border border-[var(--line-strong)] bg-[var(--surface-card)] px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
                    >
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--surface-soft)] text-[var(--accent-strong)]">
                        <FiUser />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--text-primary)]">{person.username}</p>
                        <p className="truncate text-sm text-[var(--text-secondary)]">
                          {person.isOnline ? "Online now" : "Offline, messages will deliver when they return"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        <span className="block">{existingChatId ? "Open" : "Start"}</span>
                        <FiChevronRight className="ml-auto mt-1" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="mt-3 rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-card)] px-4 py-5 text-sm text-[var(--text-secondary)]">
                  No username matches yet. Try a different search.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Type a username to find someone and open a direct chat, even if they are offline.
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 px-4 py-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[var(--text-muted)]">My Chats</p>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              {chats.length}
            </span>
          </div>

          <div className="h-full overflow-y-auto pr-1">
            {chats.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-card)] p-5 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <FiMessageSquare className="text-xl" />
                </div>
                <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">Your inbox is empty</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  New users start with a clean slate. Search a username above to begin your first conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {chats.map((chat) => {
                  const active = currentChat?._id === chat._id;
                  return (
                    <button
                      key={chat._id}
                      onClick={() => handleOpenChat(chat)}
                      className={`flex w-full items-center gap-3 rounded-[28px] border px-4 py-4 text-left transition ${
                        active
                          ? "border-[var(--accent)] bg-[var(--chat-card-active)] shadow-[0_16px_30px_rgba(15,23,42,0.12)]"
                          : "border-[var(--line-strong)] bg-[var(--surface-card)] shadow-sm hover:-translate-y-0.5 hover:border-[var(--accent)]"
                      }`}
                    >
                      <div
                        className={`grid h-12 w-12 place-items-center rounded-2xl ${
                          active ? "bg-white text-[var(--accent-strong)]" : "bg-[var(--surface-soft)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {chat.isGroup ? <FiUsers className="text-lg" /> : <FiMessageSquare className="text-lg" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                            {resolveTitle(chat, user?._id)}
                          </p>
                          {chat.lastMessage?.createdAt ? (
                            <span className="text-xs text-[var(--text-muted)]">
                              {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                          {resolveSubtitle(chat, user?._id)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
