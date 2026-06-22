import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import {
  FiCheck,
  FiKey,
  FiMail,
  FiMessageSquare,
  FiMonitor,
  FiMoon,
  FiSun,
  FiUser,
  FiX,
  FiCamera,
} from "react-icons/fi";

const accents = [
  { id: "teal", label: "Teal Tide", color: "#14b8a6" },
  { id: "blue", label: "Electric Blue", color: "#3b82f6" },
  { id: "sunset", label: "Sunset Gold", color: "#f59e0b" },
  { id: "rose", label: "Rose Glow", color: "#f43f5e" },
];

const themes = [
  { id: "system", label: "System", icon: FiMonitor },
  { id: "light", label: "Light", icon: FiSun },
  { id: "dark", label: "Dark", icon: FiMoon },
];

export default function SettingsPanel({ isOpen, initialSection = "account", onClose }) {
  const {
    user,
    updatePreferences,
    updateEmail,
    updatePassword,
    refreshLoginEntries,
    updateAvatar,
  } = useAuth();
  const { uploadFiles } = useChat();

  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState(initialSection);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmailForm({ email: user?.email || "", password: "" });
    setPasswordForm({ currentPassword: "", newPassword: "" });
    setActiveSection(initialSection);
    refreshLoginEntries().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const savePreference = async (payload) => {
    try {
      setError("");
      setStatus("");
      await updatePreferences(payload);
      setStatus("Settings updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update settings.");
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setStatus("");
      await updateEmail(emailForm.email, emailForm.password);
      setEmailForm((prev) => ({ ...prev, password: "" }));
      setStatus("Email updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update email.");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setStatus("");
      await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setStatus("Password updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update password.");
    }
  };

  const handleAvatarChange = async (e) => {
    if (e.target.files?.[0]) {
      setUploading(true);
      setError("");
      setStatus("");
      try {
        const res = await uploadFiles([e.target.files[0]]);
        await updateAvatar(res.fileUrl);
        setStatus("Profile picture updated.");
      } catch (err) {
        setError("Failed to upload profile picture.");
        console.error(err);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[var(--panel-bg)] p-6 text-[var(--text-primary)] shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--text-muted)]">
              Account Hub
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Settings & Privacy</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Tune the app look, update your account details, and review recent login activity.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {status ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {status}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setActiveSection("account")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              activeSection === "account"
                ? "bg-[var(--accent)] text-white shadow-[0_18px_30px_var(--accent-shadow)]"
                : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--text-primary)]"
            }`}
          >
            <FiUser />
            Account Settings
          </button>
          <button
            onClick={() => setActiveSection("chat")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              activeSection === "chat"
                ? "bg-[var(--accent)] text-white shadow-[0_18px_30px_var(--accent-shadow)]"
                : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--text-primary)]"
            }`}
          >
            <FiMessageSquare />
            Chat Settings
          </button>
        </div>

        <section className="mb-6 rounded-[28px] border border-[var(--line)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
            Appearance
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold">Theme</p>
              <div className="grid gap-3">
                {themes.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => savePreference({ theme: id })}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      user?.preferences?.theme === id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "border-[var(--line)] bg-[var(--surface-soft)]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon />
                      {label}
                    </span>
                    {user?.preferences?.theme === id ? <FiCheck /> : null}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">Accent Color</p>
              <div className="grid grid-cols-2 gap-3">
                {accents.map((accent) => (
                  <button
                    key={accent.id}
                    onClick={() => savePreference({ accent: accent.id })}
                    className={`rounded-2xl border p-3 text-left transition ${
                      user?.preferences?.accent === accent.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] bg-[var(--surface-soft)]"
                    }`}
                  >
                    <span
                      className="mb-3 block h-10 rounded-2xl"
                      style={{ background: accent.color }}
                    />
                    <span className="flex items-center justify-between text-sm font-medium">
                      {accent.label}
                      {user?.preferences?.accent === accent.id ? <FiCheck /> : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {activeSection === "chat" ? (
          <section className="mb-6 rounded-[28px] border border-[var(--line)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Chat Experience
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <p className="font-semibold">Split View</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Chats stay on the left, and the welcome panel returns when no conversation is selected.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <p className="font-semibold">Theme-aware bubbles</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Chat cards and message surfaces now adapt their contrast to the active theme.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "account" ? (
          <>
            {/* Display Picture Selection */}
            <section className="mb-6 rounded-[28px] border border-[var(--line)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] flex flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)] w-full mb-4">
                Profile Photo
              </p>
              <div className="relative group h-28 w-28 rounded-[36px] bg-[var(--surface-soft)] border-2 border-[var(--line)] flex items-center justify-center overflow-hidden shadow-md cursor-pointer hover:border-[var(--accent)] transition">
                {user?.avatar ? (
                  <img
                    src={`${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${user.avatar}`}
                    alt={user.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-[var(--accent-strong)] uppercase select-none">
                    {user?.username?.substring(0, 2)}
                  </span>
                )}
                {/* Upload Overlay */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold uppercase transition select-none">
                  {uploading ? (
                    "Uploading"
                  ) : (
                    <>
                      <FiCamera className="text-base mb-1" />
                      Change DP
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Click image to upload a new profile display picture
              </p>
            </section>

            {/* Privacy settings */}
            <section className="mb-6 rounded-[28px] border border-[var(--line)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)] mb-4">
                Privacy
              </p>
              <label className="flex items-center justify-between gap-4 cursor-pointer p-1">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">Show Email Address</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
                    Allow other users to see your email address in group profiles and search info.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={user?.preferences?.showEmail !== false}
                  onChange={(e) => savePreference({ showEmail: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 accent-[var(--accent)] text-white focus:ring-[var(--accent)] cursor-pointer"
                />
              </label>
            </section>

            <section className="mb-6 rounded-[28px] border border-[var(--line)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
                Account Details
              </p>
              <form onSubmit={handleEmailSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block font-medium">Email</span>
                  <input
                    value={emailForm.email}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, email: e.target.value }))}
                    type="email"
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block font-medium">Confirm with password</span>
                  <input
                    value={emailForm.password}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, password: e.target.value }))}
                    type="password"
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <div className="md:col-span-2">
                  <button className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95">
                    <FiMail />
                    Update Email
                  </button>
                </div>
              </form>

              <form onSubmit={handlePasswordSubmit} className="mt-6 grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block font-medium">Current password</span>
                  <input
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                    type="password"
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block font-medium">New password</span>
                  <input
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    type="password"
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <div className="md:col-span-2">
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]">
                    <FiKey />
                    Change Password
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : null}

        {activeSection === "account" ? (
          <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-card)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
                  Login Entries
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Recent sessions from this account.
                </p>
              </div>
              <button
                onClick={() => refreshLoginEntries()}
                className="rounded-2xl border border-[var(--line)] px-3 py-2 text-sm font-medium transition hover:border-[var(--accent)]"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {(user?.loginEntries || []).map((entry) => (
                <div
                  key={entry.sessionId}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3"
                >
                  <p className="font-medium">{entry.userAgent || "Unknown device"}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {entry.ipAddress || "Unknown IP"} • Active {new Date(entry.lastActiveAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Signed in {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
