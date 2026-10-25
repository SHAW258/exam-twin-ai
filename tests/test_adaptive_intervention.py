"""Unit and integration tests for Phase 7: Adaptive Intervention Engine.

Verifies:
- Priority-score normalization, boundaries, and configurable weights
- Recency linear decay, recurrence saturation, and verified success penalty
- Deterministic multi-tier topic ranking and tie-breaking
- Canonical ErrorType to InterventionStrategy mappings
- Uncertain diagnosis and review-flag handling (CLARIFICATION_REQUIRED)
- Cold-start recommendation behavior without fabricating weaknesses
- Student data isolation across recommendations
- Read-only integrity (no mutations to Phase 6 learner state or history)
- Resilient course-grounded RAG fallback when retrieval fails
- Pydantic schema validation and serialization
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.adaptive_intervention import (
    AdaptiveInterventionService,
    InterventionRecommendation,
    InterventionStrategy,
    InterventionStrategySelector,
    PriorityBreakdown,
    StrategySelectionResult,
    TopicEvidence,
    TopicPriorityRank,
    TopicPriorityScorer,
)
from src.database.connection import DatabaseManager
from src.database.models import Base
from src.error_diagnosis.taxonomy import ErrorType
from src.learner_state.models import ErrorDiagnosisRecord, Student, TopicMasteryState
from src.learner_state.service import (
    InvalidStudentIdentifierError,
    LearnerStateService,
)
from src.rag.rag_service import RAGResponse, RAGService, SourceCitation


# -----------------------------------------------------------------------------
# Test Fixtures
# -----------------------------------------------------------------------------
@pytest.fixture
def in_memory_db():
    """Create an isolated in-memory SQLite database for test execution."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=True, expire_on_commit=False)

    class InMemoryDbManager(DatabaseManager):
        def __init__(self):
            self._engine = engine
            self._session_factory = session_factory

    return InMemoryDbManager()


@pytest.fixture
def learner_service(in_memory_db):
    """Create a LearnerStateService backed by isolated in-memory database."""
    return LearnerStateService(db_manager=in_memory_db)


@pytest.fixture
def scorer():
    """Create a standard TopicPriorityScorer with default weights."""
    return TopicPriorityScorer()


@pytest.fixture
def strategy_selector():
    """Create a standard InterventionStrategySelector."""
    return InterventionStrategySelector()


# -----------------------------------------------------------------------------
# 1. Topic Priority Scoring Tests
# -----------------------------------------------------------------------------
def test_priority_score_normalization_and_boundaries(scorer):
    """Verify all component scores and final score are strictly bounded in [0.0, 1.0]."""
    # Max error scenario
    now = datetime.now(timezone.utc)
    ev_high = TopicEvidence(
        topic="Algorithms",
        error_count=10,
        confirmed_categories={"CONCEPTUAL_MISUNDERSTANDING": 5},
        latest_error_timestamp=now,
        attempts_count=10,
        incorrect_attempts=10,
        correct_attempts=0,
    )
    breakdown_high = scorer.calculate_priority(ev_high, max_topic_errors=10, now=now)
    assert 0.0 <= breakdown_high.frequency_score <= 1.0
    assert 0.0 <= breakdown_high.recency_score <= 1.0
    assert 0.0 <= breakdown_high.recurrence_score <= 1.0
    assert 0.0 <= breakdown_high.difficulty_score <= 1.0
    assert 0.0 <= breakdown_high.recent_success_score <= 1.0
    assert 0.0 <= breakdown_high.final_score <= 1.0

    # Zero activity scenario
    ev_zero = TopicEvidence(topic="Databases")
    breakdown_zero = scorer.calculate_priority(ev_zero, max_topic_errors=10, now=now)
    assert breakdown_zero.frequency_score == 0.0
    assert breakdown_zero.recency_score == 0.0
    assert breakdown_zero.recurrence_score == 0.0
    assert breakdown_zero.difficulty_score == 0.0
    assert breakdown_zero.recent_success_score == 0.0
    assert breakdown_zero.final_score == 0.0


