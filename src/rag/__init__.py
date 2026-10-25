"""Course-Grounded Retrieval-Augmented Generation (RAG) module for ExamTwin."""

from src.rag.prompt_builder import (
    PromptBuilder,
    SYSTEM_PROMPT_GROUNDED,
    build_grounded_prompt,
)
from src.rag.retriever import (
    RetrievedContextChunk,
    Retriever,
    RetrieverError,
)
from src.rag.rag_service import (
    RAGResponse,
    RAGService,
    SourceCitation,
    get_rag_service,
)

__all__ = [
    # Retriever
    "RetrievedContextChunk",
    "Retriever",
    "RetrieverError",
    # Prompt Builder
    "PromptBuilder",
    "SYSTEM_PROMPT_GROUNDED",
    "build_grounded_prompt",
    # RAG Service
    "RAGResponse",
    "RAGService",
    "SourceCitation",
    "get_rag_service",
]
