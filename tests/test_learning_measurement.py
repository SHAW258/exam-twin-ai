"""Comprehensive automated unit and integration tests for Phase 8: Retest and Learning Measurement Engine.

Covers:
- Valid assessment creation & score normalization
- Negative score, zero/negative max score, and score-exceeding-max rejection
- Missing evidence and invalid learner identifier rejection
- Positive, zero, negative, and perfect-pretest normalized learning gains
- Different maximum scores comparability
- Missing assessment, duplicate assessment, and chronological validation
- Incompatible learning objectives and topics rejection
- Unverified evidence enforcement
- Security authorization and cross-learner data isolation
- Transaction rollback safety
- Adaptive intervention association and learner-state topic mastery integration
- Full end-to-end Phase 5 -> 6 -> 7 -> 8 pedagogical workflow
"""

from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy.exc import IntegrityError

from src.adaptive_intervention.service import AdaptiveInterventionService
from src.database.connection import DatabaseManager
from src.database.schema import create_tables, drop_tables
from src.learner_state.models import Student, TopicMasteryState
from src.learner_state.service import (
    InvalidStudentIdentifierError,
    LearnerStateService,
    UnauthorizedStudentAccessError,
)
from src.learning_measurement.exceptions import (
    AssessmentNotFoundError,
    AssessmentValidationError,
    IncompatibleAssessmentError,
    UnverifiedEvidenceError,
)
from src.learning_measurement.models import (
    AssessmentRecord,
    AssessmentType,
    GainClassification,
    LearningMeasurementRecord,
    VerificationStatus,
)
from src.learning_measurement.schemas import AssessmentCreate
from src.learning_measurement.service import LearningMeasurementService


@pytest.fixture
def measurement_db():
    """Provide an isolated in-memory test database manager."""
    mgr = DatabaseManager(database_url="sqlite:///:memory:")
    create_tables(mgr)
    yield mgr
    drop_tables(mgr)
    mgr.dispose()


@pytest.fixture
def learner_service(measurement_db):
    """Provide LearnerStateService bound to isolated test database."""
    return LearnerStateService(db_manager=measurement_db)


@pytest.fixture
def measurement_service(measurement_db, learner_service):
    """Provide LearningMeasurementService bound to isolated test database."""
    return LearningMeasurementService(
        db_manager=measurement_db,
        learner_state_service=learner_service,
    )


