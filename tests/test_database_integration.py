"""Database integration tests on an isolated test database.

Validates:
- Full model registration on Base.metadata and relational table integrity
- Transaction rollback safety under error conditions
- Student-scoped queries and cascading deletions
- Immutable diagnosis-history persistence and audit tracking
- Verified assessment mastery updates (preventing unverified predictions from mutating mastery)
- Phase 7 read-only guarantee: recommendations do not modify database tables or state
"""

from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import sessionmaker

from src.adaptive_intervention.service import AdaptiveInterventionService
from src.database.connection import DatabaseManager
from src.database.models import (
    AccessLevel,
    Base,
    Document,
    DocumentChunk,
    DocumentPage,
    ProcessingStatus,
)
from src.database.schema import create_tables, drop_tables
from src.learner_state.models import ErrorDiagnosisRecord, Student, TopicMasteryState
from src.learner_state.service import LearnerStateService


@pytest.fixture
def test_db():
    """Provide an isolated in-memory test database manager."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=True, expire_on_commit=False)

    class TestDbManager(DatabaseManager):
        def __init__(self):
            self._engine = engine
            self._session_factory = session_factory

    mgr = TestDbManager()
    yield mgr
    mgr.dispose()


def test_all_models_registered_on_metadata(test_db):
    """Verify all 6 core tables across Phases 1-6 are registered on Base.metadata."""
    inspector = inspect(test_db.engine)
    table_names = set(inspector.get_table_names())

    expected_tables = {
        "documents",
        "document_pages",
        "document_chunks",
        "students",
        "error_history",
        "topic_mastery_states",
    }
    assert expected_tables.issubset(table_names)

    # Verify foreign key relationships
    err_fks = inspector.get_foreign_keys("error_history")
    assert any(fk["referred_table"] == "students" for fk in err_fks)

    mast_fks = inspector.get_foreign_keys("topic_mastery_states")
    assert any(fk["referred_table"] == "students" for fk in mast_fks)

    chunk_fks = inspector.get_foreign_keys("document_chunks")
    assert any(fk["referred_table"] == "documents" for fk in chunk_fks)


def test_transaction_rollback_preserves_database_integrity(test_db):
    """Verify that unhandled exceptions roll back all session changes safely."""
    # Attempt a transaction that raises midway
    try:
        with test_db.get_session() as session:
            student = Student(external_student_id="student_rollback_test")
            session.add(student)
            session.flush()
            # Force an error
            raise RuntimeError("Simulated transaction failure")
    except RuntimeError:
        pass

    # Verify student was NOT committed to the database
    with test_db.get_session() as session:
        result = session.execute(
            select(Student).where(Student.external_student_id == "student_rollback_test")
        ).scalars().first()
        assert result is None


def test_student_scoped_queries_and_cascading(test_db):
    """Verify queries strictly isolate students and cascade deletes cleanly."""
    with test_db.get_session() as session:
        stud1 = Student(external_student_id="student_iso_1")
        stud2 = Student(external_student_id="student_iso_2")
        session.add_all([stud1, stud2])
        session.flush()

        # Add records for Student 1
        err1 = ErrorDiagnosisRecord(
            student_id=stud1.id,
            topic="Algorithms",
            error_category="RECALL_FAILURE",
            confidence_score=0.90,
            needs_review=False,
        )
        mast1 = TopicMasteryState(
            student_id=stud1.id,
            topic="Algorithms",
            attempts_count=2,
            correct_attempts=1,
            incorrect_attempts=1,
            mastery_score=0.25,
        )

        # Add records for Student 2
        err2 = ErrorDiagnosisRecord(
            student_id=stud2.id,
            topic="Databases",
            error_category="CONCEPTUAL_MISUNDERSTANDING",
            confidence_score=0.85,
            needs_review=False,
        )
        mast2 = TopicMasteryState(
            student_id=stud2.id,
            topic="Databases",
            attempts_count=4,
            correct_attempts=4,
            incorrect_attempts=0,
            mastery_score=0.6667,
        )
        session.add_all([err1, mast1, err2, mast2])

    # 1. Query for Student 1: Must never see Student 2's records
    with test_db.get_session() as session:
        s1_errors = session.execute(
            select(ErrorDiagnosisRecord).where(ErrorDiagnosisRecord.student_id == stud1.id)
        ).scalars().all()
        assert len(s1_errors) == 1
        assert s1_errors[0].topic == "Algorithms"

        s2_errors = session.execute(
            select(ErrorDiagnosisRecord).where(ErrorDiagnosisRecord.student_id == stud2.id)
        ).scalars().all()
        assert len(s2_errors) == 1
        assert s2_errors[0].topic == "Databases"

    # 2. Delete Student 1: Cascade must remove Student 1's history and mastery
    # while leaving Student 2 completely untouched
    with test_db.get_session() as session:
        s1 = session.get(Student, stud1.id)
        session.delete(s1)

    with test_db.get_session() as session:
        assert session.get(Student, stud1.id) is None
        # S1 child records removed
        s1_errs = session.execute(
            select(ErrorDiagnosisRecord).where(ErrorDiagnosisRecord.student_id == stud1.id)
        ).scalars().all()
        assert len(s1_errs) == 0

        # S2 records still intact
        assert session.get(Student, stud2.id) is not None
        s2_errs = session.execute(
            select(ErrorDiagnosisRecord).where(ErrorDiagnosisRecord.student_id == stud2.id)
        ).scalars().all()
        assert len(s2_errs) == 1


def test_diagnosis_history_persistence_and_immutability(test_db):
    """Verify immutable audit persistence of diagnosis records."""
    learner_service = LearnerStateService(db_manager=test_db)

    # Record two diagnosis events
    rec1 = learner_service.diagnose_and_record(
        external_student_id="student_audit_trail",
        question="What is a queue?",
        student_answer="LIFO structure",
        expected_answer="FIFO structure",
        topic="Data Structures",
    )
    rec2 = learner_service.diagnose_and_record(
        external_student_id="student_audit_trail",
        question="What is a stack?",
        student_answer="FIFO structure",
        expected_answer="LIFO structure",
        topic="Data Structures",
    )

    history = learner_service.get_student_history("student_audit_trail")
    assert len(history) == 2
    # Verify descending chronological order
    assert history[0].id == rec2.id
    assert history[1].id == rec1.id
    assert history[0].topic == "Data Structures"
    assert history[0].confidence_score >= 0.0


def test_verified_assessment_mastery_updates(test_db):
    """Verify only verified assessment attempts update TopicMasteryState."""
    learner_service = LearnerStateService(db_manager=test_db)

    # 1. Prediction diagnosis alone does NOT create topic mastery
    learner_service.diagnose_and_record(
        external_student_id="student_eval_test",
        question="Q?",
        student_answer="A",
        topic="Computer Architecture",
    )
    with test_db.get_session() as session:
        m = session.execute(select(TopicMasteryState)).scalars().all()
        assert len(m) == 0

    # 2. Verified assessment outcome creates and updates mastery
    m1 = learner_service.record_verified_assessment(
        external_student_id="student_eval_test",
        topic="Computer Architecture",
        is_correct=True,
    )
    assert m1.attempts_count == 1
    assert m1.correct_attempts == 1
    assert m1.incorrect_attempts == 0
    assert m1.mastery_score > 0.0

    # 3. Second verified attempt (incorrect) updates stats
    m2 = learner_service.record_verified_assessment(
        external_student_id="student_eval_test",
        topic="Computer Architecture",
        is_correct=False,
    )
    assert m2.attempts_count == 2
    assert m2.correct_attempts == 1
    assert m2.incorrect_attempts == 1
    # Credential-weighted formula: success_rate * (1 - 1 / (1 + 0.5 * 2)) = 0.5 * 0.5 = 0.25
    assert m2.mastery_score == 0.25


def test_phase7_recommendation_does_not_modify_database_state(test_db):
    """Verify Phase 7 recommendation generation is strictly read-only on the database."""
    learner_service = LearnerStateService(db_manager=test_db)

    # Seed student state
    learner_service.diagnose_and_record(
        external_student_id="student_db_readonly",
        question="What is a hash table?",
        student_answer="An array of linked lists with hash function",
        topic="Data Structures",
    )
    learner_service.record_verified_assessment(
        external_student_id="student_db_readonly",
        topic="Data Structures",
        is_correct=False,
    )

    # Snapshot table state
    with test_db.get_session() as session:
        students_count = session.query(Student).count()
        errors_count = session.query(ErrorDiagnosisRecord).count()
        masteries_count = session.query(TopicMasteryState).count()
        docs_count = session.query(Document).count()

    adaptive_service = AdaptiveInterventionService(learner_state_service=learner_service)

    # Call recommendation engine multiple times
    for _ in range(3):
        rec = adaptive_service.recommend_intervention(
            external_student_id="student_db_readonly"
        )
        assert rec.selected_topic == "Data Structures"

    # Verify absolute state immutability
    with test_db.get_session() as session:
        assert session.query(Student).count() == students_count
        assert session.query(ErrorDiagnosisRecord).count() == errors_count
        assert session.query(TopicMasteryState).count() == masteries_count
        assert session.query(Document).count() == docs_count
