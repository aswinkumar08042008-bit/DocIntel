import { fileExtension, formatSize } from "../utils/format";

const STAGE_TEXT = {
  waiting: "Waiting…",
  uploading: "Uploading…",
  extracting: "Extracting information…",
  done: "Ready",
  failed: "Unable to process this file",
};

export default function FileList({ items, statuses, onRemove, locked }) {
  if (!items.length) return null;
  return (
    <ul className="file-list">
      {items.map(({ key, file }) => {
        const status = statuses[key];
        const stage = status?.stage;
        return (
          <li key={key} className={`file-row ${stage === "failed" ? "failed" : ""}`}>
            <span className="file-badge">{fileExtension(file.name).replace(".", "").toUpperCase()}</span>
            <div className="file-main">
              <span className="file-name">{file.name}</span>
              <span className="muted small">
                {formatSize(file.size)}
                {stage && ` · ${STAGE_TEXT[stage]}`}
              </span>
              {stage === "failed" && status.message && <span className="small error-text">{status.message}</span>}
              {stage === "done" && status.message && <span className="small warn-text">{status.message}</span>}
            </div>
            <span className={`file-state ${stage || "selected"}`}>
              {stage === "done" ? "✓" : stage === "failed" ? "✕" : stage ? <span className="spinner" /> : ""}
            </span>
            {!locked && <button className="btn link" onClick={() => onRemove(key)}>Remove</button>}
          </li>
        );
      })}
    </ul>
  );
}