def test_priority_configurable_weights():
    """Verify scorer respects custom weights and rejects invalid bounds."""
    custom_scorer = TopicPriorityScorer(
        w1_frequency=0.40,
        w2_recency=0.30,
        w3_recurrence=0.10,
        w4_difficulty=0.10,
        w5_recent_success=0.10,
    )
    weights = custom_scorer.get_weights_dict()
    assert weights["w1_frequency"] == 0.40
    assert weights["w2_recency"] == 0.30

    # Negative weight raises ValueError
    with pytest.raises(ValueError, match="Weight w1_frequency must be between 0.0 and 1.0"):
        TopicPriorityScorer(w1_frequency=-0.1)

    # Weight > 1.0 raises ValueError
    with pytest.raises(ValueError, match="Weight w2_recency must be between 0.0 and 1.0"):
        TopicPriorityScorer(w2_recency=1.5)

    # Invalid window or saturation
    with pytest.raises(ValueError, match="recency_window_days must be at least 1"):
        TopicPriorityScorer(recency_window_days=0)

    with pytest.raises(ValueError, match="recurrence_saturation must be at least 2"):
        TopicPriorityScorer(recurrence_saturation=1)


def test_priority_recency_decay(scorer):
    """Verify linear decay of recency score over the configured time window."""
    now = datetime(2026, 10, 25, 12, 0, 0, tzinfo=timezone.utc)

    # Event observed right now
    score_today = scorer.calculate_recency_score(now, now=now)
    assert score_today == 1.0

    # Event observed 15 days ago (half of 30-day window)
    ts_15d = now - timedelta(days=15)
    score_15d = scorer.calculate_recency_score(ts_15d, now=now)
    assert pytest.approx(score_15d, abs=0.01) == 0.50

    # Event observed 30 days ago (exact boundary)
    ts_30d = now - timedelta(days=30)
    score_30d = scorer.calculate_recency_score(ts_30d, now=now)
    assert score_30d == 0.0

    # Event observed 45 days ago (beyond boundary)
    ts_45d = now - timedelta(days=45)
    score_45d = scorer.calculate_recency_score(ts_45d, now=now)
    assert score_45d == 0.0

    # No timestamp
    assert scorer.calculate_recency_score(None, now=now) == 0.0


def test_priority_recurrence_saturation(scorer):
    """Verify recurrence score scales and saturates appropriately."""
    # 0 or 1 occurrence: not recurring yet
    assert scorer.calculate_recurrence_score({}) == 0.0
    assert scorer.calculate_recurrence_score({"RECALL_FAILURE": 1}) == 0.0

    # 2 occurrences with saturation=3 -> (2-1)/(3-1) = 0.50
    assert scorer.calculate_recurrence_score({"RECALL_FAILURE": 2}) == 0.50

    # 3 occurrences -> saturated at 1.0
    assert scorer.calculate_recurrence_score({"RECALL_FAILURE": 3}) == 1.0

    # 5 occurrences -> capped at 1.0
    assert scorer.calculate_recurrence_score({"RECALL_FAILURE": 5}) == 1.0

    # Multiple categories: max category count determines recurrence
    assert scorer.calculate_recurrence_score({"RECALL_FAILURE": 1, "FORMULA_RULE_ERROR": 3}) == 1.0


def test_priority_difficulty_score(scorer):
    """Verify empirical difficulty proxy derived only from verified assessment attempts."""
    # Zero attempts -> default difficulty (0.0)
    assert scorer.calculate_difficulty_score(attempts_count=0, incorrect_attempts=0) == 0.0

    # 10 attempts, 5 incorrect -> 0.50
    assert scorer.calculate_difficulty_score(attempts_count=10, incorrect_attempts=5) == 0.50

    # 10 attempts, 10 incorrect -> 1.0
    assert scorer.calculate_difficulty_score(attempts_count=10, incorrect_attempts=10) == 1.0

    # 10 attempts, 0 incorrect -> 0.0
    assert scorer.calculate_difficulty_score(attempts_count=10, incorrect_attempts=0) == 0.0


