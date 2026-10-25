"""Assessment lifecycle router for submitting and inspecting student evaluation attempts."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.api.auth import get_current_student
from src.api.schemas import AssessmentResponse, AssessmentSubmissionRequest
from src.database.connection import DatabaseManager, get_db_manager
from src.learner_state.models import Student
from src.learning_measurement.models import AssessmentType, VerificationStatus
from src.learning_measurement.schemas import AssessmentCreate
from src.learning_measurement.service import LearningMeasurementService

router = APIRouter(prefix="/assessments", tags=["Assessments"])


@router.post(
    "",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit an assessment attempt",
)
def submit_assessment(
    payload: AssessmentSubmissionRequest,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> AssessmentResponse:
    """Validate, normalize, and record a student assessment attempt."""
    service = LearningMeasurementService(db_manager=db_manager)

    asmt_type = AssessmentType(payload.assessment_type) if payload.assessment_type in AssessmentType._value2member_map_ else AssessmentType.PRE_INTERVENTION

    create_payload = AssessmentCreate(
        student_id=current_student.external_student_id,
        topic=payload.topic,
        learning_objective_id=payload.learning_objective_id,
        assessment_type=asmt_type,
        obtained_score=payload.obtained_score,
        max_score=payload.max_score,
        evidence=payload.evidence,
        verification_status=VerificationStatus.VERIFIED,
        intervention_id=payload.intervention_id,
    )

    asmt = service.record_assessment(
        payload=create_payload,
        authenticated_student_id=current_student.external_student_id,
    )

    return AssessmentResponse(
        id=asmt.id,
        student_id=current_student.external_student_id,
        topic=asmt.topic,
        learning_objective_id=asmt.learning_objective_id,
        assessment_type=asmt.assessment_type,
        obtained_score=asmt.obtained_score,
        max_score=asmt.max_score,
        normalized_score=asmt.normalized_score,
        verification_status=asmt.verification_status,
        evidence=asmt.evidence,
        intervention_id=asmt.intervention_id,
        timestamp=asmt.timestamp,
    )


@router.get(
    "",
    response_model=List[AssessmentResponse],
    summary="List assessments for current student",
)
def list_assessments(
    topic: Optional[str] = Query(default=None, description="Optional topic filter."),
    learning_objective_id: Optional[str] = Query(default=None, description="Optional learning objective filter."),
    assessment_type: Optional[str] = Query(default=None, description="Optional assessment type filter."),
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> List[AssessmentResponse]:
    """Retrieve chronological assessment history for the current authenticated student."""
    service = LearningMeasurementService(db_manager=db_manager)
    records = service.get_student_assessments(
        external_student_id=current_student.external_student_id,
        topic=topic,
        learning_objective_id=learning_objective_id,
        assessment_type=assessment_type,
        authenticated_student_id=current_student.external_student_id,
    )

    return [
        AssessmentResponse(
            id=r.id,
            student_id=current_student.external_student_id,
            topic=r.topic,
            learning_objective_id=r.learning_objective_id,
            assessment_type=r.assessment_type,
            obtained_score=r.obtained_score,
            max_score=r.max_score,
            normalized_score=r.normalized_score,
            verification_status=r.verification_status,
            evidence=r.evidence,
            intervention_id=r.intervention_id,
            timestamp=r.timestamp,
        )
        for r in records
    ]


@router.get(
    "/{assessment_id}",
    response_model=AssessmentResponse,
    summary="Retrieve single assessment record by ID",
)
def get_assessment(
    assessment_id: str,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> AssessmentResponse:
    """Fetch an individual assessment record with ownership verification."""
    with db_manager.get_session() as session:
        service = LearningMeasurementService(db_manager=db_manager)
        asmt = service.assessment_repo.get_by_id(
            session=session,
            assessment_id=assessment_id,
            student_id=current_student.id,
        )
        if asmt is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment '{assessment_id}' not found or access denied.",
            )

        return AssessmentResponse(
            id=asmt.id,
            student_id=current_student.external_student_id,
            topic=asmt.topic,
            learning_objective_id=asmt.learning_objective_id,
            assessment_type=asmt.assessment_type,
            obtained_score=round(asmt.obtained_score, 4),
            max_score=round(asmt.max_score, 4),
            normalized_score=round(asmt.normalized_score, 4),
            verification_status=asmt.verification_status,
            evidence=asmt.evidence,
            intervention_id=asmt.intervention_id,
            timestamp=asmt.timestamp.isoformat() if asmt.timestamp else None,
        )
