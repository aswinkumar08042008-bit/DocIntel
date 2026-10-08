import { useEffect, useRef, useState } from "react";
import ActionPicker from "../components/ActionPicker";
import ChatBox from "../components/ChatBox";
import Dialog from "../components/Dialog";
import NextStep from "../components/NextStep";
import ProgressSteps from "../components/ProgressSteps";
import ResultsView from "../components/ResultsView";
import { api } from "../services/api";
import { ACTION_LABEL, formatSize } from "../utils/format";

const WORKING_STEPS = ["Reading documents", "Understanding information", "Preparing results"];

export default function WorkspacePage({ workspaceId, docs, failedNames, onLeave }) {
  const [selected, setSelected] = useState([]);
  const [analyses, setAnalyses] = useState([]);     // [{ type, result }]
  const [chat, setChat] = useState([]);             // [{ role, text, sources }]
  const [running, setRunning] = useState(false);
  const [workStep, setWorkStep] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);       // null | exit | confirmNoSave | new | saved
  const [title, setTitle] = useState(`${docs[0].name}${docs.length > 1 ? ` + ${docs.length - 1} more` : ""}`);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);  // how much work was already saved
  const resultsRef = useRef(null);
  const chatInputRef = useRef(null);

  const workCount = analyses.length + chat.filter((m) => !m.error).length;
  const hasUnsavedWork = workCount > savedCount;

  // Moves the "Reading → Understanding → Preparing" indicator while the AI works
  useEffect(() => {
    if (!running) return;
    setWorkStep(0);
    const timer = setInterval(() => setWorkStep((s) => Math.min(s + 1, WORKING_STEPS.length - 1)), 4000);
    return () => clearInterval(timer);
  }, [running]);

  function toggleAction(id) {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  async function runActions(actions) {
    if (!actions.length || running) return;
    setError("");
    setRunning(true);
    try {
      const result = await api.analyze(workspaceId, actions);
      setAnalyses((old) => [...old, { type: actions.map((a) => ACTION_LABEL[a]).join(" + "), result }]);
      setSelected([]);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function sendQuestion(question) {
    setError("");
    const history = chat.filter((m) => !m.error).map(({ role, text }) => ({ role, text }));
    setChat((old) => [...old, { role: "user", text: question }]);
    setThinking(true);
    try {
      const reply = await api.ask(workspaceId, question, history);
      setChat((old) => [...old, { role: "assistant", text: reply.answer, sources: reply.sources }]);
    } catch (e) {
      setChat((old) => [...old, { role: "assistant", text: e.message, error: true }]);
    } finally {
      setThinking(false);
    }
  }

  // Returns true when saved. Shows a friendly error otherwise.
  async function save() {
    setSaving(true);
    try {
      await api.saveSession({
        workspace_id: workspaceId,
        title,
        analyses,
        chat: chat.filter((m) => !m.error).map(({ role, text, sources }) => ({ role, text, sources: sources || [] })),
      });
      setSavedCount(workCount);
      return true;
    } catch (e) {
      setError(e.message);
      setDialog(null);
      return false;
    } finally {
      setSaving(false);
    }
  }

  const titleField = (
    <label className="field">
      Name this analysis
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
    </label>
  );

  return (
    <main className="page wide">
      <header className="workspace-head">
        <div>
          <h1 className="h1-small">Your documents are ready</h1>
          <p className="muted">{docs.length} document{docs.length > 1 ? "s" : ""} processed. Your original files on your computer are never changed.</p>
        </div>
        <button className="btn secondary" onClick={() => (hasUnsavedWork ? setDialog("new") : onLeave())}>Start New Analysis</button>
      </header>

      <div className="layout">
        <div className="col-main">
          <ActionPicker selected={selected} onToggle={toggleAction} onRun={runActions} running={running} />
          {running && (
            <section className="card" aria-live="polite">
              <ProgressSteps steps={WORKING_STEPS.map((label, i) => ({ label, state: i < workStep ? "done" : i === workStep ? "active" : "todo" }))} />
            </section>
          )}
          {error && <div className="banner error" role="alert">{error}</div>}
          <div ref={resultsRef}>{analyses.length > 0 && <ResultsView analyses={analyses} />}</div>
          {(analyses.length > 0 || chat.some((m) => m.role === "assistant" && !m.error)) && (
            <NextStep running={running} onRun={runActions}
              onAskQuestion={() => chatInputRef.current?.focus()} onExit={() => setDialog("exit")} />
          )}
        </div>

        <aside className="col-side">
          <ChatBox messages={chat} onSend={sendQuestion} thinking={thinking} inputRef={chatInputRef} />
          <section className="card">
            <h2>Documents</h2>
            <ul className="doc-list">
              {docs.map((d) => (
                <li key={d.id}>
                  <span className="ok-text">✓</span> {d.name}
                  <span className="muted small"> {d.file_type} · {formatSize(d.size_bytes)}{d.page_count ? ` · ${d.page_count} pages` : ""}</span>
                  {d.warning && <div className="small warn-text">{d.warning}</div>}
                </li>
              ))}
              {failedNames.map((name) => (
                <li key={name}><span className="error-text">✕</span> {name} <div className="small error-text">Unable to process this file</div></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {dialog === "exit" && (
        <Dialog title="Would you like to save this analysis?"
          buttons={[
            { label: "Save", kind: "primary", disabled: saving, onClick: async () => { if (await save()) setDialog("saved"); } },
            { label: "Don't Save", onClick: () => setDialog("confirmNoSave") },
            { label: "Cancel", kind: "link", onClick: () => setDialog(null) },
          ]}>
          {titleField}
        </Dialog>
      )}
      {dialog === "confirmNoSave" && (
        <Dialog title="Your analysis will not be saved. Are you sure?"
          buttons={[
            { label: "Yes, Exit", kind: "danger", onClick: onLeave },
            { label: "Cancel", kind: "link", onClick: () => setDialog(null) },
          ]}>
          <p>Your original files stay on your computer. Only this analysis will be cleared.</p>
        </Dialog>
      )}
      {dialog === "new" && (
        <Dialog title="Your current analysis has not been saved. Do you want to continue?"
          buttons={[
            { label: "Save and Continue", kind: "primary", disabled: saving, onClick: async () => { if (await save()) onLeave(); } },
            { label: "Don't Save", onClick: onLeave },
            { label: "Cancel", kind: "link", onClick: () => setDialog(null) },
          ]}>
          {titleField}
        </Dialog>
      )}
      {dialog === "saved" && (
        <Dialog title="Analysis saved successfully."
          buttons={[
            { label: "Start New Analysis", kind: "primary", onClick: onLeave },
            { label: "Keep working", kind: "link", onClick: () => setDialog(null) },
          ]}>
          <p>You can open it again later from the home page.</p>
        </Dialog>
      )}
    </main>
  );
}
