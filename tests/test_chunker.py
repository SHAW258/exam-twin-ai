"""Unit tests for Page-Aware Document Chunker and RAG citation preservation."""

import pytest

from src.ingestion.chunker import (
    PageAwareChunker,
    TextChunk,
    chunk_pages,
)
from src.ingestion.pdf_loader import ExtractedPage


@pytest.fixture
def sample_pages() -> list[ExtractedPage]:
    """Sample multi-page document for chunking tests."""
    p1_text = (
        "A stack is a linear data structure that follows the principle of "
        "Last In First Out (LIFO). This means the last element inserted is the "
        "first to be popped out. Primary operations are push, pop, and peek."
    )
    p2_text = (
        "A queue is a linear data structure following First In First Out (FIFO). "
        "Elements are enqueued at the rear and dequeued from the front. Common "
        "variants include circular queues and priority queues."
    )
    return [
        ExtractedPage(
            document_id="data_structures_01",
            page_number=1,
            text=p1_text,
            total_pages=2,
            source_path="data/raw/data_structures_01.pdf",
        ),
        ExtractedPage(
            document_id="data_structures_01",
            page_number=2,
            text=p2_text,
            total_pages=2,
            source_path="data/raw/data_structures_01.pdf",
        ),
    ]


def test_chunk_generation_and_metadata_preservation(sample_pages):
    """Verify chunks preserve page provenance, source metadata, and valid structure."""
    chunker = PageAwareChunker(chunk_size=120, chunk_overlap=20)
    chunks = chunker.chunk_pages(sample_pages)

    assert len(chunks) > 0
    for chunk in chunks:
        assert isinstance(chunk, TextChunk)
        assert chunk.document_id == "data_structures_01"
        assert chunk.page_number in [1, 2]
        assert len(chunk.text.strip()) > 0
        assert chunk.metadata["source"] == "data_structures_01.pdf"
        assert chunk.metadata["page_number"] == chunk.page_number
        assert chunk.metadata["document_id"] == "data_structures_01"


def test_sequential_chunk_indices(sample_pages):
    """Verify chunk_index is strictly monotonically increasing from 0."""
    chunks = chunk_pages(sample_pages, chunk_size=100, chunk_overlap=15)
    indices = [c.chunk_index for c in chunks]
    expected_indices = list(range(len(chunks)))
    assert indices == expected_indices


def test_configurable_chunk_size_and_overlap():
    """Verify chunk size constraint is respected."""
    long_text = "Word " * 200
    page = ExtractedPage(
        document_id="doc_test",
        page_number=5,
        text=long_text,
        total_pages=1,
        source_path="doc_test.pdf",
    )
    chunker = PageAwareChunker(chunk_size=150, chunk_overlap=30)
    chunks = chunker.chunk_pages([page])

    assert len(chunks) > 1
    for chunk in chunks:
        # Check chunk length does not exceed configured size
        assert len(chunk.text) <= 150


def test_no_empty_chunks():
    """Verify pages with empty or whitespace-only content generate no empty chunks."""
    pages = [
        ExtractedPage(
            document_id="empty_doc",
            page_number=1,
            text="    \n\n\t   ",
            total_pages=2,
            source_path="empty_doc.pdf",
        ),
        ExtractedPage(
            document_id="empty_doc",
            page_number=2,
            text="Valid actual content on page 2.",
            total_pages=2,
            source_path="empty_doc.pdf",
        ),
    ]
    chunks = chunk_pages(pages, chunk_size=200, chunk_overlap=20)
    assert len(chunks) == 1
    assert chunks[0].page_number == 2
    assert chunks[0].chunk_index == 0
    assert chunks[0].text == "Valid actual content on page 2."


def test_chunker_validation_errors():
    """Verify chunker rejects invalid chunk_size and chunk_overlap combinations."""
    with pytest.raises(ValueError):
        PageAwareChunker(chunk_size=0, chunk_overlap=10)

    with pytest.raises(ValueError):
        PageAwareChunker(chunk_size=-50, chunk_overlap=10)

    with pytest.raises(ValueError):
        PageAwareChunker(chunk_size=100, chunk_overlap=-5)

    with pytest.raises(ValueError):
        PageAwareChunker(chunk_size=100, chunk_overlap=100)

    with pytest.raises(ValueError):
        PageAwareChunker(chunk_size=100, chunk_overlap=120)


def test_chunk_model_dict_format(sample_pages):
    """Verify chunk output dict matches expected ExamTwin RAG citation contract."""
    chunker = PageAwareChunker(chunk_size=250, chunk_overlap=25)
    chunks = chunker.chunk_pages(sample_pages)

    first_chunk = chunks[0].to_dict()
    assert "document_id" in first_chunk
    assert "page_number" in first_chunk
    assert "chunk_index" in first_chunk
    assert "text" in first_chunk
    assert "metadata" in first_chunk
    assert first_chunk["metadata"]["source"] == "data_structures_01.pdf"
    assert first_chunk["metadata"]["page_number"] == 1
