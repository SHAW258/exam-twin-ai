"""Pydantic schemas and data contracts for the Adaptive Intervention Engine.

Defines structured response contracts for topic prioritization, component
score breakdowns, strategy selection rationales, and grounded content citations.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from src.adaptive_intervention.models import InterventionStrategy
from src.rag.rag_service import SourceCitation


class PriorityBreakdown(BaseModel):
    """Explainable component score breakdown for topic prioritization.

    Formula:
        priority_score = w1*frequency + w2*recency + w3*recurrence
                         + w4*difficulty - w5*recent_success
    All component scores are normalized to [0.0, 1.0].
    """

    frequency_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Normalized relative frequency of errors observed in this topic [0.0, 1.0].",
    )
    recency_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Time-decay score indicating how recently error evidence was observed [0.0, 1.0].",
    )
    recurrence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Evidence score of repeated identical error category occurrences [0.0, 1.0].",
    )
    difficulty_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Empirical difficulty proxy derived from verified assessment error rate [0.0, 1.0].",
    )
    recent_success_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Recent verified success rate discounted by elapsed time, lowering priority [0.0, 1.0].",
    )
    final_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Final aggregated priority score bounded strictly in [0.0, 1.0].",
    )
    weights: Dict[str, float] = Field(
        default_factory=dict,
        description="Configuration weights applied to each component score.",
    )
    formula: str = Field(
        default="priority = w1*freq + w2*recency + w3*recurrence + w4*difficulty - w5*recent_success",
        description="Algebraic representation of the prioritization formula.",
    )
    component_explanations: Dict[str, str] = Field(
        default_factory=dict,
        description="Human-readable evidence rationale for each individual component score.",
    )


class TopicPriorityRank(BaseModel):
    """Ranked candidate topic with complete priority scoring breakdown."""

    topic: str = Field(..., description="Curricular topic or module name.")
    rank: int = Field(..., ge=1, description="1-indexed rank among evaluated topics.")
    priority_score: float = Field(..., ge=0.0, le=1.0, description="Final priority score.")
    breakdown: PriorityBreakdown = Field(..., description="Component score details.")
    dominant_error_category: Optional[str] = Field(
        default=None,
        description="Most frequent confirmed canonical error category in this topic.",
    )
    error_count: int = Field(default=0, ge=0, description="Total diagnostic errors for this topic.")
    attempts_count: int = Field(default=0, ge=0, description="Verified assessment attempts.")
    mastery_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Topic mastery level.")


class ErrorDNAEvidence(BaseModel):
    """Summary of Error DNA diagnostic evidence supporting the recommendation."""

    total_diagnoses: int = Field(default=0, ge=0)
    topic_error_count: int = Field(default=0, ge=0)
    dominant_error_category: Optional[str] = Field(default=None)
    dominant_category_count: int = Field(default=0, ge=0)
    review_required_count: int = Field(default=0, ge=0)
    recent_error_count: int = Field(default=0, ge=0)
    latest_error_timestamp: Optional[datetime] = None


class TopicMasteryEvidence(BaseModel):
    """Verified topic mastery evidence from learner state."""

    attempts_count: int = Field(default=0, ge=0)
    correct_attempts: int = Field(default=0, ge=0)
    incorrect_attempts: int = Field(default=0, ge=0)
    measured_success_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    mastery_score: float = Field(default=0.0, ge=0.0, le=1.0)
    last_attempt_at: Optional[datetime] = None


class InterventionRecommendation(BaseModel):
    """Structured response contract for an adaptive intervention recommendation."""

    student_id: str = Field(..., description="Stable external student identifier.")
    selected_topic: str = Field(..., description="Top prioritized curricular topic.")
    priority_score: float = Field(..., ge=0.0, le=1.0, description="Priority score of selected topic.")
    priority_breakdown: PriorityBreakdown = Field(..., description="Component scoring breakdown.")
    selected_strategy: InterventionStrategy = Field(..., description="Recommended pedagogical strategy.")
    strategy_rationale: str = Field(..., description="Pedagogical justification for the chosen strategy.")
    student_explanation: str = Field(..., description="Student-facing explanatory summary.")
    is_uncertain: bool = Field(
        default=False,
        description="True if diagnosis evidence is below confidence threshold or requires teacher review.",
    )
    review_required: bool = Field(
        default=False,
        description="Flag indicating whether human educator review is advised before intervention.",
    )
    is_cold_start: bool = Field(
        default=False,
        description="True if recommendation is for a new student with no prior activity history.",
    )
    error_dna_evidence: ErrorDNAEvidence = Field(
        default_factory=ErrorDNAEvidence,
        description="Diagnostic error evidence supporting the recommendation.",
    )
    mastery_evidence: Optional[TopicMasteryEvidence] = Field(
        default=None,
        description="Empirical topic mastery evidence, or None if unobserved.",
    )
    grounded_content: Optional[str] = Field(
        default=None,
        description="Optional learning content generated from course materials via RAG.",
    )
    grounded_citations: List[SourceCitation] = Field(
        default_factory=list,
        description="Verified document source and page citations supporting grounded content.",
    )
    all_ranked_topics: List[TopicPriorityRank] = Field(
        default_factory=list,
        description="Complete list of all evaluated candidate topics sorted by priority.",
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when this recommendation was computed.",
    )
    disclaimer: str = Field(
        default=(
            "Heuristic pedagogical recommendation derived from empirical learner-state evidence. "
            "It does not claim to be a psychometric, personality, or cognitive ability measurement."
        ),
        description="Academic disclaimer distinguishing pedagogical heuristics from cognitive claims.",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert recommendation to dictionary."""
        return self.model_dump()
