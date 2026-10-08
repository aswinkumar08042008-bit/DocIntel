// Simple pop-up used for Save / Don't Save / Cancel questions.
export default function Dialog({ title, children, buttons }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog">
        <h2>{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-buttons">
          {buttons.map((b) => (
            <button key={b.label} className={`btn ${b.kind || "secondary"}`} onClick={b.onClick} disabled={b.disabled}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
