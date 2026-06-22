import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import GroupModal from "../components/GroupModal";
import SettingsPanel from "../components/SettingsPanel";

export default function DashboardPage() {
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState("account");

  const openSettings = (section = "account") => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--app-shell)] p-0">
      <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[var(--app-frame)] md:flex-row">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenGroupModal={() => setGroupModalOpen(true)}
          onOpenSettings={openSettings}
        />
        <ChatWindow onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      </div>
      <GroupModal isOpen={groupModalOpen} onClose={() => setGroupModalOpen(false)} />
      <SettingsPanel
        isOpen={settingsOpen}
        initialSection={settingsSection}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
