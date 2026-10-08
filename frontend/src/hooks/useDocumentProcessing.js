import { useState } from "react";
import { api } from "../services/api";

const PARALLEL_FILES = 3; // files handled at the same time (a simple batch size)

// Uploads and processes the chosen files, and reports progress for each file.
export function useDocumentProcessing() {
  const [statuses, setStatuses] = useState({}); // key -> { stage, message, info }
  const [running, setRunning] = useState(false);

  const setStatus = (key, patch) =>
    setStatuses((old) => ({ ...old, [key]: { ...(old[key] || {}), ...patch } }));

  async function processAll(items) {
    // items: [{ key, file }]
    setRunning(true);
    setStatuses(Object.fromEntries(items.map((i) => [i.key, { stage: "waiting" }])));
    const { workspace_id: workspaceId } = await api.createWorkspace().catch((e) => {
      setRunning(false);
      throw e;
    });
    const docs = [];
    const failed = []; // names of files that could not be processed
    const queue = [...items];

    async function worker() {
      while (queue.length) {
        const { key, file } = queue.shift();
        try {
          setStatus(key, { stage: "uploading" });
          const uploaded = await api.uploadFile(workspaceId, file);
          setStatus(key, { stage: "extracting" });
          const processed = await api.processDocument(workspaceId, uploaded.id);
          if (processed.status === "processed") {
            setStatus(key, { stage: "done", info: processed, message: processed.warning });
            docs.push(processed);
          } else {
            failed.push(file.name);
            setStatus(key, { stage: "failed", message: processed.warning || "Unable to process this file" });
          }
        } catch (error) {
          failed.push(file.name);
          setStatus(key, { stage: "failed", message: error.message });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(PARALLEL_FILES, items.length) }, worker));
    setRunning(false);
    return { workspaceId, docs, failed };
  }

  return { statuses, running, processAll };
}
