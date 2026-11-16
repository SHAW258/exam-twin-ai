"""Support router implementing backend-persisted support tickets."""

import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from src.api.auth import get_current_student
from src.api.schemas import SupportTicketCreateRequest, SupportTicketResponse
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import SupportTicket
from src.learner_state.models import Student

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["Support"])


@router.post(
    "/tickets",
    response_model=SupportTicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new support ticket",
)
def create_support_ticket(
    payload: SupportTicketCreateRequest,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> SupportTicketResponse:
    """Persist a new student support ticket in the relational database."""
    now = datetime.now(timezone.utc)
    ticket_id = f"ticket_{uuid.uuid4().hex[:12]}"

    with db_manager.get_session() as session:
        ticket = SupportTicket(
            id=ticket_id,
            student_id=current_student.external_student_id,
            category=payload.category.strip() or "General Support",
            subject=payload.subject.strip(),
            message=payload.message.strip(),
            status="OPEN",
            created_at=now,
            updated_at=now,
        )
        session.add(ticket)
        session.flush()

        return SupportTicketResponse(
            id=ticket.id,
            student_id=ticket.student_id,
            category=ticket.category,
            subject=ticket.subject,
            message=ticket.message,
            status=ticket.status,
            created_at=ticket.created_at.isoformat() if ticket.created_at else None,
            updated_at=ticket.updated_at.isoformat() if ticket.updated_at else None,
        )


@router.get(
    "/tickets",
    response_model=List[SupportTicketResponse],
    summary="List support tickets for current student",
)
def list_support_tickets(
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> List[SupportTicketResponse]:
    """Return all support tickets submitted by the authenticated student."""
    with db_manager.get_session() as session:
        stmt = (
            select(SupportTicket)
            .where(SupportTicket.student_id == current_student.external_student_id)
            .order_by(SupportTicket.created_at.desc())
        )
        tickets = session.execute(stmt).scalars().all()
        return [
            SupportTicketResponse(
                id=t.id,
                student_id=t.student_id,
                category=t.category,
                subject=t.subject,
                message=t.message,
                status=t.status,
                created_at=t.created_at.isoformat() if t.created_at else None,
                updated_at=t.updated_at.isoformat() if t.updated_at else None,
            )
            for t in tickets
        ]
