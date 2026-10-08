"""Checks that an upload is an allowed type, not empty, not too big, and really looks like that type."""
from pathlib import Path
from app.config import get_settings
from app.errors import AppError

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png"}

# First bytes of real files ("magic numbers"). Plain text types have none.
MAGIC = {
    ".pdf": [b"%PDF"],
    ".docx": [b"PK\x03\x04"],
    ".xlsx": [b"PK\x03\x04"],
    ".xls": [b"\xd0\xcf\x11\xe0"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG"],
}


def validate_upload(filename: str, data: bytes) -> str:
    """Returns the lower-case extension, or raises a friendly AppError."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise AppError("This file type is not supported. Use PDF, DOCX, TXT, XLSX, XLS, CSV, JPG or PNG.")
    if len(data) == 0:
        raise AppError("This file is empty.")
    limit_mb = get_settings().max_file_mb
    if len(data) > limit_mb * 1024 * 1024:
        raise AppError(f"This file is larger than {limit_mb} MB.")
    signatures = MAGIC.get(ext)
    if signatures and not any(data.startswith(s) for s in signatures):
        raise AppError("This file looks damaged or is not really a " + ext[1:].upper() + " file.")
    return ext
