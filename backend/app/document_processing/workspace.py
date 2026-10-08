"""
Temporary workspace = the documents the user is working on right now.
It lives in memory (and uploaded files in a private folder) until the user exits.
Nothing goes to PostgreSQL unless the user clicks Save.
"""
import shutil
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from app.config import get_settings
from app.errors import AppError


@dataclass
class WorkDoc:
    id: str
    name: str
    file_type: str
    size_bytes: int
    path: Path
    status: str = "uploaded"          # uploaded | processed | failed
    text: str = ""
    page_count: int | None = None
    warning: str = ""
    digest: str = ""                  # short version used when there are too many documents


_workspaces: dict[str, dict[str, WorkDoc]] = {}
_lock = threading.Lock()


def _folder(workspace_id: str) -> Path:
    return Path(get_settings().upload_dir) / workspace_id


def create_workspace() -> str:
    workspace_id = uuid.uuid4().hex
    with _lock:
        _workspaces[workspace_id] = {}
    _folder(workspace_id).mkdir(parents=True, exist_ok=True)
    return workspace_id


def get_docs(workspace_id: str) -> dict[str, WorkDoc]:
    docs = _workspaces.get(workspace_id)
    if docs is None:
        raise AppError("Your session has expired. Please upload the documents again.", 404)
    return docs


def add_doc(workspace_id: str, doc: WorkDoc):
    docs = get_docs(workspace_id)
    if len(docs) >= get_settings().max_files:
        raise AppError(f"You can upload up to {get_settings().max_files} documents at a time.", 400)
    docs[doc.id] = doc


def get_doc(workspace_id: str, doc_id: str) -> WorkDoc:
    doc = get_docs(workspace_id).get(doc_id)
    if not doc:
        raise AppError("Document not found.", 404)
    return doc


def remove_doc(workspace_id: str, doc_id: str):
    doc = get_docs(workspace_id).pop(doc_id, None)
    if doc:
        doc.path.unlink(missing_ok=True)


def delete_workspace(workspace_id: str):
    with _lock:
        _workspaces.pop(workspace_id, None)
    shutil.rmtree(_folder(workspace_id), ignore_errors=True)


def upload_path(workspace_id: str, doc_id: str, ext: str) -> Path:
    folder = _folder(workspace_id)
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{doc_id}{ext}"      # stored under a random name, never the user's name
