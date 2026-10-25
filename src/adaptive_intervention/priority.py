"""Topic priority scoring module for the Adaptive Intervention Engine.

Implements an explainable, configurable multi-factor priority score combining:
- Error frequency (normalized across evaluated topics)
- Evidence recency (linear time decay)
- Error category recurrence (repeated identical misconceptions)
- Empirical difficulty (verified assessment incorrect rate)
- Recent verified success (time-discounted success rate reducing priority)

All component scores and the final priority score are strictly bounded in [0.0, 1.0].
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from src.adaptive_intervention.schemas import PriorityBreakdown, TopicPriorityRank
from src.config.settings import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class TopicEvidence:
    """Aggregated empirical evidence for a single topic."""

    topic: str
    error_count: int = 0
    confirmed_categories: Dict[str, int] = field(default_factory=dict)
    needs_review_count: int = 0
    latest_error_timestamp: Optional[datetime] = None
    attempts_count: int = 0
    correct_attempts: int = 0
    incorrect_attempts: int = 0
    mastery_score: float = 0.0
    last_attempt_at: Optional[datetime] = None
    dominant_error_category: Optional[str] = None


class TopicPriorityScorer:
    """Calculates explainable topic priority scores with configurable weights."""

    def __init__(
        self,
        w1_frequency: Optional[float] = None,
        w2_recency: Optional[float] = None,
        w3_recurrence: Optional[float] = None,
        w4_difficulty: Optional[float] = None,
        w5_recent_success: Optional[float] = None,
        recency_window_days: Optional[int] = None,
        recurrence_saturation: Optional[int] = None,
        success_window_days: Optional[int] = None,
        default_difficulty: float = 0.0,
        settings: Optional[Settings] = None,
    ):
        """Initialize TopicPriorityScorer with validated weights.

        Args:
            w1_frequency: Weight for normalized error frequency [0.0, 1.0].
            w2_recency: Weight for error recency decay [0.0, 1.0].
            w3_recurrence: Weight for repeated error categories [0.0, 1.0].
            w4_difficulty: Weight for verified difficulty [0.0, 1.0].
            w5_recent_success: Weight for verified recent success [0.0, 1.0].
            recency_window_days: Days for error recency linear decay.
            recurrence_saturation: Max identical errors for 1.0 recurrence score.
            success_window_days: Days for recent success decay.
            default_difficulty: Default difficulty proxy when attempts == 0.
            settings: Application settings fallback.
        """
        cfg = settings or get_settings()

        self.w1 = float(w1_frequency if w1_frequency is not None else cfg.ADAPTIVE_W1_FREQUENCY)
        self.w2 = float(w2_recency if w2_recency is not None else cfg.ADAPTIVE_W2_RECENCY)
        self.w3 = float(w3_recurrence if w3_recurrence is not None else cfg.ADAPTIVE_W3_RECURRENCE)
        self.w4 = float(w4_difficulty if w4_difficulty is not None else cfg.ADAPTIVE_W4_DIFFICULTY)
        self.w5 = float(w5_recent_success if w5_recent_success is not None else cfg.ADAPTIVE_W5_RECENT_SUCCESS)

        self.recency_window_days = int(
            recency_window_days if recency_window_days is not None else cfg.ADAPTIVE_RECENCY_WINDOW_DAYS
        )
        self.recurrence_saturation = int(
            recurrence_saturation if recurrence_saturation is not None else cfg.ADAPTIVE_RECURRENCE_SATURATION
        )
        self.success_window_days = int(
            success_window_days if success_window_days is not None else cfg.ADAPTIVE_SUCCESS_WINDOW_DAYS
        )
        self.default_difficulty = float(default_difficulty)

        # Validate weight boundaries
        for name, weight in [
            ("w1_frequency", self.w1),
            ("w2_recency", self.w2),
            ("w3_recurrence", self.w3),
            ("w4_difficulty", self.w4),
            ("w5_recent_success", self.w5),
        ]:
            if not (0.0 <= weight <= 1.0):
                raise ValueError(f"Weight {name} must be between 0.0 and 1.0 inclusive (got {weight}).")

        if self.recency_window_days < 1:
            raise ValueError("recency_window_days must be at least 1.")
        if self.recurrence_saturation < 2:
            raise ValueError("recurrence_saturation must be at least 2.")
        if self.success_window_days < 1:
            raise ValueError("success_window_days must be at least 1.")
        if not (0.0 <= self.default_difficulty <= 1.0):
            raise ValueError("default_difficulty must be between 0.0 and 1.0.")

    def get_weights_dict(self) -> Dict[str, float]:
        """Return configured scoring weights."""
        return {
            "w1_frequency": self.w1,
            "w2_recency": self.w2,
            "w3_recurrence": self.w3,
            "w4_difficulty": self.w4,
            "w5_recent_success": self.w5,
        }

    def calculate_frequency_score(self, topic_errors: int, max_topic_errors: int) -> float:
        """Calculate normalized topic error frequency [0.0, 1.0].

        Normalized relative to the highest error count among candidate topics for this student.
        """
        if max_topic_errors <= 0 or topic_errors <= 0:
            return 0.0
        return round(min(1.0, max(0.0, topic_errors / max_topic_errors)), 4)

    def calculate_recency_score(
        self,
        latest_timestamp: Optional[datetime],
        now: Optional[datetime] = None,
    ) -> float:
        """Calculate linear recency decay score [0.0, 1.0].

        Scores 1.0 if observed today, decaying linearly to 0.0 at recency_window_days.
        """
        if latest_timestamp is None:
            return 0.0

        current_time = now or datetime.now(timezone.utc)
        ts = latest_timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        delta_seconds = (current_time - ts).total_seconds()
        delta_days = max(0.0, delta_seconds / 86400.0)

        if delta_days <= 0.0:
            return 1.0
        if delta_days >= self.recency_window_days:
            return 0.0

        score = 1.0 - (delta_days / self.recency_window_days)
        return round(max(0.0, min(1.0, score)), 4)

    def calculate_recurrence_score(self, category_counts: Dict[str, int]) -> float:
        """Calculate error category recurrence score [0.0, 1.0].

        Properties:
        - If max occurrences k <= 1: 0.0 (an error occurring once is not yet recurring).
        - If k >= recurrence_saturation: 1.0.
        - For intermediate counts: linear scaling (k - 1) / (saturation - 1).
        """
        if not category_counts:
            return 0.0

        k = max(category_counts.values())
        if k <= 1:
            return 0.0
        if k >= self.recurrence_saturation:
            return 1.0

        score = (k - 1) / (self.recurrence_saturation - 1)
        return round(max(0.0, min(1.0, score)), 4)

    def calculate_difficulty_score(
        self,
        attempts_count: int,
        incorrect_attempts: int,
    ) -> float:
        """Calculate difficulty score based on verified assessment performance [0.0, 1.0].

        Academic Integrity:
        - Only verified assessment attempts provide correctness signals.
        - Classifier predictions are NOT treated as verified incorrect answers.
        - If attempts == 0, returns documented neutral default (default_difficulty).
        """
        if attempts_count <= 0:
            return round(self.default_difficulty, 4)

        raw_difficulty = incorrect_attempts / attempts_count
        return round(max(0.0, min(1.0, raw_difficulty)), 4)

    def calculate_recent_success_score(
        self,
        attempts_count: int,
        correct_attempts: int,
        last_attempt_at: Optional[datetime],
        now: Optional[datetime] = None,
    ) -> float:
        """Calculate recent verified success score lowering topic priority [0.0, 1.0].

        High recent verified success rate indicates the student has recently demonstrated
        competence on this topic, appropriately decreasing the priority of immediate intervention.
        """
        if attempts_count <= 0 or correct_attempts <= 0 or last_attempt_at is None:
            return 0.0

        current_time = now or datetime.now(timezone.utc)
        ts = last_attempt_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        delta_seconds = (current_time - ts).total_seconds()
        delta_days = max(0.0, delta_seconds / 86400.0)

        if delta_days >= self.success_window_days:
            return 0.0

        recency_factor = max(0.0, 1.0 - (delta_days / self.success_window_days))
        success_rate = min(1.0, max(0.0, correct_attempts / attempts_count))

        return round(max(0.0, min(1.0, success_rate * recency_factor)), 4)

    def calculate_priority(
        self,
        evidence: TopicEvidence,
        max_topic_errors: int,
        now: Optional[datetime] = None,
    ) -> PriorityBreakdown:
        """Compute the full component breakdown and final priority score for a topic.

        Formula:
            priority = w1*freq + w2*recency + w3*recurrence + w4*difficulty - w5*recent_success
            final_score = max(0.0, min(1.0, round(priority, 4)))
        """
        freq_score = self.calculate_frequency_score(evidence.error_count, max_topic_errors)
        recency_score = self.calculate_recency_score(evidence.latest_error_timestamp, now=now)
        recurrence_score = self.calculate_recurrence_score(evidence.confirmed_categories)
        difficulty_score = self.calculate_difficulty_score(
            evidence.attempts_count, evidence.incorrect_attempts
        )
        recent_success_score = self.calculate_recent_success_score(
            evidence.attempts_count,
            evidence.correct_attempts,
            evidence.last_attempt_at,
            now=now,
        )

        raw_priority = (
            self.w1 * freq_score
            + self.w2 * recency_score
            + self.w3 * recurrence_score
            + self.w4 * difficulty_score
            - self.w5 * recent_success_score
        )

        final_score = round(max(0.0, min(1.0, raw_priority)), 4)

        # Build explainable rationale for each component
        explanations = {
            "frequency": (
                f"{evidence.error_count} errors ({freq_score:.2f} relative to student maximum of {max_topic_errors})"
            ),
            "recency": (
                f"Recency score {recency_score:.2f} based on latest diagnostic event "
                f"(linear decay window: {self.recency_window_days} days)"
                if evidence.latest_error_timestamp
                else "No diagnostic error timestamp recorded (recency=0.0)"
            ),
            "recurrence": (
                f"Recurrence score {recurrence_score:.2f} (dominant category repeated "
                f"{max(evidence.confirmed_categories.values()) if evidence.confirmed_categories else 0} times, "
                f"saturation threshold: {self.recurrence_saturation})"
            ),
            "difficulty": (
                f"Verified error rate of {difficulty_score:.2f} ({evidence.incorrect_attempts}/{evidence.attempts_count} attempts)"
                if evidence.attempts_count > 0
                else f"No verified assessment attempts recorded (neutral baseline: {self.default_difficulty})"
            ),
            "recent_success": (
                f"Verified recent success factor {recent_success_score:.2f} "
                f"({evidence.correct_attempts}/{evidence.attempts_count} correct, "
                f"success window: {self.success_window_days} days)"
                if evidence.attempts_count > 0 and evidence.correct_attempts > 0
                else "No recent verified success reducing priority"
            ),
        }

        return PriorityBreakdown(
            frequency_score=freq_score,
            recency_score=recency_score,
            recurrence_score=recurrence_score,
            difficulty_score=difficulty_score,
            recent_success_score=recent_success_score,
            final_score=final_score,
            weights=self.get_weights_dict(),
            component_explanations=explanations,
        )

    def rank_topics(
        self,
        evidences: List[TopicEvidence],
        now: Optional[datetime] = None,
    ) -> List[TopicPriorityRank]:
        """Rank candidate topics deterministically using multi-tier tie-breaking.

        Tie-breaking hierarchy:
        1. Higher final priority_score (descending)
        2. Higher recurrence_score (descending)
        3. Higher recency_score (descending)
        4. Higher frequency_score (descending)
        5. Lexicographical topic name (ascending, case-insensitive)
        """
        if not evidences:
            return []

        max_topic_errors = max((e.error_count for e in evidences), default=0)

        scored: List[TopicPriorityRank] = []
        for ev in evidences:
            breakdown = self.calculate_priority(ev, max_topic_errors, now=now)
            scored.append(
                TopicPriorityRank(
                    topic=ev.topic,
                    rank=1,  # will be assigned after sorting
                    priority_score=breakdown.final_score,
                    breakdown=breakdown,
                    dominant_error_category=ev.dominant_error_category,
                    error_count=ev.error_count,
                    attempts_count=ev.attempts_count,
                    mastery_score=ev.mastery_score,
                )
            )

        # Multi-tier deterministic sorting key:
        # (-final_score, -recurrence_score, -recency_score, -frequency_score, topic.lower())
        scored.sort(
            key=lambda item: (
                -item.priority_score,
                -item.breakdown.recurrence_score,
                -item.breakdown.recency_score,
                -item.breakdown.frequency_score,
                item.topic.lower(),
            )
        )

        for i, item in enumerate(scored, start=1):
            item.rank = i

        return scored
