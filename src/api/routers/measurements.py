"""Learning measurements router evaluating normalized gains between paired assessments."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.api.auth import get_current_student
from src.api.schemas import MeasurementRequest, MeasurementResponse
from src.database.connection import DatabaseManager, get_db_manager
from src.learner_state.models import Student
from src.learning_measurement.service import LearningMeasurementService

router = APIRouter(prefix="/learning/measurements", tags=["Learning Measurements"])


@router.post(
    "",
    response_model=MeasurementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Compute normalized learning gain between pre- and post-assessments",
)
def compute_learning_measurement(
    payload: MeasurementRequest,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> MeasurementResponse:
    """Evaluate normalized learning gain (g = (post - pre) / (1 - pre)) between verified assessments."""
    service = LearningMeasurementService(db_manager=db_manager)

    result = service.measure_learning_gain(
        pre_assessment_id=payload.pre_assessment_id,
        post_assessment_id=payload.post_assessment_id,
        intervention_id=payload.intervention_id,
        require_verified=payload.require_verified,
        update_topic_mastery=payload.update_topic_mastery,
        notes=payload.notes,
        authenticated_student_id=current_student.external_student_id,
    )

    return MeasurementResponse(
        measurement_id=result.measurement_id,
        student_id=current_student.external_student_id,
        topic=result.topic,
        learning_objective_id=result.learning_objective_id,
        pre_assessment_id=result.pre_assessment_id,
        post_assessment_id=result.post_assessment_id,
        intervention_id=result.intervention_id,
        pre_normalized_score=result.pre_normalized_score,
        post_normalized_score=result.post_normalized_score,
        normalized_gain=result.normalized_gain,
        absolute_gain=result.absolute_gain,
        gain_classification=result.gain_classification.value,
        is_verified=result.is_verified,
        summary_explanation=result.summary_explanation,
        measured_at=result.measured_at,
    )


@router.get(
    "",
    response_model=List[MeasurementResponse],
    summary="List learning gain measurements for current student",
)
def list_measurements(
    topic: Optional[str] = Query(default=None, description="Optional topic filter."),
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> List[MeasurementResponse]:
    """Retrieve chronological learning measurement records for the current student."""
    service = LearningMeasurementService(db_manager=db_manager)
    results = service.get_student_measurements(
        external_student_id=current_student.external_student_id,
        topic=topic,
        authenticated_student_id=current_student.external_student_id,
    )

    return [
        MeasurementResponse(
            measurement_id=r.measurement_id,
            student_id=current_student.external_student_id,
            topic=r.topic,
            learning_objective_id=r.learning_objective_id,
            pre_assessment_id=r.pre_assessment_id,
            post_assessment_id=r.post_assessment_id,
            intervention_id=r.intervention_id,
            pre_normalized_score=r.pre_normalized_score,
            post_normalized_score=r.post_normalized_score,
            normalized_gain=r.normalized_gain,
            absolute_gain=r.absolute_gain,
            gain_classification=r.gain_classification.value,
            is_verified=r.is_verified,
            summary_explanation=r.summary_explanation,
            measured_at=r.measured_at,
        )
        for r in results
    ]


@router.get(
    "/{measurement_id}",
    response_model=MeasurementResponse,
    summary="Retrieve single measurement record by ID",
)
def get_measurement(
    measurement_id: str,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> MeasurementResponse:
    """Fetch an individual measurement record with ownership verification."""
    with db_manager.get_session() as session:
        service = LearningMeasurementService(db_manager=db_manager)
        m = service.measurement_repo.get_by_id(
            session=session,
            measurement_id=measurement_id,
            student_id=current_student.id,
        )
        if m is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Measurement '{measurement_id}' not found or access denied.",
            )

        return MeasurementResponse(
            measurement_id=m.id,
            student_id=current_student.external_student_id,
            topic=m.topic,
            learning_objective_id=m.learning_objective_id,
            pre_assessment_id=m.pre_assessment_id,
            post_assessment_id=m.post_assessment_id,
            intervention_id=m.intervention_id,
            pre_normalized_score=round(m.pre_normalized_score, 4),
            post_normalized_score=round(m.post_normalized_score, 4),
            normalized_gain=round(m.normalized_gain, 4) if m.normalized_gain is not None else None,
            absolute_gain=round(m.absolute_gain, 4),
            gain_classification=m.gain_classification,
            is_verified=m.is_verified,
            summary_explanation=f"Topic: {m.topic} | Gain: {m.normalized_gain} | Status: {m.gain_classification}",
            measured_at=m.measured_at.isoformat() if m.measured_at else None,
        )
