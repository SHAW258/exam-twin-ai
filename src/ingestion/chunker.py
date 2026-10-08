"""Page-Aware Document Chunker for ExamTwin RAG Ingestion.

Splits extracted and cleaned course document pages into citation-retaining chunks
with configurable sizes and overlaps, preserving page numbers and source metadata.
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from src.ingestion.pdf_loader import ExtractedPage
from src.ingestion.text_cleaner import clean_text


class TextChunk(BaseModel):
    """Structured representation of a citation-grounded text chunk."""

    document_id: str = Field(..., description="Document identifier.")
    page_number: int = Field(..., ge=1, description="1-indexed source page number.")
    chunk_index: int = Field(..., ge=0, description="0-indexed sequence number of the chunk.")
    text: str = Field(..., min_length=1, description="Chunk textual content.")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Grounding metadata including source document and citation page.",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk model to dictionary."""
        return self.model_dump()


class PageAwareChunker:
    """Chunks documents while preserving individual page provenance for RAG citations."""

    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        clean_before_chunking: bool = True,
    ):
        """Initialize PageAwareChunker.

        Args:
            chunk_size: Maximum character length for each text chunk.
            chunk_overlap: Number of characters to overlap between adjacent chunks.
            clean_before_chunking: Whether to apply deterministic text cleaning to page text.

        Raises:
            ValueError: If chunk_size <= 0 or chunk_overlap < 0 or chunk_overlap >= chunk_size.
        """
        if chunk_size <= 0:
            raise ValueError(f"chunk_size must be positive, got {chunk_size}")
        if chunk_overlap < 0:
            raise ValueError(f"chunk_overlap cannot be negative, got {chunk_overlap}")
        if chunk_overlap >= chunk_size:
            raise ValueError(
                f"chunk_overlap ({chunk_overlap}) must be strictly less than chunk_size ({chunk_size})"
            )

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.clean_before_chunking = clean_before_chunking

    def _split_text_with_overlap(self, text: str) -> List[str]:
        """Split a string into overlapping chunks using natural boundaries where possible."""
        text = text.strip()
        if not text:
            return []

        if len(text) <= self.chunk_size:
            return [text]

        # Use natural paragraph and sentence delimiters
        delimiters = ["\n\n", "\n", ". ", "? ", "! ", " "]
        
        chunks: List[str] = []
        start = 0
        text_len = len(text)

        while start < text_len:
            # Determine potential chunk end
            end = start + self.chunk_size

            if end >= text_len:
                chunk = text[start:].strip()
                if chunk:
                    chunks.append(chunk)
                break

            # Find best split boundary within the acceptable chunk window
            best_split = -1
            # Search from end backwards up to (end - step_back) to find natural boundary
            step_back = max(1, self.chunk_size - self.chunk_overlap)
            search_window_start = max(start, end - (self.chunk_size // 4))

            for delim in delimiters:
                split_pos = text.rfind(delim, search_window_start, end)
                if split_pos != -1:
                    # Include the punctuation in the current chunk if sentence end
                    best_split = split_pos + len(delim)
                    break

            if best_split == -1 or best_split <= start:
                # Fallback to exact chunk_size if no boundary found
                best_split = end

            chunk = text[start:best_split].strip()
            if chunk:
                chunks.append(chunk)

            # Advance start index accounting for overlap
            next_start = best_split - self.chunk_overlap
            if next_start <= start:
                next_start = start + max(1, self.chunk_size - self.chunk_overlap)

            start = next_start

        return chunks

    def chunk_page(
        self,
        page: Union[ExtractedPage, Dict[str, Any]],
        start_chunk_index: int = 0,
    ) -> List[TextChunk]:
        """Chunk a single page, attaching citation metadata to every produced chunk.

        Args:
            page: ExtractedPage or dictionary containing page information.
            start_chunk_index: Starting sequential chunk index.

        Returns:
            List of TextChunk models.
        """
        if isinstance(page, ExtractedPage):
            doc_id = page.document_id
            page_num = page.page_number
            raw_text = page.text
            source_path = page.source_path
        else:
            doc_id = page["document_id"]
            page_num = page["page_number"]
            raw_text = page.get("text", "")
            source_path = page.get("source_path") or page.get("metadata", {}).get("source", f"{doc_id}.pdf")

        text_to_chunk = clean_text(raw_text) if self.clean_before_chunking else raw_text.strip()
        if not text_to_chunk:
            return []

        text_segments = self._split_text_with_overlap(text_to_chunk)
        chunks: List[TextChunk] = []

        # Derive source filename
        source_name = source_path.replace("\\", "/").split("/")[-1] if source_path else f"{doc_id}.pdf"

        for offset, seg in enumerate(text_segments):
            chunk_obj = TextChunk(
                document_id=doc_id,
                page_number=page_num,
                chunk_index=start_chunk_index + offset,
                text=seg,
                metadata={
                    "source": source_name,
                    "page_number": page_num,
                    "document_id": doc_id,
                },
            )
            chunks.append(chunk_obj)

        return chunks

    def chunk_pages(
        self,
        pages: List[Union[ExtractedPage, Dict[str, Any]]],
    ) -> List[TextChunk]:
        """Chunk multiple document pages sequentially while maintaining sequential chunk indices.

        Args:
            pages: List of ExtractedPage or dict page objects.

        Returns:
            List of all non-empty TextChunk objects.
        """
        all_chunks: List[TextChunk] = []
        current_chunk_index = 0

        for page in pages:
            page_chunks = self.chunk_page(page, start_chunk_index=current_chunk_index)
            all_chunks.extend(page_chunks)
            current_chunk_index += len(page_chunks)

        return all_chunks


def chunk_pages(
    pages: List[Union[ExtractedPage, Dict[str, Any]]],
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    clean_before_chunking: bool = True,
) -> List[TextChunk]:
    """Functional convenience wrapper for page-aware chunking."""
    chunker = PageAwareChunker(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        clean_before_chunking=clean_before_chunking,
    )
    return chunker.chunk_pages(pages)
