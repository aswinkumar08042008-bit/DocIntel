import { useState } from "react";
import { ACTIONS } from "../utils/format";

export default function NextStep({ onRun, onAskQuestion, onExit, running }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card next-step">
      <h2>What would you like to do next?</h2>
      <div className="row">
        <button className="btn primary" onClick={() => setOpen(!open)}>Further Proceed</button>
        <button className="btn secondary" onClick={onExit}>Exit</button>
      </div>
      {open && (
        <div className="chip-row">
          <button className="chip" onClick={onAskQuestion}>Ask another question</button>
          {ACTIONS.map((a) => (
            <button key={a.id} className="chip" disabled={running} onClick={() => onRun([a.id])}>
              {a.id === "compare" ? "Compare again" : a.title}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
