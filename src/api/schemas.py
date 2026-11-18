"""Pydantic request and response schemas for CodeKnot Phase 9 Web API layer.

Defines strict type contracts for the future React + TypeScript web frontend,
preventing direct ORM leakage and standardizing error/data formats.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


# -----------------------------------------------------------------------------
# 1. Authentication Schemas
# -----------------------------------------------------------------------------

class StudentRegisterRequest(BaseModel):
    """Payload for registering a new student account (legacy direct registration)."""

    username: str = Field(
        ...,
        min_length=3,
        max_length=64,
        description="Unique username or student roll number identifier.",
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Secure plaintext password (minimum 8 characters).",
    )
    email: Optional[str] = Field(
        default=None,
        description="Student email address.",
    )
    full_name: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Student display name.",
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Username cannot be empty or whitespace.")
        return clean


class RegisterOTPRequest(BaseModel):
    """Request OTP for email-verified student registration."""

    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=8, max_length=128)
    email: str = Field(..., min_length=5, max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Username cannot be empty or whitespace.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("A valid email address is required.")
        return clean


class VerifyRegisterOTPRequest(BaseModel):
    """Verify OTP and complete student registration."""

    email: str = Field(..., min_length=5, max_length=255)
    otp_code: str = Field(..., min_length=4, max_length=12)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class ResendRegisterOTPRequest(BaseModel):
    """Request resend of registration OTP."""

    email: str = Field(..., min_length=5, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class OTPRequestResponse(BaseModel):
    """Response for OTP request/resend actions."""

    message: str
    email: str
    expires_in_minutes: int
    resend_cooldown_seconds: int
    dev_otp_code: Optional[str] = None


class StudentLoginRequest(BaseModel):
    """Payload for authenticating and obtaining a JWT access token."""

    username: str = Field(..., description="Student username / identifier.")
    password: str = Field(..., description="Student password.")


class TokenResponse(BaseModel):
    """JWT bearer access token response contract."""

    access_token: str
    token_type: str = "bearer"
    student_id: str
    expires_in_minutes: int
    is_admin: bool = False


class StudentProfileResponse(BaseModel):
    """Student profile information contract for current student endpoint."""

    id: str
    external_student_id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool = False
    total_diagnoses_count: int
    topics_tracked_count: int
    created_at: Optional[str] = None


# -----------------------------------------------------------------------------
# 2. Document Ingestion Schemas
# -----------------------------------------------------------------------------

class DocumentUploadResponse(BaseModel):
    """Response contract following successful PDF ingestion and chunking."""

    document_id: str
    filename: str
    pages_count: int
    chunks_count: int
    status: str
    message: str


class DocumentListItem(BaseModel):
    """Summary item in document catalog list."""

    id: str
    title: str
    access_level: str
    pages_count: int
    chunks_count: int
    created_at: Optional[str] = None


class DocumentDetailResponse(BaseModel):
    """Detailed view of an ingested course document."""

    id: str
    title: str
    access_level: str
    pages_count: int
    chunks_count: int
    created_at: Optional[str] = None


# -----------------------------------------------------------------------------
# 3. AI Tutor Schemas
# -----------------------------------------------------------------------------

class SourceCitationResponse(BaseModel):
    """Verified source citation grounded in textbook or lecture materials."""

    source_path: str
    document_id: str
    page_number: int
    similarity_score: float
    snippet: str


class TutorAskRequest(BaseModel):
    """Request payload for querying the grounded AI Tutor."""

    question: str = Field(
        ...,
        min_length=2,
        description="Student conceptual or problem question.",
    )
    document_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional list of specific document IDs to scope retrieval.",
    )
    topic: Optional[str] = Field(
        default=None,
        description="Optional curriculum topic name.",
    )
    mode: str = Field(
        default="qa",
        description="Interaction mode: 'qa' (grounded answer), 'hint' (Socratic hint), or 'practice' (retest question).",
    )
    question_count: Optional[int] = Field(
        default=None,
        ge=1,
        le=25,
        description="Optional target count of MCQs to generate when mode is 'practice'.",
    )
    seed: Optional[int] = Field(
        default=None,
        description="Optional randomization seed or retry variation key to ensure diverse questions.",
    )


class TutorAskResponse(BaseModel):
    """Response contract from the grounded Gemini AI Tutor."""

    question: str
    answer: str
    mode: str
    citations: List[SourceCitationResponse] = Field(default_factory=list)
    grounded: bool
    source_kind: str = Field(
        default="own_document",
        description="own_document | global_document | general_ai | none",
    )
    practice_record_id: Optional[str] = Field(
        default=None,
        description="Set when a no-PDF AI practice drill was recorded in the database.",
    )


class AIPracticeRecordResponse(BaseModel):
    """A logged practice session that used Gemini because no PDF was available."""

    id: str
    student_id: str
    topic: str
    mode: str
    question_count: int
    source_kind: str
    created_at: Optional[str] = None


# -----------------------------------------------------------------------------
# 4. Learning & Diagnosis Schemas
# -----------------------------------------------------------------------------

class DiagnosisRequest(BaseModel):
    """Request payload for automated ML error diagnosis."""

    question: str = Field(..., min_length=2, description="Exam or problem question.")
    student_answer: str = Field(..., description="Student's submitted response.")
    expected_answer: Optional[str] = Field(default=None, description="Reference answer if available.")
    topic: str = Field(default="General", description="Curricular topic evaluated.")
    context: Optional[str] = Field(default=None, description="Optional lecture or module context.")


class DiagnosisResponse(BaseModel):
    """Diagnosis event response contract."""

    id: str
    student_id: str
    topic: str
    error_category: Optional[str] = None
    confidence_score: float
    needs_review: bool
    is_verified: bool
    model_version: str
    created_at: Optional[str] = None


# -----------------------------------------------------------------------------
# 5. Assessment Lifecycle Schemas
# -----------------------------------------------------------------------------

class AssessmentSubmissionRequest(BaseModel):
    """Payload for recording a student assessment attempt."""

    topic: str = Field(..., min_length=1, max_length=128)
    learning_objective_id: str = Field(..., min_length=1, max_length=128)
    assessment_type: str = Field(
        default="PRE_INTERVENTION",
        description="PRE_INTERVENTION, POST_INTERVENTION, FORMATIVE, or SUMMATIVE.",
    )
    obtained_score: float = Field(..., ge=0.0)
    max_score: float = Field(..., gt=0.0)
    evidence: str = Field(..., min_length=1, description="Student assessment answer or evaluation work.")
    intervention_id: Optional[str] = None


class AssessmentResponse(BaseModel):
    """Response contract for persisted assessment attempt."""

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


# -----------------------------------------------------------------------------
# 6. Learning Measurement Schemas
# -----------------------------------------------------------------------------

class MeasurementRequest(BaseModel):
    """Payload for evaluating normalized learning gain between paired assessments."""

    pre_assessment_id: str = Field(..., min_length=1)
    post_assessment_id: str = Field(..., min_length=1)
    intervention_id: Optional[str] = None
    require_verified: bool = True
    update_topic_mastery: bool = True
    notes: Optional[str] = None


class MeasurementResponse(BaseModel):
    """Empirical learning gain measurement contract."""

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
    gain_classification: str
    is_verified: bool
    summary_explanation: str
    measured_at: Optional[str] = None


# -----------------------------------------------------------------------------
# Support Ticket Schemas
# -----------------------------------------------------------------------------

class SupportTicketCreateRequest(BaseModel):
    category: str = Field(default="General Support", max_length=64)
    subject: str = Field(..., min_length=3, max_length=255)
    message: str = Field(..., min_length=5, max_length=5000)


class SupportTicketResponse(BaseModel):
    id: str
    student_id: str
    category: str
    subject: str
    message: str
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

