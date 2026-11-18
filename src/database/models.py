"""SQLAlchemy ORM models for CodeKnot document, page, and chunk storage."""

import json
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class ProcessingStatus(str, Enum):
    """Document ingestion processing status values."""
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class AccessLevel(str, Enum):
    """Document access control boundary values."""
    PRIVATE = "PRIVATE"
    COURSE_SHARED = "COURSE_SHARED"


class Document(Base):
    """SQLAlchemy model representing an uploaded or course-provided document."""

    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, default=lambda: f"doc_{uuid.uuid4().hex[:16]}")
    owner_user_id = Column(String(64), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(64), nullable=False, default="application/pdf")
    source_type = Column(String(64), nullable=False, default="PDF")
    access_level = Column(String(32), nullable=False, default=AccessLevel.PRIVATE.value, index=True)
    file_path = Column(String(512), nullable=True)
    processing_status = Column(
        String(32),
        nullable=False,
        default=ProcessingStatus.UPLOADED.value,
        index=True,
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    pages = relationship(
        "DocumentPage",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentPage.page_number",
    )
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert Document record to a dictionary."""
        return {
            "id": self.id,
            "owner_user_id": self.owner_user_id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "content_type": self.content_type,
            "source_type": self.source_type,
            "access_level": self.access_level,
            "file_path": self.file_path,
            "processing_status": self.processing_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "page_count": len(self.pages) if self.pages else 0,
            "chunk_count": len(self.chunks) if self.chunks else 0,
        }


class DocumentPage(Base):
    """SQLAlchemy model representing an extracted page of a document."""

    __tablename__ = "document_pages"

    id = Column(String(64), primary_key=True, default=lambda: f"page_{uuid.uuid4().hex[:16]}")
    document_id = Column(
        String(64),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_number = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    document = relationship("Document", back_populates="pages")
    chunks = relationship(
        "DocumentChunk",
        back_populates="page",
        foreign_keys="DocumentChunk.page_id",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert DocumentPage record to a dictionary."""
        return {
            "id": self.id,
            "document_id": self.document_id,
            "page_number": self.page_number,
            "text": self.text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DocumentChunk(Base):
    """SQLAlchemy model representing a citation-grounded text chunk with its embedding."""

    __tablename__ = "document_chunks"

    id = Column(String(64), primary_key=True, default=lambda: f"chunk_{uuid.uuid4().hex[:16]}")
    document_id = Column(
        String(64),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_id = Column(
        String(64),
        ForeignKey("document_pages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    page_number = Column(Integer, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(Text, nullable=True)  # JSON-encoded array of floating point values
    chunk_metadata = Column(Text, nullable=True)  # JSON-encoded provenance metadata dictionary
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    document = relationship("Document", back_populates="chunks")
    page = relationship("DocumentPage", back_populates="chunks")

    @property
    def embedding_vector(self) -> Optional[List[float]]:
        """Deserialize stored JSON embedding string to a float list."""
        if not self.embedding:
            return None
        return json.loads(self.embedding)

    @embedding_vector.setter
    def embedding_vector(self, vector: Optional[List[float]]) -> None:
        """Serialize a float list into JSON format for storage."""
        if vector is None:
            self.embedding = None
        else:
            self.embedding = json.dumps(vector)

    @property
    def metadata_dict(self) -> Dict[str, Any]:
        """Deserialize stored JSON metadata string to a dictionary."""
        if not self.chunk_metadata:
            return {}
        return json.loads(self.chunk_metadata)

    @metadata_dict.setter
    def metadata_dict(self, data: Optional[Dict[str, Any]]) -> None:
        """Serialize metadata dictionary to JSON for storage."""
        if data is None:
            self.chunk_metadata = None
        else:
            self.chunk_metadata = json.dumps(data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert DocumentChunk record to a dictionary."""
        return {
            "id": self.id,
            "document_id": self.document_id,
            "page_id": self.page_id,
            "page_number": self.page_number,
            "chunk_index": self.chunk_index,
            "text": self.text,
            "has_embedding": bool(self.embedding),
            "metadata": self.metadata_dict,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TutorChatMessage(Base):
    """SQLAlchemy model representing a persistent AI Tutor chat message."""

    __tablename__ = "tutor_chat_messages"

    id = Column(String(64), primary_key=True, default=lambda: f"msg_{uuid.uuid4().hex[:16]}")
    student_id = Column(String(64), nullable=False, index=True)
    seq = Column(Integer, nullable=False, default=0, server_default="0", index=True)
    sender = Column(String(16), nullable=False)  # 'student' | 'tutor'
    text = Column(Text, nullable=False)
    mode = Column(String(32), nullable=True, default="qa")
    grounded = Column(Boolean, nullable=True, default=True)
    citations = Column(Text, nullable=True)  # JSON-encoded array of SourceCitation
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    def to_dict(self) -> Dict[str, Any]:
        cits = []
        if self.citations:
            try:
                cits = json.loads(self.citations)
            except Exception:
                cits = []
        return {
            "id": self.id,
            "seq": int(self.seq or 0),
            "sender": self.sender,
            "text": self.text,
            "mode": self.mode or "qa",
            "grounded": bool(self.grounded),
            "citations": cits,
            "timestamp": self.created_at.isoformat() if self.created_at else None,
        }

class AIPracticeRecord(Base):
    """Audit trail for practice drills generated by AI when no PDF was available.

    These records let the platform show (and report) that a student practised a topic with
    Gemini even though the student had no matching course PDF at the time.
    """

    __tablename__ = "ai_practice_records"

    id = Column(String(64), primary_key=True, default=lambda: f"aipr_{uuid.uuid4().hex[:16]}")
    student_id = Column(String(64), nullable=False, index=True)
    topic = Column(String(255), nullable=False)
    mode = Column(String(32), nullable=False, default="practice")
    question_count = Column(Integer, nullable=False, default=0)
    source_kind = Column(String(32), nullable=False, default="general_ai")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "student_id": self.student_id,
            "topic": self.topic,
            "mode": self.mode,
            "question_count": self.question_count,
            "source_kind": self.source_kind,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RegistrationOTP(Base):
    """Pending registration record used for email OTP verification before account activation."""

    __tablename__ = "registration_otps"

    id = Column(String(64), primary_key=True, default=lambda: f"otp_{uuid.uuid4().hex[:16]}")
    email = Column(String(255), nullable=False, index=True)
    username = Column(String(64), nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    otp_code = Column(String(16), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    resend_count = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime, nullable=False)
    last_sent_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SupportTicket(Base):
    """Student support ticket entity persisted in relational storage."""

    __tablename__ = "support_tickets"

    id = Column(String(64), primary_key=True, default=lambda: f"ticket_{uuid.uuid4().hex[:12]}")
    student_id = Column(String(64), nullable=False, index=True)
    category = Column(String(64), nullable=False, default="General Support")
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(32), nullable=False, default="OPEN")  # OPEN, IN_PROGRESS, RESOLVED
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "student_id": self.student_id,
            "category": self.category,
            "subject": self.subject,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

