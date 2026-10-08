"""Prepares the documents for the AI and turns AI answers into clean results."""
from app.ai import gemini_client, prompts
from app.config import get_settings
from app.document_processing import workspace
from app.errors import AppError
from app.schemas.analysis import AnalysisResult, AskResponse, ChatMessage, SourceRef

ACTION_LABELS = {
    "summarize": "Summarize", "compare": "Compare", "important": "Find Important Information",
    "conflicts": "Find Differences / Conflicts", "missing": "Find Missing Information",
    "overall": "Overall Analysis",
}


def action_title(actions: list[str]) -> str:
    return " + ".join(ACTION_LABELS[a] for a in actions)


def _processed_docs(workspace_id: str):
    docs = [d for d in workspace.get_docs(workspace_id).values() if d.status == "processed"]
    if not docs:
        raise AppError("There are no processed documents yet. Please process your documents first.")
    return docs


def build_documents_text(workspace_id: str) -> str:
    """
    Joins all documents into one text. If the total is too big for one request,
    each document is replaced by a short fact sheet (digest) that keeps every date, amount and source marker.
    """
    docs = _processed_docs(workspace_id)
    limit = get_settings().max_context_chars
    use_digest = sum(len(d.text) for d in docs) > limit
    blocks = []
    for doc in docs:
        body = doc.text
        if use_digest:
            if not doc.digest:
                doc.digest = gemini_client.ask_text(prompts.DIGEST_PROMPT.format(text=doc.text[:limit]))
            body = doc.digest
        blocks.append(f"=== DOCUMENT: {doc.name} ===\n{body}\n=== END OF {doc.name} ===")
    return "\n\n".join(blocks)


def analyze(workspace_id: str, actions: list[str], instruction: str = "") -> AnalysisResult:
    documents_text = build_documents_text(workspace_id)
    prompt = prompts.build_analysis_prompt(actions, documents_text, instruction)
    result = AnalysisResult.model_validate(_safe(gemini_client.ask_json(prompt)))
    # Honest warnings about documents that were read only partly
    for doc in _processed_docs(workspace_id):
        if doc.warning and "paragraph numbers" not in doc.warning:
            result.notes.append(f"{doc.name}: {doc.warning}")
    failed = [d.name for d in workspace.get_docs(workspace_id).values() if d.status == "failed"]
    if failed:
        result.notes.append("Not included because they could not be read: " + ", ".join(failed))
    return result


def ask(workspace_id: str, question: str, history: list[ChatMessage]) -> AskResponse:
    documents_text = build_documents_text(workspace_id)
    history_text = "\n".join(f"{m.role.upper()}: {m.text}" for m in history[-8:])
    data = gemini_client.ask_json(prompts.build_ask_prompt(question, documents_text, history_text))
    answer = str(data.get("answer") or "Not found in the uploaded documents.")
    sources = []
    for item in data.get("sources") or []:
        if isinstance(item, dict):
            sources.append(SourceRef(document=str(item.get("document", "")),
                                     location=str(item.get("location") or "Location not determined")))
    return AskResponse(answer=answer, sources=sources)


def _safe(data: dict) -> dict:
    """Drops values of the wrong type so one odd AI field cannot break the whole result."""
    try:
        AnalysisResult.model_validate(data)
        return data
    except Exception:
        clean = {}
        for key in AnalysisResult.model_fields:
            if key in data:
                try:
                    AnalysisResult.model_validate({key: data[key]})
                    clean[key] = data[key]
                except Exception:
                    pass
        return clean
