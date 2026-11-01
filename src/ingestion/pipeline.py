"""Document Ingestion and Embedding Pipeline.

Orchestrates Phase 2 document loading, cleaning, and page-aware chunking with
Phase 3 embedding generation and vector storage.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Union

from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import AccessLevel, Document, DocumentPage, ProcessingStatus
from src.embeddings.embedding_service import BaseEmbeddingService, get_embedding_service
from src.ingestion.chunker import PageAwareChunker
from src.ingestion.pdf_loader import PDFLoader
from src.vector_store.base import DocumentChunkRecord, VectorStore
from src.vector_store.mysql_vector_store import MySQLVectorStore


class DocumentIngestionPipeline:
    """Orchestrates end-to-end PDF processing, chunking, embedding, and storage."""

    def __init__(
        self,
        db_manager: Optional[DatabaseManager] = None,
        embedding_service: Optional[BaseEmbeddingService] = None,
        vector_store: Optional[VectorStore] = None,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
    ):
        self.db_manager = db_manager or get_db_manager()
        self.embedding_service = embedding_service or get_embedding_service()
        self.vector_store = vector_store or MySQLVectorStore(db_manager=self.db_manager)
        self.loader = PDFLoader(preserve_empty_pages=True)
        self.chunker = PageAwareChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    def ingest_pdf(
        self,
        file_path: Union[str, Path],
        owner_user_id: str,
        document_id: Optional[str] = None,
        access_level: str = AccessLevel.PRIVATE.value,
        source_type: str = "PDF",
    ) -> Dict[str, Any]:
        """Process a PDF file and persist its pages, chunks, and embeddings.

        Args:
            file_path: Path to the target PDF.
            owner_user_id: User ID of the uploader/owner.
            document_id: Optional explicit identifier.
            access_level: 'PRIVATE' or 'COURSE_SHARED'.
            source_type: Document origin classification.

        Returns:
            Dictionary with document details, page count, and chunk count.
        """
        path = Path(file_path).resolve()
        doc_id = document_id or path.stem

        # Step 1: Initialize document record in database
        with self.db_manager.get_session() as session:
            doc = Document(
                id=doc_id,
                owner_user_id=owner_user_id,
                filename=path.name,
                original_filename=path.name,
                content_type="application/pdf",
                source_type=source_type,
                access_level=access_level,
                file_path=str(path),
                processing_status=ProcessingStatus.PROCESSING.value,
            )
            session.merge(doc)

        try:
            # Step 2: Extract pages using Phase 2 PDFLoader
            extracted_pages = self.loader.load(path, document_id=doc_id)

            # Step 3: Persist document pages
            page_id_map = {}
            with self.db_manager.get_session() as session:
                for p in extracted_pages:
                    db_page = DocumentPage(
                        document_id=doc_id,
                        page_number=p.page_number,
                        text=(p.text or "").replace("\x00", ""),
                    )
                    session.add(db_page)
                    session.flush()
                    page_id_map[p.page_number] = db_page.id

            # Step 4: Chunk pages using Phase 2 PageAwareChunker
            chunks = self.chunker.chunk_pages(extracted_pages)

            if chunks:
                # Step 5: Compute dense embeddings using Phase 3 EmbeddingService
                texts_to_embed = [c.text for c in chunks]
                embeddings = self.embedding_service.embed_texts(texts_to_embed)

                # Step 6: Create vector store chunk records
                chunk_records = []
                for chunk, emb in zip(chunks, embeddings):
                    clean_chunk_text = (chunk.text or "").replace("\x00", "")
                    clean_metadata = {
                        k: (v.replace("\x00", "") if isinstance(v, str) else v)
                        for k, v in (chunk.metadata or {}).items()
                    }
                    chunk_records.append(
                        DocumentChunkRecord(
                            document_id=doc_id,
                            page_id=page_id_map.get(chunk.page_number),
                            page_number=chunk.page_number,
                            chunk_index=chunk.chunk_index,
                            text=clean_chunk_text,
                            embedding=emb,
                            metadata=clean_metadata,
                        )
                    )

                # Step 7: Persist chunks via VectorStore interface
                self.vector_store.add_chunks(chunk_records)

            # Step 8: Update status to PROCESSED
            with self.db_manager.get_session() as session:
                doc = session.get(Document, doc_id)
                if doc:
                    doc.processing_status = ProcessingStatus.PROCESSED.value

            return {
                "document_id": doc_id,
                "owner_user_id": owner_user_id,
                "access_level": access_level,
                "status": ProcessingStatus.PROCESSED.value,
                "page_count": len(extracted_pages),
                "chunk_count": len(chunks),
            }

        except Exception as exc:
            # Mark processing as failed on error
            with self.db_manager.get_session() as session:
                doc = session.get(Document, doc_id)
                if doc:
                    doc.processing_status = ProcessingStatus.FAILED.value
            raise exc
