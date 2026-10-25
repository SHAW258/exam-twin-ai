"""Security regression tests for Student Data Authorization Boundaries and cross-student isolation.

Demonstrates:
1. Student A cannot read or modify Student B's records through existing supported service workflows.
2. Request-supplied student identifiers cannot silently override an authenticated security principal.
3. Invalid or blank student identifiers are rejected safely.
4. Complete data isolation between distinct students across LearnerStateService and AdaptiveInterventionService.
"""

from datetime import datetime, timezone
import pytest
from sqlalchemy.exc import IntegrityError

from src.adaptive_intervention.service import AdaptiveInterventionService
from src.database.connection import DatabaseManager
from src.database.schema import create_tables, drop_tables
from src.learner_state.models import Student
from src.learner_state.service import (
    InvalidStudentIdentifierError,
    LearnerStateService,
    UnauthorizedStudentAccessError,
)


@pytest.fixture
def auth_db():
    """Isolated in-memory SQLite database for authorization tests."""
    mgr = DatabaseManager(database_url="sqlite:///:memory:")
    create_tables(mgr)
    yield mgr
    drop_tables(mgr)
    mgr.dispose()


@pytest.fixture
def fake_classifier():
    """Mock classifier returning predictable diagnosis for authorization tests."""
    class MockClassifier:
        def predict_error(self, question, student_answer, expected_answer=None, context=None):
            return {
                "predicted_category": "CONCEPTUAL_MISUNDERSTANDING",
                "confidence": 0.88,
                "needs_review": False,
                "message": "Diagnosed conceptual misunderstanding.",
                "model_version": "test_v1",
            }

    return MockClassifier()


@pytest.fixture
def learner_service(auth_db, fake_classifier):
    return LearnerStateService(db_manager=auth_db, classifier=fake_classifier)


@pytest.fixture
def intervention_service(learner_service):
    return AdaptiveInterventionService(learner_state_service=learner_service)


class TestStudentAuthorizationBoundaries:
    """Tests verifying identity verification and rejection of IDOR attempts."""

    def test_enforce_student_authorization_accepts_valid_matching_principal(self, learner_service):
        """When request ID matches authenticated principal, it is accepted."""
        result = learner_service.enforce_student_authorization(
            requested_student_id="student_alice",
            authenticated_student_id="student_alice",
        )
        assert result == "student_alice"

    def test_enforce_student_authorization_allows_none_principal_for_internal_service(self, learner_service):
        """When authenticated_student_id is None, internal service calls succeed."""
        result = learner_service.enforce_student_authorization(
            requested_student_id="student_alice",
            authenticated_student_id=None,
        )
        assert result == "student_alice"

    def test_enforce_student_authorization_rejects_identity_mismatch(self, learner_service):
        """When request parameter attempts to target another student, raise UnauthorizedStudentAccessError."""
        with pytest.raises(UnauthorizedStudentAccessError) as exc_info:
            learner_service.enforce_student_authorization(
                requested_student_id="student_bob",
                authenticated_student_id="student_alice",
            )
        assert "Authorization failed" in str(exc_info.value)
        assert "student_bob" in str(exc_info.value)
        assert "student_alice" in str(exc_info.value)

    def test_register_or_get_student_rejects_unauthorized_override(self, learner_service):
        """Student Alice cannot register or access Student Bob's profile."""
        with pytest.raises(UnauthorizedStudentAccessError):
            learner_service.register_or_get_student(
                external_student_id="student_bob",
                authenticated_student_id="student_alice",
            )

    def test_diagnose_and_record_rejects_unauthorized_override(self, learner_service):
        """Student Alice cannot submit a diagnosis under Student Bob's identity."""
        with pytest.raises(UnauthorizedStudentAccessError):
            learner_service.diagnose_and_record(
                external_student_id="student_bob",
                question="What is recursion?",
                student_answer="A loop.",
                authenticated_student_id="student_alice",
            )

    def test_record_verified_assessment_rejects_unauthorized_override(self, learner_service):
        """Student Alice cannot record an assessment attempt for Student Bob."""
        with pytest.raises(UnauthorizedStudentAccessError):
            learner_service.record_verified_assessment(
                external_student_id="student_bob",
                topic="Recursion",
                is_correct=True,
                authenticated_student_id="student_alice",
            )

    def test_get_error_dna_summary_rejects_unauthorized_override(self, learner_service):
        """Student Alice cannot read Student Bob's Error DNA summary."""
        with pytest.raises(UnauthorizedStudentAccessError):
            learner_service.get_error_dna_summary(
                external_student_id="student_bob",
                authenticated_student_id="student_alice",
            )

    def test_get_student_history_rejects_unauthorized_override(self, learner_service):
        """Student Alice cannot inspect Student Bob's diagnosis history."""
        with pytest.raises(UnauthorizedStudentAccessError):
            learner_service.get_student_history(
                external_student_id="student_bob",
                authenticated_student_id="student_alice",
            )

    def test_adaptive_intervention_rejects_unauthorized_override(self, intervention_service):
        """Student Alice cannot request an intervention recommendation for Student Bob."""
        with pytest.raises(UnauthorizedStudentAccessError):
            intervention_service.recommend_intervention(
                external_student_id="student_bob",
                authenticated_student_id="student_alice",
            )

    def test_blank_or_invalid_student_id_rejected(self, learner_service, intervention_service):
        """Blank or whitespace student IDs must raise InvalidStudentIdentifierError."""
        for invalid_id in ["", "   ", None]:
            with pytest.raises(InvalidStudentIdentifierError):
                learner_service._validate_student_id(invalid_id)

            with pytest.raises(InvalidStudentIdentifierError):
                intervention_service._validate_student_id(invalid_id)


