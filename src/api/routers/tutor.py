"""AI Tutor router providing course-grounded Q&A, Socratic hints, and practice questions."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from src.api.auth import get_current_student
from src.api.schemas import SourceCitationResponse, TutorAskRequest, TutorAskResponse
from src.database.connection import DatabaseManager, get_db_manager
from src.learner_state.models import Student
from src.rag.rag_service import get_rag_service

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])


@router.post(
    "/ask",
    response_model=TutorAskResponse,
    summary="Ask a grounded conceptual question or request hints/practice",
)
def ask_ai_tutor(
    payload: TutorAskRequest,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> TutorAskResponse:
    """Query the grounded Gemini AI Tutor with course document citations.

    Modes:
    - 'qa': Grounded conceptual explanation backed by retrieved textbook/note citations.
    - 'hint': Socratic scaffolding hint guiding the student without giving away the direct answer.
    - 'practice': Pedagogical practice retest question targeting the given topic.
    """
    rag_service = get_rag_service(db_manager=db_manager)
    student_id = current_student.external_student_id

    mode = payload.mode.lower().strip()
    if mode == "hint":
        result = rag_service.generate_hint(
            question=payload.question,
            user_id=student_id,
            document_ids=payload.document_ids,
        )
    elif mode == "practice":
        topic_target = payload.topic or payload.question
        result = rag_service.generate_practice_question(
            topic=topic_target,
            user_id=student_id,
            document_ids=payload.document_ids,
        )
    else:  # default 'qa'
        result = rag_service.answer_question(
            question=payload.question,
            user_id=student_id,
            document_ids=payload.document_ids,
            fallback_to_general=True,
        )

    citations = [
        SourceCitationResponse(
            source_path=getattr(c, "source", None) or getattr(c, "source_path", "course_material.pdf"),
            document_id=c.document_id,
            page_number=c.page_number,
            similarity_score=round(float(c.similarity_score), 4),
            snippet=getattr(c, "snippet", "") or "",
        )
        for c in (result.sources or [])
    ]

    return TutorAskResponse(
        question=result.question,
        answer=result.answer,
        mode=mode,
        citations=citations,
        grounded=result.is_grounded,
    )
