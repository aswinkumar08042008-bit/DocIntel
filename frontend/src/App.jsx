import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import SavedSessionPage from "./pages/SavedSessionPage";
import WorkspacePage from "./pages/WorkspacePage";
import { api } from "./services/api";

const DEFAULT_CONFIG = {
  max_files: 20, max_file_mb: 15,
  allowed_extensions: [".pdf", ".docx", ".txt", ".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png"],
};

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [workspace, setWorkspace] = useState(null);   // { workspaceId, docs, failed }
  const [openSessionId, setOpenSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsError, setSessionsError] = useState("");

  function loadSessions() {
    api.listSessions().then((list) => { setSessions(list); setSessionsError(""); }).catch((e) => setSessionsError(e.message));
  }

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
    loadSessions();
  }, []);

  // Leaves the current analysis: removes the temporary server copy and returns home.
  function leaveWorkspace() {
    if (workspace) api.clearWorkspace(workspace.workspaceId).catch(() => {});
    setWorkspace(null);
    loadSessions();
  }

  async function deleteSaved(id) {
    if (!window.confirm("Delete this saved analysis?")) return;
    try { await api.deleteSession(id); loadSessions(); } catch (e) { setSessionsError(e.message); }
  }

  return (
    <>
      <nav className="topbar"><span className="brand">DocIntel</span></nav>
      {openSessionId ? (
        <SavedSessionPage sessionId={openSessionId} onBack={() => setOpenSessionId(null)} />
      ) : workspace ? (
        <WorkspacePage workspaceId={workspace.workspaceId} docs={workspace.docs} failedNames={workspace.failed} onLeave={leaveWorkspace} />
      ) : (
        <HomePage config={config} sessions={sessions} sessionsError={sessionsError}
          onProcessed={(workspaceId, docs, failed) => setWorkspace({ workspaceId, docs, failed })}
          onOpenSaved={setOpenSessionId} onDeleteSaved={deleteSaved} />
      )}
    </>
  );
}
