"""Unit tests for the RAG Retriever module."""

import pytest

from src.database.connection import DatabaseManager
from src.database.models import AccessLevel, Document, ProcessingStatus
from src.database.schema import create_tables, drop_tables
from src.embeddings.embedding_service import DeterministicMockEmbeddingService
from src.rag.retriever import RetrievedContextChunk, Retriever, RetrieverError
from src.vector_store.base import DocumentChunkRecord
from src.vector_store.mysql_vector_store import MySQLVectorStore


@pytest.fixture
def test_db_manager():
    mgr = DatabaseManager(database_url="sqlite:///:memory:")
    create_tables(mgr)
    yield mgr
    drop_tables(mgr)
    mgr.dispose()


@pytest.fixture
def vector_store(test_db_manager):
    return MySQLVectorStore(db_manager=test_db_manager)


@pytest.fixture
def embedding_service():
    return DeterministicMockEmbeddingService(dimension=768)


@pytest.fixture
def retriever(vector_store, embedding_service):
    return Retriever(
        vector_store=vector_store,
        embedding_service=embedding_service,
        default_top_k=5,
        default_min_similarity=0.20,
    )


def _seed_document_and_chunks(db_mgr, vector_store, embedding_service):
    with db_mgr.get_session() as session:
        doc1 = Document(
            id="doc_ds",
            owner_user_id="user_alice",
            filename="data_structures.pdf",
            original_filename="data_structures.pdf",
            access_level=AccessLevel.PRIVATE.value,
            processing_status=ProcessingStatus.PROCESSED.value,
        )
        doc2 = Document(
            id="doc_algo",
            owner_user_id="user_bob",
            filename="algorithms.pdf",
            original_filename="algorithms.pdf",
            access_level=AccessLevel.PRIVATE.value,
            processing_status=ProcessingStatus.PROCESSED.value,
        )
        doc3 = Document(
            id="doc_shared",
            owner_user_id="admin_user",
            filename="shared_course.pdf",
            original_filename="shared_course.pdf",
            access_level=AccessLevel.COURSE_SHARED.value,
            processing_status=ProcessingStatus.PROCESSED.value,
        )
        session.merge(doc1)
        session.merge(doc2)
        session.merge(doc3)

    t1 = "A stack is a linear data structure using LIFO order with push and pop."
    t2 = "A queue is a linear data structure using FIFO order with enqueue and dequeue."
    t3 = "Binary search runs in logarithmic time O(log n)."
    t4 = "General computer science fundamentals."

    vector_store.add_chunks([
        DocumentChunkRecord(
            document_id="doc_ds",
            page_number=5,
            chunk_index=0,
            text=t1,
            embedding=embedding_service.embed_text(t1),
            metadata={"source": "data_structures.pdf", "page_number": 5},
        ),
        DocumentChunkRecord(
            document_id="doc_ds",
            page_number=6,
            chunk_index=1,
            text=t2,
            embedding=embedding_service.embed_text(t2),
            metadata={"source": "data_structures.pdf", "page_number": 6},
        ),
        DocumentChunkRecord(
            document_id="doc_algo",
            page_number=12,
            chunk_index=0,
            text=t3,
            embedding=embedding_service.embed_text(t3),
            metadata={"source": "algorithms.pdf", "page_number": 12},
        ),
        DocumentChunkRecord(
            document_id="doc_shared",
            page_number=1,
            chunk_index=0,
            text=t4,
            embedding=embedding_service.embed_text(t4),
            metadata={"source": "shared_course.pdf", "page_number": 1},
        ),
    ])


def test_retrieve_successful_ranking_and_metadata(test_db_manager, vector_store, embedding_service, retriever):
    """Verify retrieval returns ranked results with correct metadata and citation info."""
    _seed_document_and_chunks(test_db_manager, vector_store, embedding_service)

    results = retriever.retrieve(
        question="How does a stack structure implement LIFO push and pop?",
        user_id="user_alice",
        top_k=2,
    )

    assert len(results) > 0
    assert isinstance(results[0], RetrievedContextChunk)
    assert results[0].document_id == "doc_ds"
    assert results[0].page_number == 5
    assert results[0].source == "data_structures.pdf"
    assert results[0].similarity_score > 0.5
    assert "stack" in results[0].text.lower()


def test_retrieve_user_access_isolation(test_db_manager, vector_store, embedding_service, retriever):
    """Verify user Alice cannot retrieve user Bob's private algorithms document."""
    _seed_document_and_chunks(test_db_manager, vector_store, embedding_service)

    alice_results = retriever.retrieve(
        question="binary search logarithmic algorithm",
        user_id="user_alice",
        top_k=10,
        min_similarity=0.0,
    )
    doc_ids = {r.document_id for r in alice_results}
    assert "doc_algo" not in doc_ids  # Bob's private doc is isolated
    assert "doc_ds" in doc_ids or "doc_shared" in doc_ids


def test_retrieve_document_id_filtering(test_db_manager, vector_store, embedding_service, retriever):
    """Verify explicit document_ids restrict search scope."""
    _seed_document_and_chunks(test_db_manager, vector_store, embedding_service)

    results = retriever.retrieve(
        question="LIFO and FIFO operations",
        user_id="user_alice",
        document_ids=["doc_shared"],
        min_similarity=0.0,
    )
    for r in results:
        assert r.document_id == "doc_shared"


def test_retrieve_empty_question_raises(retriever):
    """Verify empty or whitespace query raises RetrieverError."""
    with pytest.raises(RetrieverError):
        retriever.retrieve(question="")

    with pytest.raises(RetrieverError):
        retriever.retrieve(question="   \n\t  ")


def test_retrieve_invalid_top_k_raises(retriever):
    """Verify invalid top_k raises RetrieverError."""
    with pytest.raises(RetrieverError):
        retriever.retrieve(question="What is a stack?", top_k=0)

    with pytest.raises(RetrieverError):
        retriever.retrieve(question="What is a stack?", top_k=-3)


def test_retrieve_high_similarity_threshold_filters_out(test_db_manager, vector_store, embedding_service, retriever):
    """Verify setting high min_similarity filters out loosely matching chunks."""
    _seed_document_and_chunks(test_db_manager, vector_store, embedding_service)

    # Completely unrelated query with high threshold should yield 0 chunks
    results = retriever.retrieve(
        question="Photosynthesis chlorophyll plant biology",
        user_id="user_alice",
        min_similarity=0.95,
    )
    assert len(results) == 0
