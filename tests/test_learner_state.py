"""Comprehensive automated unit tests for Phase 6: Error DNA and Persistent Learner State."""

from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy.exc import IntegrityError

from src.database.connection import DatabaseManager
from src.database.schema import create_tables, drop_tables
from src.error_diagnosis.classifier import ErrorDiagnosisClassifier
from src.error_diagnosis.taxonomy import ErrorType
from src.learner_state.models import ErrorDiagnosisRecord, Student, TopicMasteryState
from src.learner_state.repository import (
    ErrorHistoryRepository,
    StudentRepository,
    TopicMasteryRepository,
)
from src.learner_state.service import (
    InvalidStudentIdentifierError,
    LearnerStateService,
)


@pytest.fixture
def isolated_db_manager():
    """Provide an isolated in-memory SQLite database manager for fast unit tests."""
    mgr = DatabaseManager(database_url="sqlite:///:memory:")
    create_tables(mgr)
    yield mgr
    drop_tables(mgr)
    mgr.dispose()


@pytest.fixture
def mock_classifier():
    """Mock classifier for deterministic unit testing without retraining or external calls."""
    class FakeClassifier:
        def __init__(self, category="CONCEPTUAL_MISUNDERSTANDING", confidence=0.85, needs_review=False):
            self.category = category
            self.confidence = confidence
            self.needs_review = needs_review

        def predict_error(self, question, student_answer, expected_answer=None, context=None):
            if not student_answer or not student_answer.strip():
                return {
                    "predicted_category": None,
                    "confidence": 0.0,
                    "needs_review": True,
                    "message": "Empty answer.",
                    "model_version": "mock_v1",
                }
            return {
                "predicted_category": self.category,
                "confidence": self.confidence,
                "needs_review": self.needs_review,
                "message": f"Diagnosed as {self.category}.",
                "model_version": "mock_v1",
            }

    return FakeClassifier()


@pytest.fixture
def learner_service(isolated_db_manager, mock_classifier):
    """Instantiate LearnerStateService with isolated database and mock classifier."""
    return LearnerStateService(db_manager=isolated_db_manager, classifier=mock_classifier)


# =============================================================================
# 1. Database Model Tests
# =============================================================================

def test_student_creation_and_fields(isolated_db_manager):
    """Verify Student model persists with required fields and defaults."""
    with isolated_db_manager.get_session() as session:
        student = Student(external_student_id="student_101")
        session.add(student)

    with isolated_db_manager.get_session() as session:
        retrieved = session.query(Student).filter_by(external_student_id="student_101").first()
        assert retrieved is not None
        assert retrieved.id.startswith("stud_")
        assert retrieved.created_at is not None
        assert retrieved.updated_at is not None
        assert retrieved.to_dict()["external_student_id"] == "student_101"


def test_unique_external_student_id_constraint(isolated_db_manager):
    """Verify attempting to create duplicate external_student_id raises IntegrityError."""
    with isolated_db_manager.get_session() as session:
        s1 = Student(external_student_id="dup_student_id")
        session.add(s1)

    with pytest.raises(IntegrityError):
        with isolated_db_manager.get_session() as session:
            s2 = Student(external_student_id="dup_student_id")
            session.add(s2)


def test_student_cascade_deletion(isolated_db_manager):
    """Verify deleting a student cascades deletion to error history and topic masteries."""
    with isolated_db_manager.get_session() as session:
        student = Student(external_student_id="cascade_student")
        session.add(student)
        session.flush()

        rec = ErrorDiagnosisRecord(
            student_id=student.id,
            topic="Operating Systems",
            error_category=ErrorType.CONCEPTUAL_MISUNDERSTANDING.value,
            confidence_score=0.9,
        )
        mastery = TopicMasteryState(
            student_id=student.id,
            topic="Operating Systems",
            attempts_count=2,
            correct_attempts=1,
            incorrect_attempts=1,
            mastery_score=0.5,
        )
        session.add(rec)
        session.add(mastery)

    with isolated_db_manager.get_session() as session:
        s = session.query(Student).filter_by(external_student_id="cascade_student").first()
        assert len(s.error_history) == 1
        assert len(s.topic_masteries) == 1
        session.delete(s)

    with isolated_db_manager.get_session() as session:
        records = session.query(ErrorDiagnosisRecord).all()
        masteries = session.query(TopicMasteryState).all()
        assert len(records) == 0
        assert len(masteries) == 0


