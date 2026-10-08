"""The AI client used by DocIntel."""

import json
import re
import time
import traceback
from app.config import get_settings
from app.errors import AppError
from app.ai import prompts

_client = None


def _get_client():
    global _client

    settings = get_settings()

    if not settings.groq_api_key:
        raise AppError(
            "The AI service is not set up yet. Add GROQ_API_KEY to the backend .env file.",
            503,
        )

    if _client is None:
        from groq import Groq

        _client = Groq(api_key=settings.groq_api_key)

    return _client


def _generate(prompt, want_json: bool) -> str:
    settings = get_settings()

    last_error = None

    for attempt in range(3):
        try:
            response = _get_client().chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                temperature=0.1,
                max_tokens=8000,
                response_format=None,
            )

            text = response.choices[0].message.content

            if text:
                return text

            last_error = "empty"

        except AppError:
            raise

        except Exception as error:
            print("GROQ ERROR:", repr(error), flush=True)
            traceback.print_exc()
            last_error = error
        time.sleep(1.5 * (attempt + 1))

    raise AppError(
        "The AI service is busy or unreachable. Please try again in a moment.",
        503,
    ) from (last_error if isinstance(last_error, Exception) else None)


def parse_json(text: str) -> dict:
    print("AI RAW RESPONSE:")
    print(text)
    print("--------------------")
    cleaned = re.sub(
        r"^```(?:json)?|```$",
        "",
        text.strip(),
        flags=re.MULTILINE,
    ).strip()

    try:
        data = json.loads(cleaned)

    except json.JSONDecodeError as error:
        print("JSON PARSE ERROR:", repr(error), flush=True)
        print("CLEANED RESPONSE REPR:", repr(cleaned), flush=True)
        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end == -1:
            raise AppError(
                "The AI gave an unclear answer. Please try again.",
                502,
            )

        try:
            data = json.loads(cleaned[start : end + 1])

        except json.JSONDecodeError:
            raise AppError(
                "The AI gave an unclear answer. Please try again.",
                502,
            )

    return data if isinstance(data, dict) else {}


def ask_json(prompt: str) -> dict:
    return parse_json(
        _generate(prompt, want_json=True)
    )


def ask_text(prompt: str) -> str:
    return _generate(prompt, want_json=False)


def read_file_with_ai(
    data: bytes,
    mime_type: str,
    pages: bool = False,
) -> str:

    prompt = prompts.OCR_PROMPT.format(
        pages=prompts.OCR_PAGES_HINT if pages else ""
    )

    # Groq text models cannot directly receive arbitrary PDF/image bytes
    # in the same way Gemini's multimodal API did.
    # The existing document extraction pipeline should therefore provide
    # text to the AI instead of sending raw file bytes here.

    raise AppError(
        "AI file reading is not available with the current Groq setup.",
        503,
    )