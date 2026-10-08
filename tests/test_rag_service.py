"""Unit and integration tests for the grounded RAG service."""

import pytest

from src.database.connection import DatabaseManager
from src.database.models import AccessLevel, Document, ProcessingStatus
from src.database.schema import create_tables, drop_tables
from src.embeddings.embedding_service import DeterministicMockEmbeddingService
from src.llm.gemini_service import MockLLMService
from src.rag.prompt_builder import PromptBuilder
from src.rag.rag_service import RAGResponse, RAGService, SourceCitation
from src.rag.retriever import Retriever
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
        default_min_similarity=0.15,
    )


@pytest.fixture
def mock_llm():
    return MockLLMService(
        default_response=(
            "According to the course notes (Operating_System.pdf, Page 42), "
            "a deadlock occurs when processes are blocked waiting for resources held by each other."
        )
    )


@pytest.fixture
def rag_service(retriever, mock_llm):
    return RAGService(
        retriever=retriever,
        llm_service=mock_llm,
        prompt_builder=PromptBuilder(),
    )


def _seed_os_document(db_mgr, vector_store, embedding_service):
    with db_mgr.get_session() as session:
        doc = Document(
            id="doc_os_101",
            owner_user_id="student_alice",
            filename="Operating_System.pdf",
            original_filename="Operating_System.pdf",
            access_level=AccessLevel.PRIVATE.value,
            processing_status=ProcessingStatus.PROCESSED.value,
        )
        session.merge(doc)

    t1 = "Deadlock occurs when processes wait indefinitely for resources held by each other."
    t2 = "Four Coffman conditions for deadlock: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait."

    vector_store.add_chunks([
        DocumentChunkRecord(
            document_id="doc_os_101",
            page_number=42,
            chunk_index=0,
            text=t1,
            embedding=embedding_service.embed_text(t1),
            metadata={"source": "Operating_System.pdf", "page_number": 42},
        ),
        DocumentChunkRecord(
            document_id="doc_os_101",
            page_number=43,
            chunk_index=1,
            text=t2,
            embedding=embedding_service.embed_text(t2),
            metadata={"source": "Operating_System.pdf", "page_number": 43},
        ),
    ])


def test_answer_question_end_to_end_grounding(test_db_manager, vector_store, embedding_service, rag_service, mock_llm):
    """Verify end-to-end grounded Q&A flow with citations and LLM prompt construction."""
    _seed_os_document(test_db_manager, vector_store, embedding_service)

    response = rag_service.answer_question(
        question="Deadlock occurs when processes wait indefinitely for resources",
        user_id="student_alice",
        top_k=2,
    )

    assert isinstance(response, RAGResponse)
    assert response.is_grounded is True
    assert response.retrieved_chunks > 0
    assert "deadlock" in response.answer.lower()
    assert len(response.sources) > 0

    # Verify citation metadata preservation (page numbers from chunk metadata, not LLM)
    first_source = response.sources[0]
    assert isinstance(first_source, SourceCitation)
    assert first_source.document_id == "doc_os_101"
    assert first_source.source == "Operating_System.pdf"
    assert first_source.page_number in [42, 43]
    assert first_source.similarity_score > 0.15

    # Verify LLM was invoked with formatted prompt
    assert len(mock_llm.call_history) == 1
    prompt_sent = mock_llm.call_history[0]["prompt"]
    assert "[RETRIEVED DOCUMENT CONTEXT]" in prompt_sent
    assert "Operating_System.pdf" in prompt_sent


def test_answer_question_no_result_handling(rag_service, mock_llm):
    """Verify controlled response when no matching chunks exist (LLM is not called)."""
    response = rag_service.answer_question(
        question="What is Quantum Chromodynamics?",
        user_id="student_alice",
        min_similarity=0.99,  # Unattainable threshold
    )

    assert response.is_grounded is False
    assert response.retrieved_chunks == 0
    assert response.sources == []
    assert "could not find relevant information" in response.answer.lower()
    # LLM must NOT be called on empty context
    assert len(mock_llm.call_history) == 0


def test_answer_question_security_isolation(test_db_manager, vector_store, embedding_service, rag_service, mock_llm):
    """Verify user Bob cannot query Alice's private OS document."""
    _seed_os_document(test_db_manager, vector_store, embedding_service)

    # Bob asks about deadlock in Alice's document
    bob_response = rag_service.answer_question(
        question="What is deadlock?",
        user_id="student_bob",  # Unauthorized user
    )

    assert bob_response.is_grounded is False
    assert bob_response.retrieved_chunks == 0
    assert bob_response.sources == []
    assert len(mock_llm.call_history) == 0


def test_generate_hint_and_practice_question(test_db_manager, vector_store, embedding_service, rag_service):
    """Verify educational hint and practice question workflows."""
    _seed_os_document(test_db_manager, vector_store, embedding_service)

    hint_res = rag_service.generate_hint(
        question="Deadlock occurs when processes wait indefinitely",
        student_answer="When CPU is idle",
        user_id="student_alice",
    )
    assert hint_res.is_grounded is True
    assert len(hint_res.sources) > 0

    practice_res = rag_service.generate_practice_question(
        topic="Four Coffman conditions for deadlock: Mutual Exclusion",
        user_id="student_alice",
    )
    assert practice_res.is_grounded is True
    assert len(practice_res.sources) > 0


def test_rag_service_empty_question_raises(rag_service):
    """Verify empty question raises ValueError."""
    with pytest.raises(ValueError):
        rag_service.answer_question("")

    with pytest.raises(ValueError):
        rag_service.answer_question("   ")
