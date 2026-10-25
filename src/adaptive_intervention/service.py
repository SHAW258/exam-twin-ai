"""Domain service orchestrating topic prioritization and pedagogical intervention recommendations.

Integrates Phase 6 Learner State (Error DNA, Topic Mastery) with explainable
priority scoring, deterministic strategy selection, and optional Phase 4
course-grounded RAG retrieval.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from src.adaptive_intervention.models import InterventionStrategy
from src.adaptive_intervention.priority import TopicEvidence, TopicPriorityScorer
from src.adaptive_intervention.schemas import (
    ErrorDNAEvidence,
    InterventionRecommendation,
    PriorityBreakdown,
    TopicMasteryEvidence,
    TopicPriorityRank,
)
from src.adaptive_intervention.strategy_selector import InterventionStrategySelector
from src.config.settings import Settings, get_settings
from src.learner_state.service import (
    InvalidStudentIdentifierError,
    LearnerStateService,
)
from src.rag.rag_service import RAGService, SourceCitation

logger = logging.getLogger(__name__)


class AdaptiveInterventionService:
    """Core domain service for personalized educational intervention recommendations."""

    def __init__(
        self,
        learner_state_service: Optional[LearnerStateService] = None,
        rag_service: Optional[RAGService] = None,
        priority_scorer: Optional[TopicPriorityScorer] = None,
        strategy_selector: Optional[InterventionStrategySelector] = None,
        settings: Optional[Settings] = None,
    ):
        """Initialize AdaptiveInterventionService with dependency injection.

        Args:
            learner_state_service: Service managing persistent student state and Error DNA.
            rag_service: Optional Grounded RAG service for retrieving course material.
            priority_scorer: Multi-factor topic priority scorer.
            strategy_selector: Deterministic pedagogical strategy selector.
            settings: Application configuration settings.
        """
        self.settings = settings or get_settings()
        self.learner_state_service = learner_state_service or LearnerStateService()
        self.rag_service = rag_service
        self.priority_scorer = priority_scorer or TopicPriorityScorer(settings=self.settings)
        self.strategy_selector = strategy_selector or InterventionStrategySelector()

    def _validate_student_id(self, external_student_id: str) -> str:
        """Validate format of external student identifier."""
        if not external_student_id or not str(external_student_id).strip():
            raise InvalidStudentIdentifierError(
                "external_student_id must be a non-empty string identifier."
            )
        return str(external_student_id).strip()

    def recommend_intervention(
        self,
        external_student_id: str,
        candidate_topics: Optional[List[str]] = None,
        include_grounded_content: bool = False,
        document_ids: Optional[List[str]] = None,
        now: Optional[datetime] = None,
        authenticated_student_id: Optional[str] = None,
    ) -> InterventionRecommendation:
        """Generate an explainable adaptive intervention recommendation for a student.

        Workflow:
        1. Validate student identity and ensure strict student isolation via authorization boundary.
        2. Retrieve student Error DNA summary and chronological diagnosis history.
        3. Identify candidate topics (from parameter or observed learner history).
        4. If no history exists, produce a transparent cold-start recommendation.
        5. Aggregate per-topic evidence (error frequencies, recency, recurrence, verified mastery).
        6. Compute priority scores and rank topics deterministically.
        7. Select appropriate pedagogical strategy based on dominant error evidence.
        8. Optionally retrieve grounded course materials and verified citations via RAG.
        9. Assemble structured, evidence-backed recommendation contract.

        Args:
            external_student_id: Stable external student identifier.
            candidate_topics: Optional explicit list of topics to consider.
            include_grounded_content: If True, queries RAG service for course materials.
            document_ids: Optional document filters for RAG retrieval.
            now: Optional current timestamp override for reproducible testing.
            authenticated_student_id: Optional security principal from auth token.

        Returns:
            InterventionRecommendation schema detailing topic, strategy, scores, and rationale.
        """
        clean_student_id = self.learner_state_service.enforce_student_authorization(
            external_student_id, authenticated_student_id=authenticated_student_id
        )
        current_time = now or datetime.now(timezone.utc)

        # Step 1: Retrieve persistent learner state and history (strictly isolated)
        dna_summary = self.learner_state_service.get_error_dna_summary(
            clean_student_id, authenticated_student_id=authenticated_student_id
        )
        history = self.learner_state_service.get_student_history(
            clean_student_id, limit=500, authenticated_student_id=authenticated_student_id
        )

        # Step 2: Determine topic universe
        topic_set = set()
        if candidate_topics:
            topic_set.update(t.strip() for t in candidate_topics if t and t.strip())
        else:
            # Discover topics from empirical learner state
            for item in dna_summary.most_affected_topics:
                topic_set.add(item.topic)
            for m in dna_summary.topic_masteries:
                topic_set.add(m.topic)
            for rec in history:
                if rec.topic:
                    topic_set.add(rec.topic)

        # Step 3: Handle cold-start scenario when student has no recorded history
        if not topic_set:
            logger.info("Cold-start recommendation for student '%s' (no activity history).", clean_student_id)
            default_topic = "General Foundation"
            zero_breakdown = PriorityBreakdown(
                frequency_score=0.0,
                recency_score=0.0,
                recurrence_score=0.0,
                difficulty_score=0.0,
                recent_success_score=0.0,
                final_score=0.0,
                weights=self.priority_scorer.get_weights_dict(),
                component_explanations={
                    "frequency": "No diagnostic errors recorded (cold start).",
                    "recency": "No activity timestamp recorded.",
                    "recurrence": "No recurring errors observed.",
                    "difficulty": "No verified assessment attempts.",
                    "recent_success": "No verified recent successes.",
                },
            )
            return InterventionRecommendation(
                student_id=clean_student_id,
                selected_topic=default_topic,
                priority_score=0.0,
                priority_breakdown=zero_breakdown,
                selected_strategy=InterventionStrategy.GUIDED_PRACTICE,
                strategy_rationale=(
                    "No prior diagnostic or assessment activity observed for this student. "
                    "Introductory guided practice recommended to establish initial learner state."
                ),
                student_explanation=(
                    f"Welcome to ExamTwin! No previous study activity was found. "
                    f"Let's begin with introductory practice in {default_topic} to start your learning profile."
                ),
                is_uncertain=False,
                review_required=False,
                is_cold_start=True,
                error_dna_evidence=ErrorDNAEvidence(total_diagnoses=0),
                mastery_evidence=None,
                grounded_content=None,
                grounded_citations=[],
                all_ranked_topics=[
                    TopicPriorityRank(
                        topic=default_topic,
                        rank=1,
                        priority_score=0.0,
                        breakdown=zero_breakdown,
                        error_count=0,
                        attempts_count=0,
                        mastery_score=0.0,
                    )
                ],
                timestamp=current_time,
            )

        # Step 4: Aggregate evidence per topic
        # Map masteries by topic
        mastery_by_topic = {m.topic: m for m in dna_summary.topic_masteries}

        evidences: List[TopicEvidence] = []
        for topic_name in sorted(topic_set):
            # Gather error history for this topic
            topic_records = [r for r in history if r.topic == topic_name]
            error_count = len(topic_records)

            confirmed_cats: Dict[str, int] = {}
            needs_review_count = 0
            latest_ts: Optional[datetime] = None

            for r in topic_records:
                if r.created_at:
                    if latest_ts is None or r.created_at > latest_ts:
                        latest_ts = r.created_at

                if r.needs_review:
                    needs_review_count += 1
                elif r.error_category:
                    confirmed_cats[r.error_category] = confirmed_cats.get(r.error_category, 0) + 1

            # Mastery state
            m_state = mastery_by_topic.get(topic_name)
            attempts_count = m_state.attempts_count if m_state else 0
            correct_attempts = m_state.correct_attempts if m_state else 0
            incorrect_attempts = m_state.incorrect_attempts if m_state else 0
            mastery_score = m_state.mastery_score if m_state else 0.0
            last_attempt_at = m_state.last_attempt_at if m_state else None

            # Dominant error category
            dominant_cat = None
            if confirmed_cats:
                dominant_cat = max(confirmed_cats.items(), key=lambda x: x[1])[0]

            evidences.append(
                TopicEvidence(
                    topic=topic_name,
                    error_count=error_count,
                    confirmed_categories=confirmed_cats,
                    needs_review_count=needs_review_count,
                    latest_error_timestamp=latest_ts,
                    attempts_count=attempts_count,
                    correct_attempts=correct_attempts,
                    incorrect_attempts=incorrect_attempts,
                    mastery_score=mastery_score,
                    last_attempt_at=last_attempt_at,
                    dominant_error_category=dominant_cat,
                )
            )

        # Step 5: Rank topics deterministically
        ranked_topics = self.priority_scorer.rank_topics(evidences, now=current_time)
        top_rank = ranked_topics[0]

        # Find matching evidence for selected top topic
        top_evidence = next(e for e in evidences if e.topic == top_rank.topic)

        # Step 6: Select pedagogical intervention strategy
        strategy_result = self.strategy_selector.select_strategy(top_evidence)

        # Step 7: Build student-facing explanation
        component_parts = []
        if top_rank.breakdown.frequency_score > 0.0:
            component_parts.append(f"{top_evidence.error_count} recorded diagnostic errors")
        if top_rank.breakdown.recurrence_score > 0.0 and top_evidence.dominant_error_category:
            component_parts.append(f"repeated occurrences of {top_evidence.dominant_error_category}")
        if top_rank.breakdown.difficulty_score > 0.5:
            component_parts.append("high rate of incorrect assessment attempts")
        if top_rank.breakdown.recent_success_score > 0.0:
            component_parts.append("offset by recent verified progress")

        evidence_str = ", ".join(component_parts) if component_parts else "overall curricular sequencing"

        friendly_strategy_name = strategy_result.strategy.value.replace("_", " ").title()
        student_explanation = (
            f"Topic '{top_rank.topic}' has been prioritized (score: {top_rank.priority_score:.2f}) "
            f"due to {evidence_str}. Recommended activity: {friendly_strategy_name} — {strategy_result.rationale}"
        )

        # Step 8: Optional Grounded Content Integration via Phase 4 RAG
        grounded_content: Optional[str] = None
        grounded_citations: List[SourceCitation] = []

        if include_grounded_content and self.rag_service is not None:
            try:
                grounded_content, grounded_citations = self._retrieve_grounded_content(
                    topic=top_rank.topic,
                    strategy=strategy_result.strategy,
                    document_ids=document_ids,
                )
            except Exception as e:
                logger.warning(
                    "Optional RAG grounded content retrieval failed for topic '%s': %s",
                    top_rank.topic,
                    e,
                    exc_info=True,
                )
                grounded_content = None
                grounded_citations = []

        # Step 9: Assemble final recommendation contract
        dna_evidence = ErrorDNAEvidence(
            total_diagnoses=dna_summary.total_diagnoses,
            topic_error_count=top_evidence.error_count,
            dominant_error_category=top_evidence.dominant_error_category,
            dominant_category_count=(
                top_evidence.confirmed_categories.get(top_evidence.dominant_error_category, 0)
                if top_evidence.dominant_error_category
                else 0
            ),
            review_required_count=top_evidence.needs_review_count,
            recent_error_count=dna_summary.temporal_trend.recent_diagnoses_count,
            latest_error_timestamp=top_evidence.latest_error_timestamp,
        )

        mastery_evidence = None
        if top_evidence.attempts_count > 0 or top_evidence.last_attempt_at:
            m_rate = (
                top_evidence.correct_attempts / top_evidence.attempts_count
                if top_evidence.attempts_count > 0
                else 0.0
            )
            mastery_evidence = TopicMasteryEvidence(
                attempts_count=top_evidence.attempts_count,
                correct_attempts=top_evidence.correct_attempts,
                incorrect_attempts=top_evidence.incorrect_attempts,
                measured_success_rate=round(m_rate, 4),
                mastery_score=top_evidence.mastery_score,
                last_attempt_at=top_evidence.last_attempt_at,
            )

        return InterventionRecommendation(
            student_id=clean_student_id,
            selected_topic=top_rank.topic,
            priority_score=top_rank.priority_score,
            priority_breakdown=top_rank.breakdown,
            selected_strategy=strategy_result.strategy,
            strategy_rationale=strategy_result.rationale,
            student_explanation=student_explanation,
            is_uncertain=strategy_result.is_uncertain,
            review_required=strategy_result.review_required,
            is_cold_start=False,
            error_dna_evidence=dna_evidence,
            mastery_evidence=mastery_evidence,
            grounded_content=grounded_content,
            grounded_citations=grounded_citations,
            all_ranked_topics=ranked_topics,
            timestamp=current_time,
        )

    def _retrieve_grounded_content(
        self,
        topic: str,
        strategy: InterventionStrategy,
        document_ids: Optional[List[str]] = None,
    ) -> Tuple[Optional[str], List[SourceCitation]]:
        """Retrieve course-grounded content and citations using Phase 4 RAGService."""
        if self.rag_service is None:
            return None, []

        # Formulate query aligned with the selected pedagogical strategy
        if strategy in [
            InterventionStrategy.CONCEPT_EXPLANATION,
            InterventionStrategy.DEFINITION_RECALL,
            InterventionStrategy.FORMULA_REVISION,
            InterventionStrategy.STEP_BY_STEP_REASONING,
        ]:
            query = f"Explain the fundamental concepts, definitions, and rules for {topic}."
            rag_resp = self.rag_service.answer_question(query, document_ids=document_ids)
            return rag_resp.answer, rag_resp.sources

        elif strategy in [
            InterventionStrategy.CALCULATION_DRILL,
            InterventionStrategy.GUIDED_PRACTICE,
            InterventionStrategy.MIXED_REVIEW,
            InterventionStrategy.WORKED_EXAMPLE,
        ]:
            rag_resp = self.rag_service.generate_practice_question(topic=topic, document_ids=document_ids)
            return rag_resp.answer, rag_resp.sources

        else:
            query = f"Provide a diagnostic review of {topic}."
            rag_resp = self.rag_service.answer_question(query, document_ids=document_ids)
            return rag_resp.answer, rag_resp.sources
