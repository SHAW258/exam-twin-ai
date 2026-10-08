"""Unit tests for MySQL VectorStore implementation, similarity ranking, and access security."""

import pytest

from src.database.connection import DatabaseManager
from src.database.models import AccessLevel, Document, ProcessingStatus
from src.database.schema import create_tables, drop_tables
from src.embeddings.embedding_service import DeterministicMockEmbeddingService
from src.ingestion.pipeline import DocumentIngestionPipeline
from src.vector_store.base import DocumentChunkRecord, SearchResult
from src.vector_store.mysql_vector_store import (
    MySQLVectorStore,
    compute_cosine_similarity,
)


@pytest.fixture
def test_db_manager():
    """In-memory database fixture for vector store testing."""
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


def _seed_document(
    db_mgr: DatabaseManager,
    doc_id: str,
    owner_user_id: str,
    access_level: str = AccessLevel.PRIVATE.value,
):
    with db_mgr.get_session() as session:
        doc = Document(
            id=doc_id,
            owner_user_id=owner_user_id,
            filename=f"{doc_id}.pdf",
            original_filename=f"{doc_id}.pdf",
            content_type="application/pdf",
            source_type="PDF",
            access_level=access_level,
            processing_status=ProcessingStatus.PROCESSED.value,
        )
        session.merge(doc)


def test_cosine_similarity_computation():
    """Verify mathematical properties of cosine similarity calculation."""
    # Orthogonal vectors -> 0.0
    v1 = [1.0, 0.0, 0.0]
    v2 = [0.0, 1.0, 0.0]
    assert pytest.approx(compute_cosine_similarity(v1, v2)) == 0.0

    # Identical vectors -> 1.0
    v3 = [0.6, 0.8]
    assert pytest.approx(compute_cosine_similarity(v3, v3)) == 1.0

    # Opposite vectors -> -1.0
    v4 = [-0.6, -0.8]
    assert pytest.approx(compute_cosine_similarity(v3, v4)) == -1.0

    # Zero vector safety
    assert compute_cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_add_and_retrieve_document_chunks(test_db_manager, vector_store, embedding_service):
    """Verify adding chunks and fetching them by document ID."""
    _seed_document(test_db_manager, "doc_dsa", "user_alice", AccessLevel.PRIVATE.value)

    c1_vec = embedding_service.embed_text("Stack LIFO operation.")
    c2_vec = embedding_service.embed_text("Queue FIFO operation.")

    chunks = [
        DocumentChunkRecord(
            document_id="doc_dsa",
            page_number=1,
            chunk_index=0,
            text="Stack LIFO operation.",
            embedding=c1_vec,
            metadata={"source": "doc_dsa.pdf", "page_number": 1},
        ),
        DocumentChunkRecord(
            document_id="doc_dsa",
            page_number=2,
            chunk_index=1,
            text="Queue FIFO operation.",
            embedding=c2_vec,
            metadata={"source": "doc_dsa.pdf", "page_number": 2},
        ),
    ]

    added = vector_store.add_chunks(chunks)
    assert added == 2

    retrieved = vector_store.get_document_chunks("doc_dsa")
    assert len(retrieved) == 2
    assert retrieved[0].text == "Stack LIFO operation."
    assert retrieved[0].chunk_index == 0
    assert retrieved[1].text == "Queue FIFO operation."
    assert retrieved[1].chunk_index == 1


def test_delete_document(test_db_manager, vector_store, embedding_service):
    """Verify document deletion removes all associated chunks."""
    _seed_document(test_db_manager, "doc_to_delete", "user_alice")
    vec = embedding_service.embed_text("Content to delete.")
    vector_store.add_chunks([
        DocumentChunkRecord(
            document_id="doc_to_delete",
            page_number=1,
            chunk_index=0,
            text="Content to delete.",
            embedding=vec,
        )
    ])

    assert len(vector_store.get_document_chunks("doc_to_delete")) == 1

    deleted = vector_store.delete_document("doc_to_delete")
    assert deleted is True
    assert len(vector_store.get_document_chunks("doc_to_delete")) == 0

    # Deleting non-existent document returns False
    assert vector_store.delete_document("doc_to_delete") is False


def test_similarity_search_and_top_k(test_db_manager, vector_store, embedding_service):
    """Verify similarity search ranks the most semantically relevant chunk highest."""
    _seed_document(test_db_manager, "doc_course", "user_admin", AccessLevel.COURSE_SHARED.value)

    texts = [
        "A stack is a Last In First Out (LIFO) collection where elements are added and removed from the top.",
        "A binary search tree maintains sorted elements with logarithmic search complexity.",
        "Dijkstra algorithm finds single-source shortest paths in weighted graphs with non-negative edge weights.",
    ]

    chunk_records = []
    for idx, text in enumerate(texts):
        chunk_records.append(
            DocumentChunkRecord(
                document_id="doc_course",
                page_number=idx + 1,
                chunk_index=idx,
                text=text,
                embedding=embedding_service.embed_text(text),
                metadata={"source": "course.pdf", "page_number": idx + 1},
            )
        )
    vector_store.add_chunks(chunk_records)

    # Search for stack concept
    query_vec = embedding_service.embed_text("How does a stack structure handle LIFO data?")
    results = vector_store.search(query_embedding=query_vec, top_k=2, user_id="user_student")

    assert len(results) == 2
    # The first result must be the stack chunk
    assert "stack" in results[0].text.lower()
    assert results[0].similarity_score >= results[1].similarity_score
    assert isinstance(results[0], SearchResult)
    assert results[0].metadata["page_number"] == 1


