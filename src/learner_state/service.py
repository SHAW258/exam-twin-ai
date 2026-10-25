"""Learner State and Error DNA Service for ExamTwin.

Coordinates persistent student profiles, diagnostic event recording,
Phase 5 ML classifier integration, and explainable Error DNA summaries.
"""

from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, List, Optional

from src.database.connection import DatabaseManager, get_db_manager
from src.error_diagnosis.classifier import ErrorDiagnosisClassifier
from src.error_diagnosis.taxonomy import ErrorType
from src.learner_state.models import Student
from src.learner_state.repository import (
    ErrorHistoryRepository,
    StudentRepository,
    TopicMasteryRepository,
)
from src.learner_state.schemas import (
    AffectedTopicItem,
    DiagnosisRecordSchema,
    ErrorDNASummary,
    RecurringErrorItem,
    RevisionRecommendation,
    StudentProfileSchema,
    TemporalTrend,
    TopicMasterySchema,
)

logger = logging.getLogger(__name__)


class LearnerStateError(Exception):
    """Base exception for learner state operations."""
    pass


class StudentNotFoundError(LearnerStateError):
    """Raised when an operation targets a non-existent student identifier."""
    pass


class InvalidStudentIdentifierError(LearnerStateError):
    """Raised when a provided student identifier is blank or invalid."""
    pass


class UnauthorizedStudentAccessError(LearnerStateError):
    """Raised when an operation attempts unauthorized access across student boundaries."""
    pass


