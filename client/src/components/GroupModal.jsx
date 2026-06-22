import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

export default function GroupModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { directoryUsers, chats, createGroupChat, uploadFiles } = useChat();
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [uploading, setUploading] = useState(false);

  // Extract users we have chatted with
  const activePeers = useMemo(() => {
    const peerIds = new Set();
    (chats || []).forEach((chat) => {
      if (!chat.isGroup) {
        const peer = chat.participants.find((p) => p._id !== user?._id);
        if (peer?._id) peerIds.add(peer._id);
      }
    });
    return peerIds;
  }, [chats, user?._id]);

  // Filter and sort known connections
  const filteredConnections = useMemo(() => {
    return (directoryUsers || [])
      .filter(
        (u) =>
          activePeers.has(u._id) &&
          u.username.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [directoryUsers, activePeers, search]);

  // Filter and sort other users
  const filteredOthers = useMemo(() => {
    return (directoryUsers || [])
      .filter(
        (u) =>
          !activePeers.has(u._id) &&
          u.username.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [directoryUsers, activePeers, search]);

  if (!isOpen) return null;

  const toggleUser = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length < 2) return;
    await createGroupChat(groupName.trim(), selected, groupAvatar);
    setGroupName("");
    setGroupAvatar("");
    setSelected([]);
    setSearch("");
    onClose();
  };

  const handleFileChange = async (e) => {
    if (e.target.files?.[0]) {
      setUploading(true);
      try {
        const res = await uploadFiles([e.target.files[0]]);
        setGroupAvatar(res.fileUrl);
      } catch (err) {
        console.error("Group DP upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const renderUserRow = (u) => (
    <label
      key={u._id}
      className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] cursor-pointer hover:border-[var(--accent)] transition"
    >
      <input
        type="checkbox"
        checked={selected.includes(u._id)}
        onChange={() => toggleUser(u._id)}
        className="h-4 w-4 rounded border-gray-300 accent-[var(--accent)] text-white focus:ring-[var(--accent)]"
      />
      <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)] uppercase text-xs">
        {u.avatar ? (
          <img
            src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${u.avatar}`}
            alt={u.username}
            className="h-full w-full object-cover rounded-xl"
          />
        ) : (
          u.username.substring(0, 2)
        )}
      </div>
      <span className="flex-1 font-medium">{u.username}</span>
      <span className="text-xs text-[var(--text-secondary)]">
        {u.isOnline ? "Online" : "Offline"}
      </span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-[var(--line)] bg-[var(--panel-bg)] p-6 shadow-2xl">
        <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Create Group</h3>
        
        {/* Group Name & DP Selection */}
        <div className="flex gap-4 mt-5 items-center">
          <div className="relative h-16 w-16 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)] flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 hover:border-[var(--accent)] transition">
            {groupAvatar ? (
              <img
                src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${groupAvatar}`}
                alt="Group DP Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[10px] text-[var(--text-muted)] text-center font-semibold leading-tight px-1 uppercase">
                {uploading ? "Uploading" : "Add DP"}
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] text-sm"
          />
        </div>

        {/* Search input to filter contacts */}
        <div className="relative mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connections..."
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3.5 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] text-sm"
          />
        </div>

        {/* Users list sorted by recent chatted connections */}
        <div className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-1">
          {filteredConnections.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
                Recent Chats & Connections
              </p>
              <div className="space-y-2">{filteredConnections.map(renderUserRow)}</div>
            </div>
          )}

          {filteredOthers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1 mt-3">
                Other Users
              </p>
              <div className="space-y-2">{filteredOthers.map(renderUserRow)}</div>
            </div>
          )}

          {filteredConnections.length === 0 && filteredOthers.length === 0 && (
            <p className="text-sm text-center text-[var(--text-muted)] py-6">
              No users found matching query
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--line)] pt-4">
          <button
            onClick={() => {
              setGroupName("");
              setGroupAvatar("");
              setSelected([]);
              setSearch("");
              onClose();
            }}
            className="rounded-2xl border border-[var(--line)] px-5 py-3 text-sm font-medium text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selected.length < 2 || uploading}
            className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_var(--accent-shadow)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
