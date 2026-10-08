import { useState } from "react";
import FileDropzone from "../components/FileDropzone";
import FileList from "../components/FileList";
import ProgressSteps from "../components/ProgressSteps";
import { api } from "../services/api";
import { useDocumentProcessing } from "../hooks/useDocumentProcessing";
import { fileExtension, formatDate, formatSize } from "../utils/format";

export default function HomePage({ config, sessions, sessionsError, onProcessed, onOpenSaved, onDeleteSaved }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const { statuses, running, processAll } = useDocumentProcessing();
  const started = Object.keys(statuses).length > 0;

  function addFiles(files) {
    const problems = [];
    const accepted = [];
    for (const file of files) {
      if (!config.allowed_extensions.includes(fileExtension(file.name))) problems.push(`${file.name}: file type not supported.`);
      else if (file.size === 0) problems.push(`${file.name}: the file is empty.`);
      else if (file.size > config.max_file_mb * 1024 * 1024) problems.push(`${file.name}: larger than ${config.max_file_mb} MB (${formatSize(file.size)}).`);
      else accepted.push({ key: `${file.name}-${file.size}-${Math.random()}`, file });
    }
    const room = config.max_files - items.length;
    if (accepted.length > room) problems.push(`You can add up to ${config.max_files} documents. Extra files were skipped.`);
    setItems([...items, ...accepted.slice(0, Math.max(room, 0))]);
    setMessage(problems.join(" "));
  }

  async function handleProcess() {
    setMessage("");
    try {
      const { workspaceId, docs, failed } = await processAll(items);
      if (!docs.length) {
        api.clearWorkspace(workspaceId).catch(() => {});
        setMessage("None of the documents could be processed. Remove them and try other files.");
        return;
      }
      onProcessed(workspaceId, docs, failed);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const stages = Object.values(statuses).map((s) => s.stage);
  const finished = stages.length > 0 && stages.every((s) => s === "done" || s === "failed");
  const uploadedAll = stages.length > 0 && stages.every((s) => !["waiting", "uploading"].includes(s));
  const steps = [
    { label: "Files uploaded", state: uploadedAll ? "done" : "active" },
    { label: "Extracting information", state: finished ? "done" : uploadedAll ? "active" : "todo" },
    { label: "Preparing your workspace", state: finished && !running ? "done" : "todo" },
  ];

  return (
    <main className="page">
      <section className="hero">
        <h1>Intelligent Information Understanding &amp; Processing</h1>
        <p className="lead">Upload multiple documents and let the system extract, understand, compare and organize the important information.</p>
        <p className="flow">Extract → Understand → Connect → Compare → Detect → Explain → You decide</p>
      </section>

      <section className="card">
        <h2>Documents</h2>
        <FileDropzone allowedExtensions={config.allowed_extensions} onFiles={addFiles} disabled={running} />
        {message && <div className="banner warn" role="alert">{message}</div>}
        <FileList items={items} statuses={statuses} locked={running}
          onRemove={(key) => setItems(items.filter((i) => i.key !== key))} />
        {started && <ProgressSteps steps={steps} />}
        {items.length > 0 && (
          <div className="row">
            <button className="btn primary" disabled={running} onClick={handleProcess}>
              {running ? "Processing…" : started ? "Try Again" : `Process Documents (${items.length})`}
            </button>
            <span className="muted small">Up to {config.max_files} files, {config.max_file_mb} MB each.</span>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Saved analyses</h2>
        {sessionsError && <p className="muted">Saved analyses are unavailable right now. ({sessionsError})</p>}
        {!sessionsError && sessions.length === 0 && <p className="muted">Nothing saved yet. Finish an analysis and choose Save.</p>}
        <ul className="saved-list">
          {sessions.map((s) => (
            <li key={s.id}>
              <div>
                <strong>{s.title}</strong>
                <span className="muted small">{formatDate(s.created_at)} · {s.document_count} documents · {s.analysis_count} results</span>
              </div>
              <div className="row tight">
                <button className="btn secondary" onClick={() => onOpenSaved(s.id)}>Open</button>
                <button className="btn link danger" onClick={() => onDeleteSaved(s.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
