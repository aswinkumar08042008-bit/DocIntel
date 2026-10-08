from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.analysis import SaveSessionRequest
from app.services import session_service
from app.utils.security import require_api_key

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/save-session")
def save_session(request: SaveSessionRequest, db: Session = Depends(get_db)):
    return session_service.save_session(db, request)


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db)):
    return session_service.list_sessions(db)


@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    return session_service.get_session(db, session_id)


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session_service.delete_session(db, session_id)
    return {"ok": True}
