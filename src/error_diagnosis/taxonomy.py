"""Canonical Error Taxonomy and Structured Diagnosis Results for ExamTwin.

Defines the 7 standard error classifications, data validation schemas,
and remediation mappings required by the ExamTwin specification.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class ErrorType(str, Enum):
    """The canonical 7 error categories utilized in ExamTwin diagnosis."""

    CONCEPTUAL_MISUNDERSTANDING = "CONCEPTUAL_MISUNDERSTANDING"
    RECALL_FAILURE = "RECALL_FAILURE"
    FORMULA_RULE_ERROR = "FORMULA_RULE_ERROR"
    CALCULATION_EXECUTION_ERROR = "CALCULATION_EXECUTION_ERROR"
    REASONING_LOGICAL_ERROR = "REASONING_LOGICAL_ERROR"
    QUESTION_MISREADING = "QUESTION_MISREADING"
    PARTIAL_KNOWLEDGE = "PARTIAL_KNOWLEDGE"

    @classmethod
    def list_values(cls) -> List[str]:
        """Return list of all error type string values."""
        return [e.value for e in cls]


ERROR_TAXONOMY_DESCRIPTIONS = {
    ErrorType.CONCEPTUAL_MISUNDERSTANDING: (
        "Flawed mental model or fundamental confusion of core definitions, principles, "
        "or relationships (e.g., confusing LIFO with FIFO)."
    ),
    ErrorType.RECALL_FAILURE: (
        "Inability to recall a specific factual keyword, term, or naming convention "
        "despite understanding underlying mechanics."
    ),
    ErrorType.FORMULA_RULE_ERROR: (
        "Application of the wrong theorem, formula, syntax rule, or standard equation "
        "for the given problem context."
    ),
    ErrorType.CALCULATION_EXECUTION_ERROR: (
        "Correct reasoning and formulas used, but an arithmetic, algebraic, or mechanical "
        "computation step was executed incorrectly."
    ),
    ErrorType.REASONING_LOGICAL_ERROR: (
        "Fallacious deductive step, inverted causation, or invalid logical leap "
        "connecting correct premises to an incorrect conclusion."
    ),
    ErrorType.QUESTION_MISREADING: (
        "Failure to adhere to question constraints, missing negation (e.g., 'which is NOT'), "
        "or answering an unasked question."
    ),
    ErrorType.PARTIAL_KNOWLEDGE: (
        "Answer is directionally accurate but incomplete, missing critical conditions, "
        "base cases, or necessary elaboration."
    ),
}

RECOMMENDED_INTERVENTIONS = {
    ErrorType.CONCEPTUAL_MISUNDERSTANDING: [
        "guided_concept_explanation",
        "worked_example",
        "foundational_practice",
        "targeted_retest",
    ],
    ErrorType.RECALL_FAILURE: [
        "concise_definition",
        "active_recall_drill",
        "targeted_retest",
    ],
    ErrorType.FORMULA_RULE_ERROR: [
        "rule_clarification",
        "formula_worked_example",
        "targeted_retest",
    ],
    ErrorType.CALCULATION_EXECUTION_ERROR: [
        "step_by_step_audit",
        "calculation_drill",
        "targeted_retest",
    ],
    ErrorType.REASONING_LOGICAL_ERROR: [
        "counter_example_trace",
        "logical_step_breakdown",
        "targeted_retest",
    ],
    ErrorType.QUESTION_MISREADING: [
        "highlighted_prompt_review",
        "constraint_checklist",
        "targeted_retest",
    ],
    ErrorType.PARTIAL_KNOWLEDGE: [
        "missing_concept_explanation",
        "targeted_extension_practice",
        "targeted_retest",
    ],
}


class DiagnosisResult(BaseModel):
    """Structured output contract for student answer error diagnosis.

    Confidence is treated as an uncalibrated diagnostic confidence estimate
    until formal calibration (e.g. Platt scaling / temperature scaling) is applied.
    """

    error_type: Optional[ErrorType] = Field(
        default=None,
        description="The diagnosed error category, or None if the answer is completely correct."
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Estimated diagnostic confidence between 0.0 and 1.0."
    )
    reason: str = Field(
        ...,
        description="Human-readable explanation of why this error occurred."
    )
    topic: str = Field(
        ...,
        description="Academic subject or topic module (e.g., 'Data Structures')."
    )
    evidence: List[str] = Field(
        default_factory=list,
        description="List of text excerpts, comparisons, or discrepancies supporting the diagnosis."
    )

    @field_validator("confidence")
    @classmethod
    def validate_confidence_range(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("confidence must be between 0.0 and 1.0 inclusive")
        return round(v, 4)

    @property
    def is_error(self) -> bool:
        """Return True if an error category was diagnosed."""
        return self.error_type is not None

    def get_remediation_path(self) -> List[str]:
        """Retrieve the default pedagogical intervention sequence for this error type."""
        if self.error_type is None:
            return ["reinforcement_practice"]
        return RECOMMENDED_INTERVENTIONS.get(self.error_type, ["standard_review"])
