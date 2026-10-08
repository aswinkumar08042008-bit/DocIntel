import uuid
from fastapi import APIRouter, Depends, File, Form, UploadFile
from app.ai import gemini_client
from app.config import get_settings
from app.document_processing import workspace
from app.document_processing.extractors import extract
from app.document_processing.validators import ALLOWED_EXTENSIONS, validate_upload
from app.errors import AppError
from app.schemas.analysis import ProcessRequest
from app.utils.security import require_api_key, sanitize_filename

router = APIRouter(dependencies=[Depends(require_api_key)])


def _doc_info(doc: workspace.WorkDoc) -> dict:
    return {"id": doc.id, "name": doc.name, "file_type": doc.file_type, "size_bytes": doc.size_bytes,
            "status": doc.status, "page_count": doc.page_count, "warning": doc.warning,
            "characters": len(doc.text)}


@router.get("/config")
def get_config():
    s = get_settings()
    return {"max_files": s.max_files, "max_file_mb": s.max_file_mb,
            "allowed_extensions": sorted(ALLOWED_EXTENSIONS)}


@router.post("/workspaces")
def new_workspace():
    return {"workspace_id": workspace.create_workspace()}


@router.delete("/workspaces/{workspace_id}")
def clear_workspace(workspace_id: str):
    """Used by 'Don't Save' / Exit: removes temporary files and extracted text."""
    workspace.delete_workspace(workspace_id)
    return {"ok": True}


@router.post("/upload")
async def upload(workspace_id: str = Form(...), file: UploadFile = File(...)):
    """Step 1: receive and check one file. Called once per file so the screen can show progress."""
    limit = get_settings().max_file_mb * 1024 * 1024
    data = await file.read(limit + 1)                    # never read more than the limit
    name = sanitize_filename(file.filename or "file")
    ext = validate_upload(name, data)
    doc_id = uuid.uuid4().hex
    path = workspace.upload_path(workspace_id, doc_id, ext)
    path.write_bytes(data)                               # saved under a random name; never executed
    doc = workspace.WorkDoc(id=doc_id, name=name, file_type=ext[1:].upper(), size_bytes=len(data), path=path)
    try:
        workspace.add_doc(workspace_id, doc)
    except AppError:
        path.unlink(missing_ok=True)
        raise
    return _doc_info(doc)


@router.post("/process")
def process(request: ProcessRequest):
    """Step 2: read the text out of one uploaded file. A failure only affects this file."""
    doc = workspace.get_doc(request.workspace_id, request.document_id)
    ext = "." + doc.file_type.lower()
    try:
        doc.text, doc.page_count, doc.warning = extract(doc.path, ext, ocr_function=gemini_client.read_file_with_ai)
        doc.status = "processed"
    except AppError as error:
        doc.status, doc.warning = "failed", error.message
    except Exception:
        doc.status, doc.warning = "failed", "We couldn't process this document. Please check the file and try again."
    return _doc_info(doc)


@router.delete("/workspaces/{workspace_id}/documents/{document_id}")
def remove_document(workspace_id: str, document_id: str):
    workspace.remove_doc(workspace_id, document_id)
    return {"ok": True}