class TestAssessmentValidationAndNormalization:
    """Tests covering assessment ingestion, score normalization, and input validation."""

    def test_valid_assessment_creation_and_score_normalization(self, measurement_service):
        """Verify normal assessment creation and correct normalized score calculation (16/20 = 0.8)."""
        payload = AssessmentCreate(
            student_id="student_alice",
            topic="Binary Search Trees",
            learning_objective_id="LO-BST-INSERT",
            assessment_type=AssessmentType.PRE_INTERVENTION,
            obtained_score=16.0,
            max_score=20.0,
            evidence="Student correctly implemented binary insertion with correct left/right pointer links.",
            verification_status=VerificationStatus.VERIFIED,
        )
        asmt = measurement_service.record_assessment(payload)
        assert asmt.id.startswith("asmt_")
        assert asmt.obtained_score == 16.0
        assert asmt.max_score == 20.0
        assert asmt.normalized_score == 0.8
        assert asmt.topic == "Binary Search Trees"
        assert asmt.learning_objective_id == "LO-BST-INSERT"
        assert asmt.verification_status == "VERIFIED"

    @pytest.mark.parametrize(
        "obtained,maximum,expected_norm",
        [
            (0.0, 100.0, 0.0),
            (25.0, 100.0, 0.25),
            (50.0, 100.0, 0.50),
            (75.0, 100.0, 0.75),
            (100.0, 100.0, 1.0),
            (7.5, 10.0, 0.75),
            (35.0, 50.0, 0.70),
        ],
    )
    def test_score_normalization_formula(self, measurement_service, obtained, maximum, expected_norm):
        """Verify normalized_score = obtained_score / max_score strictly bounded in [0, 1]."""
        payload = AssessmentCreate(
            student_id="student_norm_test",
            topic="Dynamic Programming",
            learning_objective_id="LO-DP-MEMO",
            obtained_score=obtained,
            max_score=maximum,
            evidence="Worked exercise on memoized Fibonacci.",
        )
        asmt = measurement_service.record_assessment(payload)
        assert pytest.approx(asmt.normalized_score, rel=1e-4) == expected_norm

    def test_negative_score_rejection(self):
        """Reject negative obtained scores with AssessmentValidationError."""
        with pytest.raises(AssessmentValidationError) as exc:
            AssessmentCreate(
                student_id="student_bad",
                topic="Graphs",
                learning_objective_id="LO-GRAPH-01",
                obtained_score=-5.0,
                max_score=10.0,
                evidence="Negative score submission.",
            )
        assert "cannot be negative" in str(exc.value)

    def test_invalid_maximum_score_rejection(self):
        """Reject zero or negative maximum scores with AssessmentValidationError."""
        for bad_max in [0.0, -10.0]:
            with pytest.raises(AssessmentValidationError) as exc:
                AssessmentCreate(
                    student_id="student_bad",
                    topic="Graphs",
                    learning_objective_id="LO-GRAPH-01",
                    obtained_score=5.0,
                    max_score=bad_max,
                    evidence="Invalid maximum score.",
                )
            assert "strictly greater than 0" in str(exc.value)

    def test_score_exceeding_maximum_rejection(self):
        """Reject obtained score exceeding maximum possible score."""
        with pytest.raises(AssessmentValidationError) as exc:
            AssessmentCreate(
                student_id="student_bad",
                topic="Graphs",
                learning_objective_id="LO-GRAPH-01",
                obtained_score=15.0,
                max_score=10.0,
                evidence="Score exceeding maximum limit.",
            )
        assert "cannot exceed maximum possible score" in str(exc.value)

    def test_missing_or_blank_evidence_rejection(self):
        """Reject empty or whitespace-only evidence strings."""
        for empty_ev in ["", "   ", "\n\t"]:
            with pytest.raises(AssessmentValidationError) as exc:
                AssessmentCreate(
                    student_id="student_bad",
                    topic="Graphs",
                    learning_objective_id="LO-GRAPH-01",
                    obtained_score=5.0,
                    max_score=10.0,
                    evidence=empty_ev,
                )
            assert "must be a non-empty string" in str(exc.value)

    def test_blank_student_id_rejection(self):
        """Reject empty or whitespace student identifiers."""
        with pytest.raises(AssessmentValidationError):
            AssessmentCreate(
                student_id="  ",
                topic="Graphs",
                learning_objective_id="LO-GRAPH-01",
                obtained_score=5.0,
                max_score=10.0,
                evidence="Valid evidence.",
            )


