"""Pydantic validation schemas for Phase 8: Assessment and Learning Measurement contracts."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from src.learning_measurement.exceptions import AssessmentValidationError
from src.learning_measurement.models import (
    AssessmentType,
    GainClassification,
    VerificationStatus,
)


class AssessmentCreate(BaseModel):
    """Input validation schema for submitting an assessment attempt."""

    student_id: str = Field(..., description="External or persistent student identifier.")
    topic: str = Field(..., description="Curricular topic evaluated (e.g. 'Binary Search Trees').")
    learning_objective_id: str = Field(
        ...,
        description="Standardized learning objective ID ensuring pedagogical comparability.",
    )
    assessment_type: AssessmentType = Field(
        default=AssessmentType.PRE_INTERVENTION,
        description="Phase in assessment lifecycle: PRE_INTERVENTION, POST_INTERVENTION, etc.",
    )
    obtained_score: float = Field(..., description="Raw score obtained by learner.")
    max_score: float = Field(..., description="Maximum possible score.")
    evidence: str = Field(
        ...,
        description="Concrete student submission or evaluation breakdown (never model output).",
    )
    verification_status: VerificationStatus = Field(
        default=VerificationStatus.VERIFIED,
        description="Verification ground truth status.",
    )
    intervention_id: Optional[str] = Field(
        default=None,
        description="Optional ID of associated adaptive intervention.",
    )
    timestamp: Optional[datetime] = Field(
        default=None,
        description="Timestamp when assessment was administered.",
    )

    @field_validator("student_id", "topic", "learning_objective_id", "evidence")
    @classmethod
    def validate_non_empty_strings(cls, v: str, info) -> str:
        """Ensure critical string identifiers and evidence are not blank or whitespace."""
        if not v or not str(v).strip():
            raise AssessmentValidationError(
                f"Field '{info.field_name}' must be a non-empty string."
            )
        return str(v).strip()

    @model_validator(mode="after")
    def validate_scores_and_bounds(self) -> "AssessmentCreate":
        """Strict academic validation: max_score > 0, obtained_score >= 0, and obtained <= max."""
        if self.max_score <= 0:
            raise AssessmentValidationError(
                f"Maximum score must be strictly greater than 0, got {self.max_score}."
            )
        if self.obtained_score < 0:
            raise AssessmentValidationError(
                f"Obtained score cannot be negative, got {self.obtained_score}."
            )
        if self.obtained_score > self.max_score:
            raise AssessmentValidationError(
                f"Obtained score ({self.obtained_score}) cannot exceed maximum possible score ({self.max_score})."
            )
        return self


class AssessmentSchema(BaseModel):
    """Complete serialized representation of an AssessmentRecord."""

    id: str
    student_id: str
    topic: str
    learning_objective_id: str
    assessment_type: str
    obtained_score: float
    max_score: float
    normalized_score: float
    verification_status: str
    evidence: str
    intervention_id: Optional[str] = None
    timestamp: Optional[str] = None
    created_at: Optional[str] = None


class LearningMeasurementResult(BaseModel):
    """Pedagogical measurement contract reporting normalized learning gain and audit trail."""

    measurement_id: str
    student_id: str
    topic: str
    learning_objective_id: str
    pre_assessment_id: str
    post_assessment_id: str
    intervention_id: Optional[str] = None
    pre_normalized_score: float
    post_normalized_score: float
    normalized_gain: Optional[float] = None
    absolute_gain: float
    gain_classification: GainClassification
    is_verified: bool
    notes: Optional[str] = None
    summary_explanation: str
    measured_at: Optional[str] = None
