"""AI Tutor router providing course-grounded Q&A, Socratic hints, practice questions, and WebSocket chat."""

from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import case, func, select

from src.api.auth import decode_access_token, get_current_student
from src.api.schemas import AIPracticeRecordResponse, SourceCitationResponse, TutorAskRequest, TutorAskResponse
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import AIPracticeRecord, TutorChatMessage
from src.learner_state.models import Student
from src.rag.rag_service import get_rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])


def _source_kind_of(result: Any) -> str:
    """Read provenance defensively (mocks and older RAG results may not provide a string)."""
    kind = getattr(result, "source_kind", "own_document")
    return kind if isinstance(kind, str) and kind else "own_document"


def _count_generated_questions(answer_text: str) -> int:
    """Count MCQs in a generated drill JSON string, tolerating markdown fences."""
    cleaned = (answer_text or "").strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    try:
        payload = json.loads(cleaned)
        questions = payload.get("questions") if isinstance(payload, dict) else None
        return len(questions) if isinstance(questions, list) else 0
    except Exception:
        return 0


def _next_chat_seq(session, student_id: str) -> int:
    """Return next strictly monotonic sequence integer for a student's tutor conversation."""
    max_seq = session.execute(
        select(func.max(TutorChatMessage.seq)).where(TutorChatMessage.student_id == student_id)
    ).scalar()
    return int(max_seq or 0) + 1


