"""MySQL implementation of the VectorStore interface using SQLAlchemy.

ACADEMIC & ARCHITECTURAL NOTE:
MySQL does not natively provide pgvector-style vector index types (e.g., HNSW or IVFFlat).
For this prototype, embeddings are persisted as JSON-encoded representations in MySQL.
Candidate chunks are retrieved using SQL metadata/access-control filters, and cosine
similarity ranking is computed in the application layer.

This implementation satisfies the VectorStore interface, allowing direct substitution
with PostgreSQL + pgvector in later production phases without rewriting the RAG layer.
"""

import json
import math
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import AccessLevel, Document, DocumentChunk
from src.vector_store.base import DocumentChunkRecord, SearchResult, VectorStore


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate the cosine similarity between two numeric vectors.

    cos_sim = (A · B) / (||A|| * ||B||)

    Args:
        vec_a: First float vector.
        vec_b: Second float vector.

    Returns:
        Cosine similarity bounded between -1.0 and 1.0 (or 0.0 if zero norm).
    """
    if len(vec_a) != len(vec_b) or not vec_a:
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a < 1e-12 or norm_b < 1e-12:
        return 0.0

    score = dot_product / (norm_a * norm_b)
    # Clamp for floating-point arithmetic edge cases
    return max(-1.0, min(1.0, score))


class MySQLVectorStore(VectorStore):
    """SQLAlchemy-backed VectorStore using MySQL relational storage and application-side ranking."""

    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        """Initialize MySQLVectorStore.

        Args:
            db_manager: Optional DatabaseManager instance. Defaults to global DB manager.
        """
        self.db_manager = db_manager or get_db_manager()

    def add_chunks(self, chunks: List[DocumentChunkRecord]) -> int:
        """Persist chunk records and their JSON-serialized embeddings into MySQL.

        Args:
            chunks: List of DocumentChunkRecord objects to store.

        Returns:
            Number of chunks successfully persisted.
        """
        if not chunks:
            return 0

        with self.db_manager.get_session() as session:
            count = 0
            for chunk_rec in chunks:
                chunk_id = chunk_rec.id or f"chunk_{uuid.uuid4().hex[:16]}"
                clean_text = (chunk_rec.text or "").replace("\x00", "")
                clean_metadata_str = json.dumps(chunk_rec.metadata or {}).replace("\\u0000", "")
                db_chunk = DocumentChunk(
                    id=chunk_id,
                    document_id=chunk_rec.document_id,
                    page_id=chunk_rec.page_id,
                    page_number=chunk_rec.page_number,
                    chunk_index=chunk_rec.chunk_index,
                    text=clean_text,
                    embedding=json.dumps(chunk_rec.embedding),
                    chunk_metadata=clean_metadata_str,
                )
                session.merge(db_chunk)
                count += 1
            return count

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        user_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
    ) -> List[SearchResult]:
        """Perform similarity search with user-ownership and document-level authorization filters.

        Filtering rules:
        1. A user can only access their own documents (owner_user_id == user_id)
           OR documents flagged as COURSE_SHARED.
        2. If user_id is None, only COURSE_SHARED documents are returned.
        3. If document_ids is specified, only chunks within those documents are considered.

        Candidate retrieval is executed in SQL, followed by application-layer cosine ranking.

        Args:
            query_embedding: Target vector for similarity comparison.
            top_k: Number of highest-ranked results to return.
            user_id: Requesting user ID for ownership checks.
            document_ids: Optional list of document IDs to constrain retrieval.

        Returns:
            List of SearchResult objects sorted descending by similarity score.
        """
        if not query_embedding or top_k <= 0:
            return []

        with self.db_manager.get_session() as session:
            # Query candidate chunks joined with their parent document for authorization
            query = select(DocumentChunk, Document).join(
                Document, DocumentChunk.document_id == Document.id
            )

            # Apply access control filters
            if user_id:
                query = query.where(
                    or_(
                        Document.owner_user_id == user_id,
                        Document.access_level == AccessLevel.COURSE_SHARED.value,
                    )
                )
            else:
                query = query.where(Document.access_level == AccessLevel.COURSE_SHARED.value)

            # Apply explicit document_id filter if provided
            if document_ids:
                query = query.where(DocumentChunk.document_id.in_(document_ids))

            results = session.execute(query).all()
            if not results:
                return []

            scored_candidates: List[Tuple[float, DocumentChunk]] = []

            for row in results:
                chunk: DocumentChunk = row[0]
                if not chunk.embedding:
                    continue

                try:
                    chunk_vec = json.loads(chunk.embedding)
                except Exception:
                    continue

                score = compute_cosine_similarity(query_embedding, chunk_vec)
                scored_candidates.append((score, chunk))

            # Rank candidates by descending cosine similarity
            scored_candidates.sort(key=lambda x: x[0], reverse=True)
            top_candidates = scored_candidates[:top_k]

            search_results: List[SearchResult] = []
            for score, chunk in top_candidates:
                metadata = chunk.metadata_dict
                if "document_id" not in metadata:
                    metadata["document_id"] = chunk.document_id
                if "page_number" not in metadata:
                    metadata["page_number"] = chunk.page_number

                search_results.append(
                    SearchResult(
                        chunk_id=chunk.id,
                        document_id=chunk.document_id,
                        page_number=chunk.page_number,
                        chunk_index=chunk.chunk_index,
                        text=chunk.text,
                        similarity_score=round(score, 4),
                        metadata=metadata,
                    )
                )

            return search_results

    def delete_document(self, document_id: str) -> bool:
        """Delete a document and all related pages and chunks via cascading delete.

        Args:
            document_id: Unique identifier of document to remove.

        Returns:
            True if found and deleted, False otherwise.
        """
        with self.db_manager.get_session() as session:
            doc = session.get(Document, document_id)
            if doc is None:
                return False
            session.delete(doc)
            return True

    def get_document_chunks(self, document_id: str) -> List[DocumentChunkRecord]:
        """Fetch all chunks for a document ordered by chunk_index.

        Args:
            document_id: Document ID.

        Returns:
            List of DocumentChunkRecord objects.
        """
        with self.db_manager.get_session() as session:
            query = (
                select(DocumentChunk)
                .where(DocumentChunk.document_id == document_id)
                .order_by(DocumentChunk.chunk_index)
            )
            chunks = session.execute(query).scalars().all()

            records: List[DocumentChunkRecord] = []
            for c in chunks:
                vec = c.embedding_vector or []
                records.append(
                    DocumentChunkRecord(
                        id=c.id,
                        document_id=c.document_id,
                        page_id=c.page_id,
                        page_number=c.page_number,
                        chunk_index=c.chunk_index,
                        text=c.text,
                        embedding=vec,
                        metadata=c.metadata_dict,
                    )
                )
            return records
