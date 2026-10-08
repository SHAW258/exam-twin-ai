"""Document Ingestion, Cleaning, Chunking, and Storage Pipeline for ExamTwin."""

from src.ingestion.pdf_loader import (
    ExtractedPage,
    PDFLoader,
    PDFLoadingError,
    load_pdf,
)
from src.ingestion.text_cleaner import (
    clean_text,
    dehyphenate_line_breaks,
    normalize_line_breaks,
    normalize_whitespace,
    remove_excessive_blank_lines,
    remove_standalone_page_markers,
)
from src.ingestion.chunker import (
    PageAwareChunker,
    TextChunk,
    chunk_pages,
)
from src.ingestion.pipeline import DocumentIngestionPipeline

__all__ = [
    # Loader
    "ExtractedPage",
    "PDFLoader",
    "PDFLoadingError",
    "load_pdf",
    # Cleaner
    "clean_text",
    "normalize_line_breaks",
    "dehyphenate_line_breaks",
    "normalize_whitespace",
    "remove_excessive_blank_lines",
    "remove_standalone_page_markers",
    # Chunker
    "PageAwareChunker",
    "TextChunk",
    "chunk_pages",
    # Pipeline
    "DocumentIngestionPipeline",
]