def test_user_ownership_and_security_boundaries(test_db_manager, vector_store, embedding_service):
    """Verify security isolation: User A cannot retrieve User B's PRIVATE document."""
    # Alice's private document
    _seed_document(test_db_manager, "doc_alice_private", "user_alice", AccessLevel.PRIVATE.value)
    # Bob's private document
    _seed_document(test_db_manager, "doc_bob_private", "user_bob", AccessLevel.PRIVATE.value)
    # Course shared document
    _seed_document(test_db_manager, "doc_shared", "user_prof", AccessLevel.COURSE_SHARED.value)

    t_alice = "Alice private notes on advanced memory management and paging."
    t_bob = "Bob private exam cheat sheet on dynamic programming."
    t_shared = "Official university course syllabus on algorithms and data structures."

    vector_store.add_chunks([
        DocumentChunkRecord(
            document_id="doc_alice_private",
            page_number=1,
            chunk_index=0,
            text=t_alice,
            embedding=embedding_service.embed_text(t_alice),
        ),
        DocumentChunkRecord(
            document_id="doc_bob_private",
            page_number=1,
            chunk_index=0,
            text=t_bob,
            embedding=embedding_service.embed_text(t_bob),
        ),
        DocumentChunkRecord(
            document_id="doc_shared",
            page_number=1,
            chunk_index=0,
            text=t_shared,
            embedding=embedding_service.embed_text(t_shared),
        ),
    ])

    query_vec = embedding_service.embed_text("memory management algorithms")

    # 1. User Alice searches: should see her private doc AND shared doc, but NEVER Bob's private doc
    alice_results = vector_store.search(query_embedding=query_vec, top_k=10, user_id="user_alice")
    alice_doc_ids = {r.document_id for r in alice_results}
    assert "doc_alice_private" in alice_doc_ids
    assert "doc_shared" in alice_doc_ids
    assert "doc_bob_private" not in alice_doc_ids

    # 2. User Bob searches: should see his private doc AND shared doc, but NEVER Alice's private doc
    bob_results = vector_store.search(query_embedding=query_vec, top_k=10, user_id="user_bob")
    bob_doc_ids = {r.document_id for r in bob_results}
    assert "doc_bob_private" in bob_doc_ids
    assert "doc_shared" in bob_doc_ids
    assert "doc_alice_private" not in bob_doc_ids

    # 3. Anonymous / Unauthenticated user (user_id=None): can ONLY access COURSE_SHARED documents
    anon_results = vector_store.search(query_embedding=query_vec, top_k=10, user_id=None)
    anon_doc_ids = {r.document_id for r in anon_results}
    assert "doc_shared" in anon_doc_ids
    assert "doc_alice_private" not in anon_doc_ids
    assert "doc_bob_private" not in anon_doc_ids


def test_document_id_filtering(test_db_manager, vector_store, embedding_service):
    """Verify document_ids parameter restricts search to designated documents."""
    _seed_document(test_db_manager, "doc_os", "user_alice", AccessLevel.PRIVATE.value)
    _seed_document(test_db_manager, "doc_db", "user_alice", AccessLevel.PRIVATE.value)

    t1 = "Operating system deadlock mutual exclusion."
    t2 = "Database normalization BCNF candidate keys."

    vector_store.add_chunks([
        DocumentChunkRecord(
            document_id="doc_os",
            page_number=1,
            chunk_index=0,
            text=t1,
            embedding=embedding_service.embed_text(t1),
        ),
        DocumentChunkRecord(
            document_id="doc_db",
            page_number=1,
            chunk_index=0,
            text=t2,
            embedding=embedding_service.embed_text(t2),
        ),
    ])

    query_vec = embedding_service.embed_text("deadlock and normalization")

    # Constrain search only to doc_db
    results = vector_store.search(
        query_embedding=query_vec,
        top_k=5,
        user_id="user_alice",
        document_ids=["doc_db"],
    )
    assert len(results) == 1
    assert results[0].document_id == "doc_db"


def test_end_to_end_pipeline_integration(tmp_path, test_db_manager, vector_store, embedding_service):
    """Verify end-to-end flow: synthetic PDF -> pipeline -> MySQL/SQLite vector store -> search."""
    from tests.test_pdf_loader import _generate_synthetic_pdf

    pdf_bytes = _generate_synthetic_pdf([
        "Chapter 1: Graph Theory Fundamentals. Vertices and Edges.",
        "Chapter 2: Spanning Trees and Kruskal Algorithm.",
    ])
    sample_pdf = tmp_path / "graph_theory.pdf"
    sample_pdf.write_bytes(pdf_bytes)

    pipeline = DocumentIngestionPipeline(
        db_manager=test_db_manager,
        embedding_service=embedding_service,
        vector_store=vector_store,
        chunk_size=150,
        chunk_overlap=20,
    )

    result = pipeline.ingest_pdf(
        file_path=sample_pdf,
        owner_user_id="student_101",
        document_id="doc_graphs",
        access_level=AccessLevel.PRIVATE.value,
    )

    assert result["document_id"] == "doc_graphs"
    assert result["status"] == "PROCESSED"
    assert result["page_count"] == 2
    assert result["chunk_count"] >= 2

    # Query for Kruskal algorithm
    query_vec = embedding_service.embed_text("How does Kruskal algorithm find spanning trees?")
    search_hits = vector_store.search(
        query_embedding=query_vec,
        top_k=1,
        user_id="student_101",
    )
    assert len(search_hits) == 1
    assert search_hits[0].document_id == "doc_graphs"
    assert "Kruskal" in search_hits[0].text
    assert search_hits[0].page_number == 2
