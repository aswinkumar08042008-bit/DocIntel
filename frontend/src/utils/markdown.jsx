// Tiny markdown renderer for chat answers (headings, bullets, **bold**, tables, paragraphs).
// Written by hand so the project needs no extra libraries.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

const isTableRow = (line) => line.trim().startsWith("|") && line.trim().endsWith("|");
const isDivider = (line) => /^\|?[\s:|-]+\|?$/.test(line.trim());
const cells = (line) => line.trim().slice(1, -1).split("|").map((c) => c.trim());

export function renderMarkdown(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { if (!isDivider(lines[i])) rows.push(cells(lines[i])); i++; }
      blocks.push(
        <div className="table-wrap" key={blocks.length}>
          <table>
            <thead><tr>{rows[0].map((c, k) => <th key={k}>{inline(c)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    } else if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*•]\s+/, "")); i++; }
      blocks.push(<ul key={blocks.length}>{items.map((t, k) => <li key={k}>{inline(t)}</li>)}</ul>);
    } else if (/^#{1,4}\s+/.test(line)) {
      blocks.push(<h4 key={blocks.length}>{inline(line.replace(/^#{1,4}\s+/, ""))}</h4>);
      i++;
    } else {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>);
      i++;
    }
  }
  return blocks;
}