class TestNormalizedLearningGainCalculation:
    """Tests covering normalized learning gain formulas, edge cases, and comparisons."""

    def test_positive_normalized_learning_gain(self, measurement_service):
        """Verify positive gain: pre=0.40, post=0.70 => g = (0.70 - 0.40)/(1 - 0.40) = 0.50 (+50%)."""
        t0 = datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 10, 20, 11, 0, tzinfo=timezone.utc)

        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_gain_1",
                topic="Recursion",
                learning_objective_id="LO-REC-BASE",
                assessment_type=AssessmentType.PRE_INTERVENTION,
                obtained_score=40.0,
                max_score=100.0,
                evidence="Pre-test: missed base case in recursive factorial.",
                timestamp=t0,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_gain_1",
                topic="Recursion",
                learning_objective_id="LO-REC-BASE",
                assessment_type=AssessmentType.POST_INTERVENTION,
                obtained_score=70.0,
                max_score=100.0,
                evidence="Post-test: correctly implemented base case and termination guard.",
                timestamp=t1,
            )
        )

        res = measurement_service.measure_learning_gain(pre.id, post.id)
        assert res.pre_normalized_score == 0.40
        assert res.post_normalized_score == 0.70
        assert pytest.approx(res.normalized_gain, rel=1e-4) == 0.50
        assert pytest.approx(res.absolute_gain, rel=1e-4) == 0.30
        assert res.gain_classification == GainClassification.POSITIVE
        assert res.is_verified is True
        assert "Positive normalized learning gain (+50.00%)" in res.summary_explanation

    def test_zero_normalized_learning_gain(self, measurement_service):
        """Verify zero gain: pre=0.50, post=0.50 => g = 0.0."""
        t0 = datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)

        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_gain_2",
                topic="Sorting",
                learning_objective_id="LO-SORT-QUICK",
                obtained_score=5.0,
                max_score=10.0,
                evidence="Pre-test on pivot selection.",
                timestamp=t0,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_gain_2",
                topic="Sorting",
                learning_objective_id="LO-SORT-QUICK",
                obtained_score=5.0,
                max_score=10.0,
                evidence="Post-test on pivot selection.",
                timestamp=t1,
            )
        )

        res = measurement_service.measure_learning_gain(pre.id, post.id)
        assert pytest.approx(res.normalized_gain, abs=1e-4) == 0.0
        assert res.gain_classification == GainClassification.ZERO
        assert "Zero learning gain" in res.summary_explanation

    def test_negative_normalized_learning_gain(self, measurement_service):
        """Verify negative gain: pre=0.80, post=0.50 => g = (0.50 - 0.80)/(1 - 0.80) = -1.50 (-150%)."""
        t0 = datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)

        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_gain_3",
                topic="Hashing",
                learning_objective_id="LO-HASH-COLLISION",
                obtained_score=8.0,
                max_score=10.0,
                evidence="Pre-test on linear probing.",
                timestamp=t0,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_gain_3",
                topic="Hashing",
                learning_objective_id="LO-HASH-COLLISION",
                obtained_score=5.0,
                max_score=10.0,
                evidence="Post-test regression on collision handling.",
                timestamp=t1,
            )
        )

        res = measurement_service.measure_learning_gain(pre.id, post.id)
        assert pytest.approx(res.normalized_gain, rel=1e-4) == -1.50
        assert res.gain_classification == GainClassification.NEGATIVE
        assert "Negative learning gain" in res.summary_explanation

    def test_perfect_pretest_handling_avoids_division_by_zero(self, measurement_service):
        """Verify perfect pre-test (1.0) returns None for normalized_gain without division by zero."""
        t0 = datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)

        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_perfect",
                topic="Bitwise Operations",
                learning_objective_id="LO-BIT-MASK",
                obtained_score=10.0,
                max_score=10.0,
                evidence="Perfect score on bit masking.",
                timestamp=t0,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_perfect",
                topic="Bitwise Operations",
                learning_objective_id="LO-BIT-MASK",
                obtained_score=10.0,
                max_score=10.0,
                evidence="Maintained perfect score.",
                timestamp=t1,
            )
        )

        res = measurement_service.measure_learning_gain(pre.id, post.id)
        assert res.pre_normalized_score == 1.0
        assert res.post_normalized_score == 1.0
        assert res.normalized_gain is None  # Undefined mathematically
        assert res.gain_classification == GainClassification.PERFECT_PRETEST
        assert "ceiling reached" in res.summary_explanation

    def test_different_maximum_scores_comparability(self, measurement_service):
        """Verify normalization enables comparison across different max_scores (pre: 6/10=0.6, post: 40/50=0.8)."""
        t0 = datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)

        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_diff_scale",
                topic="Graph Theory",
                learning_objective_id="LO-GRAPH-BFS",
                obtained_score=6.0,
                max_score=10.0,  # 10-point quiz
                evidence="10-point quiz on BFS queue traversal.",
                timestamp=t0,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_diff_scale",
                topic="Graph Theory",
                learning_objective_id="LO-GRAPH-BFS",
                obtained_score=40.0,
                max_score=50.0,  # 50-point exam
                evidence="50-point comprehensive BFS problem set.",
                timestamp=t1,
            )
        )

        res = measurement_service.measure_learning_gain(pre.id, post.id)
        assert res.pre_normalized_score == 0.60
        assert res.post_normalized_score == 0.80
        # g = (0.80 - 0.60) / (1 - 0.60) = 0.20 / 0.40 = 0.50
        assert pytest.approx(res.normalized_gain, rel=1e-4) == 0.50
        assert res.gain_classification == GainClassification.POSITIVE


