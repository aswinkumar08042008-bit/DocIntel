import { ACTIONS } from "../utils/format";

export default function ActionPicker({ selected, onToggle, onRun, running }) {
  return (
    <section className="card">
      <h2>What would you like to do?</h2>
      <p className="muted">Choose one or more options. You can also type a question in the chat.</p>
      <div className="action-grid">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            className={`action-card ${selected.includes(a.id) ? "selected" : ""}`}
            onClick={() => onToggle(a.id)}
            disabled={running}
            aria-pressed={selected.includes(a.id)}
          >
            <span className="action-icon">{a.icon}</span>
            <span className="action-title">{a.title}</span>
            <span className="muted small">{a.text}</span>
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" onClick={() => onRun(selected)} disabled={running || !selected.length}>
          {running ? "Working…" : `Run ${selected.length ? `(${selected.length})` : ""}`}
        </button>
        <span className="muted small">Ask Questions: use the chat box.</span>
      </div>
    </section>
  );
}