def test_priority_recent_success_reduces_score(scorer):
    """Verify verified recent success appropriately lowers priority score."""
    now = datetime(2026, 10, 25, 12, 0, 0, tzinfo=timezone.utc)

    # Base topic with 4 errors, no verified attempts
    ev_struggling = TopicEvidence(
        topic="Calculus",
        error_count=4,
        confirmed_categories={"FORMULA_RULE_ERROR": 3},
        latest_error_timestamp=now,
        attempts_count=0,
        correct_attempts=0,
        incorrect_attempts=0,
    )
    breakdown_struggling = scorer.calculate_priority(ev_struggling, max_topic_errors=4, now=now)

    # Identical topic with 4 errors BUT student recently solved 5/5 verified questions correctly today
    ev_repaired = TopicEvidence(
        topic="Calculus",
        error_count=4,
        confirmed_categories={"FORMULA_RULE_ERROR": 3},
        latest_error_timestamp=now,
        attempts_count=5,
        correct_attempts=5,
        incorrect_attempts=0,
        last_attempt_at=now,
    )
    breakdown_repaired = scorer.calculate_priority(ev_repaired, max_topic_errors=4, now=now)

    assert breakdown_repaired.recent_success_score == 1.0
    # Recent success must strictly reduce final priority score
    assert breakdown_repaired.final_score < breakdown_struggling.final_score
    diff = round(breakdown_struggling.final_score - breakdown_repaired.final_score, 4)
    assert diff == pytest.approx(scorer.w5 * 1.0, abs=0.01)


def test_deterministic_topic_ranking_and_tie_breaking(scorer):
    """Verify deterministic multi-tier tie-breaking across topics."""
    now = datetime(2026, 10, 25, 12, 0, 0, tzinfo=timezone.utc)

    # Topic A and Topic B have identical final scores, but Topic A has higher recurrence
    ev_a = TopicEvidence(
        topic="TopicAlpha",
        error_count=3,
        confirmed_categories={"CONCEPTUAL_MISUNDERSTANDING": 3},  # recurrence = 1.0
        latest_error_timestamp=now,
    )
    ev_b = TopicEvidence(
        topic="TopicBeta",
        error_count=3,
        confirmed_categories={"RECALL_FAILURE": 2},  # recurrence = 0.5
        latest_error_timestamp=now,
    )

    ranked1 = scorer.rank_topics([ev_a, ev_b], now=now)
    ranked2 = scorer.rank_topics([ev_b, ev_a], now=now)  # reverse input order

    # Both runs must yield identical ordering with TopicAlpha ranked #1
    assert [r.topic for r in ranked1] == ["TopicAlpha", "TopicBeta"]
    assert [r.topic for r in ranked2] == ["TopicAlpha", "TopicBeta"]
    assert ranked1[0].rank == 1
    assert ranked1[1].rank == 2


# -----------------------------------------------------------------------------
# 2. Strategy Selection Tests
# -----------------------------------------------------------------------------
@pytest.mark.parametrize(
    "error_type, expected_strategy",
    [
        (ErrorType.CONCEPTUAL_MISUNDERSTANDING, InterventionStrategy.CONCEPT_EXPLANATION),
        (ErrorType.RECALL_FAILURE, InterventionStrategy.DEFINITION_RECALL),
        (ErrorType.FORMULA_RULE_ERROR, InterventionStrategy.FORMULA_REVISION),
        (ErrorType.CALCULATION_EXECUTION_ERROR, InterventionStrategy.CALCULATION_DRILL),
        (ErrorType.REASONING_LOGICAL_ERROR, InterventionStrategy.STEP_BY_STEP_REASONING),
        (ErrorType.QUESTION_MISREADING, InterventionStrategy.QUESTION_INTERPRETATION),
        (ErrorType.PARTIAL_KNOWLEDGE, InterventionStrategy.GUIDED_PRACTICE),
    ],
)
def test_strategy_selector_all_canonical_mappings(strategy_selector, error_type, expected_strategy):
    """Verify each canonical ErrorType maps to its designated pedagogical InterventionStrategy."""
    evidence = TopicEvidence(
        topic="TestTopic",
        error_count=3,
        confirmed_categories={error_type.value: 3},
        dominant_error_category=error_type.value,
    )
    result = strategy_selector.select_strategy(evidence)
    assert result.strategy == expected_strategy
    assert error_type.value in result.rationale
    assert result.is_uncertain is False
    assert result.review_required is False


def test_strategy_selector_uncertain_diagnosis_handling(strategy_selector):
    """Verify diagnoses requiring review return CLARIFICATION_REQUIRED."""
    evidence = TopicEvidence(
        topic="Quantum Computing",
        error_count=2,
        confirmed_categories={},  # All diagnoses were below confidence threshold
        needs_review_count=2,
    )
    result = strategy_selector.select_strategy(evidence)
    assert result.strategy == InterventionStrategy.CLARIFICATION_REQUIRED
    assert result.is_uncertain is True
    assert result.review_required is True
    assert "Teacher review or diagnostic clarification" in result.rationale