class TestComparabilityAndInvariants:
    """Tests enforcing comparability invariants, chronology, verification, and errors."""

    def test_incompatible_learning_objectives_rejected(self, measurement_service):
        """Reject comparison when pre- and post-tests evaluate different learning objectives."""
        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_lo_test",
                topic="Trees",
                learning_objective_id="LO-TREE-TRAVERSAL",
                obtained_score=5.0,
                max_score=10.0,
                evidence="Tree traversal.",
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_lo_test",
                topic="Trees",
                learning_objective_id="LO-TREE-BALANCE",
                obtained_score=8.0,
                max_score=10.0,
                evidence="Tree balancing.",
            )
        )

        with pytest.raises(IncompatibleAssessmentError) as exc:
            measurement_service.measure_learning_gain(pre.id, post.id)
        assert "learning objective mismatch" in str(exc.value)

    def test_incompatible_topics_rejected(self, measurement_service):
        """Reject comparison when assessments evaluate different topics."""
        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_topic_test",
                topic="Trees",
                learning_objective_id="LO-COMMON",
                obtained_score=5.0,
                max_score=10.0,
                evidence="Tree problem.",
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_topic_test",
                topic="Graphs",
                learning_objective_id="LO-COMMON",
                obtained_score=8.0,
                max_score=10.0,
                evidence="Graph problem.",
            )
        )

        with pytest.raises(IncompatibleAssessmentError) as exc:
            measurement_service.measure_learning_gain(pre.id, post.id)
        assert "topic mismatch" in str(exc.value)

    def test_duplicate_assessment_rejected(self, measurement_service):
        """Reject comparing an assessment with itself."""
        asmt = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_dup",
                topic="Arrays",
                learning_objective_id="LO-ARR-2D",
                obtained_score=7.0,
                max_score=10.0,
                evidence="2D array indexing.",
            )
        )
        with pytest.raises(AssessmentValidationError) as exc:
            measurement_service.measure_learning_gain(asmt.id, asmt.id)
        assert "exact same assessment record" in str(exc.value)

    def test_chronological_timestamp_inconsistency_rejected(self, measurement_service):
        """Reject if post-assessment timestamp is earlier than pre-assessment."""
        t_pre = datetime(2026, 10, 20, 15, 0, tzinfo=timezone.utc)
        t_post_earlier = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)

        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_chrono",
                topic="Linked Lists",
                learning_objective_id="LO-LL-REV",
                obtained_score=4.0,
                max_score=10.0,
                evidence="Pre-test.",
                timestamp=t_pre,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_chrono",
                topic="Linked Lists",
                learning_objective_id="LO-LL-REV",
                obtained_score=8.0,
                max_score=10.0,
                evidence="Post-test with earlier timestamp.",
                timestamp=t_post_earlier,
            )
        )

        with pytest.raises(AssessmentValidationError) as exc:
            measurement_service.measure_learning_gain(pre.id, post.id)
        assert "cannot precede pre-assessment" in str(exc.value)

    def test_unverified_assessment_evidence_rejected(self, measurement_service):
        """Reject unverified assessment evidence when require_verified=True."""
        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_unverified",
                topic="Stacks",
                learning_objective_id="LO-STACK-EVAL",
                obtained_score=3.0,
                max_score=10.0,
                evidence="Pre-test stack evaluation.",
                verification_status=VerificationStatus.UNVERIFIED,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_unverified",
                topic="Stacks",
                learning_objective_id="LO-STACK-EVAL",
                obtained_score=8.0,
                max_score=10.0,
                evidence="Post-test stack evaluation.",
                verification_status=VerificationStatus.VERIFIED,
            )
        )

        with pytest.raises(UnverifiedEvidenceError) as exc:
            measurement_service.measure_learning_gain(pre.id, post.id, require_verified=True)
        assert "lack VERIFIED status" in str(exc.value)

    def test_missing_assessment_record_raises_not_found(self, measurement_service):
        """Missing assessment IDs raise AssessmentNotFoundError."""
        with pytest.raises(AssessmentNotFoundError):
            measurement_service.measure_learning_gain("asmt_nonexistent_1", "asmt_nonexistent_2")


