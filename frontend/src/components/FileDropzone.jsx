import { useRef, useState } from "react";

export default function FileDropzone({ allowedExtensions, onFiles, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div
      className={`dropzone ${dragging ? "dragging" : ""} ${disabled ? "disabled" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <p className="drop-title">Drag and drop your documents here</p>
      <p className="muted">PDF, Word, Excel, CSV, text files and photos of documents</p>
      <button className="btn primary" disabled={disabled} onClick={() => inputRef.current.click()}>
        Upload Documents
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={allowedExtensions.join(",")}
        onChange={(e) => { onFiles(Array.from(e.target.files)); e.target.value = ""; }}
      />
    </div>
  );
}