def test_strategy_selector_tied_categories_fallback(strategy_selector):
    """Verify equal frequency across multiple categories falls back to MIXED_REVIEW."""
    evidence = TopicEvidence(
        topic="Operating Systems",
        error_count=4,
        confirmed_categories={
            "CONCEPTUAL_MISUNDERSTANDING": 2,
            "RECALL_FAILURE": 2,
        },
    )
    result = strategy_selector.select_strategy(evidence)
    assert result.strategy == InterventionStrategy.MIXED_REVIEW
    assert "Multiple error categories occur with equal frequency" in result.rationale


def test_strategy_selector_no_errors_defaults_to_guided_practice(strategy_selector):
    """Verify unobserved topic or topic with zero errors defaults to GUIDED_PRACTICE."""
    evidence = TopicEvidence(topic="Computer Networks", error_count=0)
    result = strategy_selector.select_strategy(evidence)
    assert result.strategy == InterventionStrategy.GUIDED_PRACTICE
    assert "Standard guided practice recommended" in result.rationale


# -----------------------------------------------------------------------------
# 3. Adaptive Intervention Service Integration Tests
# -----------------------------------------------------------------------------
def test_service_cold_start_behavior(learner_service):
    """Verify a student with no prior history receives a transparent cold-start recommendation."""
    service = AdaptiveInterventionService(learner_state_service=learner_service)

    rec = service.recommend_intervention(external_student_id="new_student_999")

    assert isinstance(rec, InterventionRecommendation)
    assert rec.student_id == "new_student_999"
    assert rec.is_cold_start is True
    assert rec.priority_score == 0.0
    assert rec.selected_strategy == InterventionStrategy.GUIDED_PRACTICE
    assert "Welcome to ExamTwin" in rec.student_explanation
    # Ensure no fabricated weakness or diagnostic errors
    assert rec.error_dna_evidence.total_diagnoses == 0
    assert rec.mastery_evidence is None


def test_service_student_isolation(learner_service, in_memory_db):
    """Verify student records are completely isolated and do not leak across recommendations."""
    service = AdaptiveInterventionService(learner_state_service=learner_service)

    # Seed errors exclusively for Student A
    with in_memory_db.get_session() as session:
        student_a = Student(external_student_id="student_A")
        session.add(student_a)
        session.flush()

        for _ in range(5):
            rec = ErrorDiagnosisRecord(
                student_id=student_a.id,
                topic="Advanced Graph Theory",
                error_category="CONCEPTUAL_MISUNDERSTANDING",
                confidence_score=0.92,
                needs_review=False,
            )
            session.add(rec)

    # Request recommendation for Student B (who has no history)
    rec_b = service.recommend_intervention(external_student_id="student_B")
    assert rec_b.student_id == "student_B"
    assert rec_b.is_cold_start is True
    assert rec_b.selected_topic != "Advanced Graph Theory"
    assert rec_b.error_dna_evidence.total_diagnoses == 0

    # Request recommendation for Student A
    rec_a = service.recommend_intervention(external_student_id="student_A")
    assert rec_a.student_id == "student_A"
    assert rec_a.is_cold_start is False
    assert rec_a.selected_topic == "Advanced Graph Theory"
    assert rec_a.selected_strategy == InterventionStrategy.CONCEPT_EXPLANATION
    assert rec_a.priority_score > 0.0


def test_service_read_only_guarantee(learner_service, in_memory_db):
    """Verify recommendation generation does NOT alter Phase 6 history or mastery records."""
    service = AdaptiveInterventionService(learner_state_service=learner_service)

    # Setup student with an existing error record
    with in_memory_db.get_session() as session:
        student = Student(external_student_id="student_readonly")
        session.add(student)
        session.flush()

        rec = ErrorDiagnosisRecord(
            student_id=student.id,
            topic="Compiler Design",
            error_category="FORMULA_RULE_ERROR",
            confidence_score=0.88,
            needs_review=False,
        )
        session.add(rec)

    # Count records before
    with in_memory_db.get_session() as session:
        count_err_before = session.query(ErrorDiagnosisRecord).count()
        count_mast_before = session.query(TopicMasteryState).count()

    # Generate recommendation
    rec = service.recommend_intervention(external_student_id="student_readonly")
    assert rec.selected_topic == "Compiler Design"

    # Count records after
    with in_memory_db.get_session() as session:
        count_err_after = session.query(ErrorDiagnosisRecord).count()
        count_mast_after = session.query(TopicMasteryState).count()

    assert count_err_before == count_err_after
    assert count_mast_before == count_mast_after


