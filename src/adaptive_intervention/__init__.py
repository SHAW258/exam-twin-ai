"""Adaptive Intervention Engine module for ExamTwin.

Coordinates topic prioritization, pedagogical strategy selection,
and course-grounded RAG remediation.
"""

from src.adaptive_intervention.models import InterventionStrategy
from src.adaptive_intervention.priority import TopicEvidence, TopicPriorityScorer
from src.adaptive_intervention.schemas import (
    ErrorDNAEvidence,
    InterventionRecommendation,
    PriorityBreakdown,
    TopicMasteryEvidence,
    TopicPriorityRank,
)
from src.adaptive_intervention.service import AdaptiveInterventionService
from src.adaptive_intervention.strategy_selector import (
    InterventionStrategySelector,
    StrategySelectionResult,
    TAXONOMY_STRATEGY_MAP,
)

__all__ = [
    "InterventionStrategy",
    "PriorityBreakdown",
    "TopicPriorityRank",
    "ErrorDNAEvidence",
    "TopicMasteryEvidence",
    "InterventionRecommendation",
    "TopicEvidence",
    "TopicPriorityScorer",
    "InterventionStrategySelector",
    "StrategySelectionResult",
    "TAXONOMY_STRATEGY_MAP",
    "AdaptiveInterventionService",
]