class LearnerStateService:
    """Core domain service for persistent student state and Error DNA derivation."""

    def __init__(
        self,
        db_manager: Optional[DatabaseManager] = None,
        classifier: Optional[ErrorDiagnosisClassifier] = None,
    ):
        """Initialize LearnerStateService.

        Args:
            db_manager: Database connection manager. Defaults to global get_db_manager().
            classifier: Error diagnosis classifier. If None, initialized with defaults.
        """
        self.db_manager = db_manager or get_db_manager()
        self._classifier = classifier
        self.student_repo = StudentRepository()
        self.error_repo = ErrorHistoryRepository()
        self.mastery_repo = TopicMasteryRepository()

    @property
    def classifier(self) -> ErrorDiagnosisClassifier:
        """Lazy-initialize or return the error diagnosis classifier."""
        if self._classifier is None:
            self._classifier = ErrorDiagnosisClassifier()
        return self._classifier

    def _validate_student_id(self, external_student_id: str) -> str:
        """Validate format of external student identifier."""
        if not external_student_id or not str(external_student_id).strip():
            raise InvalidStudentIdentifierError(
                "external_student_id must be a non-empty string identifier."
            )
        return str(external_student_id).strip()

    def enforce_student_authorization(
        self,
        requested_student_id: str,
        authenticated_student_id: Optional[str] = None,
    ) -> str:
        """Enforce identity authorization boundary.

        SECURITY BOUNDARY:
        - In the core service layer, methods receive requested_student_id.
        - When exposed over an HTTP API (Phase 9), the caller's identity MUST come from
          an authenticated security principal (e.g., verified JWT 'sub' claim or session).
        - If authenticated_student_id is supplied, it is the authoritative trusted principal.
          Any mismatch with requested_student_id raises UnauthorizedStudentAccessError to
          prevent Insecure Direct Object References (IDOR).
        - If authenticated_student_id is None, the call runs in internal/trusted domain mode.

        Args:
            requested_student_id: Student ID provided in the request payload or parameter.
            authenticated_student_id: Authoritative identity from authentication middleware.

        Returns:
            Validated clean student identifier.

        Raises:
            InvalidStudentIdentifierError: If requested_student_id is blank.
            UnauthorizedStudentAccessError: If requested_student_id does not match authenticated_student_id.
        """
        clean_id = self._validate_student_id(requested_student_id)
        if authenticated_student_id is not None:
            clean_principal = str(authenticated_student_id).strip()
            if clean_id != clean_principal:
                raise UnauthorizedStudentAccessError(
                    f"Authorization failed: requested student identifier '{clean_id}' does not "
                    f"match authenticated principal '{clean_principal}'."
                )
        return clean_id

    def register_or_get_student(
        self,
        external_student_id: str,
        authenticated_student_id: Optional[str] = None,
    ) -> StudentProfileSchema:
        """Retrieve existing student profile or create a new student record."""
        clean_id = self.enforce_student_authorization(external_student_id, authenticated_student_id)
        with self.db_manager.get_session() as session:
            student = self.student_repo.get_or_create(session, clean_id)
            data = student.to_dict()
            return StudentProfileSchema(**data)

    def diagnose_and_record(
        self,
        external_student_id: str,
        question: str,
        student_answer: str,
        expected_answer: Optional[str] = None,
        topic: str = "General",
        context: Optional[str] = None,
        authenticated_student_id: Optional[str] = None,
    ) -> DiagnosisRecordSchema:
        """Execute Phase 5 error classification and record immutable diagnosis event.

        Strict academic rules:
        - Accurately records prediction, confidence, and review flags.
        - Low-confidence predictions (confidence < min_confidence) are marked needs_review=True
          and are NOT silently treated as confirmed errors.
        - Topic mastery is NOT decremented merely because a classifier predicted an error;
          mastery updates require verified correctness signals.

        Args:
            external_student_id: Student unique identifier.
            question: Prompt / problem text.
            student_answer: Student submitted response.
            expected_answer: Reference answer, if available.
            topic: Curricular topic name (e.g., 'Data Structures').
            context: Additional module or course notes context.
            authenticated_student_id: Optional security principal from auth token.

        Returns:
            Persisted DiagnosisRecordSchema record.
        """
        clean_student_id = self.enforce_student_authorization(
            external_student_id, authenticated_student_id
        )
        resolved_topic = (topic or "General").strip()

        # Step 1: Run Phase 5 classifier inference
        pred = self.classifier.predict_error(
            question=question,
            student_answer=student_answer,
            expected_answer=expected_answer,
            context=context or resolved_topic,
        )

        predicted_category = pred.get("predicted_category")
        confidence = float(pred.get("confidence", 0.0))
        needs_review = bool(pred.get("needs_review", False))
        model_version = str(pred.get("model_version", "baseline_v1"))

        # Step 2: Persist immutable audit record in database
        with self.db_manager.get_session() as session:
            student = self.student_repo.get_or_create(session, clean_student_id)

            record_data = {
                "student_id": student.id,
                "topic": resolved_topic,
                "error_category": predicted_category,
                "question_reference": question,
                "student_answer": student_answer,
                "expected_answer": expected_answer,
                "confidence_score": confidence,
                "needs_review": needs_review,
                "is_verified": False,
                "model_version": model_version,
            }

            record = self.error_repo.create_record(session, record_data)
            return DiagnosisRecordSchema(**record.to_dict())

    def record_verified_assessment(
        self,
        external_student_id: str,
        topic: str,
        is_correct: bool,
        timestamp: Optional[datetime] = None,
        authenticated_student_id: Optional[str] = None,
    ) -> TopicMasterySchema:
        """Record verified assessment outcome and recalculate topic mastery.

        Args:
            external_student_id: Student identifier.
            topic: Curricular topic evaluated.
            is_correct: Verified assessment correctness boolean.
            timestamp: Optional execution timestamp.
            authenticated_student_id: Optional security principal from auth token.

        Returns:
            Updated TopicMasterySchema.
        """
        clean_student_id = self.enforce_student_authorization(
            external_student_id, authenticated_student_id
        )
        resolved_topic = (topic or "General").strip()

        with self.db_manager.get_session() as session:
            student = self.student_repo.get_or_create(session, clean_student_id)
            mastery = self.mastery_repo.record_attempt(
                session=session,
                student_id=student.id,
                topic=resolved_topic,
                is_correct=is_correct,
                timestamp=timestamp,
            )
            return TopicMasterySchema(**mastery.to_dict())

    def get_error_dna_summary(
        self,
        external_student_id: str,
        window_days: int = 30,
        forgetting_threshold_days: int = 14,
        authenticated_student_id: Optional[str] = None,
    ) -> ErrorDNASummary:
        """Derive an explainable, evidence-backed Error DNA summary for a student.

        Args:
            external_student_id: Student identifier.
            window_days: Time window (in days) defining recent learning activity.
            forgetting_threshold_days: Heuristic elapsed days triggering a revision suggestion.
            authenticated_student_id: Optional security principal from auth token.

        Returns:
            ErrorDNASummary schema detailing recurring errors, affected topics,
            temporal trend, and revision suggestions.
        """
        clean_student_id = self.enforce_student_authorization(
            external_student_id, authenticated_student_id
        )
        now = datetime.now(timezone.utc)
        recent_cutoff = now - timedelta(days=window_days)

        with self.db_manager.get_session() as session:
            student = self.student_repo.get_by_external_id(session, clean_student_id)
            if student is None:
                # Return zero-activity summary for new or unobserved students
                return ErrorDNASummary(
                    student_id=clean_student_id,
                    total_diagnoses=0,
                    review_required_count=0,
                    confirmed_diagnoses_count=0,
                    recurring_errors=[],
                    most_affected_topics=[],
                    temporal_trend=TemporalTrend(
                        recent_window_days=window_days,
                        recent_diagnoses_count=0,
                        historical_diagnoses_count=0,
                        trend="STABLE",
                    ),
                    topic_masteries=[],
                    revision_recommendations=[],
                )

            student_id = student.id

            total_count = self.error_repo.count_total(session, student_id)
            review_count = self.error_repo.count_review_needed(session, student_id)
            confirmed_count = max(0, total_count - review_count)

            # Category distribution (confirmed only)
            cat_counts = self.error_repo.get_category_counts(session, student_id)
            recurring_errors: List[RecurringErrorItem] = []
            for category, count in cat_counts:
                pct = round((count / confirmed_count) * 100.0, 2) if confirmed_count > 0 else 0.0
                recurring_errors.append(
                    RecurringErrorItem(category=category, count=count, percentage=pct)
                )

            # Most affected topics
            topic_counts = self.error_repo.get_topic_error_counts(session, student_id)
            affected_topics: List[AffectedTopicItem] = []
            for topic_name, count in topic_counts:
                # Find dominant error category for this specific topic
                stmt_dominant = self.error_repo.get_category_counts(session, student_id, topic=topic_name)
                primary_cat = stmt_dominant[0][0] if stmt_dominant else None
                affected_topics.append(
                    AffectedTopicItem(
                        topic=topic_name,
                        count=count,
                        primary_error_category=primary_cat,
                    )
                )

            # Temporal trend calculation
            recent_count = self.error_repo.count_total(session, student_id, since=recent_cutoff)
            historical_count = max(0, total_count - recent_count)

            if total_count == 0:
                trend = "STABLE"
            elif historical_count == 0 and recent_count > 0:
                trend = "INCREASING"
            else:
                ratio = recent_count / max(1, historical_count)
                if ratio > 1.3:
                    trend = "INCREASING"
                elif ratio < 0.7:
                    trend = "DECREASING"
                else:
                    trend = "STABLE"

            temporal = TemporalTrend(
                recent_window_days=window_days,
                recent_diagnoses_count=recent_count,
                historical_diagnoses_count=historical_count,
                trend=trend,
            )

            # Topic masteries
            mastery_models = self.mastery_repo.get_student_masteries(session, student_id)
            masteries = [TopicMasterySchema(**m.to_dict()) for m in mastery_models]

            # Revision recommendations (heuristic forgetting & recurring error indicators)
            recommendations: List[RevisionRecommendation] = []
            for m in mastery_models:
                # Check for high error rate
                if m.attempts_count > 0 and (m.incorrect_attempts / m.attempts_count) >= 0.5:
                    recommendations.append(
                        RevisionRecommendation(
                            topic=m.topic,
                            reason=(
                                f"High incorrect rate ({m.incorrect_attempts}/{m.attempts_count} attempts). "
                                "Core conceptual review recommended."
                            ),
                            urgency="HIGH",
                        )
                    )
                # Check for elapsed time (heuristic forgetting)
                elif m.last_attempt_at:
                    # Make last_attempt_at timezone-aware if needed
                    dt = m.last_attempt_at
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    days_elapsed = (now - dt).days
                    if days_elapsed >= forgetting_threshold_days:
                        recommendations.append(
                            RevisionRecommendation(
                                topic=m.topic,
                                reason=(
                                    f"No practice recorded in {days_elapsed} days "
                                    f"(threshold: {forgetting_threshold_days} days)."
                                ),
                                days_since_last_attempt=days_elapsed,
                                urgency="MEDIUM",
                            )
                        )

            return ErrorDNASummary(
                student_id=clean_student_id,
                total_diagnoses=total_count,
                review_required_count=review_count,
                confirmed_diagnoses_count=confirmed_count,
                recurring_errors=recurring_errors,
                most_affected_topics=affected_topics,
                temporal_trend=temporal,
                topic_masteries=masteries,
                revision_recommendations=recommendations,
            )

    def get_student_history(
        self,
        external_student_id: str,
        limit: int = 50,
        offset: int = 0,
        topic: Optional[str] = None,
        authenticated_student_id: Optional[str] = None,
    ) -> List[DiagnosisRecordSchema]:
        """Fetch chronological diagnosis history for a student."""
        clean_student_id = self.enforce_student_authorization(
            external_student_id, authenticated_student_id
        )
        with self.db_manager.get_session() as session:
            student = self.student_repo.get_by_external_id(session, clean_student_id)
            if student is None:
                return []
            records = self.error_repo.get_student_history(
                session=session,
                student_id=student.id,
                limit=limit,
                offset=offset,
                topic=topic,
            )
            return [DiagnosisRecordSchema(**r.to_dict()) for r in records]

    def verify_diagnosis_record(
        self,
        record_id: str,
        verified_category: str,
    ) -> Optional[DiagnosisRecordSchema]:
        """Allow an educator or ground truth review to verify a diagnosis."""
        with self.db_manager.get_session() as session:
            record = self.error_repo.verify_record(session, record_id, verified_category)
            if record:
                return DiagnosisRecordSchema(**record.to_dict())
            return None
