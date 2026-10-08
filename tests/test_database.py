"""Unit tests for SQLAlchemy models, database connection management, and schema operations."""

import json
import pytest
from sqlalchemy import select

from src.database.connection import DatabaseManager
from src.database.models import (
    AccessLevel,
    Document,
    DocumentChunk,
    DocumentPage,
    ProcessingStatus,
)
from src.database.schema import create_tables, drop_tables


@pytest.fixture
def test_db_manager():
    """Fixture providing an isolated in-memory SQLite database manager for fast unit tests."""
    mgr = DatabaseManager(database_url="sqlite:///:memory:")
    create_tables(mgr)
    yield mgr
    drop_tables(mgr)
    mgr.dispose()


def test_database_manager_initialization(test_db_manager):
    """Verify DatabaseManager initializes engine and session factory properly."""
    assert test_db_manager.engine is not None
    assert test_db_manager.session_factory is not None


def test_document_model_creation_and_fields(test_db_manager):
    """Verify Document model persists with required fields and defaults."""
    with test_db_manager.get_session() as session:
        doc = Document(
            id="doc_test_101",
            owner_user_id="user_alice",
            filename="Operating_Systems.pdf",
            original_filename="Operating_Systems.pdf",
            content_type="application/pdf",
            source_type="PDF",
            access_level=AccessLevel.PRIVATE.value,
            processing_status=ProcessingStatus.UPLOADED.value,
        )
        session.add(doc)

    with test_db_manager.get_session() as session:
        retrieved = session.get(Document, "doc_test_101")
        assert retrieved is not None
        assert retrieved.owner_user_id == "user_alice"
        assert retrieved.access_level == "PRIVATE"
        assert retrieved.processing_status == "UPLOADED"
        assert retrieved.created_at is not None
        assert retrieved.updated_at is not None


def test_document_page_and_chunk_relationships_and_cascade(test_db_manager):
    """Verify Document -> Pages -> Chunks relationships and cascade deletion."""
    with test_db_manager.get_session() as session:
        doc = Document(
            id="doc_rel_test",
            owner_user_id="user_bob",
            filename="data_structures.pdf",
            original_filename="data_structures.pdf",
        )
        session.add(doc)
        session.flush()

        page1 = DocumentPage(
            id="page_1",
            document_id=doc.id,
            page_number=1,
            text="Page 1: Stacks and Queues.",
        )
        session.add(page1)
        session.flush()

        chunk1 = DocumentChunk(
            id="chunk_1",
            document_id=doc.id,
            page_id=page1.id,
            page_number=1,
            chunk_index=0,
            text="A stack is LIFO.",
            embedding=json.dumps([0.1, 0.2, 0.3]),
            chunk_metadata=json.dumps({"source": "data_structures.pdf", "page_number": 1}),
        )
        session.add(chunk1)

    # Verify relationships can be navigated
    with test_db_manager.get_session() as session:
        retrieved_doc = session.get(Document, "doc_rel_test")
        assert len(retrieved_doc.pages) == 1
        assert len(retrieved_doc.chunks) == 1
        assert retrieved_doc.pages[0].text == "Page 1: Stacks and Queues."
        assert retrieved_doc.chunks[0].embedding_vector == [0.1, 0.2, 0.3]
        assert retrieved_doc.chunks[0].metadata_dict["page_number"] == 1

        # Delete document - should cascade to pages and chunks
        session.delete(retrieved_doc)

    # Verify cascade deletion
    with test_db_manager.get_session() as session:
        assert session.get(Document, "doc_rel_test") is None
        pages = session.execute(select(DocumentPage).where(DocumentPage.document_id == "doc_rel_test")).all()
        assert len(pages) == 0
        chunks = session.execute(select(DocumentChunk).where(DocumentChunk.document_id == "doc_rel_test")).all()
        assert len(chunks) == 0


def test_chunk_embedding_and_metadata_property_helpers():
    """Verify helper property getters and setters on DocumentChunk."""
    chunk = DocumentChunk(
        document_id="doc_01",
        page_number=1,
        chunk_index=0,
        text="Sample text",
    )
    # Test None state
    assert chunk.embedding_vector is None
    assert chunk.metadata_dict == {}

    # Test assignment
    vec = [0.123, -0.456, 0.789]
    chunk.embedding_vector = vec
    assert chunk.embedding_vector == vec
    assert json.loads(chunk.embedding) == vec

    meta = {"source": "test.pdf", "topic": "DSA"}
    chunk.metadata_dict = meta
    assert chunk.metadata_dict == meta
    assert json.loads(chunk.chunk_metadata) == meta

    # Test to_dict serialization
    d = chunk.to_dict()
    assert d["document_id"] == "doc_01"
    assert d["has_embedding"] is True
    assert d["metadata"] == meta


def test_processing_status_and_access_level_enums():
    """Verify supported enum constants."""
    assert ProcessingStatus.UPLOADED.value == "UPLOADED"
    assert ProcessingStatus.PROCESSING.value == "PROCESSING"
    assert ProcessingStatus.PROCESSED.value == "PROCESSED"
    assert ProcessingStatus.FAILED.value == "FAILED"

    assert AccessLevel.PRIVATE.value == "PRIVATE"
    assert AccessLevel.COURSE_SHARED.value == "COURSE_SHARED"
