"""Pydantic schemas and data contracts for Learner State and Error DNA."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class StudentProfileSchema(BaseModel):
    """Data contract representing a student learner profile."""

    id: str = Field(..., description="Internal unique primary key ID.")
    external_student_id: str = Field(..., description="Stable external student identifier.")
    email: Optional[str] = Field(default=None, description="Student email address.")
    full_name: Optional[str] = Field(default=None, description="Student display name.")
    is_active: bool = Field(default=True, description="Account active status.")
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
    total_diagnoses_count: int = Field(default=0, ge=0)
    topics_tracked_count: int = Field(default=0, ge=0)


class DiagnosisRecordCreate(BaseModel):
    """Payload for recording a new error diagnosis event."""

    topic: str = Field(..., min_length=1, max_length=128)
    error_category: Optional[str] = Field(default=None, description="Diagnosed canonical ErrorType.")
    question_reference: Optional[str] = Field(default=None)
    student_answer: Optional[str] = Field(default=None)
    expected_answer: Optional[str] = Field(default=None)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    needs_review: bool = Field(default=False)
    model_version: str = Field(default="baseline_v1")


class DiagnosisRecordSchema(BaseModel):
    """Data contract representing a stored error diagnosis event."""

    id: str
    student_id: str
    topic: str
    error_category: Optional[str] = None
    question_reference: Optional[str] = None
    student_answer: Optional[str] = None
    expected_answer: Optional[str] = None
    confidence_score: float
    needs_review: bool
    is_verified: bool = False
    verified_error_category: Optional[str] = None
    model_version: str
    created_at: Optional[datetime] = None


class TopicMasterySchema(BaseModel):
    """Data contract representing topic mastery and practice attempt statistics."""

    id: str
    student_id: str
    topic: str
    attempts_count: int = Field(default=0, ge=0)
    correct_attempts: int = Field(default=0, ge=0)
    incorrect_attempts: int = Field(default=0, ge=0)
    mastery_score: float = Field(default=0.0, ge=0.0, le=1.0)
    measured_success_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    last_attempt_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RecurringErrorItem(BaseModel):
    """Aggregation of a recurring error category."""

    category: str = Field(..., description="Error taxonomy category.")
    count: int = Field(..., ge=0, description="Total occurrences.")
    percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of confirmed error diagnoses.")


class AffectedTopicItem(BaseModel):
    """Aggregation of a topic experiencing frequent student errors."""

    topic: str
    count: int = Field(..., ge=0)
    primary_error_category: Optional[str] = None


class TemporalTrend(BaseModel):
    """Recent vs historical diagnostic frequency indicator."""

    recent_window_days: int
    recent_diagnoses_count: int
    historical_diagnoses_count: int
    trend: str = Field(
        ...,
        description="Directional error activity indicator: 'INCREASING', 'DECREASING', or 'STABLE'.",
    )


class RevisionRecommendation(BaseModel):
    """Heuristic topic revision recommendation based on recurrence and elapsed time."""

    topic: str
    reason: str
    days_since_last_attempt: Optional[int] = None
    urgency: str = Field(default="MEDIUM", description="'HIGH', 'MEDIUM', or 'LOW'.")


class ErrorDNASummary(BaseModel):
    """Explainable Error DNA and persistent learner state summary."""

    student_id: str = Field(..., description="External student identifier.")
    total_diagnoses: int = Field(..., ge=0)
    review_required_count: int = Field(..., ge=0, description="Count of uncertain or low-confidence diagnoses.")
    confirmed_diagnoses_count: int = Field(..., ge=0)
    recurring_errors: List[RecurringErrorItem] = Field(default_factory=list)
    most_affected_topics: List[AffectedTopicItem] = Field(default_factory=list)
    temporal_trend: TemporalTrend
    topic_masteries: List[TopicMasterySchema] = Field(default_factory=list)
    revision_recommendations: List[RevisionRecommendation] = Field(default_factory=list)
    explanatory_note: str = Field(
        default=(
            "Error DNA reflects empirical activity history and diagnostic classifier predictions. "
            "These indicators represent educational evidence, not psychological or cognitive measurements."
        )
    )
