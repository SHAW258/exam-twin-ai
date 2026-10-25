"""Learning, error diagnosis, and adaptive intervention router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from src.adaptive_intervention.schemas import InterventionRecommendation
from src.adaptive_intervention.service import AdaptiveInterventionService
from src.api.auth import get_current_student
from src.api.schemas import DiagnosisRequest, DiagnosisResponse
from src.database.connection import DatabaseManager, get_db_manager
from src.learner_state.schemas import ErrorDNASummary
from src.learner_state.service import LearnerStateService
from src.learner_state.models import Student
from src.rag.rag_service import get_rag_service

router = APIRouter(tags=["Learning & Diagnostics"])


@router.post(
    "/diagnosis",
    response_model=DiagnosisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Diagnose student error and record persistent diagnostic history",
)
def diagnose_error(
    payload: DiagnosisRequest,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> DiagnosisResponse:
    """Classify student misconception using Phase 5 ML classifier and record an immutable audit event."""
    service = LearnerStateService(db_manager=db_manager)
    record = service.diagnose_and_record(
        external_student_id=current_student.external_student_id,
        question=payload.question,
        student_answer=payload.student_answer,
        expected_answer=payload.expected_answer,
        topic=payload.topic,
        context=payload.context,
        authenticated_student_id=current_student.external_student_id,
    )

    return DiagnosisResponse(
        id=record.id,
        student_id=current_student.external_student_id,
        topic=record.topic,
        error_category=record.error_category,
        confidence_score=round(record.confidence_score, 4),
        needs_review=record.needs_review,
        is_verified=record.is_verified,
        model_version=record.model_version,
        created_at=record.created_at.isoformat() if record.created_at else None,
    )


@router.get(
    "/learning/state",
    response_model=ErrorDNASummary,
    summary="Retrieve persistent Error DNA and topic mastery profile",
)
def get_learner_state(
    window_days: int = Query(default=30, ge=1, le=365, description="Time window for recent activity analysis."),
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> ErrorDNASummary:
    """Return comprehensive explainable Error DNA summary, recurring errors, masteries, and revision suggestions."""
    service = LearnerStateService(db_manager=db_manager)
    return service.get_error_dna_summary(
        external_student_id=current_student.external_student_id,
        window_days=window_days,
        authenticated_student_id=current_student.external_student_id,
    )


@router.get(
    "/learning/interventions",
    response_model=InterventionRecommendation,
    summary="Generate prioritized adaptive intervention recommendation",
)
def get_adaptive_interventions(
    candidate_topics: Optional[List[str]] = Query(default=None, description="Optional topic filters."),
    include_grounded_content: bool = Query(
        default=False,
        description="Whether to retrieve course notes excerpts via grounded RAG.",
    ),
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> InterventionRecommendation:
    """Generate explainable pedagogical recommendation with prioritized topic and targeted intervention strategy."""
    learner_service = LearnerStateService(db_manager=db_manager)
    rag_service = get_rag_service(db_manager=db_manager)
    adaptive_service = AdaptiveInterventionService(
        learner_state_service=learner_service,
        rag_service=rag_service,
    )

    return adaptive_service.recommend_intervention(
        external_student_id=current_student.external_student_id,
        candidate_topics=candidate_topics,
        include_grounded_content=include_grounded_content,
        authenticated_student_id=current_student.external_student_id,
    )
