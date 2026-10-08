export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileExtension(name) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export const ACTIONS = [
  { id: "summarize", title: "Summarize", text: "A short summary of all documents", icon: "≡" },
  { id: "compare", title: "Compare", text: "See documents side by side", icon: "⇄" },
  { id: "important", title: "Find Important Information", text: "Dates, amounts, names, requirements", icon: "★" },
  { id: "conflicts", title: "Find Differences / Conflicts", text: "Where documents disagree", icon: "⚠" },
  { id: "missing", title: "Find Missing Information", text: "What seems to be absent", icon: "?" },
  { id: "overall", title: "Overall Analysis", text: "Everything combined", icon: "◎" },
];

export const ACTION_LABEL = Object.fromEntries(ACTIONS.map((a) => [a.id, a.title]));

// Collects every "where did this come from" reference found in a result.
export function collectSources(result) {
  const list = [];
  const add = (what, source) => {
    if (source?.document) list.push({ what, document: source.document, location: source.location });
  };
  (result.important_info || []).forEach((i) => add(`${i.label}: ${i.value}`, i.source));
  (result.dates || []).forEach((i) => add(`${i.label}: ${i.value}`, i.source));
  (result.amounts || []).forEach((i) => add(`${i.label}: ${i.value}`, i.source));
  (result.conflicts || []).forEach((c) =>
    (c.values || []).forEach((v) => add(`${c.topic}: ${v.value}`, v.source?.document ? v.source : { document: v.document, location: "Location not determined" }))
  );
  return list;
}
