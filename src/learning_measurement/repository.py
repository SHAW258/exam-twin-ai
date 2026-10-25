"""SQLAlchemy repositories for Phase 8: Assessment and Learning Measurement entities."""

from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from src.learning_measurement.models import AssessmentRecord, LearningMeasurementRecord


class AssessmentRepository:
    """Repository handling persistence and queries for AssessmentRecord entities."""

    def create(self, session: Session, data: Dict[str, Any]) -> AssessmentRecord:
        """Persist a new AssessmentRecord entity."""
        record = AssessmentRecord(**data)
        session.add(record)
        session.flush()
        return record

    def get_by_id(
        self,
        session: Session,
        assessment_id: str,
        student_id: Optional[str] = None,
    ) -> Optional[AssessmentRecord]:
        """Fetch an assessment by its primary ID, optionally scoped to a student."""
        stmt = select(AssessmentRecord).where(AssessmentRecord.id == assessment_id)
        if student_id is not None:
            stmt = stmt.where(AssessmentRecord.student_id == student_id)
        return session.execute(stmt).scalar_one_or_none()

    def get_student_assessments(
        self,
        session: Session,
        student_id: str,
        topic: Optional[str] = None,
        learning_objective_id: Optional[str] = None,
        assessment_type: Optional[str] = None,
    ) -> List[AssessmentRecord]:
        """Fetch assessments for a student with optional topic, learning objective, and type filters."""
        stmt = select(AssessmentRecord).where(AssessmentRecord.student_id == student_id)
        if topic:
            stmt = stmt.where(AssessmentRecord.topic == topic)
        if learning_objective_id:
            stmt = stmt.where(AssessmentRecord.learning_objective_id == learning_objective_id)
        if assessment_type:
            stmt = stmt.where(AssessmentRecord.assessment_type == assessment_type)
        stmt = stmt.order_by(desc(AssessmentRecord.timestamp))
        return list(session.execute(stmt).scalars().all())


class LearningMeasurementRepository:
    """Repository handling persistence and queries for LearningMeasurementRecord entities."""

    def create(self, session: Session, data: Dict[str, Any]) -> LearningMeasurementRecord:
        """Persist a new LearningMeasurementRecord entity."""
        record = LearningMeasurementRecord(**data)
        session.add(record)
        session.flush()
        return record

    def get_by_id(
        self,
        session: Session,
        measurement_id: str,
        student_id: Optional[str] = None,
    ) -> Optional[LearningMeasurementRecord]:
        """Fetch a measurement record by primary ID, optionally scoped to a student."""
        stmt = select(LearningMeasurementRecord).where(
            LearningMeasurementRecord.id == measurement_id
        )
        if student_id is not None:
            stmt = stmt.where(LearningMeasurementRecord.student_id == student_id)
        return session.execute(stmt).scalar_one_or_none()

    def get_student_measurements(
        self,
        session: Session,
        student_id: str,
        topic: Optional[str] = None,
    ) -> List[LearningMeasurementRecord]:
        """Fetch chronological learning measurement records for a student."""
        stmt = select(LearningMeasurementRecord).where(
            LearningMeasurementRecord.student_id == student_id
        )
        if topic:
            stmt = stmt.where(LearningMeasurementRecord.topic == topic)
        stmt = stmt.order_by(desc(LearningMeasurementRecord.measured_at))
        return list(session.execute(stmt).scalars().all())

    def get_by_assessment_pair(
        self,
        session: Session,
        pre_assessment_id: str,
        post_assessment_id: str,
    ) -> Optional[LearningMeasurementRecord]:
        """Find an existing measurement by its paired assessment identifiers."""
        stmt = select(LearningMeasurementRecord).where(
            LearningMeasurementRecord.pre_assessment_id == pre_assessment_id,
            LearningMeasurementRecord.post_assessment_id == post_assessment_id,
        )
        return session.execute(stmt).scalar_one_or_none()
