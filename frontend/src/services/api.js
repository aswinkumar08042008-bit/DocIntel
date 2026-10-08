// All calls to the backend live here, so components never deal with fetch() details.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY || "";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(BASE_URL + path, {
      ...options,
      headers: { "X-API-Key": API_KEY, ...(options.headers || {}) },
    });
  } catch {
    throw new Error("We can't reach the server. Please check your connection and that the backend is running.");
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    /* response had no JSON body */
  }
  if (!response.ok) {
    throw new Error(data?.detail || "Something went wrong. Please try again.");
  }
  return data;
}

const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  getConfig: () => request("/config"),
  createWorkspace: () => request("/workspaces", { method: "POST" }),
  uploadFile: (workspaceId, file) => {
    const form = new FormData();
    form.append("workspace_id", workspaceId);
    form.append("file", file);
    return request("/upload", { method: "POST", body: form });
  },
  processDocument: (workspaceId, documentId) =>
    request("/process", json({ workspace_id: workspaceId, document_id: documentId })),
  analyze: (workspaceId, actions, instruction = "") =>
    request("/analyze", json({ workspace_id: workspaceId, actions, instruction })),
  ask: (workspaceId, question, history) =>
    request("/ask", json({ workspace_id: workspaceId, question, history })),
  saveSession: (payload) => request("/save-session", json(payload)),
  listSessions: () => request("/sessions"),
  getSession: (id) => request(`/sessions/${id}`),
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),
  clearWorkspace: (workspaceId) => request(`/workspaces/${workspaceId}`, { method: "DELETE" }),
};
