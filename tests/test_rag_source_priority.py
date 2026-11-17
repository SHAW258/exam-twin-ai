"""Tests for own-PDF-first retrieval, anonymous global answers and AI practice logging."""

import json

import pytest

from src.api.routers.tutor import _count_generated_questions, _record_ai_practice
from src.database.connection import DatabaseManager
from src.database.models import AccessLevel, AIPracticeRecord, Document, ProcessingStatus
from src.database.schema import create_tables, drop_tables
from src.embeddings.embedding_service import DeterministicMockEmbeddingService
from src.llm.gemini_service import MockLLMService
from src.rag.prompt_builder import PromptBuilder
from src.rag.rag_service import RAGService
from src.rag.retriever import Retriever
from src.vector_store.base import DocumentChunkRecord
from src.vector_store.mysql_vector_store import MySQLVectorStore

TOPIC = "Deadlock occurs when processes wait indefinitely for resources held by each other"


def _drill_json(with_source: bool = False) -> str:
    question = {
        "question": "What is a deadlock?",
        "options": ["A) Waiting cycle", "B) Fast process", "C) No resources", "D) Idle CPU"],
        "correct_option_index": 0,
        "explanation": "Processes block each other while holding resources.",
    }
    if with_source:
        question["source_page"] = 42
    return json.dumps({"questions": [question], "insufficient": False, "message": ""})


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
    def respond(prompt: str) -> str:
        if "Return ONLY valid JSON" in prompt or "multiple-choice exam practice" in prompt:
            return _drill_json(with_source="SHARED COURSE KNOWLEDGE" in prompt)
        return (
            "According to the course notes (Operating_System.pdf, Page 42), "
            "a deadlock happens when processes wait for each other's resources."
        )

    return MockLLMService(response_generator=respond)


@pytest.fixture
def rag_service(retriever, mock_llm):
    return RAGService(retriever=retriever, llm_service=mock_llm, prompt_builder=PromptBuilder())


def _seed_pdf(db_mgr, vector_store, embedding_service, doc_id, owner, filename, text, page=1):
    with db_mgr.get_session() as session:
        session.merge(
            Document(
                id=doc_id,
                owner_user_id=owner,
                filename=filename,
                original_filename=filename,
                access_level=AccessLevel.PRIVATE.value,
                processing_status=ProcessingStatus.PROCESSED.value,
            )
        )
    vector_store.add_chunks([
        DocumentChunkRecord(
            document_id=doc_id,
            page_number=page,
            chunk_index=0,
            text=text,
            embedding=embedding_service.embed_text(text),
            metadata={"source": filename, "page_number": page, "original_filename": filename},
        )
    ])


def test_students_own_pdf_is_searched_first_with_citations(
    test_db_manager, vector_store, embedding_service, rag_service, mock_llm
):
    """Own PDF wins over another user's PDF and keeps normal page citations."""
    _seed_pdf(test_db_manager, vector_store, embedding_service, "doc_alice", "alice", "Alice_Notes.pdf", TOPIC)
    _seed_pdf(test_db_manager, vector_store, embedding_service, "doc_bob", "bob", "Bob_Notes.pdf", TOPIC)

    response = rag_service.answer_question(question=TOPIC, user_id="bob")

    assert response.source_kind == "own_document"
    assert response.is_grounded is True
    assert response.sources
    assert {c.document_id for c in response.sources} == {"doc_bob"}
    prompt = mock_llm.call_history[0]["prompt"]
    assert "Bob_Notes.pdf" in prompt
    assert "Alice_Notes.pdf" not in prompt


def test_global_pdf_answer_hides_all_source_details(
    test_db_manager, vector_store, embedding_service, rag_service, mock_llm
):
    """Other users' PDFs may answer, but no filename, page or similarity may be exposed."""
    _seed_pdf(test_db_manager, vector_store, embedding_service, "doc_alice", "alice", "Operating_System.pdf", TOPIC)

    response = rag_service.answer_question(question=TOPIC, user_id="bob")

    assert response.is_grounded is True
    assert response.retrieved_chunks > 0
    assert response.source_kind == "global_document"
    assert response.sources == []
    prompt = mock_llm.call_history[0]["prompt"]
    assert "SHARED COURSE KNOWLEDGE" in prompt
    assert "Operating_System.pdf" not in prompt
    assert "Similarity Score" not in prompt
    assert "Page:" not in prompt
    # Even if the model echoes a citation, it is scrubbed before reaching the student.
    assert ".pdf" not in response.answer
    assert "Page 42" not in response.answer


def test_global_practice_drill_has_no_source_page(
    test_db_manager, vector_store, embedding_service, rag_service
):
    """A PDF-grounded drill served from the global pool never carries source_page."""
    _seed_pdf(test_db_manager, vector_store, embedding_service, "doc_alice", "alice", "Operating_System.pdf", TOPIC)

    response = rag_service.generate_practice_question(topic=TOPIC, user_id="bob")

    assert response.source_kind == "global_document"
    assert response.is_grounded is True
    assert response.sources == []
    payload = json.loads(response.answer)
    assert payload["questions"]
    assert "source_page" not in payload["questions"][0]
    assert ".pdf" not in response.answer


def test_no_pdf_drill_stays_interactive_and_is_marked_ai_practice(rag_service):
    """With no PDF anywhere the drill is still a valid interactive quiz, labelled AI practice."""
    response = rag_service.generate_practice_question(topic="Operating system deadlocks", user_id="bob")

    assert response.source_kind == "general_ai"
    assert response.is_grounded is False
    payload = json.loads(response.answer)
    assert payload["questions"]
    assert "correct_option_index" in payload["questions"][0]
    assert response.sources == []


def test_global_search_can_be_disabled_for_strict_isolation(
    test_db_manager, vector_store, embedding_service, retriever, mock_llm
):
    strict_service = RAGService(
        retriever=retriever,
        llm_service=mock_llm,
        prompt_builder=PromptBuilder(),
        enable_global_document_search=False,
    )
    _seed_pdf(test_db_manager, vector_store, embedding_service, "doc_alice", "alice", "Operating_System.pdf", TOPIC)

    response = strict_service.answer_question(question=TOPIC, user_id="bob")

    assert response.is_grounded is False
    assert response.retrieved_chunks == 0
    assert response.sources == []
    assert mock_llm.call_history == []


def test_ai_practice_record_is_persisted(test_db_manager):
    """No-PDF practice is recorded in the database for later reporting."""
    drill = _drill_json()
    record_id = _record_ai_practice(test_db_manager, "bob", "Operating system deadlocks", drill)

    assert record_id
    with test_db_manager.get_session() as session:
        record = session.get(AIPracticeRecord, record_id)
        assert record is not None
        assert record.student_id == "bob"
        assert record.topic == "Operating system deadlocks"
        assert record.question_count == 1
        assert record.source_kind == "general_ai"

    assert _count_generated_questions(drill) == 1
    assert _count_generated_questions("not json") == 0
