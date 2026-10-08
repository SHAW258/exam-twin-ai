"""Schema initialization and migration management for ExamTwin relational store."""

from typing import Optional, Union
from sqlalchemy import Engine

from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import Base


def create_tables(target: Optional[Union[Engine, DatabaseManager]] = None) -> None:
    """Create all configured tables in the target database.

    Args:
        target: SQLAlchemy Engine or DatabaseManager instance. If None, default DB is used.
    """
    if target is None:
        db_mgr = get_db_manager()
        engine = db_mgr.engine
    elif isinstance(target, DatabaseManager):
        engine = target.engine
    else:
        engine = target

    Base.metadata.create_all(bind=engine)


def drop_tables(target: Optional[Union[Engine, DatabaseManager]] = None) -> None:
    """Drop all tables in the target database.

    Caution: This deletes all data. Used primarily in test suites and tear-downs.
    """
    if target is None:
        db_mgr = get_db_manager()
        engine = db_mgr.engine
    elif isinstance(target, DatabaseManager):
        engine = target.engine
    else:
        engine = target

    Base.metadata.drop_all(bind=engine)


if __name__ == "__main__":
    import sys

    print("Initializing ExamTwin database tables...")
    try:
        create_tables()
        print("Database schema successfully created.")
    except Exception as exc:
        print(f"Error initializing schema: {exc}", file=sys.stderr)
        sys.exit(1)
