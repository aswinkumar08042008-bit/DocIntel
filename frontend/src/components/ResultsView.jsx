import { useEffect, useState } from "react";
import { collectSources } from "../utils/format";

function Source({ source }) {
  if (!source?.document) return <span className="source-chip muted">Source not determined</span>;
  return <span className="source-chip">{source.document} — {source.location || "Location not determined"}</span>;
}

function Bullets({ items }) {
  return <ul className="bullets">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}

function InfoList({ items, icon }) {
  return (
    <ul className="info-list">
      {items.map((it, i) => (
        <li key={i}>
          <div><span className="info-icon">{icon}</span> <strong>{it.value}</strong> — {it.label}</div>
          <Source source={it.source} />
        </li>
      ))}
    </ul>
  );
}

function ComparisonTable({ comparison }) {
  const docs = comparison.documents?.length ? comparison.documents : [...new Set(comparison.rows.flatMap((r) => Object.keys(r.values || {})))];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Information</th>{docs.map((d) => <th key={d}>{d}</th>)}<th>Difference</th></tr>
        </thead>
        <tbody>
          {comparison.rows.map((row, i) => (
            <tr key={i}>
              <td><strong>{row.information}</strong></td>
              {docs.map((d) => <td key={d}>{row.values?.[d] ?? "Not found"}</td>)}
              <td>{row.difference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConflictCard({ conflict }) {
  return (
    <div className="conflict">
      <h4>⚠️ Potential Conflict — {conflict.topic}</h4>
      <ul>
        {conflict.values.map((v, i) => (
          <li key={i}><strong>{v.document}:</strong> {v.value} <Source source={v.source?.document ? v.source : { document: v.document }} /></li>
        ))}
      </ul>
      {conflict.difference && <p><strong>Difference:</strong> {conflict.difference}</p>}
      <p className="muted">{conflict.note || "Please verify which value is correct."}</p>
    </div>
  );
}

export default function ResultsView({ analyses }) {
  const [active, setActive] = useState(analyses.length - 1);
  const [tab, setTab] = useState(null);
  useEffect(() => { setActive(analyses.length - 1); setTab(null); }, [analyses.length]);

  const current = analyses[Math.min(active, analyses.length - 1)];
  if (!current) return null;
  const r = current.result;
  const sources = collectSources(r);
  const summaryItems = r.summary.length ? r.summary : r.simple_summary;

  // Only show tabs that have something to show
  const tabs = [
    { id: "summary", label: "Summary", count: summaryItems.length + (r.comparison.rows.length ? 0 : r.findings.length) },
    { id: "important", label: "Important Information", count: r.important_info.length },
    { id: "dates", label: "Important Deadlines", count: r.dates.length },
    { id: "amounts", label: "Important Amounts", count: r.amounts.length },
    { id: "comparison", label: "Comparison", count: r.comparison.rows.length },
    { id: "conflicts", label: "Conflicts / Warnings", count: r.conflicts.length },
    { id: "missing", label: "Missing Information", count: r.missing.length },
    { id: "sources", label: "Sources", count: sources.length },
  ].filter((t) => t.count > 0);
  const shown = tabs.find((t) => t.id === tab) || tabs[0];

  return (
    <section className="card results">
      <h2>Results</h2>
      {analyses.length > 1 && (
        <div className="chip-row">
          {analyses.map((a, i) => (
            <button key={i} className={`chip ${i === active ? "on" : ""}`} onClick={() => { setActive(i); setTab(null); }}>
              {i + 1}. {a.type}
            </button>
          ))}
        </div>
      )}
      <p className="muted small">{current.type}</p>

      {r.conflicts.length > 0 && (
        <div className="banner warn">⚠️ {r.conflicts.length} possible conflict{r.conflicts.length > 1 ? "s" : ""} found. Please check the Conflicts tab.</div>
      )}

      {tabs.length > 0 ? (
        <>
          <div className="tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={shown.id === t.id}
                className={`tab ${shown.id === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
                {t.label} <span className="count">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="tab-panel">
            {shown.id === "summary" && (
              <>
                <h3>Summary</h3><Bullets items={summaryItems} />
                {!r.comparison.rows.length && r.findings.length > 0 && (<><h3>Important Findings</h3><Bullets items={r.findings} /></>)}
              </>
            )}
            {shown.id === "important" && <InfoList items={r.important_info} icon="★" />}
            {shown.id === "dates" && <InfoList items={r.dates} icon="📅" />}
            {shown.id === "amounts" && <InfoList items={r.amounts} icon="💰" />}
            {shown.id === "comparison" && (
              <>
                <h3>Comparison</h3><ComparisonTable comparison={r.comparison} />
                {r.findings.length > 0 && (<><h3>Important Findings</h3><Bullets items={r.findings} /></>)}
                {r.simple_summary.length > 0 && (<><h3>Simple Summary</h3><Bullets items={r.simple_summary} /></>)}
              </>
            )}
            {shown.id === "conflicts" && r.conflicts.map((c, i) => <ConflictCard key={i} conflict={c} />)}
            {shown.id === "missing" && (
              <>
                {r.missing.map((m, i) => (
                  <div key={i} className="missing"><strong>⚠️ {m.item}</strong><p className="muted">{m.note}</p></div>
                ))}
                <p className="muted small">“Not found” only means we did not find it in the uploaded documents. It may exist elsewhere.</p>
              </>
            )}
            {shown.id === "sources" && (
              <ul className="info-list">
                {sources.map((s, i) => <li key={i}><div>{s.what}</div><Source source={s} /></li>)}
              </ul>
            )}
          </div>
        </>
      ) : (
        <p>{r.notes[0] || "Nothing was found for this request in the uploaded documents."}</p>
      )}
      {r.notes.length > 0 && tabs.length > 0 && (
        <div className="banner info"><strong>Please note</strong><Bullets items={r.notes} /></div>
      )}
    </section>
  );
}
