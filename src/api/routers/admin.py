"""Administrator router for full database inspection, PDF catalog, and analytics visualizations."""

from datetime import date, datetime
import json
import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select

from src.api.auth import get_current_admin
from src.api.routers.documents import clean_document_display_title
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import (
    AIPracticeRecord,
    Base,
    Document,
    DocumentChunk,
    DocumentPage,
    RegistrationOTP,
    SupportTicket,
    TutorChatMessage,
)
from src.learner_state.models import ErrorDiagnosisRecord, Student, TopicMasteryState
from src.learning_measurement.models import AssessmentRecord

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Administrator"])

TABLE_DISPLAY_NAMES: Dict[str, str] = {
    "students": "Users & Students",
    "documents": "Uploaded PDFs",
    "document_pages": "Extracted PDF Pages",
    "document_chunks": "Indexed Vector Chunks",
    "tutor_chat_messages": "AI Tutor Chat Messages",
    "error_history": "Error DNA Diagnoses",
    "topic_mastery_states": "Topic Mastery States",
    "assessment_records": "Assessment Records",
    "ai_practice_records": "AI Practice Records",
    "support_tickets": "Support Tickets",
    "registration_otps": "Registration OTPs",
}

PREFERRED_TABLE_ORDER: List[str] = [
    "students",
    "documents",
    "document_pages",
    "document_chunks",
    "tutor_chat_messages",
    "error_history",
    "topic_mastery_states",
    "assessment_records",
    "ai_practice_records",
    "support_tickets",
    "registration_otps",
]

REDACTED_COLUMNS = {"hashed_password", "password_hash", "otp_code"}


def _ordered_table_names() -> List[str]:
    registered = set(Base.metadata.tables.keys())
    ordered = [name for name in PREFERRED_TABLE_ORDER if name in registered]
    extras = sorted(registered - set(ordered))
    return ordered + extras


def _format_cell_value(col_name: str, value: Any) -> Any:
    """Safely serialize database column values for JSON table display."""
    if value is None:
        return None
    if col_name in REDACTED_COLUMNS:
        return "[REDACTED]"
    if col_name == "embedding" and isinstance(value, str):
        try:
            vec = json.loads(value)
            if isinstance(vec, list):
                return f"[Vector: {len(vec)} dims]"
        except Exception:
            pass
        return f"[Vector data: {len(value)} chars]"
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (bool, int, float, str)):
        return value
    return str(value)


