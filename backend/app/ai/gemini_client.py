"""The only file that talks to the Gemini API."""
import json
import re
import time
from app.config import get_settings
from app.errors import AppError
from app.ai import prompts

_client = None


def _get_client():
    global _client
    settings = get_settings()
    if not settings.gemini_api_key:
        raise AppError("The AI service is not set up yet. Add GEMINI_API_KEY to the backend .env file.", 503)
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _generate(contents, want_json: bool) -> str:
    """Calls Gemini with 3 tries, because the network and the API can fail briefly."""
    from google.genai import types
    config = types.GenerateContentConfig(
        temperature=0.1,                       # low = factual and consistent
        response_mime_type="application/json" if want_json else "text/plain",
    )
    last_error = None
    for attempt in range(3):
        try:
            response = _get_client().models.generate_content(
                model=get_settings().gemini_model, contents=contents, config=config)
            if response.text:
                return response.text
            last_error = "empty"
        except AppError:
            raise
        except Exception as error:             # network, quota, safety block, ...
            last_error = error
        time.sleep(1.5 * (attempt + 1))
    raise AppError("The AI service is busy or unreachable. Please try again in a moment.", 503) from (
        last_error if isinstance(last_error, Exception) else None)


def parse_json(text: str) -> dict:
    """Gemini sometimes wraps JSON in ```json fences; remove them and parse."""
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start == -1 or end == -1:
            raise AppError("The AI gave an unclear answer. Please try again.", 502)
        try:
            data = json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError:
            raise AppError("The AI gave an unclear answer. Please try again.", 502)
    return data if isinstance(data, dict) else {}


def ask_json(prompt: str) -> dict:
    return parse_json(_generate(prompt, want_json=True))


def ask_text(prompt: str) -> str:
    return _generate(prompt, want_json=False)


def read_file_with_ai(data: bytes, mime_type: str, pages: bool = False) -> str:
    """OCR for images and scanned PDFs."""
    from google.genai import types
    prompt = prompts.OCR_PROMPT.format(pages=prompts.OCR_PAGES_HINT if pages else "")
    try:
        return _generate([types.Part.from_bytes(data=data, mime_type=mime_type), prompt], want_json=False)
    except AppError as error:
        if error.status_code == 503 and "not set up" not in error.message:
            raise AppError("We couldn't read the text in this file (OCR failed). Please try again.", 503)
        raise
