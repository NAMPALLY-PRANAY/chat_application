import { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import useDebounce from "../hooks/useDebounce";
import {
  FiSend,
  FiPaperclip,
  FiSearch,
  FiMessageSquare,
  FiUser,
  FiUsers,
  FiX,
  FiCheck,
  FiFileText,
  FiChevronLeft,
  FiMail,
} from "react-icons/fi";

const getUsernameColor = (username) => {
  const colors = [
    "text-blue-400",
    "text-rose-400",
    "text-emerald-400",
    "text-amber-400",
    "text-violet-400",
    "text-pink-400",
    "text-sky-400",
    "text-teal-400",
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function ChatWindow({ onToggleSidebar }) {
  const { user } = useAuth();
  const {
    currentChat,
    messages,
    typingUsers,
    sendMessage,
    sendTyping,
    searchInCurrentChat,
    uploadFiles,
  } = useChat();

  const [draft, setDraft] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Close sidebars on chat selection change
  useEffect(() => {
    setSearchOpen(false);
    setProfileOpen(false);
    setSearchQuery("");
  }, [currentChat]);

  // Scroll to bottom when messages or currentChat changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentChat]);

  // Typing status logic
  const handleTyping = (text) => {
    setDraft(text);
    sendTyping(text.length > 0);
  };

  // Run local search inside active chat
  useEffect(() => {
    const runSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchInCurrentChat(debouncedSearch.trim());
        setSearchResults(results || []);
      } catch (err) {
        console.error("Error searching messages:", err);
      } finally {
        setSearching(false);
      }
    };
    runSearch();
  }, [debouncedSearch, searchInCurrentChat]);

  // Handle message send with uploads
  const handleSend = async () => {
    if (!draft.trim() && selectedFiles.length === 0) return;
    setUploading(true);
    try {
      let uploadedData = { fileUrl: "", fileType: "", attachments: [] };
      if (selectedFiles.length > 0) {
        const uploadResult = await uploadFiles(selectedFiles);
        uploadedData = {
          fileUrl: uploadResult.fileUrl,
          fileType: uploadResult.fileType,
          attachments: uploadResult.attachments || [],
        };
      }

      await sendMessage({
        content: draft.trim(),
        fileUrl: uploadedData.fileUrl,
        fileType: uploadedData.fileType,
        attachments: uploadedData.attachments,
      });

      setDraft("");
      setSelectedFiles([]);
      sendTyping(false);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Scroll to a message and flash-highlight it
  const navigateToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(msgId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

  // Peer metadata resolver
  const peer = useMemo(() => {
    if (!currentChat || currentChat.isGroup) return null;
    return currentChat.participants.find((p) => p._id !== user?._id);
  }, [currentChat, user?._id]);

  // Resolves list of other people typing in this chat
  const typingUsernames = useMemo(() => {
    if (!currentChat) return [];
    return currentChat.participants
      .filter((p) => p._id !== user?._id && typingUsers[p._id])
      .map((p) => p.username);
  }, [currentChat, user?._id, typingUsers]);

  const chatTitle = useMemo(() => {
    if (!currentChat) return "";
    if (currentChat.isGroup) return currentChat.groupName;
    return peer?.username || "Direct Chat";
  }, [currentChat, peer]);

  const subtitleText = useMemo(() => {
    if (!currentChat) return "";
    if (typingUsernames.length > 0) {
      return `${typingUsernames.join(", ")} ${
        typingUsernames.length > 1 ? "are" : "is"
      } typing...`;
    }
    if (currentChat.isGroup) {
      const onlineCount = currentChat.participants.filter((p) => p.isOnline).length;
      return `${currentChat.participants.length} members, ${onlineCount} online`;
    }
    return peer?.isOnline ? "online" : "offline";
  }, [currentChat, peer, typingUsernames]);

  if (!currentChat) {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[linear-gradient(180deg,var(--chat-top),var(--chat-bottom))] px-6 text-center">
        <button
          onClick={onToggleSidebar}
          className="absolute left-5 top-5 z-10 grid h-14 w-14 place-items-center rounded-[22px] border border-[var(--line-strong)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-[0_16px_30px_rgba(15,23,42,0.12)] md:hidden"
        >
          <FiChevronLeft className="text-2xl" />
        </button>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_35%)]" />
        <div className="relative max-w-sm">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-[var(--surface-card)] text-[var(--accent-strong)] shadow-[0_20px_40px_rgba(15,23,42,0.1)]">
            <FiMessageSquare className="text-3xl" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">Select a chat to start messaging</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Choose a direct chat or a group conversation from the list, or search for a new username to connect.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-row overflow-hidden bg-[var(--chat-bg)]">
      {/* Main Chat Interface */}
      <div className="flex flex-1 flex-col h-full overflow-hidden relative">
        {/* Chat Header */}
        <header className="flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--header-bg)] px-5 py-3 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--text-primary)] md:hidden"
            >
              <FiChevronLeft className="text-xl" />
            </button>

            {/* Clickable Header Info Area (opens 3rd split Info sidebar) */}
            <div
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setSearchOpen(false);
              }}
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)] uppercase transition hover:brightness-95">
                {currentChat.isGroup ? (
                  currentChat.groupAvatar ? (
                    <img
                      src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${currentChat.groupAvatar}`}
                      alt={currentChat.groupName}
                      className="h-full w-full object-cover rounded-2xl"
                    />
                  ) : (
                    <FiUsers className="text-lg" />
                  )
                ) : peer?.avatar ? (
                  <img
                    src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${peer.avatar}`}
                    alt={peer.username}
                    className="h-full w-full object-cover rounded-2xl"
                  />
                ) : (
                  peer?.username?.substring(0, 2) || "?"
                )}
                {!currentChat.isGroup && peer?.isOnline && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent-strong)] transition">
                  {chatTitle}
                </h3>
                <p className="truncate text-xs text-[var(--text-muted)] mt-0.5">{subtitleText}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearchOpen((prev) => !prev);
                setProfileOpen(false);
              }}
              className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                searchOpen
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <FiSearch className="text-lg" />
            </button>
          </div>
        </header>

        {/* Message Container Wallpaper Overlay */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.02))] chat-pattern" />

        {/* Messages List */}
        <div
          ref={messagesContainerRef}
          className="chat-messages-container flex-1 overflow-y-auto px-5 py-5 space-y-3 z-10"
        >
          {messages.length === 0 ? (
            <div className="mx-auto max-w-xs rounded-2xl bg-white/40 dark:bg-black/20 p-5 text-center backdrop-blur-sm">
              <p className="text-sm font-medium text-[var(--text-secondary)]">No messages yet.</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Type a message below to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
              const isHighlighted = highlightedMessageId === msg._id;
              return (
                <div
                  key={msg._id}
                  id={`msg-${msg._id}`}
                  className={`flex w-full transition-all duration-500 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    style={isMe ? { backgroundImage: "var(--bubble-me)" } : {}}
                    className={`max-w-[85%] md:max-w-[65%] rounded-[20px] px-4 py-2.5 shadow-sm relative transition-all duration-300 ${
                      isHighlighted ? "ring-4 ring-amber-400 scale-[1.02]" : ""
                    } ${
                      isMe
                        ? "rounded-tr-none text-white shadow-[0_4px_12px_var(--accent-shadow)]"
                        : "rounded-tl-none border border-[var(--incoming-bubble-border)] bg-[var(--incoming-bubble)] text-[var(--text-primary)]"
                    }`}
                  >
                    {/* Sender Username for Groups */}
                    {currentChat.isGroup && !isMe && msg.sender && (
                      <p className={`text-xs font-semibold mb-1 select-none ${getUsernameColor(msg.sender.username)}`}>
                        {msg.sender.username}
                      </p>
                    )}

                    {/* Message Text Content */}
                    {msg.content && (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">{msg.content}</p>
                    )}

                    {/* Attachments List */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((att, idx) => {
                          const fileHref = `${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${att.fileUrl}`;
                          const isImg = att.fileType && att.fileType.startsWith("image/");
                          if (isImg) {
                            return (
                              <div key={idx} className="rounded-lg overflow-hidden border border-black/10 max-w-sm">
                                <a href={fileHref} target="_blank" rel="noreferrer">
                                  <img
                                    src={fileHref}
                                    alt={att.originalName || "Image"}
                                    className="max-h-60 w-full object-cover hover:opacity-95"
                                  />
                                </a>
                              </div>
                            );
                          }
                          return (
                            <a
                              key={idx}
                              href={fileHref}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-medium transition ${
                                isMe
                                  ? "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                                  : "bg-[var(--surface-soft)] hover:bg-[var(--surface-card)] border-[var(--line)] text-[var(--text-primary)]"
                              }`}
                            >
                              <FiFileText className="text-lg flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">{att.originalName || "Attachment"}</p>
                                <p className="text-[10px] opacity-75 mt-0.5">{formatFileSize(att.size)}</p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* Metadata (Time + Ticks) */}
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[9px] select-none ${
                        isMe ? "text-white/70" : "text-[var(--text-muted)]"
                      }`}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMe && (
                        <span className="inline-flex">
                          {msg.status === "seen" ? (
                            <span className="flex -space-x-1">
                              <FiCheck className="h-3.5 w-3.5 text-emerald-400" />
                              <FiCheck className="h-3.5 w-3.5 text-emerald-400" />
                            </span>
                          ) : (
                            <FiCheck className="h-3.5 w-3.5 text-white/80" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer (Bottom Area) */}
        <div className="border-t border-[var(--line)] bg-[var(--composer-bg)] p-4 backdrop-blur-md z-10 flex flex-col gap-2">
          {/* Selected File Previews */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-[var(--composer-input-bg)] border border-[var(--line)] rounded-2xl max-h-40 overflow-y-auto">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-[var(--surface-soft)] text-[var(--text-primary)] rounded-xl px-3 py-1.5 text-xs font-medium border border-[var(--line)] max-w-xs truncate"
                >
                  <FiFileText className="flex-shrink-0" />
                  <span className="truncate flex-1 max-w-[120px]">{file.name}</span>
                  <button
                    onClick={() => removeSelectedFile(idx)}
                    className="text-[var(--text-muted)] hover:text-rose-500 ml-1"
                  >
                    <FiX className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Form Row */}
          <div className="flex items-end gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="grid h-12 w-12 flex-shrink-0 cursor-pointer place-items-center rounded-2xl border border-[var(--line)] bg-[var(--composer-input-bg)] text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
            >
              <FiPaperclip className="text-xl" />
            </button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex-1 rounded-[24px] border border-[var(--line)] bg-[var(--composer-input-bg)] px-4 py-2 shadow-sm flex items-center min-h-[48px]">
              <textarea
                value={draft}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Write a message"
                rows={1}
                className="max-h-24 min-h-[20px] w-full resize-none bg-transparent text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={uploading || (!draft.trim() && selectedFiles.length === 0)}
              className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-white shadow-[0_12px_24px_var(--accent-shadow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSend className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Local Message Search Panel (Search Sidebar) */}
      {searchOpen && (
        <aside className="w-80 border-l border-[var(--line)] bg-[var(--surface-card)] h-full flex flex-col z-20 absolute right-0 top-0 shadow-2xl md:static md:shadow-none">
          <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--line)] bg-[var(--header-bg)]">
            <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FiSearch /> Search Messages
            </h4>
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="rounded-lg p-1.5 hover:bg-[var(--surface-soft)] text-[var(--text-secondary)]"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          <div className="p-4 border-b border-[var(--line)]">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this chat..."
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {searching ? (
              <p className="text-sm text-[var(--text-muted)] text-center mt-4">Searching message log...</p>
            ) : searchQuery.trim() ? (
              searchResults.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center mt-4">No matching messages found.</p>
              ) : (
                searchResults.map((result) => {
                  const isMe = result.sender === user?._id || result.sender?._id === user?._id;
                  return (
                    <button
                      key={result._id}
                      onClick={() => navigateToMessage(result._id)}
                      className="w-full text-left rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] hover:bg-[var(--surface-card)] hover:border-[var(--accent)] p-3 transition shadow-sm"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {isMe ? "You" : result.sender?.username || "Other"}
                        </span>
                        <span>
                          {new Date(result.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{result.content}</p>
                    </button>
                  );
                })
              )
            ) : (
              <div className="text-center text-[var(--text-muted)] text-xs mt-10">
                <FiMessageSquare className="text-3xl mx-auto mb-3 opacity-60" />
                Type keywords above to find specific messages in this conversation.
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Profile/Group Info Sidebar Panel (3rd Column Split) */}
      {profileOpen && (
        <aside className="w-80 border-l border-[var(--line)] bg-[var(--surface-card)] h-full flex flex-col z-20 absolute right-0 top-0 shadow-2xl md:static md:shadow-none">
          <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--line)] bg-[var(--header-bg)]">
            <h4 className="font-semibold text-[var(--text-primary)]">
              {currentChat.isGroup ? "Group Info" : "User Info"}
            </h4>
            <button
              onClick={() => setProfileOpen(false)}
              className="rounded-lg p-1.5 hover:bg-[var(--surface-soft)] text-[var(--text-secondary)]"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center">
            {/* Avatar Profile Picture */}
            <div className="relative h-28 w-28 rounded-[36px] bg-[var(--accent-soft)] border-2 border-[var(--line)] flex items-center justify-center overflow-hidden shadow-md select-none font-bold text-3xl text-[var(--accent-strong)] uppercase">
              {currentChat.isGroup ? (
                currentChat.groupAvatar ? (
                  <img
                    src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${currentChat.groupAvatar}`}
                    alt={currentChat.groupName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FiUsers className="text-4xl" />
                )
              ) : peer?.avatar ? (
                <img
                  src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${peer.avatar}`}
                  alt={peer.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                peer?.username?.substring(0, 2) || "?"
              )}
            </div>

            {/* Title Name & Online State */}
            <h3 className="mt-4 text-xl font-bold text-[var(--text-primary)] text-center leading-snug">
              {currentChat.isGroup ? currentChat.groupName : peer?.username}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 text-center font-medium capitalize">
              {currentChat.isGroup
                ? `${currentChat.participants.length} members`
                : peer?.isOnline
                ? "online"
                : "offline"}
            </p>

            <div className="w-full border-t border-[var(--line)] my-5" />

            {/* Profile Info Details List */}
            <div className="w-full space-y-4">
              {currentChat.isGroup ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 px-1">
                    Group Members
                  </p>
                  <div className="space-y-2">
                    {currentChat.participants.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-3 p-2 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)] text-xs font-medium"
                      >
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)] uppercase text-xs">
                          {member.avatar ? (
                            <img
                              src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${member.avatar}`}
                              alt={member.username}
                              className="h-full w-full object-cover rounded-xl"
                            />
                          ) : (
                            member.username?.substring(0, 2) || "?"
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[var(--text-primary)]">
                            {member.username}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {member._id === currentChat.admin
                              ? "Owner / Admin"
                              : member.isOnline
                              ? "online"
                              : "offline"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[var(--surface-soft)] rounded-2xl p-4 border border-[var(--line)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Username
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)] block">
                      @{peer?.username}
                    </span>
                  </div>

                  <div className="bg-[var(--surface-soft)] rounded-2xl p-4 border border-[var(--line)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Email Address
                    </span>
                    {peer?.email ? (
                      <span className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <FiMail className="opacity-80" /> {peer.email}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] italic block leading-relaxed">
                        Email hidden by user privacy settings
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
    </main>
  );
}