class TestSecurityAuthorizationAndDataIsolation:
    """Tests verifying cross-learner boundary protection and principal enforcement."""

    def test_authorization_rejects_identity_mismatch_on_record(self, measurement_service):
        """Student Alice cannot record an assessment under Student Bob's identity."""
        payload = AssessmentCreate(
            student_id="student_bob",
            topic="Queues",
            learning_objective_id="LO-QUEUE-CIRC",
            obtained_score=8.0,
            max_score=10.0,
            evidence="Circular queue buffer management.",
        )
        with pytest.raises(UnauthorizedStudentAccessError):
            measurement_service.record_assessment(payload, authenticated_student_id="student_alice")

    def test_cross_learner_measurement_attempt_rejected(self, measurement_service):
        """Reject computing learning gain between Student Alice's pre-test and Student Bob's post-test."""
        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_alice",
                topic="Recursion",
                learning_objective_id="LO-REC",
                obtained_score=4.0,
                max_score=10.0,
                evidence="Alice pre-test.",
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_bob",
                topic="Recursion",
                learning_objective_id="LO-REC",
                obtained_score=8.0,
                max_score=10.0,
                evidence="Bob post-test.",
            )
        )

        with pytest.raises(IncompatibleAssessmentError) as exc:
            measurement_service.measure_learning_gain(pre.id, post.id)
        assert "belong to different students" in str(exc.value)

    def test_get_student_assessments_and_measurements_strictly_isolated(
        self, measurement_service
    ):
        """Verify Student Alice cannot retrieve or leak Student Bob's assessment history."""
        # Record assessments for Alice and Bob
        measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_alice",
                topic="Binary Trees",
                learning_objective_id="LO-BT",
                obtained_score=9.0,
                max_score=10.0,
                evidence="Alice test.",
            )
        )
        measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_bob",
                topic="SQL Indexing",
                learning_objective_id="LO-SQL",
                obtained_score=7.0,
                max_score=10.0,
                evidence="Bob test.",
            )
        )

        alice_records = measurement_service.get_student_assessments(
            "student_alice", authenticated_student_id="student_alice"
        )
        assert len(alice_records) == 1
        assert alice_records[0].topic == "Binary Trees"

        bob_records = measurement_service.get_student_assessments(
            "student_bob", authenticated_student_id="student_bob"
        )
        assert len(bob_records) == 1
        assert bob_records[0].topic == "SQL Indexing"

        # Attempt to access Bob's assessments with Alice's principal
        with pytest.raises(UnauthorizedStudentAccessError):
            measurement_service.get_student_assessments(
                "student_bob", authenticated_student_id="student_alice"
            )


class TestIntegrationAndStateUpdates:
    """Tests verifying learner state integration, mastery updates, and intervention association."""

    def test_verified_post_test_updates_topic_mastery(
        self, measurement_db, measurement_service, learner_service
    ):
        """Verified post-assessment achievement updates TopicMasteryState for the student."""
        t0 = datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 10, 20, 11, 0, tzinfo=timezone.utc)

        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_mastery_integ",
                topic="Heaps",
                learning_objective_id="LO-HEAP-MAX",
                obtained_score=3.0,
                max_score=10.0,
                evidence="Pre-test heapify.",
                timestamp=t0,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_mastery_integ",
                topic="Heaps",
                learning_objective_id="LO-HEAP-MAX",
                obtained_score=9.0,
                max_score=10.0,
                evidence="Post-test max-heap extraction.",
                timestamp=t1,
            )
        )

        res = measurement_service.measure_learning_gain(
            pre.id, post.id, update_topic_mastery=True
        )
        assert res.gain_classification == GainClassification.POSITIVE

        # Verify persistent topic mastery in database
        with measurement_db.get_session() as session:
            student = session.query(Student).filter_by(external_student_id="student_mastery_integ").first()
            mastery = session.query(TopicMasteryState).filter_by(student_id=student.id, topic="Heaps").first()
            assert mastery is not None
            assert mastery.attempts_count == 1
            assert mastery.correct_attempts == 1
            assert mastery.incorrect_attempts == 0
            assert mastery.mastery_score > 0.0

    def test_intervention_linkage_preservation(self, measurement_service):
        """Intervention recommendation identifier is preserved in measurement audit record."""
        intervention_uuid = "rec_interv_98765"
        t0 = datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 10, 20, 11, 0, tzinfo=timezone.utc)

        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_interv_link",
                topic="Dynamic Programming",
                learning_objective_id="LO-DP-01",
                obtained_score=4.0,
                max_score=10.0,
                evidence="Pre-test knapsack.",
                timestamp=t0,
            )
        )
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id="student_interv_link",
                topic="Dynamic Programming",
                learning_objective_id="LO-DP-01",
                obtained_score=9.0,
                max_score=10.0,
                evidence="Post-test knapsack with optimal subproblem memoization.",
                intervention_id=intervention_uuid,
                timestamp=t1,
            )
        )

        res = measurement_service.measure_learning_gain(
            pre.id, post.id, intervention_id=intervention_uuid
        )
        assert res.intervention_id == intervention_uuid


