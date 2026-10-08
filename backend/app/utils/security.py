import hmac
import re
from pathlib import Path
from fastapi import Header
from app.config import get_settings
from app.errors import AppError


def require_api_key(x_api_key: str = Header(default="")):
    """Dependency: rejects requests without the right X-API-Key (if one is configured)."""
    expected = get_settings().app_api_key
    if expected and not hmac.compare_digest(x_api_key, expected):
        raise AppError("Access denied. Please check the application key.", 401)


def sanitize_filename(name: str) -> str:
    """Removes folders and odd characters so a name can never escape the upload folder."""
    name = Path(name or "file").name
    name = re.sub(r"[^\w.\- ()]", "_", name).strip(" .")
    return (name or "file")[:120]
