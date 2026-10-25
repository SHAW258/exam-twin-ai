"""Document ingestion and catalog router for ExamTwin."""

import email
from pathlib import Path
import tempfile
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, select

from src.api.auth import get_current_student
from src.api.schemas import (
    DocumentDetailResponse,
    DocumentListItem,
    DocumentUploadResponse,
)
from src.config.settings import get_settings
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import AccessLevel, Document
from src.ingestion.pdf_loader import (
    InvalidPDFSignatureError,
    PDFEmptyFileError,
    PDFLoadingError,
    PDFSizeLimitExceededError,
)
from src.ingestion.pipeline import DocumentIngestionPipeline
from src.learner_state.models import Student

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a course PDF document",
)
async def upload_document(
    request: Request,
    title: Optional[str] = Query(default=None, description="Optional custom title for the document."),
    access_level: str = Query(default="PRIVATE", description="Access level: PRIVATE or COURSE_SHARED."),
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> DocumentUploadResponse:
    """Upload a course PDF document.

    Enforces:
    - Pre-read size limit (max 25 MB via MAX_PDF_SIZE_BYTES).
    - %PDF- magic byte signature validation.
    - 0-byte file rejection.
    - Secure temporary storage before chunking, embedding, and relational persistence.
    """
    settings = get_settings()
    content_type = request.headers.get("content-type", "")

    # Extract filename and binary payload
    filename = "upload.pdf"
    file_bytes = b""

    if "multipart/form-data" in content_type:
        raw_body = await request.body()
        msg = email.message_from_bytes(
            f"Content-Type: {content_type}\r\n\r\n".encode("utf-8") + raw_body
        )
        found_file = False
        for part in msg.walk():
            part_filename = part.get_filename()
            if part_filename:
                filename = part_filename
                file_bytes = part.get_payload(decode=True) or b""
                found_file = True
                break
        if not found_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file found in multipart form-data payload.",
            )
    else:
        # Direct raw binary stream upload
        file_bytes = await request.body()
        filename_header = request.headers.get("x-filename")
        if filename_header:
            filename = filename_header

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    # Pre-read size check
    max_size = getattr(settings, "MAX_PDF_SIZE_BYTES", 25 * 1024 * 1024)
    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {max_size} bytes (25 MB).",
        )

    # Magic byte check
    if getattr(settings, "VALIDATE_PDF_SIGNATURE", True):
        if not file_bytes.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File does not have a valid PDF magic-byte header '%PDF-'. Upload rejected.",
            )

    safe_title = title.strip() if title else Path(filename).stem
    doc_id = f"doc_{uuid.uuid4().hex[:12]}"

    # Write to temporary file for PDFLoader parsing
    raw_dir = settings.raw_data_dir
    raw_dir.mkdir(parents=True, exist_ok=True)
    temp_path = raw_dir / f"{doc_id}_{filename}"

    try:
        temp_path.write_bytes(file_bytes)

        pipeline = DocumentIngestionPipeline(db_manager=db_manager)
        result = pipeline.ingest_pdf(
            file_path=temp_path,
            owner_user_id=current_student.external_student_id,
            document_id=doc_id,
            access_level=access_level if access_level in ["PRIVATE", "COURSE_SHARED"] else "PRIVATE",
        )

        return DocumentUploadResponse(
            document_id=doc_id,
            filename=filename,
            pages_count=result.get("page_count", result.get("pages_count", 0)),
            chunks_count=result.get("chunk_count", result.get("chunks_count", 0)),
            status="SUCCESS",
            message=f"Document '{safe_title}' successfully ingested and chunked.",
        )
    except (PDFSizeLimitExceededError, InvalidPDFSignatureError, PDFEmptyFileError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except PDFLoadingError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"PDF parsing error: {exc}")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {exc}",
        )
    finally:
        # Clean up temporary upload file if left over
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass


@router.get(
    "",
    response_model=List[DocumentListItem],
    summary="List course documents accessible to current student",
)
def list_documents(
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> List[DocumentListItem]:
    """Return catalog of documents owned by the student or marked COURSE_SHARED."""
    with db_manager.get_session() as session:
        stmt = select(Document).where(
            or_(
                Document.owner_user_id == current_student.external_student_id,
                Document.access_level == AccessLevel.COURSE_SHARED.value,
            )
        ).order_by(Document.created_at.desc())

        docs = session.execute(stmt).scalars().all()
        return [
            DocumentListItem(
                id=d.id,
                title=getattr(d, "original_filename", None) or getattr(d, "filename", "Untitled Document"),
                access_level=d.access_level,
                pages_count=len(d.pages) if d.pages else 0,
                chunks_count=len(d.chunks) if d.chunks else 0,
                created_at=d.created_at.isoformat() if d.created_at else None,
            )
            for d in docs
        ]


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Retrieve details for a specific document",
)
def get_document_details(
    document_id: str,
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> DocumentDetailResponse:
    """Retrieve details for a specific document with ownership enforcement."""
    with db_manager.get_session() as session:
        doc = session.get(Document, document_id)
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found.",
            )

        # Enforce access boundary
        if (
            doc.owner_user_id != current_student.external_student_id
            and doc.access_level != AccessLevel.COURSE_SHARED.value
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this document.",
            )

        return DocumentDetailResponse(
            id=doc.id,
            title=getattr(doc, "original_filename", None) or getattr(doc, "filename", "Untitled Document"),
            access_level=doc.access_level,
            pages_count=len(doc.pages) if doc.pages else 0,
            chunks_count=len(doc.chunks) if doc.chunks else 0,
            created_at=doc.created_at.isoformat() if doc.created_at else None,
        )
