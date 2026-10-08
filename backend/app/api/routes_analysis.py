from fastapi import APIRouter, Depends
from app.schemas.analysis import AnalysisResult, AnalyzeRequest, AskRequest, AskResponse
from app.services import analysis_service
from app.utils.security import require_api_key

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/analyze", response_model=AnalysisResult)
def analyze(request: AnalyzeRequest):
    """Runs one or several actions (summarize, compare, ...) in a single AI call."""
    return analysis_service.analyze(request.workspace_id, request.actions, request.instruction)


@router.post("/compare", response_model=AnalysisResult)
def compare(request: AnalyzeRequest):
    return analysis_service.analyze(request.workspace_id, ["compare"], request.instruction)


@router.post("/summarize", response_model=AnalysisResult)
def summarize(request: AnalyzeRequest):
    return analysis_service.analyze(request.workspace_id, ["summarize"], request.instruction)


@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    return analysis_service.ask(request.workspace_id, request.question, request.history)
