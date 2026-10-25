"""Repository layer for Learner State, Error History, and Topic Mastery."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from src.learner_state.models import ErrorDiagnosisRecord, Student, TopicMasteryState


class StudentRepository:
    """Encapsulates database operations for Student learner profiles."""

    def get_by_external_id(self, session: Session, external_student_id: str) -> Optional[Student]:
        """Retrieve student record by unique external identifier."""
        stmt = select(Student).where(Student.external_student_id == external_student_id)
        return session.execute(stmt).scalars().first()

    def get_by_id(self, session: Session, student_id: str) -> Optional[Student]:
        """Retrieve student record by primary key."""
        return session.get(Student, student_id)

    def get_or_create(self, session: Session, external_student_id: str) -> Student:
        """Fetch existing student or create a new student record."""
        student = self.get_by_external_id(session, external_student_id)
        if student is None:
            student = Student(external_student_id=external_student_id)
            session.add(student)
            session.flush()
        return student


class ErrorHistoryRepository:
    """Encapsulates database operations for immutable Error Diagnosis records."""

    def create_record(self, session: Session, record_data: Dict[str, Any]) -> ErrorDiagnosisRecord:
        """Persist a new immutable error diagnosis record."""
        record = ErrorDiagnosisRecord(**record_data)
        session.add(record)
        session.flush()
        return record

    def get_student_history(
        self,
        session: Session,
        student_id: str,
        limit: int = 100,
        offset: int = 0,
        topic: Optional[str] = None,
        error_category: Optional[str] = None,
    ) -> List[ErrorDiagnosisRecord]:
        """Query chronological error diagnosis history for a student."""
        stmt = select(ErrorDiagnosisRecord).where(ErrorDiagnosisRecord.student_id == student_id)
        if topic:
            stmt = stmt.where(ErrorDiagnosisRecord.topic == topic)
        if error_category:
            stmt = stmt.where(ErrorDiagnosisRecord.error_category == error_category)
        stmt = stmt.order_by(desc(ErrorDiagnosisRecord.created_at)).limit(limit).offset(offset)
        return list(session.execute(stmt).scalars().all())

    def get_category_counts(
        self,
        session: Session,
        student_id: str,
        topic: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> List[Tuple[str, int]]:
        """Return counts of confirmed error categories (excluding null / review-required)."""
        stmt = (
            select(
                ErrorDiagnosisRecord.error_category,
                func.count(ErrorDiagnosisRecord.id).label("count"),
            )
            .where(
                ErrorDiagnosisRecord.student_id == student_id,
                ErrorDiagnosisRecord.error_category.isnot(None),
                ErrorDiagnosisRecord.needs_review.is_(False),
            )
            .group_by(ErrorDiagnosisRecord.error_category)
            .order_by(desc("count"))
        )
        if topic:
            stmt = stmt.where(ErrorDiagnosisRecord.topic == topic)
        if since:
            stmt = stmt.where(ErrorDiagnosisRecord.created_at >= since)
        results = session.execute(stmt).all()
        return [(str(row[0]), int(row[1])) for row in results]

    def get_topic_error_counts(
        self,
        session: Session,
        student_id: str,
        since: Optional[datetime] = None,
    ) -> List[Tuple[str, int]]:
        """Return counts of error diagnosis events grouped by topic."""
        stmt = (
            select(
                ErrorDiagnosisRecord.topic,
                func.count(ErrorDiagnosisRecord.id).label("count"),
            )
            .where(ErrorDiagnosisRecord.student_id == student_id)
            .group_by(ErrorDiagnosisRecord.topic)
            .order_by(desc("count"))
        )
        if since:
            stmt = stmt.where(ErrorDiagnosisRecord.created_at >= since)
        results = session.execute(stmt).all()
        return [(str(row[0]), int(row[1])) for row in results]

    def count_total(
        self,
        session: Session,
        student_id: str,
        since: Optional[datetime] = None,
    ) -> int:
        """Count total diagnosis records for a student."""
        stmt = select(func.count(ErrorDiagnosisRecord.id)).where(
            ErrorDiagnosisRecord.student_id == student_id
        )
        if since:
            stmt = stmt.where(ErrorDiagnosisRecord.created_at >= since)
        return int(session.execute(stmt).scalar() or 0)

    def count_review_needed(
        self,
        session: Session,
        student_id: str,
        since: Optional[datetime] = None,
    ) -> int:
        """Count diagnoses flagged as uncertain or below confidence threshold."""
        stmt = select(func.count(ErrorDiagnosisRecord.id)).where(
            ErrorDiagnosisRecord.student_id == student_id,
            ErrorDiagnosisRecord.needs_review.is_(True),
        )
        if since:
            stmt = stmt.where(ErrorDiagnosisRecord.created_at >= since)
        return int(session.execute(stmt).scalar() or 0)

    def verify_record(
        self,
        session: Session,
        record_id: str,
        verified_category: str,
    ) -> Optional[ErrorDiagnosisRecord]:
        """Update review audit status for an existing diagnosis record."""
        record = session.get(ErrorDiagnosisRecord, record_id)
        if record:
            record.is_verified = True
            record.verified_error_category = verified_category
            record.needs_review = False
            session.flush()
        return record


class TopicMasteryRepository:
    """Encapsulates database operations for Topic Mastery states."""

    @staticmethod
    def calculate_estimated_mastery(correct_attempts: int, total_attempts: int) -> float:
        """Compute sample-size credential-weighted estimated mastery score.

        Formula:
            When total_attempts == 0: 0.0
            When total_attempts > 0:
                raw_success = correct_attempts / total_attempts
                sample_credential = 1.0 - (1.0 / (1.0 + 0.5 * total_attempts))
                mastery_score = round(raw_success * sample_credential, 4)

        Properties:
            - Strictly bounded between 0.0 and 1.0.
            - Accounts for empirical performance while penalizing small sample sizes
              (e.g., 1 lucky correct attempt yields 0.3333 mastery, not 1.0).
        """
        if total_attempts <= 0:
            return 0.0
        raw_success = max(0.0, min(1.0, correct_attempts / total_attempts))
        sample_credential = 1.0 - (1.0 / (1.0 + 0.5 * total_attempts))
        return round(raw_success * sample_credential, 4)

    def get_or_create_topic_state(
        self,
        session: Session,
        student_id: str,
        topic: str,
    ) -> TopicMasteryState:
        """Fetch existing topic mastery state or initialize a zero-attempt record."""
        stmt = select(TopicMasteryState).where(
            TopicMasteryState.student_id == student_id,
            TopicMasteryState.topic == topic,
        )
        state = session.execute(stmt).scalars().first()
        if state is None:
            state = TopicMasteryState(
                student_id=student_id,
                topic=topic,
                attempts_count=0,
                correct_attempts=0,
                incorrect_attempts=0,
                mastery_score=0.0,
            )
            session.add(state)
            session.flush()
        return state

    def record_attempt(
        self,
        session: Session,
        student_id: str,
        topic: str,
        is_correct: bool,
        timestamp: Optional[datetime] = None,
    ) -> TopicMasteryState:
        """Update topic mastery counts upon a verified assessment attempt."""
        state = self.get_or_create_topic_state(session, student_id, topic)
        state.attempts_count += 1
        if is_correct:
            state.correct_attempts += 1
        else:
            state.incorrect_attempts += 1

        state.last_attempt_at = timestamp or datetime.now(timezone.utc)
        state.mastery_score = self.calculate_estimated_mastery(
            state.correct_attempts, state.attempts_count
        )
        session.flush()
        return state

    def get_student_masteries(
        self,
        session: Session,
        student_id: str,
    ) -> List[TopicMasteryState]:
        """Fetch all topic mastery records for a student."""
        stmt = (
            select(TopicMasteryState)
            .where(TopicMasteryState.student_id == student_id)
            .order_by(desc(TopicMasteryState.mastery_score))
        )
        return list(session.execute(stmt).scalars().all())
