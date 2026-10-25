"""SQLAlchemy ORM models for Learner State, Error DNA, and Topic Mastery.

Defines persistent models for students, immutable error diagnosis history,
and topic-level mastery states, strictly maintaining database constraints
and foreign-key integrity.
"""

from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from src.database.models import Base


class Student(Base):
    """SQLAlchemy model representing a persistent student learner profile."""

    __tablename__ = "students"

    id = Column(
        String(64),
        primary_key=True,
        default=lambda: f"stud_{uuid.uuid4().hex[:16]}",
    )
    external_student_id = Column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        doc="Stable external student identifier (e.g., student username or registration ID).",
    )
    email = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
        doc="Student email address for notifications and account recovery.",
    )
    hashed_password = Column(
        String(255),
        nullable=True,
        doc="Salted scrypt hash of the student password.",
    )
    full_name = Column(
        String(255),
        nullable=True,
        doc="Student full display name.",
    )
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        doc="Account active flag.",
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
    error_history = relationship(
        "ErrorDiagnosisRecord",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="desc(ErrorDiagnosisRecord.created_at)",
    )
    topic_masteries = relationship(
        "TopicMasteryState",
        back_populates="student",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert Student record to dictionary. Note: password hash is never serialized."""
        return {
            "id": self.id,
            "external_student_id": self.external_student_id,
            "email": self.email,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "total_diagnoses_count": len(self.error_history) if self.error_history else 0,
            "topics_tracked_count": len(self.topic_masteries) if self.topic_masteries else 0,
        }


class ErrorDiagnosisRecord(Base):
    """Immutable audit record of an individual error diagnosis event."""

    __tablename__ = "error_history"

    id = Column(
        String(64),
        primary_key=True,
        default=lambda: f"err_{uuid.uuid4().hex[:16]}",
    )
    student_id = Column(
        String(64),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic = Column(
        String(128),
        nullable=False,
        index=True,
        doc="Curricular topic or module under study (e.g., 'Data Structures').",
    )
    error_category = Column(
        String(64),
        nullable=True,
        index=True,
        doc="Predicted canonical ErrorType string, or None if low confidence / uncertain.",
    )
    question_reference = Column(
        Text,
        nullable=True,
        doc="Prompt or exam question presented to the student.",
    )
    student_answer = Column(
        Text,
        nullable=True,
        doc="Submitted student response text.",
    )
    expected_answer = Column(
        Text,
        nullable=True,
        doc="Reference or expected correct response.",
    )
    confidence_score = Column(
        Float,
        nullable=False,
        default=0.0,
        doc="Uncalibrated probability confidence estimate from diagnosis model.",
    )
    needs_review = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        doc="True if diagnosis is uncertain or confidence is below threshold.",
    )
    is_verified = Column(
        Boolean,
        nullable=False,
        default=False,
        doc="True if human educator or ground-truth assessment verified the diagnosis.",
    )
    verified_error_category = Column(
        String(64),
        nullable=True,
        doc="Human-verified error taxonomy category.",
    )
    model_version = Column(
        String(64),
        nullable=False,
        default="baseline_v1",
        doc="Identifier of the model version that generated this diagnosis.",
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships
    student = relationship("Student", back_populates="error_history")

    __table_args__ = (
        Index("ix_error_student_created", "student_id", "created_at"),
        Index("ix_error_student_topic", "student_id", "topic"),
        Index("ix_error_student_category", "student_id", "error_category"),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert ErrorDiagnosisRecord to dictionary."""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "topic": self.topic,
            "error_category": self.error_category,
            "question_reference": self.question_reference,
            "student_answer": self.student_answer,
            "expected_answer": self.expected_answer,
            "confidence_score": round(self.confidence_score, 4),
            "needs_review": self.needs_review,
            "is_verified": self.is_verified,
            "verified_error_category": self.verified_error_category,
            "model_version": self.model_version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TopicMasteryState(Base):
    """Persistent topic-level learning performance and estimated mastery state."""

    __tablename__ = "topic_mastery_states"

    id = Column(
        String(64),
        primary_key=True,
        default=lambda: f"mast_{uuid.uuid4().hex[:16]}",
    )
    student_id = Column(
        String(64),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic = Column(
        String(128),
        nullable=False,
        index=True,
    )
    attempts_count = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Total number of evaluated question attempts for this topic.",
    )
    correct_attempts = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Number of verified correct question attempts.",
    )
    incorrect_attempts = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Number of verified incorrect question attempts.",
    )
    mastery_score = Column(
        Float,
        nullable=False,
        default=0.0,
        doc="Estimated mastery level bounded strictly between 0.0 and 1.0.",
    )
    last_attempt_at = Column(
        DateTime,
        nullable=True,
        doc="Timestamp of the most recent evaluated attempt in this topic.",
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    student = relationship("Student", back_populates="topic_masteries")

    __table_args__ = (
        UniqueConstraint("student_id", "topic", name="uq_student_topic_mastery"),
        Index("ix_mastery_student_topic", "student_id", "topic"),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert TopicMasteryState to dictionary."""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "topic": self.topic,
            "attempts_count": self.attempts_count,
            "correct_attempts": self.correct_attempts,
            "incorrect_attempts": self.incorrect_attempts,
            "mastery_score": round(self.mastery_score, 4),
            "measured_success_rate": (
                round(self.correct_attempts / self.attempts_count, 4)
                if self.attempts_count > 0
                else 0.0
            ),
            "last_attempt_at": self.last_attempt_at.isoformat() if self.last_attempt_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
