"""Request/response models. Every field has a default so a slightly incomplete AI answer never crashes the app."""
from typing import Literal
from pydantic import BaseModel, Field

ActionName = Literal["summarize", "compare", "important", "conflicts", "missing", "overall"]


class SourceRef(BaseModel):
    document: str = ""
    location: str = "Location not determined"


class InfoItem(BaseModel):
    label: str = ""
    value: str = ""
    source: SourceRef = Field(default_factory=SourceRef)


class ConflictValue(BaseModel):
    document: str = ""
    value: str = ""
    source: SourceRef = Field(default_factory=SourceRef)


class Conflict(BaseModel):
    topic: str = ""
    values: list[ConflictValue] = []
    difference: str = ""
    note: str = "Please verify which value is correct."


class MissingItem(BaseModel):
    item: str = ""
    note: str = "Not found in the uploaded documents."


class ComparisonRow(BaseModel):
    information: str = ""
    values: dict[str, str] = {}      # document name -> value
    difference: str = ""


class Comparison(BaseModel):
    documents: list[str] = []
    rows: list[ComparisonRow] = []


class AnalysisResult(BaseModel):
    summary: list[str] = []
    important_info: list[InfoItem] = []
    dates: list[InfoItem] = []
    amounts: list[InfoItem] = []
    comparison: Comparison = Field(default_factory=Comparison)
    findings: list[str] = []
    conflicts: list[Conflict] = []
    missing: list[MissingItem] = []
    simple_summary: list[str] = []
    notes: list[str] = []            # honest limits, e.g. "Document X could not be read fully"


class AnalyzeRequest(BaseModel):
    workspace_id: str
    actions: list[ActionName] = Field(min_length=1)
    instruction: str = ""            # optional extra wish from the user


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str
    sources: list[SourceRef] = []


class AskRequest(BaseModel):
    workspace_id: str
    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = []


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceRef] = []


class ProcessRequest(BaseModel):
    workspace_id: str
    document_id: str


class StoredAnalysis(BaseModel):
    type: str                         # e.g. "Compare + Find Missing Information"
    result: AnalysisResult


class SaveSessionRequest(BaseModel):
    workspace_id: str
    title: str = Field(default="Untitled analysis", max_length=200)
    analyses: list[StoredAnalysis] = []
    chat: list[ChatMessage] = []
