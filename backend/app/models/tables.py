"""Database tables. They mirror database/schema.sql."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.db import Base

Json = JSON().with_variant(JSONB(), "postgresql")


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(120), default="Demo User")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    sessions = relationship("AnalysisSession", back_populates="user")


class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    chat_history: Mapped[list] = mapped_column(Json, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    user = relationship("User", back_populates="sessions")
    documents = relationship("Document", back_populates="session", cascade="all, delete-orphan")
    results = relationship("AnalysisResult", back_populates="session", cascade="all, delete-orphan",
                           order_by="AnalysisResult.created_at")


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("analysis_sessions.id", ondelete="CASCADE"))
    file_name: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(20))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    session = relationship("AnalysisSession", back_populates="documents")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("analysis_sessions.id", ondelete="CASCADE"))
    analysis_type: Mapped[str] = mapped_column(String(120))
    summary: Mapped[list] = mapped_column(Json, default=list)
    comparison: Mapped[dict] = mapped_column(Json, default=dict)
    important_findings: Mapped[list] = mapped_column(Json, default=list)
    conflicts: Mapped[list] = mapped_column(Json, default=list)
    missing_information: Mapped[list] = mapped_column(Json, default=list)
    full_result: Mapped[dict] = mapped_column(Json, default=dict)  # everything, as shown on screen
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    session = relationship("AnalysisSession", back_populates="results")
