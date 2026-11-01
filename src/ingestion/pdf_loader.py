"""PDF Document Loader for ExamTwin Ingestion Pipeline.

Extracts text page-by-page from course PDFs while preserving document IDs,
1-indexed page metadata, and academic citation references. Enforces security
guards against oversized files, invalid magic bytes, empty streams, and malformed structures.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
import pypdf
from pypdf.errors import PdfReadError, PdfStreamError

from src.config.settings import get_settings

DEFAULT_MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB default limit
PDF_MAGIC_BYTES = b"%PDF-"


class PDFLoadingError(Exception):
    """Base exception for PDF loading, validation, and parsing failures."""
    pass


class PDFValidationError(PDFLoadingError):
    """Raised when a PDF fails pre-parse validation (size, magic bytes, file format)."""
    pass


class PDFSizeLimitExceededError(PDFValidationError):
    """Raised when a PDF file size exceeds the configured maximum limit."""
    pass


class InvalidPDFSignatureError(PDFValidationError):
    """Raised when a file lacks the required %PDF- magic byte signature."""
    pass


class PDFEmptyFileError(PDFValidationError):
    """Raised when a PDF file is 0 bytes."""
    pass


class ExtractedPage(BaseModel):
    """Structured representation of a single extracted PDF page."""

    document_id: str = Field(..., description="Unique identifier for the parent document.")
    page_number: int = Field(..., ge=1, description="1-indexed page number matching PDF page numbering.")
    text: str = Field(default="", description="Extracted raw or normalized text content of the page.")
    total_pages: int = Field(..., ge=1, description="Total page count of the source document.")
    source_path: str = Field(..., description="Filesystem or storage path of the original PDF.")

    @property
    def is_empty(self) -> bool:
        """Return True if page contains no textual characters."""
        return len(self.text.strip()) == 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert page object to dictionary representation."""
        return self.model_dump()