def _fetch_ordered_chat_history(session, student_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Return chronological chat messages with deterministic tie-breaking even on 1-second MySQL timestamps."""
    sender_rank = case((TutorChatMessage.sender == "tutor", 1), else_=0)
    stmt = (
        select(TutorChatMessage)
        .where(TutorChatMessage.student_id == student_id)
        .order_by(
            TutorChatMessage.seq.desc(),
            TutorChatMessage.created_at.desc(),
            sender_rank.desc(),
            TutorChatMessage.id.desc(),
        )
        .limit(limit)
    )
    msgs = session.execute(stmt).scalars().all()
    return [m.to_dict() for m in reversed(msgs)]


def _record_ai_practice(
    db_manager: DatabaseManager,
    student_id: str,
    topic: str,
    answer_text: str,
) -> Optional[str]:
    """Log a drill that Gemini produced because no PDF was available for the topic."""
    try:
        with db_manager.get_session() as session:
            record = AIPracticeRecord(
                student_id=student_id,
                topic=(topic or "General")[:255],
                mode="practice",
                question_count=_count_generated_questions(answer_text),
                source_kind="general_ai",
            )
            session.add(record)
            session.flush()
            return record.id
    except Exception as exc:
        logger.warning("Could not record AI practice session: %s", exc)
        return None


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
    """Query the grounded Gemini AI Tutor with course document citations."""
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
            question_count=payload.question_count or 3,
            query_instruction=payload.question,
            seed=payload.seed,
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

    # A drill with no PDF anywhere is still interactive, but must be logged as AI practice.
    practice_record_id: Optional[str] = None
    if mode == "practice" and getattr(result, "source_kind", "") == "general_ai":
        practice_record_id = _record_ai_practice(
            db_manager,
            student_id,
            payload.topic or payload.question,
            result.answer,
        )

    # Persist conversational messages only. Practice drills belong to the full quiz view,
    # so they are never written into the AI Tutor chat history.
    if mode != "practice":
        try:
            with db_manager.get_session() as session:
                base_seq = _next_chat_seq(session, student_id)
                now_ts = datetime.now(timezone.utc)
                # 1. Student query (strictly earlier seq & timestamp than tutor reply)
                msg_student = TutorChatMessage(
                    student_id=student_id,
                    seq=base_seq,
                    sender="student",
                    text=payload.question,
                    mode=mode,
                    created_at=now_ts,
                )
                session.add(msg_student)

                # 2. Tutor response (strictly base_seq + 1 so bubbles never flip)
                msg_tutor = TutorChatMessage(
                    student_id=student_id,
                    seq=base_seq + 1,
                    sender="tutor",
                    text=result.answer,
                    mode=mode,
                    grounded=result.is_grounded,
                    citations=json.dumps([c.model_dump() for c in citations]),
                    created_at=now_ts + timedelta(seconds=1),
                )
                session.add(msg_tutor)
        except Exception as exc:
            logger.warning("Could not persist chat message to history: %s", exc)

    return TutorAskResponse(
        question=result.question,
        answer=result.answer,
        mode=mode,
        citations=citations,
        grounded=result.is_grounded,
        source_kind=_source_kind_of(result),
        practice_record_id=practice_record_id,
    )


@router.get(
    "/ai-practice",
    response_model=List[AIPracticeRecordResponse],
    summary="List topics practised with AI when no PDF was available",
)
def get_ai_practice_records(
    limit: int = 20,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> List[AIPracticeRecordResponse]:
    """Return this student's no-PDF AI practice history, newest first."""
    student_id = current_student.external_student_id
    with db_manager.get_session() as session:
        stmt = (
            select(AIPracticeRecord)
            .where(AIPracticeRecord.student_id == student_id)
            .order_by(AIPracticeRecord.created_at.desc())
            .limit(max(1, min(limit, 100)))
        )
        return [AIPracticeRecordResponse(**record.to_dict()) for record in session.execute(stmt).scalars().all()]


@router.get(
    "/history",
    summary="Get recent persistent chat history for the current student",
)
def get_chat_history(
    limit: int = 50,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> List[Dict[str, Any]]:
    """Return chronological past conversation messages for the current student."""
    student_id = current_student.external_student_id
    with db_manager.get_session() as session:
        return _fetch_ordered_chat_history(session, student_id, limit=limit)


@router.delete(
    "/history",
    summary="Clear persistent chat history for the current student",
)
def clear_chat_history(
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> dict:
    """Delete all past chat messages for the authenticated student."""
    student_id = current_student.external_student_id
    with db_manager.get_session() as session:
        stmt = select(TutorChatMessage).where(TutorChatMessage.student_id == student_id)
        msgs = session.execute(stmt).scalars().all()
        for m in msgs:
            session.delete(m)
        return {"status": "SUCCESS", "message": "Chat history cleared successfully."}


@router.websocket("/ws")
async def tutor_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db_manager: DatabaseManager = Depends(get_db_manager),
):
    """Real-time WebSocket endpoint for the AI Tutor.
    
    Provides:
    - Automatic authentication via JWT query param or auth packet
    - Instant dispatch of past chat history on connect
    - Live streaming of status and citations
    - Persistent storage of student and tutor messages
    - Heartbeat ping/pong support
    """
    await websocket.accept()

    # Authenticate student
    if not token:
        try:
            auth_msg = await websocket.receive_json()
            if auth_msg.get("type") == "auth":
                token = auth_msg.get("token")
        except Exception:
            token = None

    if not token:
        await websocket.send_json({"type": "error", "message": "Authentication required. Pass token."})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        claims = decode_access_token(token)
        student_id = claims.get("sub")
        if not student_id:
            raise ValueError("Token missing valid subject (student ID)")
    except Exception as exc:
        await websocket.send_json({"type": "error", "message": f"Authentication failed: {exc}"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Send connection acknowledgment
    await websocket.send_json({
        "type": "connected",
        "student_id": student_id,
        "message": "Connected to CodeKnot AI Tutor live WebSocket.",
    })

    # Dispatch recent chat history immediately so client holds previous chat in exact order
    try:
        with db_manager.get_session() as session:
            history = _fetch_ordered_chat_history(session, student_id, limit=50)
            await websocket.send_json({
                "type": "history",
                "messages": history,
            })
    except Exception as exc:
        logger.warning("Error fetching initial chat history on WS: %s", exc)

    # Listen for incoming student questions and commands
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "question")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type == "clear_history":
                with db_manager.get_session() as session:
                    stmt = select(TutorChatMessage).where(TutorChatMessage.student_id == student_id)
                    for m in session.execute(stmt).scalars().all():
                        session.delete(m)
                await websocket.send_json({"type": "history_cleared"})
                continue

            if msg_type == "question":
                user_question = data.get("question", "").strip()
                if not user_question:
                    continue

                mode = data.get("mode", "qa").lower().strip()
                topic = data.get("topic")
                doc_ids = data.get("document_ids")
                client_msg_id = data.get("client_msg_id")

                # 1. Persist student message in DB with monotonic sequence number
                student_msg_dict = None
                student_created_at = datetime.now(timezone.utc)
                student_seq = 0
                if mode != "practice":
                    try:
                        with db_manager.get_session() as session:
                            student_seq = _next_chat_seq(session, student_id)
                            msg_student = TutorChatMessage(
                                student_id=student_id,
                                seq=student_seq,
                                sender="student",
                                text=user_question,
                                mode=mode,
                                created_at=student_created_at,
                            )
                            session.add(msg_student)
                            session.flush()
                            student_msg_dict = msg_student.to_dict()
                    except Exception as exc:
                        logger.warning("Error saving student message on WS: %s", exc)

                # Immediately acknowledge student bubble with its canonical ID & sequence position
                if student_msg_dict:
                    await websocket.send_json({
                        "type": "student_ack",
                        "client_msg_id": client_msg_id,
                        "id": student_msg_dict["id"],
                        "seq": student_msg_dict["seq"],
                        "timestamp": student_msg_dict["timestamp"],
                    })

                # 2. Send status notification
                await websocket.send_json({
                    "type": "status",
                    "status": "processing",
                    "client_msg_id": client_msg_id,
                    "message": "Consulting your course materials and preparing an answer...",
                })

                # 3. Execute RAG service asynchronously via threadpool
                rag_service = get_rag_service(db_manager=db_manager)

                def run_rag():
                    if mode == "hint":
                        return rag_service.generate_hint(
                            question=user_question,
                            user_id=student_id,
                            document_ids=doc_ids,
                        )
                    elif mode == "practice":
                        return rag_service.generate_practice_question(
                            topic=topic or user_question,
                            user_id=student_id,
                            document_ids=doc_ids,
                            question_count=data.get("question_count", 3),
                            query_instruction=user_question,
                            seed=data.get("seed"),
                        )
                    else:
                        return rag_service.answer_question(
                            question=user_question,
                            user_id=student_id,
                            document_ids=doc_ids,
                            fallback_to_general=True,
                        )

                import anyio
                result = await anyio.to_thread.run_sync(run_rag)

                practice_record_id = None
                if mode == "practice" and getattr(result, "source_kind", "") == "general_ai":
                    practice_record_id = _record_ai_practice(
                        db_manager,
                        student_id,
                        topic or user_question,
                        result.answer,
                    )

                citations_list = [
                    {
                        "source_path": getattr(c, "source", None) or getattr(c, "source_path", "course_material.pdf"),
                        "document_id": c.document_id,
                        "page_number": c.page_number,
                        "similarity_score": round(float(c.similarity_score), 4),
                        "snippet": getattr(c, "snippet", "") or "",
                    }
                    for c in (result.sources or [])
                ]

                # 4. Persist tutor response in DB with strictly greater sequence & timestamp
                tutor_msg_dict = None
                if mode != "practice":
                    try:
                        with db_manager.get_session() as session:
                            tutor_seq = max(student_seq + 1, _next_chat_seq(session, student_id))
                            tutor_created_at = max(
                                datetime.now(timezone.utc),
                                student_created_at + timedelta(seconds=1),
                            )
                            msg_tutor = TutorChatMessage(
                                student_id=student_id,
                                seq=tutor_seq,
                                sender="tutor",
                                text=result.answer,
                                mode=mode,
                                grounded=result.is_grounded,
                                citations=json.dumps(citations_list),
                                created_at=tutor_created_at,
                            )
                            session.add(msg_tutor)
                            session.flush()
                            tutor_msg_dict = msg_tutor.to_dict()
                    except Exception as exc:
                        logger.warning("Error saving tutor response on WS: %s", exc)

                # 5. Send complete response anchored to exact sequence & student message
                await websocket.send_json({
                    "type": "answer",
                    "id": tutor_msg_dict["id"] if tutor_msg_dict else f"tut_{id(result)}",
                    "seq": tutor_msg_dict["seq"] if tutor_msg_dict else (student_seq + 1),
                    "in_reply_to": student_msg_dict["id"] if student_msg_dict else client_msg_id,
                    "client_msg_id": client_msg_id,
                    "text": result.answer,
                    "mode": mode,
                    "grounded": result.is_grounded,
                    "citations": citations_list,
                    "source_kind": _source_kind_of(result),
                    "practice_record_id": practice_record_id,
                    "timestamp": tutor_msg_dict["timestamp"] if tutor_msg_dict else None,
                })

    except WebSocketDisconnect:
        logger.info("WebSocket connection closed for student %s", student_id)
    except Exception as exc:
        logger.warning("WebSocket exception for student %s: %s", student_id, exc)
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
