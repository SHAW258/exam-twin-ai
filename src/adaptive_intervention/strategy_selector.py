"""Pedagogical strategy selection module for the Adaptive Intervention Engine.

Maps diagnosed student error categories to actionable educational interventions
based on canonical pedagogical heuristics. Operates deterministically without
external LLM dependencies.
"""

from dataclasses import dataclass
import logging
from typing import Dict, List, Optional, Tuple

from src.adaptive_intervention.models import InterventionStrategy
from src.adaptive_intervention.priority import TopicEvidence
from src.error_diagnosis.taxonomy import ErrorType

logger = logging.getLogger(__name__)


@dataclass
class StrategySelectionResult:
    """Outcome of pedagogical strategy selection."""

    strategy: InterventionStrategy
    rationale: str
    is_uncertain: bool = False
    review_required: bool = False
    dominant_category: Optional[str] = None


# Canonical pedagogical heuristic mappings from ErrorType to InterventionStrategy
TAXONOMY_STRATEGY_MAP: Dict[ErrorType, Tuple[InterventionStrategy, str]] = {
    ErrorType.CONCEPTUAL_MISUNDERSTANDING: (
        InterventionStrategy.CONCEPT_EXPLANATION,
        (
            "Flawed mental model or fundamental confusion detected. Guided concept explanation "
            "followed by a worked example recommended."
        ),
    ),
    ErrorType.RECALL_FAILURE: (
        InterventionStrategy.DEFINITION_RECALL,
        (
            "Inability to retrieve core terminology, keywords, or naming conventions. "
            "Active recall drills and concise definitions recommended."
        ),
    ),
    ErrorType.FORMULA_RULE_ERROR: (
        InterventionStrategy.FORMULA_REVISION,
        (
            "Incorrect formula, theorem, or syntax rule applied. Formula clarification "
            "followed by targeted application exercises recommended."
        ),
    ),
    ErrorType.CALCULATION_EXECUTION_ERROR: (
        InterventionStrategy.CALCULATION_DRILL,
        (
            "Arithmetic, algebraic, or mechanical calculation misstep. Step-by-step "
            "calculation practice and procedural audit recommended."
        ),
    ),
    ErrorType.REASONING_LOGICAL_ERROR: (
        InterventionStrategy.STEP_BY_STEP_REASONING,
        (
            "Logical fallacy, inverted causation, or invalid deduction detected. Worked "
            "reasoning examples and step-by-step logical breakdown recommended."
        ),
    ),
    ErrorType.QUESTION_MISREADING: (
        InterventionStrategy.QUESTION_INTERPRETATION,
        (
            "Failure to adhere to problem constraints, negation, or question requirements. "
            "Prompt interpretation exercises and constraint checklists recommended."
        ),
    ),
    ErrorType.PARTIAL_KNOWLEDGE: (
        InterventionStrategy.GUIDED_PRACTICE,
        (
            "Directionally accurate but incomplete response. Scaffolded practice with "
            "progressive hints and gradual reduction of assistance recommended."
        ),
    ),
}


