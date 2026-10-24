"""Unit tests for the pretrained embedding service abstraction and deterministic mock provider."""

import math
import pytest

from src.embeddings.embedding_service import (
    BaseEmbeddingService,
    DeterministicMockEmbeddingService,
    EmbeddingError,
    GeminiEmbeddingService,
    get_embedding_service,
)
from src.vector_store.mysql_vector_store import compute_cosine_similarity


def test_mock_embedding_service_initialization():
    """Verify service initializes with custom and default dimensions."""
    svc = DeterministicMockEmbeddingService(dimension=768)
    assert svc.dimension == 768
    assert svc.model_name == "mock-text-embedding-004"

    svc_custom = DeterministicMockEmbeddingService(dimension=384, model_name="custom-model")
    assert svc_custom.dimension == 384
    assert svc_custom.model_name == "custom-model"

    with pytest.raises(ValueError):
        DeterministicMockEmbeddingService(dimension=0)


def test_embed_text_dimension_and_normalization():
    """Verify single text embedding produces unit-normalized float vector."""
    svc = DeterministicMockEmbeddingService(dimension=768)
    vec = svc.embed_text("A stack is a Last-In-First-Out data structure.")

    assert isinstance(vec, list)
    assert len(vec) == 768
    assert all(isinstance(x, float) for x in vec)

    # Verify L2 normalization (length ≈ 1.0)
    norm = math.sqrt(sum(x * x for x in vec))
    assert pytest.approx(norm, abs=1e-3) == 1.0


def test_embed_texts_batch_processing():
    """Verify batch embedding preserves input ordering and lengths."""
    svc = DeterministicMockEmbeddingService(dimension=768)
    texts = [
        "Binary search operates on sorted arrays.",
        "Dijkstra algorithm computes shortest paths in graphs.",
        "Relational databases enforce ACID transaction properties.",
    ]
    vectors = svc.embed_texts(texts)

    assert len(vectors) == 3
    for vec in vectors:
        assert len(vec) == 768
        assert pytest.approx(math.sqrt(sum(x * x for x in vec)), abs=1e-3) == 1.0


def test_embed_empty_or_whitespace_raises():
    """Verify appropriate errors are raised on blank text inputs."""
    svc = DeterministicMockEmbeddingService(dimension=768)

    with pytest.raises(EmbeddingError):
        svc.embed_text("")

    with pytest.raises(EmbeddingError):
        svc.embed_text("   \n\t  ")

    with pytest.raises(EmbeddingError):
        svc.embed_texts(["Valid text", "   "])


def test_embedding_determinism_and_semantic_separation():
    """Verify identical text produces identical vector, and related texts have higher similarity."""
    svc = DeterministicMockEmbeddingService(dimension=768)

    t1 = "A stack is a linear data structure using LIFO order."
    t2 = "A stack is a linear data structure using LIFO order."
    t3 = "A stack pushes and pops elements in LIFO order."
    t4 = "Transmission Control Protocol manages network transport segments."

    v1 = svc.embed_text(t1)
    v2 = svc.embed_text(t2)
    v3 = svc.embed_text(t3)
    v4 = svc.embed_text(t4)

    # Identical texts must have identical embeddings (cosine similarity == 1.0)
    sim_identical = compute_cosine_similarity(v1, v2)
    assert pytest.approx(sim_identical, abs=1e-5) == 1.0

    # Semantically related texts sharing stack vocabulary must have high similarity
    sim_related = compute_cosine_similarity(v1, v3)
    # Dissimilar text (TCP) should have lower similarity
    sim_unrelated = compute_cosine_similarity(v1, v4)

    assert sim_related > sim_unrelated


def test_get_embedding_service_factory():
    """Verify factory returns BaseEmbeddingService conforming instance."""
    svc = get_embedding_service(use_mock=True)
    assert isinstance(svc, BaseEmbeddingService)
    assert svc.dimension == 768


def test_gemini_embedding_service_requires_api_key(monkeypatch):
    """Verify Gemini service raises meaningful error when API key is missing."""
    from src.config.settings import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    with pytest.raises(EmbeddingError) as exc_info:
        GeminiEmbeddingService(api_key=None)
    assert "API key is not configured" in str(exc_info.value)
