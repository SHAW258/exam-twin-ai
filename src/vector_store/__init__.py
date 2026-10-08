"""Vector store abstraction and storage implementations for ExamTwin."""

from src.vector_store.base import (
    DocumentChunkRecord,
    SearchResult,
    VectorStore,
)
from src.vector_store.mysql_vector_store import (
    MySQLVectorStore,
    compute_cosine_similarity,
)

__all__ = [
    "DocumentChunkRecord",
    "MySQLVectorStore",
    "SearchResult",
    "VectorStore",
    "compute_cosine_similarity",
]
