"""Database models, connection pooling, and schema management for ExamTwin."""

from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import (
    AccessLevel,
    Base,
    Document,
    DocumentChunk,
    DocumentPage,
    ProcessingStatus,
)
from src.database.schema import create_tables, drop_tables

__all__ = [
    "AccessLevel",
    "Base",
    "DatabaseManager",
    "Document",
    "DocumentChunk",
    "DocumentPage",
    "ProcessingStatus",
    "create_tables",
    "drop_tables",
    "get_db_manager",
]