def test_duplicate_topic_state_constraint(isolated_db_manager):
    """Verify unique constraint on (student_id, topic) prevents duplicates."""
    with isolated_db_manager.get_session() as session:
        student = Student(external_student_id="topic_test_student")
        session.add(student)
        session.flush()

        m1 = TopicMasteryState(student_id=student.id, topic="Data Structures")
        session.add(m1)

    with pytest.raises(IntegrityError):
        with isolated_db_manager.get_session() as session:
            s = session.query(Student).filter_by(external_student_id="topic_test_student").first()
            m2 = TopicMasteryState(student_id=s.id, topic="Data Structures")
            session.add(m2)


# =============================================================================
# 2. Error History & Diagnosis Recording Tests
# =============================================================================

def test_diagnose_and_record_valid_flow(learner_service):
    """Verify diagnose_and_record persists diagnosis and preserves Phase 5 metadata."""
    record = learner_service.diagnose_and_record(
        external_student_id="student_alice",
        question="What is FIFO?",
        student_answer="First In First Out",
        expected_answer="First In First Out",
        topic="Data Structures",
    )

    assert record.id.startswith("err_")
    assert record.topic == "Data Structures"
    assert record.error_category == "CONCEPTUAL_MISUNDERSTANDING"
    assert record.confidence_score == 0.85
    assert record.needs_review is False
    assert record.model_version == "mock_v1"
    assert record.is_verified is False


def test_diagnose_and_record_low_confidence_marks_review(isolated_db_manager):
    """Verify low-confidence predictions are flagged as needs_review=True."""
    class LowConfidenceClassifier:
        def predict_error(self, **kwargs):
            return {
                "predicted_category": None,
                "confidence": 0.35,
                "needs_review": True,
                "message": "Low confidence.",
                "model_version": "baseline_v1",
            }

    service = LearnerStateService(db_manager=isolated_db_manager, classifier=LowConfidenceClassifier())
    rec = service.diagnose_and_record(
        external_student_id="student_bob",
        question="Explain heap",
        student_answer="A sort of tree",
        topic="Algorithms",
    )

    assert rec.error_category is None
    assert rec.confidence_score == 0.35
    assert rec.needs_review is True


def test_invalid_student_id_raises_error(learner_service):
    """Verify empty or whitespace student identifier raises InvalidStudentIdentifierError."""
    with pytest.raises(InvalidStudentIdentifierError):
        learner_service.register_or_get_student("")

    with pytest.raises(InvalidStudentIdentifierError):
        learner_service.diagnose_and_record(
            external_student_id="   ",
            question="Q?",
            student_answer="A",
            topic="General",
        )


def test_diagnose_does_not_mutate_topic_mastery(learner_service, isolated_db_manager):
    """Verify academic requirement: predicted error does NOT automatically alter topic mastery."""
    learner_service.diagnose_and_record(
        external_student_id="student_charlie",
        question="What is recursion?",
        student_answer="A loop",
        topic="Algorithms",
    )

    with isolated_db_manager.get_session() as session:
        masteries = session.query(TopicMasteryState).all()
        # Mastery record must NOT be created or updated purely on predicted error
        assert len(masteries) == 0


def test_verify_diagnosis_record_audit(learner_service):
    """Verify educator or ground truth review can verify a diagnosis event."""
    rec = learner_service.diagnose_and_record(
        external_student_id="student_dana",
        question="What is 2+2?",
        student_answer="5",
        topic="Math",
    )

    verified = learner_service.verify_diagnosis_record(
        record_id=rec.id,
        verified_category=ErrorType.CALCULATION_EXECUTION_ERROR.value,
    )

    assert verified is not None
    assert verified.is_verified is True
    assert verified.verified_error_category == "CALCULATION_EXECUTION_ERROR"
    assert verified.needs_review is False


# =============================================================================
# 3. Topic Mastery Calculations & Bounds Tests
# =============================================================================

def test_mastery_no_attempts_behavior():
    """Verify zero attempts produces 0.0 mastery score."""
    score = TopicMasteryRepository.calculate_estimated_mastery(correct_attempts=0, total_attempts=0)
    assert score == 0.0


def test_mastery_formula_sample_size_credentialing():
    """Verify credential factor scales with sample size while bounding between 0 and 1."""
    # 1/1 correct (100% raw success) should not yield 1.0 mastery due to low sample credential
    score_1 = TopicMasteryRepository.calculate_estimated_mastery(correct_attempts=1, total_attempts=1)
    assert 0.30 <= score_1 <= 0.40

    # 10/10 correct should yield substantially higher credentialed mastery
    score_10 = TopicMasteryRepository.calculate_estimated_mastery(correct_attempts=10, total_attempts=10)
    assert 0.80 <= score_10 <= 0.90

    # 0/5 correct yields 0.0
    score_zero = TopicMasteryRepository.calculate_estimated_mastery(correct_attempts=0, total_attempts=5)
    assert score_zero == 0.0