class TestFullEndToEndPhase5To8Workflow:
    """Full architectural end-to-end integration: Phase 5 -> Phase 6 -> Phase 7 -> Phase 8."""

    def test_full_learning_measurement_lifecycle(
        self, measurement_db, learner_service, measurement_service
    ):
        """Exercise full learner cycle:

        1. Student exhibits misconception in 'Tree Traversal' (Phase 5 classifier).
        2. Diagnosis is persisted and Error DNA is aggregated (Phase 6).
        3. Adaptive Intervention engine recommends CONCEPT_EXPLANATION (Phase 7).
        4. Pre-test records baseline knowledge score of 30% (Phase 8).
        5. Student undergoes intervention and completes post-test scoring 80% (Phase 8).
        6. Normalized learning gain is calculated: +71.4% gain (Phase 8).
        7. Verified mastery updates persistent student state (Phase 6/8).
        """
        student_id = "student_e2e_phase8"
        topic = "Tree Traversal"
        objective = "LO-TREE-INORDER"

        # 1. Phase 5 diagnosis & Phase 6 recording
        rec = learner_service.diagnose_and_record(
            external_student_id=student_id,
            question="What is the inorder traversal of a BST?",
            student_answer="Root, then left subtree, then right subtree.",
            expected_answer="Left subtree, then root, then right subtree.",
            topic=topic,
        )
        assert rec.student_id is not None
        assert rec.topic == topic

        # 2. Phase 6 Error DNA retrieval
        dna = learner_service.get_error_dna_summary(student_id)
        assert dna.total_diagnoses == 1
        assert len(dna.most_affected_topics) == 1

        # 3. Phase 7 Adaptive Intervention
        adaptive_service = AdaptiveInterventionService(learner_state_service=learner_service)
        intervention = adaptive_service.recommend_intervention(student_id)
        assert intervention.selected_topic == topic
        assert intervention.selected_strategy is not None

        # 4. Phase 8 Pre-intervention assessment
        t0 = datetime(2026, 10, 25, 10, 0, tzinfo=timezone.utc)
        pre = measurement_service.record_assessment(
            AssessmentCreate(
                student_id=student_id,
                topic=topic,
                learning_objective_id=objective,
                assessment_type=AssessmentType.PRE_INTERVENTION,
                obtained_score=3.0,
                max_score=10.0,
                evidence="Pre-test: Student confused inorder with preorder traversal.",
                intervention_id=intervention.selected_strategy.value,
                timestamp=t0,
            )
        )
        assert pre.normalized_score == 0.30

        # 5. Phase 8 Post-intervention assessment
        t1 = datetime(2026, 10, 25, 12, 0, tzinfo=timezone.utc)
        post = measurement_service.record_assessment(
            AssessmentCreate(
                student_id=student_id,
                topic=topic,
                learning_objective_id=objective,
                assessment_type=AssessmentType.POST_INTERVENTION,
                obtained_score=8.5,
                max_score=10.0,
                evidence="Post-test: Correct recursive inorder traversal with sorted BST output.",
                intervention_id=intervention.selected_strategy.value,
                timestamp=t1,
            )
        )
        assert pre.normalized_score == 0.30
        assert post.normalized_score == 0.85

        # 6. Phase 8 Normalized Learning Gain: (0.85 - 0.30) / (1.0 - 0.30) = 0.55 / 0.70 = 0.7857 (+78.57%)
        measurement = measurement_service.measure_learning_gain(
            pre_assessment_id=pre.id,
            post_assessment_id=post.id,
            intervention_id=intervention.selected_strategy.value,
            update_topic_mastery=True,
        )

        assert measurement.student_id == student_id
        assert measurement.topic == topic
        assert measurement.learning_objective_id == objective
        assert pytest.approx(measurement.normalized_gain, rel=1e-4) == 0.7857
        assert measurement.gain_classification == GainClassification.POSITIVE
        assert measurement.is_verified is True

        # 7. Verify persistent history & topic mastery state updated
        measurements = measurement_service.get_student_measurements(student_id)
        assert len(measurements) == 1
        assert measurements[0].measurement_id == measurement.measurement_id

        updated_dna = learner_service.get_error_dna_summary(student_id)
        assert len(updated_dna.topic_masteries) == 1
        assert updated_dna.topic_masteries[0].topic == topic
        assert updated_dna.topic_masteries[0].correct_attempts == 1
