"""Core domain service for Phase 8: Assessment Lifecycle and Learning Measurement.

Coordinates pre- and post-intervention assessment ingestion, score normalization,
assessment comparability validation, normalized learning gain calculation,
and integration with persistent learner state and adaptive interventions.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from src.database.connection import DatabaseManager, get_db_manager
from src.learner_state.repository import StudentRepository
from src.learner_state.service import (
    InvalidStudentIdentifierError,
    LearnerStateService,
    UnauthorizedStudentAccessError,
)
from src.learning_measurement.exceptions import (
    AssessmentNotFoundError,
    AssessmentValidationError,
    IncompatibleAssessmentError,
    LearningMeasurementError,
    UnauthorizedAssessmentAccessError,
    UnverifiedEvidenceError,
)
from src.learning_measurement.models import (
    AssessmentRecord,
    AssessmentType,
    GainClassification,
    LearningMeasurementRecord,
    VerificationStatus,
)
from src.learning_measurement.repository import (
    AssessmentRepository,
    LearningMeasurementRepository,
)
from src.learning_measurement.schemas import (
    AssessmentCreate,
    AssessmentSchema,
    LearningMeasurementResult,
)

logger = logging.getLogger(__name__)


class LearningMeasurementService:
    """Domain service managing assessment validation, gain computation, and state integration."""

    def __init__(
        self,
        db_manager: Optional[DatabaseManager] = None,
        learner_state_service: Optional[LearnerStateService] = None,
        assessment_repo: Optional[AssessmentRepository] = None,
        measurement_repo: Optional[LearningMeasurementRepository] = None,
    ):
        """Initialize LearningMeasurementService with dependency injection.

        Args:
            db_manager: Database connection manager. Defaults to global get_db_manager().
            learner_state_service: Service managing learner state and authorization.
            assessment_repo: Repository for AssessmentRecord entities.
            measurement_repo: Repository for LearningMeasurementRecord entities.
        """
        self.db_manager = db_manager or get_db_manager()
        self.learner_state_service = learner_state_service or LearnerStateService(
            db_manager=self.db_manager
        )
        self.student_repo = StudentRepository()
        self.assessment_repo = assessment_repo or AssessmentRepository()
        self.measurement_repo = measurement_repo or LearningMeasurementRepository()

    def record_assessment(
        self,
        payload: AssessmentCreate,
        authenticated_student_id: Optional[str] = None,
    ) -> AssessmentSchema:
        """Validate, normalize, and persist an individual student assessment attempt.

        Validation rules:
        - Student identity verified against authenticated security principal.
        - max_score > 0, obtained_score >= 0, and obtained_score <= max_score.
        - normalized_score = obtained_score / max_score in [0.0, 1.0].
        - Evidence must represent actual student assessment work (not model guesses).

        Args:
            payload: Validated AssessmentCreate Pydantic model.
            authenticated_student_id: Optional authenticated principal ID from auth token.

        Returns:
            Persisted AssessmentSchema with computed normalized score.

        Raises:
            UnauthorizedStudentAccessError: If requested student does not match authenticated principal.
            AssessmentValidationError: If score bounds or required fields fail validation.
        """
        clean_student_id = self.learner_state_service.enforce_student_authorization(
            payload.student_id, authenticated_student_id
        )

        # Score normalization
        normalized_score = payload.obtained_score / payload.max_score
        if normalized_score < 0.0 or normalized_score > 1.0:
            raise AssessmentValidationError(
                f"Computed normalized score ({normalized_score}) falls outside valid interval [0.0, 1.0]."
            )

        with self.db_manager.get_session() as session:
            student = self.student_repo.get_or_create(session, clean_student_id)

            record_data = {
                "student_id": student.id,
                "topic": payload.topic,
                "learning_objective_id": payload.learning_objective_id,
                "assessment_type": payload.assessment_type.value,
                "obtained_score": payload.obtained_score,
                "max_score": payload.max_score,
                "normalized_score": normalized_score,
                "verification_status": payload.verification_status.value,
                "evidence": payload.evidence,
                "intervention_id": payload.intervention_id,
                "timestamp": payload.timestamp or datetime.now(timezone.utc),
            }

            record = self.assessment_repo.create(session, record_data)
            return AssessmentSchema(**record.to_dict())

    def measure_learning_gain(
        self,
        pre_assessment_id: str,
        post_assessment_id: str,
        intervention_id: Optional[str] = None,
        require_verified: bool = True,
        update_topic_mastery: bool = True,
        notes: Optional[str] = None,
        authenticated_student_id: Optional[str] = None,
    ) -> LearningMeasurementResult:
        """Empirically evaluate normalized learning gain between paired pre- and post-assessments.

        Strict academic rules & edge cases:
        1. Duplicate identity: pre_id cannot equal post_id.
        2. Comparability: both assessments must belong to the same student, same topic,
           and exact same learning objective identifier.
        3. Verification: unverified assessment evidence is rejected from verified gain calculations.
        4. Chronology: post-assessment timestamp must not precede pre-assessment timestamp.
        5. Formula:
           g = (post_norm - pre_norm) / (1 - pre_norm)
        6. Perfect Pre-test: If pre_norm == 1.0, normalized gain is undefined (ceiling reached);
           returns normalized_gain=None with GainClassification.PERFECT_PRETEST.
        7. State Integration: If update_topic_mastery is True and evidence is verified,
           updates the persistent learner topic mastery state based on post-test outcome.

        Args:
            pre_assessment_id: Identifier of pre-intervention baseline assessment.
            post_assessment_id: Identifier of post-intervention evaluation assessment.
            intervention_id: Optional linking ID of the adaptive intervention.
            require_verified: If True, requires VERIFIED status on both assessments.
            update_topic_mastery: If True, updates persistent TopicMasteryState on verified post-test.
            notes: Optional diagnostic notes.
            authenticated_student_id: Optional security principal.

        Returns:
            Structured LearningMeasurementResult contract.

        Raises:
            AssessmentValidationError: For duplicate assessments or chronological violations.
            AssessmentNotFoundError: If either assessment ID does not exist in storage.
            IncompatibleAssessmentError: If topics, objectives, or students differ.
            UnverifiedEvidenceError: If require_verified is True and evidence is unverified.
            UnauthorizedStudentAccessError: If access violates tenant/student isolation.
        """
        if not pre_assessment_id or not post_assessment_id:
            raise AssessmentValidationError("Both pre_assessment_id and post_assessment_id must be provided.")

        if pre_assessment_id.strip() == post_assessment_id.strip():
            raise AssessmentValidationError(
                "Pre-assessment and post-assessment cannot refer to the exact same assessment record."
            )

        with self.db_manager.get_session() as session:
            pre_rec = self.assessment_repo.get_by_id(session, pre_assessment_id.strip())
            post_rec = self.assessment_repo.get_by_id(session, post_assessment_id.strip())

            if pre_rec is None:
                raise AssessmentNotFoundError(
                    f"Pre-assessment record '{pre_assessment_id}' could not be found."
                )
            if post_rec is None:
                raise AssessmentNotFoundError(
                    f"Post-assessment record '{post_assessment_id}' could not be found."
                )

            # Rule 1: Student ownership consistency
            if pre_rec.student_id != post_rec.student_id:
                raise IncompatibleAssessmentError(
                    "Assessments belong to different students; cannot calculate learning gain across distinct learners."
                )

            student = self.student_repo.get_by_id(session, pre_rec.student_id)
            if student is None:
                raise AssessmentNotFoundError(f"Associated student '{pre_rec.student_id}' not found.")

            # Rule 2: Security authorization check
            self.learner_state_service.enforce_student_authorization(
                student.external_student_id, authenticated_student_id
            )

            # Rule 3: Topic and Learning Objective comparability
            if pre_rec.topic != post_rec.topic:
                raise IncompatibleAssessmentError(
                    f"Assessment topic mismatch: pre-assessment is '{pre_rec.topic}', "
                    f"while post-assessment is '{post_rec.topic}'."
                )

            if pre_rec.learning_objective_id != post_rec.learning_objective_id:
                raise IncompatibleAssessmentError(
                    f"Assessment learning objective mismatch: pre-test is '{pre_rec.learning_objective_id}', "
                    f"while post-test is '{post_rec.learning_objective_id}'. Assessments are not comparable."
                )

            # Rule 4: Chronological consistency
            if pre_rec.timestamp and post_rec.timestamp and post_rec.timestamp < pre_rec.timestamp:
                raise AssessmentValidationError(
                    f"Post-assessment timestamp ({post_rec.timestamp.isoformat()}) cannot precede "
                    f"pre-assessment timestamp ({pre_rec.timestamp.isoformat()})."
                )

            # Rule 5: Verification check
            is_both_verified = (
                pre_rec.verification_status == VerificationStatus.VERIFIED.value
                and post_rec.verification_status == VerificationStatus.VERIFIED.value
            )
            if require_verified and not is_both_verified:
                raise UnverifiedEvidenceError(
                    "Cannot compute verified learning gain: one or both assessments lack VERIFIED status. "
                    f"Pre status='{pre_rec.verification_status}', Post status='{post_rec.verification_status}'."
                )

            # Rule 6: Normalized Learning Gain calculation
            pre_norm = float(pre_rec.normalized_score)
            post_norm = float(post_rec.normalized_score)
            absolute_gain = round(post_norm - pre_norm, 4)

            # Edge Case: Perfect pre-test (ceiling effect, denominator == 0)
            if abs(pre_norm - 1.0) < 1e-6:
                normalized_gain = None
                classification = GainClassification.PERFECT_PRETEST
                summary_explanation = (
                    "Student achieved a perfect pre-test score (1.0). Normalized learning gain is "
                    f"mathematically undefined (ceiling reached). Post-test score remained at {post_norm:.2f}."
                )
            else:
                gain_val = (post_norm - pre_norm) / (1.0 - pre_norm)
                normalized_gain = round(gain_val, 4)

                if normalized_gain > 0.0001:
                    classification = GainClassification.POSITIVE
                    summary_explanation = (
                        f"Positive normalized learning gain (+{normalized_gain:.2%}): performance improved "
                        f"from {pre_norm:.2%} (pre) to {post_norm:.2%} (post). Absolute gain: +{absolute_gain:.2%}."
                    )
                elif abs(normalized_gain) <= 0.0001:
                    classification = GainClassification.ZERO
                    summary_explanation = (
                        f"Zero learning gain: pre-test and post-test scores remained equivalent at {pre_norm:.2%}."
                    )
                else:
                    classification = GainClassification.NEGATIVE
                    summary_explanation = (
                        f"Negative learning gain ({normalized_gain:.2%}): performance decreased from "
                        f"{pre_norm:.2%} (pre) to {post_norm:.2%} (post). Absolute decline: {absolute_gain:.2%}."
                    )

            # Rule 7: Persist LearningMeasurementRecord
            linked_intervention = intervention_id or post_rec.intervention_id or pre_rec.intervention_id
            meas_data = {
                "student_id": student.id,
                "topic": pre_rec.topic,
                "learning_objective_id": pre_rec.learning_objective_id,
                "pre_assessment_id": pre_rec.id,
                "post_assessment_id": post_rec.id,
                "intervention_id": linked_intervention,
                "pre_normalized_score": pre_norm,
                "post_normalized_score": post_norm,
                "normalized_gain": normalized_gain,
                "absolute_gain": absolute_gain,
                "gain_classification": classification.value,
                "is_verified": is_both_verified,
                "notes": notes,
                "measured_at": datetime.now(timezone.utc),
            }

            record = self.measurement_repo.create(session, meas_data)

            # Rule 8: Learner state integration (update TopicMasteryState on verified post-assessment)
            if update_topic_mastery and is_both_verified:
                # Mastery reflects verified outcome: post_norm >= 0.70 represents mastery achievement
                is_correct_outcome = bool(post_norm >= 0.70)
                self.learner_state_service.mastery_repo.record_attempt(
                    session=session,
                    student_id=student.id,
                    topic=pre_rec.topic,
                    is_correct=is_correct_outcome,
                    timestamp=post_rec.timestamp,
                )

            return LearningMeasurementResult(
                measurement_id=record.id,
                student_id=student.external_student_id,
                topic=record.topic,
                learning_objective_id=record.learning_objective_id,
                pre_assessment_id=record.pre_assessment_id,
                post_assessment_id=record.post_assessment_id,
                intervention_id=record.intervention_id,
                pre_normalized_score=record.pre_normalized_score,
                post_normalized_score=record.post_normalized_score,
                normalized_gain=record.normalized_gain,
                absolute_gain=record.absolute_gain,
                gain_classification=classification,
                is_verified=record.is_verified,
                notes=record.notes,
                summary_explanation=summary_explanation,
                measured_at=record.measured_at.isoformat() if record.measured_at else None,
            )

    def get_student_measurements(
        self,
        external_student_id: str,
        topic: Optional[str] = None,
        authenticated_student_id: Optional[str] = None,
    ) -> List[LearningMeasurementResult]:
        """Fetch chronological learning measurement records for a student."""
        clean_id = self.learner_state_service.enforce_student_authorization(
            external_student_id, authenticated_student_id
        )
        with self.db_manager.get_session() as session:
            student = self.student_repo.get_by_external_id(session, clean_id)
            if student is None:
                return []
            records = self.measurement_repo.get_student_measurements(session, student.id, topic=topic)
            results = []
            for r in records:
                classification = GainClassification(r.gain_classification)
                gain_str = f"{r.normalized_gain:.2%}" if r.normalized_gain is not None else "N/A (ceiling)"
                results.append(
                    LearningMeasurementResult(
                        measurement_id=r.id,
                        student_id=clean_id,
                        topic=r.topic,
                        learning_objective_id=r.learning_objective_id,
                        pre_assessment_id=r.pre_assessment_id,
                        post_assessment_id=r.post_assessment_id,
                        intervention_id=r.intervention_id,
                        pre_normalized_score=r.pre_normalized_score,
                        post_normalized_score=r.post_normalized_score,
                        normalized_gain=r.normalized_gain,
                        absolute_gain=r.absolute_gain,
                        gain_classification=classification,
                        is_verified=r.is_verified,
                        notes=r.notes,
                        summary_explanation=f"Topic: {r.topic} | Gain: {gain_str} | Status: {r.gain_classification}",
                        measured_at=r.measured_at.isoformat() if r.measured_at else None,
                    )
                )
            return results

    def get_student_assessments(
        self,
        external_student_id: str,
        topic: Optional[str] = None,
        learning_objective_id: Optional[str] = None,
        assessment_type: Optional[str] = None,
        authenticated_student_id: Optional[str] = None,
    ) -> List[AssessmentSchema]:
        """Fetch assessment records for a student."""
        clean_id = self.learner_state_service.enforce_student_authorization(
            external_student_id, authenticated_student_id
        )
        with self.db_manager.get_session() as session:
            student = self.student_repo.get_by_external_id(session, clean_id)
            if student is None:
                return []
            records = self.assessment_repo.get_student_assessments(
                session=session,
                student_id=student.id,
                topic=topic,
                learning_objective_id=learning_objective_id,
                assessment_type=assessment_type,
            )
            return [AssessmentSchema(**r.to_dict()) for r in records]
