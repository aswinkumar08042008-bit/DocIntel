// steps: [{ label, state: "done" | "active" | "todo" }]
export default function ProgressSteps({ steps }) {
  const symbol = { done: "✓", active: "●", todo: "○" };
  return (
    <ul className="steps">
      {steps.map((s) => (
        <li key={s.label} className={`step ${s.state}`}>
          <span className="step-mark">{symbol[s.state]}</span>
          {s.label}
        </li>
      ))}
    </ul>
  );
}
