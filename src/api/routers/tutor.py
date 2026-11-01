"""AI Tutor router providing course-grounded Q&A, Socratic hints, practice questions, and WebSocket chat."""

import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from src.api.auth import decode_access_token, get_current_student
from src.api.schemas import SourceCitationResponse, TutorAskRequest, TutorAskResponse
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import TutorChatMessage
from src.learner_state.models import Student
from src.rag.rag_service import get_rag_service

logger = logging.getLogger(__name__)

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

    # Persist question and response in database for previous chat history
    try:
        with db_manager.get_session() as session:
            # 1. Student query
            msg_student = TutorChatMessage(
                student_id=student_id,
                sender="student",
                text=payload.question,
                mode=mode,
            )
            session.add(msg_student)

            # 2. Tutor response
            msg_tutor = TutorChatMessage(
                student_id=student_id,
                sender="tutor",
                text=result.answer,
                mode=mode,
                grounded=result.is_grounded,
                citations=json.dumps([c.model_dump() for c in citations]),
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
    )


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
        stmt = (
            select(TutorChatMessage)
            .where(TutorChatMessage.student_id == student_id)
            .order_by(TutorChatMessage.created_at.desc())
            .limit(limit)
        )
        msgs = session.execute(stmt).scalars().all()
        return [m.to_dict() for m in reversed(msgs)]


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
        "message": "Connected to ExamTwin AI Tutor live WebSocket.",
    })

    # Dispatch recent chat history immediately so client holds previous chat
    try:
        with db_manager.get_session() as session:
            stmt = (
                select(TutorChatMessage)
                .where(TutorChatMessage.student_id == student_id)
                .order_by(TutorChatMessage.created_at.desc())
                .limit(50)
            )
            msgs = session.execute(stmt).scalars().all()
            history = [m.to_dict() for m in reversed(msgs)]
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

                # 1. Persist student message in DB
                student_msg_dict = None
                try:
                    with db_manager.get_session() as session:
                        msg_student = TutorChatMessage(
                            student_id=student_id,
                            sender="student",
                            text=user_question,
                            mode=mode,
                        )
                        session.add(msg_student)
                        session.flush()
                        student_msg_dict = msg_student.to_dict()
                except Exception as exc:
                    logger.warning("Error saving student message on WS: %s", exc)

                # 2. Send status notification
                await websocket.send_json({
                    "type": "status",
                    "status": "processing",
                    "message": "Retrieving syllabus citations and synthesizing grounded answer...",
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

                # 4. Persist tutor response in DB
                tutor_msg_dict = None
                try:
                    with db_manager.get_session() as session:
                        msg_tutor = TutorChatMessage(
                            student_id=student_id,
                            sender="tutor",
                            text=result.answer,
                            mode=mode,
                            grounded=result.is_grounded,
                            citations=json.dumps(citations_list),
                        )
                        session.add(msg_tutor)
                        session.flush()
                        tutor_msg_dict = msg_tutor.to_dict()
                except Exception as exc:
                    logger.warning("Error saving tutor response on WS: %s", exc)

                # 5. Send complete response to client
                await websocket.send_json({
                    "type": "answer",
                    "id": tutor_msg_dict["id"] if tutor_msg_dict else f"tut_{id(result)}",
                    "text": result.answer,
                    "mode": mode,
                    "grounded": result.is_grounded,
                    "citations": citations_list,
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
