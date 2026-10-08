"""Retriever module for semantic context search in ExamTwin RAG.

Combines the EmbeddingService and abstract VectorStore to retrieve ranked,
authorized course/user document chunks matching student questions.
"""

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from src.config.settings import get_settings
from src.embeddings.embedding_service import BaseEmbeddingService
from src.vector_store.base import VectorStore

logger = logging.getLogger(__name__)


class RetrieverError(Exception):
    """Raised when question retrieval fails or inputs are invalid."""
    pass


class RetrievedContextChunk(BaseModel):
    """Structured representation of a retrieved citation-grounded document chunk."""

    document_id: str = Field(..., description="Parent document identifier.")
    page_number: int = Field(..., ge=1, description="1-indexed citation page number.")
    chunk_index: int = Field(..., ge=0, description="Chunk sequence index.")
    text: str = Field(..., min_length=1, description="Text content of the chunk.")
    similarity_score: float = Field(..., description="Cosine similarity score of chunk to question.")
    source: str = Field(..., description="Source document filename or identifier.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional provenance metadata.")

    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk to dictionary representation."""
        return self.model_dump()


class Retriever:
    """Orchestrates question embedding and authorized vector search."""

    def __init__(
        self,
        vector_store: VectorStore,
        embedding_service: BaseEmbeddingService,
        default_top_k: Optional[int] = None,
        default_min_similarity: Optional[float] = None,
    ):
        """Initialize Retriever with vector store and embedding service abstractions.

        Args:
            vector_store: VectorStore implementation (e.g., MySQLVectorStore).
            embedding_service: Pretrained embedding model service.
            default_top_k: Default number of chunks to return. If None, loaded from settings.
            default_min_similarity: Minimum similarity threshold. If None, loaded from settings.
        """
        settings = get_settings()
        self.vector_store = vector_store
        self.embedding_service = embedding_service
        self.default_top_k = default_top_k or settings.RAG_TOP_K
        self.default_min_similarity = (
            default_min_similarity if default_min_similarity is not None else settings.RAG_MIN_SIMILARITY
        )

    def retrieve(
        self,
        question: str,
        user_id: Optional[str] = None,
        top_k: Optional[int] = None,
        document_ids: Optional[List[str]] = None,
        min_similarity: Optional[float] = None,
    ) -> List[RetrievedContextChunk]:
        """Convert question to embedding and search the vector store for authorized chunks.

        Args:
            question: Student's query string.
            user_id: User identifier for authorization boundaries (private vs. shared).
            top_k: Maximum number of ranked chunks to return.
            document_ids: Optional filter restricting search to specific document IDs.
            min_similarity: Minimum cosine similarity required for a chunk to be retained.

        Returns:
            List of RetrievedContextChunk objects ordered descending by similarity score.

        Raises:
            RetrieverError: If question is empty or parameters are invalid.
        """
        if not question or not question.strip():
            raise RetrieverError("Question cannot be empty or whitespace-only.")

        k = top_k if top_k is not None else self.default_top_k
        if k <= 0:
            raise RetrieverError(f"top_k must be a positive integer, got {k}")

        threshold = min_similarity if min_similarity is not None else self.default_min_similarity

        # Step 1: Embed question using pretrained embedding service
        try:
            query_vector = self.embedding_service.embed_text(question.strip())
        except Exception as exc:
            raise RetrieverError(f"Failed to generate query embedding: {exc}") from exc

        # Step 2: Search vector store with ownership and access filters
        try:
            raw_results = self.vector_store.search(
                query_embedding=query_vector,
                top_k=k,
                user_id=user_id,
                document_ids=document_ids,
            )
        except Exception as exc:
            raise RetrieverError(f"Vector search failed: {exc}") from exc

        # Step 3: Filter by minimum similarity threshold and format structured context
        retrieved_chunks: List[RetrievedContextChunk] = []
        for res in raw_results:
            if res.similarity_score < threshold:
                continue

            source_name = res.metadata.get("source") or f"{res.document_id}.pdf"
            chunk_obj = RetrievedContextChunk(
                document_id=res.document_id,
                page_number=res.page_number,
                chunk_index=res.chunk_index,
                text=res.text,
                similarity_score=res.similarity_score,
                source=source_name,
                metadata=res.metadata,
            )
            retrieved_chunks.append(chunk_obj)

        logger.info(
            "Retrieved %d candidate chunks for query (threshold=%.2f, user_id=%s)",
            len(retrieved_chunks),
            threshold,
            user_id,
        )
        return retrieved_chunks
