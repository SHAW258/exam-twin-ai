"""Data models and design documentation for Adaptive Intervention Engine.

Phase 7 intentionally omits persistent database tables for intervention recommendations.
Recommendations are computed on-demand from persistent Phase 6 learner state (Error DNA
and Topic Mastery records) to ensure recommendations are always dynamic, reactive to the
latest student activity, and avoid unnecessary database writes or schema drift.

If persistent recommendation logging or audit trails are required in future phases,
the schema contracts in `src.adaptive_intervention.schemas` define the canonical format.
"""

from enum import Enum


class InterventionStrategy(str, Enum):
    """Pedagogical intervention strategies for targeted student remediation."""

    CONCEPT_EXPLANATION = "CONCEPT_EXPLANATION"
    WORKED_EXAMPLE = "WORKED_EXAMPLE"
    DEFINITION_RECALL = "DEFINITION_RECALL"
    FORMULA_REVISION = "FORMULA_REVISION"
    CALCULATION_DRILL = "CALCULATION_DRILL"
    STEP_BY_STEP_REASONING = "STEP_BY_STEP_REASONING"
    QUESTION_INTERPRETATION = "QUESTION_INTERPRETATION"
    GUIDED_PRACTICE = "GUIDED_PRACTICE"
    MIXED_REVIEW = "MIXED_REVIEW"
    CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"
