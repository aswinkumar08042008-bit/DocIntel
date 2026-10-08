import { useEffect, useState } from "react";
import ChatBox from "../components/ChatBox";
import ResultsView from "../components/ResultsView";
import { api } from "../services/api";
import { formatDate, formatSize } from "../utils/format";

// Read-only view of an analysis that was saved earlier.
export default function SavedSessionPage({ sessionId, onBack }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSession(sessionId).then(setSession).catch((e) => setError(e.message));
  }, [sessionId]);

  return (
    <main className="page wide">
      <button className="btn secondary" onClick={onBack}>← Back to home</button>
      {error && <div className="banner error">{error}</div>}
      {!session && !error && <p><span className="spinner" /> Loading…</p>}
      {session && (
        <>
          <h1 className="h1-small">{session.title}</h1>
          <p className="muted">Saved {formatDate(session.created_at)}</p>
          <div className="layout">
            <div className="col-main">
              {session.analyses.length ? <ResultsView analyses={session.analyses} /> : <section className="card"><p>No results were saved.</p></section>}
            </div>
            <aside className="col-side">
              {session.chat.length > 0 && <ChatBox messages={session.chat} readOnly thinking={false} />}
              <section className="card">
                <h2>Documents</h2>
                <ul className="doc-list">
                  {session.documents.map((d, i) => (
                    <li key={i}>{d.name} <span className="muted small">{d.file_type} · {formatSize(d.size_bytes)}</span></li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