class InterventionStrategySelector:
    """Deterministic pedagogical strategy selector grounded in empirical error evidence."""

    def __init__(
        self,
        strategy_map: Optional[Dict[ErrorType, Tuple[InterventionStrategy, str]]] = None,
        default_strategy: InterventionStrategy = InterventionStrategy.GUIDED_PRACTICE,
    ):
        """Initialize InterventionStrategySelector.

        Args:
            strategy_map: Optional custom mapping of ErrorType to (strategy, rationale).
            default_strategy: Default strategy when no error pattern is observed.
        """
        self.strategy_map = strategy_map or TAXONOMY_STRATEGY_MAP
        self.default_strategy = default_strategy

    def select_strategy(self, evidence: TopicEvidence) -> StrategySelectionResult:
        """Select the appropriate learning intervention strategy for a prioritized topic.

        Rules:
        1. If evidence is uncertain (all records flagged needs_review, or zero confirmed errors
           with pending reviews), return CLARIFICATION_REQUIRED.
        2. If no errors are recorded (cold start or only correct attempts), return GUIDED_PRACTICE.
        3. If multiple confirmed categories have identical highest count, return MIXED_REVIEW.
        4. If a single dominant category exists, map to the designated pedagogical strategy.

        Args:
            evidence: TopicEvidence containing confirmed error category counts and review flags.

        Returns:
            StrategySelectionResult with strategy, rationale, and review flags.
        """
        # Rule 1: Handle uncertain diagnoses requiring educator review
        total_errors = evidence.error_count
        confirmed_counts = evidence.confirmed_categories

        if total_errors > 0 and not confirmed_counts:
            # Errors exist but all are flagged as needs_review or uncertain
            return StrategySelectionResult(
                strategy=InterventionStrategy.CLARIFICATION_REQUIRED,
                rationale=(
                    f"Diagnostic evidence for '{evidence.topic}' is uncertain or below confidence threshold "
                    f"({evidence.needs_review_count} pending reviews). Teacher review or diagnostic "
                    "clarification recommended before targeted intervention."
                ),
                is_uncertain=True,
                review_required=True,
                dominant_category=None,
            )

        # Rule 2: Handle topics with no recorded diagnostic errors (cold start or strong performance)
        if not confirmed_counts:
            return StrategySelectionResult(
                strategy=self.default_strategy,
                rationale=(
                    f"No confirmed diagnostic error patterns observed for topic '{evidence.topic}'. "
                    "Standard guided practice recommended to reinforce topic mastery."
                ),
                is_uncertain=False,
                review_required=False,
                dominant_category=None,
            )

        # Find category with maximum frequency
        max_count = max(confirmed_counts.values())
        top_categories = [cat for cat, cnt in confirmed_counts.items() if cnt == max_count]

        # Rule 3: Transparent fallback when several error categories are equally frequent
        if len(top_categories) > 1:
            cats_str = ", ".join(sorted(top_categories))
            return StrategySelectionResult(
                strategy=InterventionStrategy.MIXED_REVIEW,
                rationale=(
                    f"Multiple error categories occur with equal frequency in '{evidence.topic}' "
                    f"({cats_str}, {max_count} each). Comprehensive mixed review recommended."
                ),
                is_uncertain=False,
                review_required=(evidence.needs_review_count > 0),
                dominant_category=top_categories[0],
            )

        # Rule 4: Single dominant error category mapping
        dominant_cat_str = top_categories[0]

        # Map string category to canonical ErrorType enum
        try:
            error_type = ErrorType(dominant_cat_str)
        except (ValueError, KeyError):
            logger.warning(
                "Unrecognized error category '%s' for topic '%s'. Falling back to default strategy.",
                dominant_cat_str,
                evidence.topic,
            )
            return StrategySelectionResult(
                strategy=self.default_strategy,
                rationale=(
                    f"Unrecognized error category '{dominant_cat_str}' observed. "
                    "Standard guided practice recommended."
                ),
                is_uncertain=True,
                review_required=True,
                dominant_category=dominant_cat_str,
            )

        if error_type in self.strategy_map:
            strategy, base_rationale = self.strategy_map[error_type]
            full_rationale = (
                f"Dominant error in '{evidence.topic}' is {error_type.value} "
                f"({max_count} occurrences). {base_rationale}"
            )
            return StrategySelectionResult(
                strategy=strategy,
                rationale=full_rationale,
                is_uncertain=False,
                review_required=(evidence.needs_review_count > 0),
                dominant_category=dominant_cat_str,
            )

        return StrategySelectionResult(
            strategy=self.default_strategy,
            rationale=(
                f"No specific pedagogical mapping defined for {error_type.value}. "
                "Guided practice recommended."
            ),
            is_uncertain=False,
            review_required=False,
            dominant_category=dominant_cat_str,
        )