def test_record_verified_assessment_updates_state(learner_service):
    """Verify recording verified attempts properly updates attempt counts and mastery score."""
    m1 = learner_service.record_verified_assessment(
        external_student_id="student_eric",
        topic="Data Structures",
        is_correct=True,
    )
    assert m1.attempts_count == 1
    assert m1.correct_attempts == 1
    assert m1.incorrect_attempts == 0
    assert m1.measured_success_rate == 1.0
    assert 0.0 < m1.mastery_score < 1.0

    m2 = learner_service.record_verified_assessment(
        external_student_id="student_eric",
        topic="Data Structures",
        is_correct=False,
    )
    assert m2.attempts_count == 2
    assert m2.correct_attempts == 1
    assert m2.incorrect_attempts == 1
    assert m2.measured_success_rate == 0.5


# =============================================================================
# 4. Error DNA Summary Tests
# =============================================================================

def test_error_dna_summary_empty_history(learner_service):
    """Verify Error DNA summary for student with no recorded history."""
    summary = learner_service.get_error_dna_summary("new_student_unknown")
    assert summary.total_diagnoses == 0
    assert summary.review_required_count == 0
    assert summary.confirmed_diagnoses_count == 0
    assert len(summary.recurring_errors) == 0
    assert len(summary.most_affected_topics) == 0
    assert summary.temporal_trend.trend == "STABLE"


def test_error_dna_recurring_errors_and_affected_topics(learner_service):
    """Verify error counts, recurring category percentages, and affected topics."""
    # Record 3 Conceptual errors in Data Structures
    for _ in range(3):
        learner_service.diagnose_and_record(
            external_student_id="student_frank",
            question="Tree traversal question",
            student_answer="Wrong answer",
            topic="Data Structures",
        )

    # Record 1 Formula error in Algorithms
    class FormulaClassifier:
        def predict_error(self, **kwargs):
            return {
                "predicted_category": ErrorType.FORMULA_RULE_ERROR.value,
                "confidence": 0.88,
                "needs_review": False,
                "model_version": "mock_v1",
            }

    learner_service._classifier = FormulaClassifier()
    learner_service.diagnose_and_record(
        external_student_id="student_frank",
        question="Sorting formula",
        student_answer="Wrong formula",
        topic="Algorithms",
    )

    summary = learner_service.get_error_dna_summary("student_frank")
    assert summary.total_diagnoses == 4
    assert summary.confirmed_diagnoses_count == 4
    assert summary.review_required_count == 0

    # Top recurring error should be CONCEPTUAL_MISUNDERSTANDING (3/4 = 75%)
    assert len(summary.recurring_errors) == 2
    assert summary.recurring_errors[0].category == "CONCEPTUAL_MISUNDERSTANDING"
    assert summary.recurring_errors[0].count == 3
    assert summary.recurring_errors[0].percentage == 75.0

    # Most affected topic should be Data Structures (3) followed by Algorithms (1)
    assert len(summary.most_affected_topics) == 2
    assert summary.most_affected_topics[0].topic == "Data Structures"
    assert summary.most_affected_topics[0].count == 3
    assert summary.most_affected_topics[0].primary_error_category == "CONCEPTUAL_MISUNDERSTANDING"
    assert summary.most_affected_topics[1].topic == "Algorithms"
    assert summary.most_affected_topics[1].count == 1
    assert summary.most_affected_topics[1].primary_error_category == "FORMULA_RULE_ERROR"


def test_error_dna_student_isolation(learner_service):
    """Verify Student A's diagnoses are completely isolated from Student B."""
    learner_service.diagnose_and_record(
        external_student_id="student_alpha",
        question="OS question",
        student_answer="Wrong",
        topic="Operating Systems",
    )

    summary_alpha = learner_service.get_error_dna_summary("student_alpha")
    summary_beta = learner_service.get_error_dna_summary("student_beta")

    assert summary_alpha.total_diagnoses == 1
    assert summary_beta.total_diagnoses == 0


def test_error_dna_forgetting_and_revision_recommendations(learner_service):
    """Verify elapsed days and high error rate trigger revision recommendations."""
    # High failure rate trigger: 2 attempts, 2 incorrect
    learner_service.record_verified_assessment(
        external_student_id="student_grace",
        topic="Computer Networks",
        is_correct=False,
    )
    learner_service.record_verified_assessment(
        external_student_id="student_grace",
        topic="Computer Networks",
        is_correct=False,
    )

    summary = learner_service.get_error_dna_summary("student_grace")
    assert len(summary.revision_recommendations) >= 1
    rec = summary.revision_recommendations[0]
    assert rec.topic == "Computer Networks"
    assert rec.urgency == "HIGH"
    assert "High incorrect rate" in rec.reason
