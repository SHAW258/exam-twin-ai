"""Pretrained embedding service module for ExamTwin."""

from src.embeddings.embedding_service import (
    BaseEmbeddingService,
    DeterministicMockEmbeddingService,
    EmbeddingError,
    GeminiEmbeddingService,
    get_embedding_service,
)

__all__ = [
    "BaseEmbeddingService",
    "DeterministicMockEmbeddingService",
    "EmbeddingError",
    "GeminiEmbeddingService",
    "get_embedding_service",
]