class TestCrossStudentDataIsolation:
    """Tests confirming strict tenant-like boundary separation between students."""

    def test_students_cannot_read_or_leak_each_others_data(
        self, learner_service, intervention_service
    ):
        """Verify complete isolation between Student A and Student B."""
        # Setup Student A: 2 diagnoses in 'Graph Algorithms'
        learner_service.diagnose_and_record(
            external_student_id="student_alice",
            question="What is Dijkstra's algorithm?",
            student_answer="A greedy sorting method.",
            topic="Graph Algorithms",
            authenticated_student_id="student_alice",
        )
        learner_service.record_verified_assessment(
            external_student_id="student_alice",
            topic="Graph Algorithms",
            is_correct=False,
            authenticated_student_id="student_alice",
        )

        # Setup Student B: 1 diagnosis in 'SQL Indexing'
        learner_service.diagnose_and_record(
            external_student_id="student_bob",
            question="What is a B-Tree index?",
            student_answer="A hash table.",
            topic="SQL Indexing",
            authenticated_student_id="student_bob",
        )
        learner_service.record_verified_assessment(
            external_student_id="student_bob",
            topic="SQL Indexing",
            is_correct=True,
            authenticated_student_id="student_bob",
        )

        # 1. Verify Student A's Error DNA contains only Graph Algorithms
        alice_dna = learner_service.get_error_dna_summary(
            "student_alice", authenticated_student_id="student_alice"
        )
        assert alice_dna.student_id == "student_alice"
        assert alice_dna.total_diagnoses == 1
        alice_topics = [t.topic for t in alice_dna.most_affected_topics]
        assert "Graph Algorithms" in alice_topics
        assert "SQL Indexing" not in alice_topics

        alice_mastery_topics = [m.topic for m in alice_dna.topic_masteries]
        assert "Graph Algorithms" in alice_mastery_topics
        assert "SQL Indexing" not in alice_mastery_topics

        # 2. Verify Student A's history contains only Student A's records
        alice_history = learner_service.get_student_history(
            "student_alice", authenticated_student_id="student_alice"
        )
        assert len(alice_history) == 1
        assert alice_history[0].topic == "Graph Algorithms"

        # 3. Verify Student B's Error DNA contains only SQL Indexing
        bob_dna = learner_service.get_error_dna_summary(
            "student_bob", authenticated_student_id="student_bob"
        )
        assert bob_dna.student_id == "student_bob"
        assert bob_dna.total_diagnoses == 1
        bob_topics = [t.topic for t in bob_dna.most_affected_topics]
        assert "SQL Indexing" in bob_topics
        assert "Graph Algorithms" not in bob_topics

        # 4. Verify Phase 7 recommendation for Student A is strictly derived from Student A
        rec_alice = intervention_service.recommend_intervention(
            "student_alice", authenticated_student_id="student_alice"
        )
        assert rec_alice.student_id == "student_alice"
        assert rec_alice.selected_topic == "Graph Algorithms"
        assert rec_alice.selected_topic != "SQL Indexing"

        # 5. Verify Phase 7 recommendation for Student B is strictly derived from Student B
        rec_bob = intervention_service.recommend_intervention(
            "student_bob", authenticated_student_id="student_bob"
        )
        assert rec_bob.student_id == "student_bob"
        assert rec_bob.selected_topic == "SQL Indexing"
        assert rec_bob.selected_topic != "Graph Algorithms"


class TestDatabaseTransactionRollback:
    """Tests confirming database session rollback behavior on exceptions."""

    def test_session_rollback_on_database_error(self, auth_db):
        """Verify that an exception inside a session rolls back uncommitted changes."""
        # Insert a valid student
        with auth_db.get_session() as session:
            student = Student(external_student_id="student_rollback_test")
            session.add(student)
            session.commit()

        # Attempt to insert an invalid record with duplicate unique external_student_id
        with pytest.raises(IntegrityError):
            with auth_db.get_session() as session:
                duplicate_student = Student(external_student_id="student_rollback_test")
                session.add(duplicate_student)
                session.flush()

        # Confirm database is intact and contains only 1 student record
        with auth_db.get_session() as session:
            all_students = session.query(Student).filter_by(
                external_student_id="student_rollback_test"
            ).all()
            assert len(all_students) == 1