@router.get(
    "/overview",
    summary="Administrator overview: all database table stats, all PDFs, and visualization charts",
)
def get_admin_overview(
    _admin: Student = Depends(get_current_admin),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> Dict[str, Any]:
    """Return global platform metrics, every table's row count, all PDFs, and chart datasets."""
    with db_manager.get_session() as session:
        # 1. Count rows across EVERY registered database table (including 0-row tables)
        table_stats: List[Dict[str, Any]] = []
        total_rows = 0
        for table_name in _ordered_table_names():
            tbl = Base.metadata.tables[table_name]
            count = session.execute(select(func.count()).select_from(tbl)).scalar() or 0
            total_rows += int(count)
            table_stats.append(
                {
                    "table_name": table_name,
                    "display_name": TABLE_DISPLAY_NAMES.get(
                        table_name, table_name.replace("_", " ").title()
                    ),
                    "row_count": int(count),
                    "column_count": len(tbl.columns),
                    "columns": [c.name for c in tbl.columns],
                }
            )

        # 2. Load users map for owner enrichment
        all_students = session.execute(select(Student)).scalars().all()
        student_by_ext: Dict[str, Student] = {s.external_student_id: s for s in all_students}
        student_by_id: Dict[str, Student] = {s.id: s for s in all_students}
        total_admins = sum(1 for s in all_students if bool(getattr(s, "is_admin", False)))

        # 3. Load ALL PDFs across all users
        all_docs = session.execute(
            select(Document).order_by(Document.created_at.desc())
        ).scalars().all()

        # Pre-aggregate page & chunk counts per document in two fast SQL queries
        page_counts = dict(
            session.execute(
                select(DocumentPage.document_id, func.count(DocumentPage.id)).group_by(
                    DocumentPage.document_id
                )
            ).all()
        )
        chunk_counts = dict(
            session.execute(
                select(DocumentChunk.document_id, func.count(DocumentChunk.id)).group_by(
                    DocumentChunk.document_id
                )
            ).all()
        )

        pdfs: List[Dict[str, Any]] = []
        pdfs_by_student_map: Dict[str, Dict[str, Any]] = {}
        pdfs_by_status_map: Dict[str, int] = {}

        for doc in all_docs:
            owner = student_by_ext.get(doc.owner_user_id) or student_by_id.get(doc.owner_user_id)
            p_count = int(page_counts.get(doc.id, 0))
            c_count = int(chunk_counts.get(doc.id, 0))
            owner_label = (
                owner.full_name or owner.email or owner.external_student_id
                if owner
                else doc.owner_user_id
            )

            pdfs.append(
                {
                    "id": doc.id,
                    "title": clean_document_display_title(doc.original_filename or doc.filename or "Untitled PDF"),
                    "filename": doc.filename,
                    "owner_user_id": doc.owner_user_id,
                    "owner_email": owner.email if owner else None,
                    "owner_full_name": owner.full_name if owner else None,
                    "access_level": doc.access_level,
                    "processing_status": doc.processing_status,
                    "content_type": doc.content_type,
                    "source_type": doc.source_type,
                    "pages_count": p_count,
                    "chunks_count": c_count,
                    "created_at": doc.created_at.isoformat() if doc.created_at else None,
                    "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
                }
            )

            status_key = doc.processing_status or "UNKNOWN"
            pdfs_by_status_map[status_key] = pdfs_by_status_map.get(status_key, 0) + 1

            if owner_label not in pdfs_by_student_map:
                pdfs_by_student_map[owner_label] = {
                    "student": owner_label,
                    "owner_user_id": doc.owner_user_id,
                    "pdf_count": 0,
                    "pages_count": 0,
                    "chunks_count": 0,
                }
            pdfs_by_student_map[owner_label]["pdf_count"] += 1
            pdfs_by_student_map[owner_label]["pages_count"] += p_count
            pdfs_by_student_map[owner_label]["chunks_count"] += c_count

        # 4. Chat breakdown by mode & sender
        chat_mode_rows = session.execute(
            select(TutorChatMessage.mode, func.count(TutorChatMessage.id)).group_by(
                TutorChatMessage.mode
            )
        ).all()
        chat_by_mode = [
            {"mode": (mode or "qa"), "count": int(cnt)} for mode, cnt in chat_mode_rows
        ]

        chat_sender_rows = session.execute(
            select(TutorChatMessage.sender, func.count(TutorChatMessage.id)).group_by(
                TutorChatMessage.sender
            )
        ).all()
        chat_by_sender = [
            {"sender": sender, "count": int(cnt)} for sender, cnt in chat_sender_rows
        ]

        # 5. Error DNA breakdown by category
        error_cat_rows = session.execute(
            select(ErrorDiagnosisRecord.error_category, func.count(ErrorDiagnosisRecord.id)).group_by(
                ErrorDiagnosisRecord.error_category
            )
        ).all()
        errors_by_category = [
            {"category": (cat or "Unclassified"), "count": int(cnt)}
            for cat, cnt in error_cat_rows
        ]

        # 6. Topic mastery score distribution buckets
        mastery_scores = session.execute(select(TopicMasteryState.mastery_score)).scalars().all()
        buckets = {"0-25%": 0, "25-50%": 0, "50-75%": 0, "75-100%": 0}
        for score in mastery_scores:
            pct = float(score or 0.0) * 100.0
            if pct < 25.0:
                buckets["0-25%"] += 1
            elif pct < 50.0:
                buckets["25-50%"] += 1
            elif pct < 75.0:
                buckets["50-75%"] += 1
            else:
                buckets["75-100%"] += 1
        mastery_distribution = [{"bucket": k, "count": v} for k, v in buckets.items()]

        counts_by_name = {t["table_name"]: t["row_count"] for t in table_stats}

        summary = {
            "total_tables": len(table_stats),
            "total_rows": total_rows,
            "total_users": len(all_students),
            "total_students": len(all_students) - total_admins,
            "total_admins": total_admins,
            "total_pdfs": counts_by_name.get("documents", 0),
            "total_pages": counts_by_name.get("document_pages", 0),
            "total_chunks": counts_by_name.get("document_chunks", 0),
            "total_chat_messages": counts_by_name.get("tutor_chat_messages", 0),
            "total_diagnoses": counts_by_name.get("error_history", 0),
            "total_mastery_records": counts_by_name.get("topic_mastery_states", 0),
            "total_assessments": counts_by_name.get("assessment_records", 0),
            "total_ai_practice_records": counts_by_name.get("ai_practice_records", 0),
            "total_support_tickets": counts_by_name.get("support_tickets", 0),
        }

        return {
            "summary": summary,
            "table_stats": table_stats,
            "pdfs": pdfs,
            "charts": {
                "rows_by_table": [
                    {
                        "table_name": t["table_name"],
                        "name": t["display_name"],
                        "count": t["row_count"],
                    }
                    for t in table_stats
                ],
                "pdfs_by_student": sorted(
                    pdfs_by_student_map.values(),
                    key=lambda x: x["pdf_count"],
                    reverse=True,
                ),
                "pdfs_by_status": [
                    {"status": k, "count": v} for k, v in pdfs_by_status_map.items()
                ],
                "chat_by_mode": chat_by_mode,
                "chat_by_sender": chat_by_sender,
                "errors_by_category": errors_by_category,
                "mastery_distribution": mastery_distribution,
            },
        }


@router.get(
    "/tables/{table_name}",
    summary="Inspect rows and columns of any database table (Admin only)",
)
def get_admin_table_rows(
    table_name: str,
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    _admin: Student = Depends(get_current_admin),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> Dict[str, Any]:
    """Return safely serialized rows from any registered SQLAlchemy table."""
    if table_name not in Base.metadata.tables:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Database table '{table_name}' does not exist.",
        )

    tbl = Base.metadata.tables[table_name]
    columns = [c.name for c in tbl.columns]

    with db_manager.get_session() as session:
        total_rows = session.execute(select(func.count()).select_from(tbl)).scalar() or 0
        stmt = select(tbl)
        if "created_at" in tbl.c:
            stmt = stmt.order_by(tbl.c.created_at.desc())
        elif "updated_at" in tbl.c:
            stmt = stmt.order_by(tbl.c.updated_at.desc())
        elif "timestamp" in tbl.c:
            stmt = stmt.order_by(tbl.c.timestamp.desc())

        result = session.execute(stmt.limit(limit).offset(offset)).mappings().all()
        rows = [
            {col: _format_cell_value(col, row.get(col)) for col in columns}
            for row in result
        ]

    return {
        "table_name": table_name,
        "display_name": TABLE_DISPLAY_NAMES.get(
            table_name, table_name.replace("_", " ").title()
        ),
        "total_rows": int(total_rows),
        "limit": limit,
        "offset": offset,
        "columns": columns,
        "rows": rows,
    }


@router.get(
    "/pdfs/{document_id}",
    summary="Inspect a specific PDF's metadata, owner, and extracted pages (Admin only)",
)
def get_admin_pdf_detail(
    document_id: str,
    _admin: Student = Depends(get_current_admin),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> Dict[str, Any]:
    """Return detailed metadata and extracted text pages for any PDF in the database."""
    with db_manager.get_session() as session:
        doc = session.get(Document, document_id)
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found.",
            )

        owner = session.execute(
            select(Student).where(
                (Student.external_student_id == doc.owner_user_id)
                | (Student.id == doc.owner_user_id)
            )
        ).scalars().first()

        pages = [
            {
                "id": p.id,
                "page_number": p.page_number,
                "text": p.text,
                "char_count": len(p.text or ""),
            }
            for p in (doc.pages or [])
        ]

        return {
            "id": doc.id,
            "title": clean_document_display_title(doc.original_filename or doc.filename or "Untitled PDF"),
            "filename": doc.filename,
            "owner_user_id": doc.owner_user_id,
            "owner_email": owner.email if owner else None,
            "owner_full_name": owner.full_name if owner else None,
            "access_level": doc.access_level,
            "processing_status": doc.processing_status,
            "pages_count": len(pages),
            "chunks_count": len(doc.chunks) if doc.chunks else 0,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "pages": pages,
        }


@router.delete(
    "/pdfs/{document_id}",
    summary="Delete any PDF from the database (Admin only)",
)
def delete_admin_pdf(
    document_id: str,
    _admin: Student = Depends(get_current_admin),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> Dict[str, Any]:
    """Delete a PDF document and cascade-delete all associated pages and chunks."""
    with db_manager.get_session() as session:
        doc = session.get(Document, document_id)
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found.",
            )
        session.delete(doc)
        return {
            "status": "SUCCESS",
            "message": f"Document '{document_id}' deleted by administrator.",
        }
