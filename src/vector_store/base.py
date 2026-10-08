"""VectorStore abstract interface for ExamTwin RAG retrieval.

Provides a database-agnostic interface enabling future substitution between
MySQL (application-side similarity) and PostgreSQL + pgvector (native vector similarity).
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DocumentChunkRecord(BaseModel):
    """Data transfer object representing a chunk stored in the vector store."""

    id: Optional[str] = Field(default=None, description="Unique chunk primary key.")
    document_id: str = Field(..., description="Parent document identifier.")
    page_id: Optional[str] = Field(default=None, description="Parent document page identifier.")
    page_number: int = Field(..., ge=1, description="1-indexed citation page number.")
    chunk_index: int = Field(..., ge=0, description="Sequential chunk index within document.")
    text: str = Field(..., min_length=1, description="Textual chunk content.")
    embedding: List[float] = Field(..., description="Dense float embedding vector.")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Grounding metadata (source filename, course info, etc.).",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk record to dictionary."""
        return self.model_dump()


class SearchResult(BaseModel):
    """Ranked retrieval result item containing chunk and cosine similarity score."""

    chunk_id: str = Field(..., description="Unique chunk identifier.")
    document_id: str = Field(..., description="Parent document identifier.")
    page_number: int = Field(..., ge=1, description="Citation page number.")
    chunk_index: int = Field(..., ge=0, description="Chunk sequence index.")
    text: str = Field(..., description="Retrieved chunk text.")
    similarity_score: float = Field(
        ...,
        description="Cosine similarity score bounded between -1.0 and 1.0 (typically 0.0 to 1.0).",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Provenance and citation metadata.",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert search result to dictionary."""
        return self.model_dump()


class VectorStore(ABC):
    """Abstract VectorStore contract implemented by backend storage engines."""

    @abstractmethod
    def add_chunks(self, chunks: List[DocumentChunkRecord]) -> int:
        """Store chunk records with their embeddings into the storage backend.

        Args:
            chunks: List of DocumentChunkRecord objects to persist.

        Returns:
            Number of successfully inserted chunks.
        """
        pass

    @abstractmethod
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        user_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
    ) -> List[SearchResult]:
        """Perform semantic similarity search with ownership and access boundaries.

        Args:
            query_embedding: Dense embedding vector of the search query.
            top_k: Maximum number of ranked results to return.
            user_id: Requesting user ID for ownership and access filtering.
            document_ids: Optional filter restricting search to specific document IDs.

        Returns:
            List of SearchResult objects ordered descending by similarity score.
        """
        pass

    @abstractmethod
    def delete_document(self, document_id: str) -> bool:
        """Delete a document and all associated chunks from the store.

        Args:
            document_id: Identifier of the document to remove.

        Returns:
            True if the document was found and removed, False otherwise.
        """
        pass

    @abstractmethod
    def get_document_chunks(self, document_id: str) -> List[DocumentChunkRecord]:
        """Retrieve all chunks belonging to a document ordered by chunk_index.

        Args:
            document_id: Target document identifier.

        Returns:
            List of DocumentChunkRecord items.
        """
        pass
