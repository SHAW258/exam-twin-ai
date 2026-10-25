"""Automated verification tests for Phase 2 Production Mock Isolation."""

import pytest

from src.config.settings import get_settings
from src.embeddings.embedding_service import (
    BaseEmbeddingService,
    DeterministicMockEmbeddingService,
    EmbeddingError,
    GeminiEmbeddingService,
    get_embedding_service,
)
from src.llm.gemini_service import (
    BaseLLMService,
    GeminiService,
    LLMError,
    MockLLMService,
    get_llm_service,
)
from src.rag.rag_service import get_rag_service


def test_production_disallows_mock_embedding_service(monkeypatch):
    """Verify production environment rejects explicit mock embedding requests."""
    settings = get_settings()
    monkeypatch.setattr(settings, "APP_ENV", "production")

    with pytest.raises(EmbeddingError) as exc_info:
        get_embedding_service(use_mock=True)
    assert "cannot be enabled in production" in str(exc_info.value).lower()


def test_production_requires_gemini_api_key_for_embeddings(monkeypatch):
    """Verify production environment raises error if GEMINI_API_KEY is missing."""
    settings = get_settings()
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    with pytest.raises(EmbeddingError) as exc_info:
        get_embedding_service()
    assert "gemini_api_key is not configured" in str(exc_info.value).lower()


def test_production_disallows_mock_llm_service(monkeypatch):
    """Verify production environment rejects explicit mock LLM requests."""
    settings = get_settings()
    monkeypatch.setattr(settings, "APP_ENV", "production")

    with pytest.raises(LLMError) as exc_info:
        get_llm_service(use_mock=True)
    assert "cannot be enabled in production" in str(exc_info.value).lower()


def test_production_requires_gemini_api_key_for_llm(monkeypatch):
    """Verify production environment raises error if GEMINI_API_KEY is missing for LLM."""
    settings = get_settings()
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    with pytest.raises(LLMError) as exc_info:
        get_llm_service()
    assert "gemini_api_key is not configured" in str(exc_info.value).lower()


@pytest.fixture
def test_db_manager():
    from src.database.connection import DatabaseManager
    from src.database.schema import create_tables
    mgr = DatabaseManager("sqlite:///:memory:")
    create_tables(mgr)
    yield mgr
    mgr.dispose()


def test_production_disallows_mock_rag_service(monkeypatch, test_db_manager):
    """Verify production environment rejects mock LLM or mock embedding in RAG factory."""
    settings = get_settings()
    monkeypatch.setattr(settings, "APP_ENV", "production")

    with pytest.raises(RuntimeError) as exc_info:
        get_rag_service(db_manager=test_db_manager, use_mock_llm=True)
    assert "mock services cannot be requested in production" in str(exc_info.value).lower()


def test_production_disables_silent_fallback_in_gemini_services(monkeypatch):
    """Verify GeminiService and GeminiEmbeddingService disable fallback to mock in production."""
    settings = get_settings()
    monkeypatch.setattr(settings, "APP_ENV", "production")

    emb_svc = GeminiEmbeddingService(api_key="dummy_test_key_abc123")
    assert emb_svc._enable_fallback is False
    assert emb_svc._fallback_service is None

    llm_svc = GeminiService(api_key="dummy_test_key_abc123")
    assert llm_svc._enable_fallback is False
    assert llm_svc._fallback_service is None


def test_non_production_permits_mock_for_test_fixtures():
    """Verify non-production environments retain mock service access for automated testing."""
    emb_svc = get_embedding_service(use_mock=True)
    assert isinstance(emb_svc, DeterministicMockEmbeddingService)
    assert isinstance(emb_svc, BaseEmbeddingService)

    llm_svc = get_llm_service(use_mock=True)
    assert isinstance(llm_svc, MockLLMService)
    assert isinstance(llm_svc, BaseLLMService)
