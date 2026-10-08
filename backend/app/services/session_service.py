"""Saving and loading analysis sessions in PostgreSQL."""
import uuid
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.document_processing import workspace
from app.errors import AppError
from app.models.tables import AnalysisResult, AnalysisSession, Document, User
from app.schemas.analysis import SaveSessionRequest

DEMO_EMAIL = "demo@docinsight.local"   # no login screen in this version, so everyone is the demo user


def _db_error() -> AppError:
    return AppError("We couldn't reach the database. Please try again.", 503)


def _demo_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if not user:
        user = User(email=DEMO_EMAIL, name="Demo User")
        db.add(user)
        db.flush()
    return user


def _uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise AppError("Saved analysis not found.", 404)


def save_session(db: Session, request: SaveSessionRequest) -> dict:
    docs = [d for d in workspace.get_docs(request.workspace_id).values() if d.status == "processed"]
    if not docs:
        raise AppError("There is nothing to save yet.")
    try:
        session = AnalysisSession(user_id=_demo_user(db).id, title=request.title.strip() or "Untitled analysis",
                                  chat_history=[m.model_dump() for m in request.chat])
        db.add(session)
        db.flush()
        for d in docs:
            db.add(Document(session_id=session.id, file_name=d.name, file_type=d.file_type,
                            size_bytes=d.size_bytes, page_count=d.page_count, extracted_text=d.text))
        for item in request.analyses:
            r = item.result
            db.add(AnalysisResult(
                session_id=session.id, analysis_type=item.type,
                summary=r.summary or r.simple_summary,
                comparison=r.comparison.model_dump(),
                important_findings=r.findings,
                conflicts=[c.model_dump() for c in r.conflicts],
                missing_information=[m.model_dump() for m in r.missing],
                full_result=r.model_dump()))
        db.commit()
        return {"id": str(session.id), "title": session.title}
    except SQLAlchemyError:
        db.rollback()
        raise _db_error()


def list_sessions(db: Session) -> list[dict]:
    try:
        rows = db.scalars(select(AnalysisSession).order_by(AnalysisSession.created_at.desc()).limit(100)).all()
        return [{"id": str(s.id), "title": s.title, "created_at": s.created_at.isoformat(),
                 "document_count": len(s.documents), "analysis_count": len(s.results),
                 "document_names": [d.file_name for d in s.documents]} for s in rows]
    except SQLAlchemyError:
        raise _db_error()


def get_session(db: Session, session_id: str) -> dict:
    try:
        s = db.get(AnalysisSession, _uuid(session_id))
        if not s:
            raise AppError("Saved analysis not found.", 404)
        return {
            "id": str(s.id), "title": s.title, "created_at": s.created_at.isoformat(),
            "documents": [{"name": d.file_name, "file_type": d.file_type, "size_bytes": d.size_bytes,
                           "page_count": d.page_count} for d in s.documents],
            "analyses": [{"type": r.analysis_type, "result": r.full_result} for r in s.results],
            "chat": s.chat_history or [],
        }
    except SQLAlchemyError:
        raise _db_error()


def delete_session(db: Session, session_id: str):
    try:
        s = db.get(AnalysisSession, _uuid(session_id))
        if not s:
            raise AppError("Saved analysis not found.", 404)
        db.delete(s)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise _db_error()
