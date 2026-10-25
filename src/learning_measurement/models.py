"""SQLAlchemy ORM models for Phase 8: Assessment Lifecycle and Learning Measurement.

Defines persistent models for verified pre- and post-intervention assessments,
score normalization, and normalized learning gain calculation.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from src.database.models import Base


class AssessmentType(str, Enum):
    """Enumeration of recognized assessment phases in the adaptive learning lifecycle."""
    PRE_INTERVENTION = "PRE_INTERVENTION"
    POST_INTERVENTION = "POST_INTERVENTION"
    FORMATIVE = "FORMATIVE"
    SUMMATIVE = "SUMMATIVE"


class VerificationStatus(str, Enum):
    """Evidence verification status for academic assessments."""
    VERIFIED = "VERIFIED"
    UNVERIFIED = "UNVERIFIED"
    DISPUTED = "DISPUTED"


class GainClassification(str, Enum):
    """Categorical classification of calculated normalized learning gain."""
    POSITIVE = "POSITIVE"
    ZERO = "ZERO"
    NEGATIVE = "NEGATIVE"
    PERFECT_PRETEST = "PERFECT_PRETEST"
    UNAVAILABLE = "UNAVAILABLE"


class AssessmentRecord(Base):
    """Persistent audit entity representing an individual student assessment attempt."""

    __tablename__ = "assessment_records"

    id = Column(
        String(64),
        primary_key=True,
        default=lambda: f"asmt_{uuid.uuid4().hex[:16]}",
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
    learning_objective_id = Column(
        String(128),
        nullable=False,
        index=True,
        doc="Curricular learning objective identifier ensuring assessment comparability.",
    )
    assessment_type = Column(
        String(32),
        nullable=False,
        default=AssessmentType.PRE_INTERVENTION.value,
    )
    obtained_score = Column(
        Float,
        nullable=False,
        doc="Raw numeric score obtained by the student.",
    )
    max_score = Column(
        Float,
        nullable=False,
        doc="Maximum possible score achievable on this assessment.",
    )
    normalized_score = Column(
        Float,
        nullable=False,
        doc="Score normalized to the continuous interval [0.0, 1.0].",
    )
    verification_status = Column(
        String(32),
        nullable=False,
        default=VerificationStatus.VERIFIED.value,
        doc="Verification status indicating whether evidence is verified ground truth.",
    )
    evidence = Column(
        Text,
        nullable=False,
        doc="Concrete student submission or evaluation evidence (never model guesses or predictions).",
    )
    intervention_id = Column(
        String(64),
        nullable=True,
        index=True,
        doc="Optional identifier of the adaptive intervention recommendation that linked this assessment.",
    )
    timestamp = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        doc="Timestamp when the assessment was administered or submitted.",
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    student = relationship("Student")

    __table_args__ = (
        Index("ix_asmt_student_topic_lo", "student_id", "topic", "learning_objective_id"),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert AssessmentRecord to serializable dictionary."""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "topic": self.topic,
            "learning_objective_id": self.learning_objective_id,
            "assessment_type": self.assessment_type,
            "obtained_score": round(self.obtained_score, 4),
            "max_score": round(self.max_score, 4),
            "normalized_score": round(self.normalized_score, 4),
            "verification_status": self.verification_status,
            "evidence": self.evidence,
            "intervention_id": self.intervention_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LearningMeasurementRecord(Base):
    """Persistent record of an empirical learning gain evaluation between paired assessments."""

    __tablename__ = "learning_measurement_records"

    id = Column(
        String(64),
        primary_key=True,
        default=lambda: f"meas_{uuid.uuid4().hex[:16]}",
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
    learning_objective_id = Column(
        String(128),
        nullable=False,
        index=True,
    )
    pre_assessment_id = Column(
        String(64),
        ForeignKey("assessment_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    post_assessment_id = Column(
        String(64),
        ForeignKey("assessment_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    intervention_id = Column(
        String(64),
        nullable=True,
        index=True,
    )
    pre_normalized_score = Column(
        Float,
        nullable=False,
    )
    post_normalized_score = Column(
        Float,
        nullable=False,
    )
    normalized_gain = Column(
        Float,
        nullable=True,
        doc="Normalized learning gain g = (post - pre)/(1 - pre); None when pre == 1.0.",
    )
    absolute_gain = Column(
        Float,
        nullable=False,
        doc="Absolute gain = post - pre.",
    )
    gain_classification = Column(
        String(32),
        nullable=False,
        doc="POSITIVE, ZERO, NEGATIVE, PERFECT_PRETEST, or UNAVAILABLE.",
    )
    is_verified = Column(
        Boolean,
        nullable=False,
        default=True,
        doc="True only when both source assessments are verified evidence.",
    )
    notes = Column(
        Text,
        nullable=True,
    )
    measured_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    student = relationship("Student")
    pre_assessment = relationship(
        "AssessmentRecord",
        foreign_keys=[pre_assessment_id],
    )
    post_assessment = relationship(
        "AssessmentRecord",
        foreign_keys=[post_assessment_id],
    )

    __table_args__ = (
        Index("ix_meas_student_topic", "student_id", "topic"),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert LearningMeasurementRecord to serializable dictionary."""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "topic": self.topic,
            "learning_objective_id": self.learning_objective_id,
            "pre_assessment_id": self.pre_assessment_id,
            "post_assessment_id": self.post_assessment_id,
            "intervention_id": self.intervention_id,
            "pre_normalized_score": round(self.pre_normalized_score, 4),
            "post_normalized_score": round(self.post_normalized_score, 4),
            "normalized_gain": round(self.normalized_gain, 4) if self.normalized_gain is not None else None,
            "absolute_gain": round(self.absolute_gain, 4),
            "gain_classification": self.gain_classification,
            "is_verified": self.is_verified,
            "notes": self.notes,
            "measured_at": self.measured_at.isoformat() if self.measured_at else None,
        }