class PDFLoader:
    """Extracts text page-by-page from PDF files with security guards and size limits."""

    def __init__(
        self,
        preserve_empty_pages: bool = True,
        max_file_size_bytes: Optional[int] = None,
        validate_signature: Optional[bool] = None,
    ):
        """Initialize PDFLoader.

        Args:
            preserve_empty_pages: If True, preserves blank/image-only pages with empty string text
                                 to maintain exact document page numbering.
            max_file_size_bytes: Maximum allowed file size in bytes. Defaults to Settings.MAX_PDF_SIZE_BYTES (25 MB).
            validate_signature: If True, enforces %PDF- magic bytes header validation before parsing.
        """
        settings = get_settings()
        self.preserve_empty_pages = preserve_empty_pages
        self.max_file_size_bytes = (
            max_file_size_bytes
            if max_file_size_bytes is not None
            else getattr(settings, "MAX_PDF_SIZE_BYTES", DEFAULT_MAX_PDF_SIZE_BYTES)
        )
        self.validate_signature = (
            validate_signature
            if validate_signature is not None
            else getattr(settings, "VALIDATE_PDF_SIGNATURE", True)
        )

    def load(
        self,
        file_path: Union[str, Path],
        document_id: Optional[str] = None,
    ) -> List[ExtractedPage]:
        """Load and extract text from a PDF file page by page with pre-parse security checks.

        Security note:
        Magic-byte validation confirms standard PDF file headers but does not guarantee
        the file is free from hostile embedded objects. File size checks are executed via
        filesystem stat before reading file contents into memory.

        Args:
            file_path: Path to the target PDF file.
            document_id: Optional identifier. If omitted, derived from the file stem.

        Returns:
            List of ExtractedPage objects with 1-indexed page numbering and metadata.

        Raises:
            FileNotFoundError: If the specified file does not exist.
            ValueError: If the file is not a regular file or does not have a .pdf extension.
            PDFEmptyFileError: If the file is 0 bytes.
            PDFSizeLimitExceededError: If the file exceeds max_file_size_bytes.
            InvalidPDFSignatureError: If the file lacks the %PDF- magic byte signature.
            PDFLoadingError: If the PDF is corrupted, password-locked, or unreadable.
        """
        path = Path(file_path).resolve()

        if not path.exists():
            raise FileNotFoundError(f"PDF file not found at: {path}")

        if not path.is_file():
            raise ValueError(f"Target path is not a file: {path}")

        if path.suffix.lower() != ".pdf":
            raise ValueError(f"Target file does not have a .pdf extension: {path.name}")

        # 1. Size validation via filesystem stat (avoids reading oversized files into memory)
        try:
            file_size = path.stat().st_size
        except (OSError, IOError) as exc:
            raise PDFLoadingError(f"Failed to access file metadata for '{path.name}': {exc}") from exc

        if file_size == 0:
            raise PDFEmptyFileError(f"PDF file is 0 bytes / empty: {path.name}")

        if self.max_file_size_bytes and file_size > self.max_file_size_bytes:
            raise PDFSizeLimitExceededError(
                f"PDF file size ({file_size} bytes) exceeds maximum allowed limit of "
                f"{self.max_file_size_bytes} bytes (25 MB): {path.name}"
            )

        # 2. Magic byte header verification (reads only the initial header bytes)
        if self.validate_signature:
            try:
                with open(path, "rb") as f:
                    header = f.read(len(PDF_MAGIC_BYTES))
                if not header.startswith(PDF_MAGIC_BYTES):
                    raise InvalidPDFSignatureError(
                        f"File '{path.name}' does not start with valid PDF magic bytes '%PDF-'. "
                        "Signature validation failed; file is not a valid PDF document."
                    )
            except (OSError, IOError) as exc:
                raise PDFLoadingError(f"Failed to inspect PDF header for '{path.name}': {exc}") from exc

        doc_id = document_id or path.stem

        # 3. PDF Parsing
        try:
            reader = pypdf.PdfReader(str(path))
        except (PdfReadError, PdfStreamError, Exception) as exc:
            raise PDFLoadingError(f"Failed to read PDF '{path.name}': {exc}") from exc

        if reader.is_encrypted:
            try:
                # Attempt empty password decryption
                decrypted = reader.decrypt("")
                if not decrypted:
                    raise PDFLoadingError(f"PDF '{path.name}' is password-encrypted and cannot be read.")
            except Exception as exc:
                raise PDFLoadingError(f"Encrypted PDF '{path.name}' cannot be decrypted: {exc}") from exc

        total_pages = len(reader.pages)
        if total_pages == 0:
            raise PDFLoadingError(f"PDF '{path.name}' contains 0 pages.")

        extracted_pages: List[ExtractedPage] = []

        for idx, page in enumerate(reader.pages):
            page_number = idx + 1
            try:
                raw_text = page.extract_text() or ""
            except Exception:
                # Fallback on extraction error for an individual page to preserve page sequence
                raw_text = ""

            # Sanitize null bytes (PostgreSQL TEXT/VARCHAR disallows 0x00)
            raw_text = raw_text.replace("\x00", "")

            page_obj = ExtractedPage(
                document_id=doc_id,
                page_number=page_number,
                text=raw_text,
                total_pages=total_pages,
                source_path=str(path),
            )

            if not page_obj.is_empty or self.preserve_empty_pages:
                extracted_pages.append(page_obj)

        return extracted_pages


def load_pdf(
    file_path: Union[str, Path],
    document_id: Optional[str] = None,
    preserve_empty_pages: bool = True,
    max_file_size_bytes: Optional[int] = None,
    validate_signature: Optional[bool] = None,
) -> List[ExtractedPage]:
    """Functional convenience wrapper for loading pages from a PDF document."""
    loader = PDFLoader(
        preserve_empty_pages=preserve_empty_pages,
        max_file_size_bytes=max_file_size_bytes,
        validate_signature=validate_signature,
    )
    return loader.load(file_path=file_path, document_id=document_id)