def test_service_invalid_student_id_handling(learner_service):
    """Verify blank or invalid student identifiers raise InvalidStudentIdentifierError."""
    service = AdaptiveInterventionService(learner_state_service=learner_service)

    with pytest.raises(InvalidStudentIdentifierError):
        service.recommend_intervention(external_student_id="")

    with pytest.raises(InvalidStudentIdentifierError):
        service.recommend_intervention(external_student_id="   ")


def test_service_optional_rag_integration_and_fallback(learner_service, in_memory_db):
    """Verify RAG content retrieval succeeds when available and falls back gracefully on failure."""
    # Seed learner state
    with in_memory_db.get_session() as session:
        student = Student(external_student_id="student_rag")
        session.add(student)
        session.flush()

        session.add(
            ErrorDiagnosisRecord(
                student_id=student.id,
                topic="Data Structures",
                error_category="CONCEPTUAL_MISUNDERSTANDING",
                confidence_score=0.90,
                needs_review=False,
            )
        )

    # 1. Successful Mock RAG service
    class MockSuccessRAG(RAGService):
        def __init__(self):
            pass

        def answer_question(self, question, **kwargs):
            return RAGResponse(
                answer="Trees are hierarchical data structures consisting of nodes.",
                sources=[
                    SourceCitation(
                        document_id="doc_ds_101",
                        source="data_structures.pdf",
                        page_number=42,
                        similarity_score=0.89,
                    )
                ],
                retrieved_chunks=1,
                is_grounded=True,
                question=question,
            )

    service_with_rag = AdaptiveInterventionService(
        learner_state_service=learner_service,
        rag_service=MockSuccessRAG(),
    )
    rec_success = service_with_rag.recommend_intervention(
        external_student_id="student_rag",
        include_grounded_content=True,
    )
    assert rec_success.grounded_content is not None
    assert "hierarchical data structures" in rec_success.grounded_content
    assert len(rec_success.grounded_citations) == 1
    assert rec_success.grounded_citations[0].source == "data_structures.pdf"

    # 2. Failing RAG service (e.g. Gemini quota exhausted / offline)
    class MockFailingRAG(RAGService):
        def __init__(self):
            pass

        def answer_question(self, question, **kwargs):
            raise RuntimeError("Gemini 503 Service Unavailable")

    service_failing_rag = AdaptiveInterventionService(
        learner_state_service=learner_service,
        rag_service=MockFailingRAG(),
    )
    # Recommendation must NOT crash; it should safely fall back with grounded_content=None
    rec_fallback = service_failing_rag.recommend_intervention(
        external_student_id="student_rag",
        include_grounded_content=True,
    )
    assert rec_fallback.selected_topic == "Data Structures"
    assert rec_fallback.grounded_content is None
    assert rec_fallback.grounded_citations == []


def test_pydantic_schema_serialization_and_validation():
    """Verify recommendation model validates constraints and serializes cleanly."""
    breakdown = PriorityBreakdown(
        frequency_score=0.8,
        recency_score=0.9,
        recurrence_score=1.0,
        difficulty_score=0.5,
        recent_success_score=0.0,
        final_score=0.75,
        weights={"w1_frequency": 0.25},
        component_explanations={"frequency": "high"},
    )
    rec = InterventionRecommendation(
        student_id="student_test_schema",
        selected_topic="Algorithms",
        priority_score=0.75,
        priority_breakdown=breakdown,
        selected_strategy=InterventionStrategy.WORKED_EXAMPLE,
        strategy_rationale="Worked examples help build mental schema.",
        student_explanation="Focus on Algorithms with worked examples.",
        is_uncertain=False,
        review_required=False,
    )

    data = rec.to_dict()
    assert isinstance(data, dict)
    assert data["student_id"] == "student_test_schema"
    assert data["selected_strategy"] == "WORKED_EXAMPLE"
    assert data["priority_score"] == 0.75
    assert "Heuristic pedagogical recommendation" in data["disclaimer"]
