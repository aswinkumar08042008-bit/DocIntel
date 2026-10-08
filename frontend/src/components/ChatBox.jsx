import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "../utils/markdown.jsx";

const IDEAS = [
  "What are the important deadlines?",
  "Are there any contradictions?",
  "What information is missing?",
  "Summarize everything in 5 points.",
];

export default function ChatBox({ messages, onSend, thinking, readOnly = false, inputRef }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages, thinking]);

  function submit(value) {
    const question = value.trim();
    if (!question || thinking) return;
    setText("");
    onSend(question);
  }

  return (
    <section className="card chat">
      <h2>Ask about your documents</h2>
      <div className="chat-log" aria-live="polite">
        {!messages.length && !readOnly && (
          <div className="chat-empty">
            <p className="muted">Try one of these:</p>
            {IDEAS.map((q) => (
              <button key={q} className="chip" onClick={() => submit(q)} disabled={thinking}>{q}</button>
            ))}
          </div>
        )}
        {messages.map((m, index) => (
          <div key={index} className={`bubble ${m.role} ${m.error ? "error" : ""}`}>
            {m.role === "assistant" ? renderMarkdown(m.text) : <p>{m.text}</p>}
            {m.sources?.length > 0 && (
              <div className="source-row">
                {m.sources.map((s, k) => <span key={k} className="source-chip">{s.document} — {s.location}</span>)}
              </div>
            )}
          </div>
        ))}
        {thinking && <div className="bubble assistant"><span className="spinner" /> Reading your documents…</div>}
        <div ref={endRef} />
      </div>
      {!readOnly && (
        <div className="chat-input">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(text)}
            placeholder="Ask something about your documents..."
            maxLength={2000}
            aria-label="Your question"
          />
          <button className="btn primary" onClick={() => submit(text)} disabled={thinking || !text.trim()}>Send</button>
        </div>
      )}
    </section>
  );
}
