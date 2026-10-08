"""PDF Document Loader for ExamTwin Ingestion Pipeline.

Extracts text page-by-page from course PDFs while preserving document IDs,
1-indexed page metadata, and academic citation references.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
import pypdf
from pypdf.errors import PdfReadError, PdfStreamError


class PDFLoadingError(Exception):
    """Raised when a PDF cannot be opened, decrypted, or parsed."""
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
    """Extracts text page-by-page from PDF files using pypdf."""

    def __init__(self, preserve_empty_pages: bool = True):
        """Initialize PDFLoader.

        Args:
            preserve_empty_pages: If True, preserves blank/image-only pages with empty string text
                                 to maintain exact document page numbering.
        """
        self.preserve_empty_pages = preserve_empty_pages

    def load(
        self,
        file_path: Union[str, Path],
        document_id: Optional[str] = None,
    ) -> List[ExtractedPage]:
        """Load and extract text from a PDF file page by page.

        Args:
            file_path: Path to the target PDF file.
            document_id: Optional identifier. If omitted, derived from the file stem.

        Returns:
            List of ExtractedPage objects with 1-indexed page numbering and metadata.

        Raises:
            FileNotFoundError: If the specified file does not exist.
            ValueError: If the file is not a PDF.
            PDFLoadingError: If the PDF is corrupted, empty, or unreadable.
        """
        path = Path(file_path).resolve()

        if not path.exists():
            raise FileNotFoundError(f"PDF file not found at: {path}")

        if not path.is_file():
            raise ValueError(f"Target path is not a file: {path}")

        if path.suffix.lower() != ".pdf":
            raise ValueError(f"Target file does not have a .pdf extension: {path.name}")

        if path.stat().st_size == 0:
            raise PDFLoadingError(f"PDF file is 0 bytes / empty: {path.name}")

        doc_id = document_id or path.stem

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
            except Exception as exc:
                # Fallback on extraction error for an individual page to preserve page sequence
                raw_text = ""

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
) -> List[ExtractedPage]:
    """Functional convenience wrapper for loading pages from a PDF document."""
    loader = PDFLoader(preserve_empty_pages=preserve_empty_pages)
    return loader.load(file_path=file_path, document_id=document_id)
