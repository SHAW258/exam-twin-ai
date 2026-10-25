"""Database engine and session management using SQLAlchemy."""

from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.config.settings import get_settings


class DatabaseManager:
    """Manages database connection pools and scoped sessions."""

    def __init__(self, database_url: Optional[str] = None):
        """Initialize DatabaseManager with target connection URL.

        Args:
            database_url: Database connection string. If omitted, loaded from settings.
        """
        settings = get_settings()
        self.database_url = database_url or settings.DATABASE_URL
        self._engine: Optional[Engine] = None
        self._session_factory: Optional[sessionmaker] = None

    @property
    def engine(self) -> Engine:
        """Lazy-initialize and return the SQLAlchemy engine."""
        if self._engine is None:
            connect_args = {}
            engine_kwargs = {"pool_pre_ping": True}
            # For SQLite in-memory testing
            if self.database_url.startswith("sqlite"):
                connect_args["check_same_thread"] = False
                if ":memory:" in self.database_url:
                    from sqlalchemy.pool import StaticPool
                    engine_kwargs["poolclass"] = StaticPool

            self._engine = create_engine(
                self.database_url,
                connect_args=connect_args,
                **engine_kwargs,
            )
        return self._engine

    @property
    def session_factory(self) -> sessionmaker:
        """Return the configured session factory."""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,
            )
        return self._session_factory

    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """Provide a transactional session scope for database operations."""
        session: Session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def dispose(self) -> None:
        """Dispose of the connection pool."""
        if self._engine:
            self._engine.dispose()
            self._engine = None
            self._session_factory = None


# Default singleton instance
_default_db_manager: Optional[DatabaseManager] = None


def get_db_manager(database_url: Optional[str] = None) -> DatabaseManager:
    """Retrieve global database manager instance or create one for custom URL."""
    global _default_db_manager
    if database_url is not None:
        return DatabaseManager(database_url=database_url)
    if _default_db_manager is None:
        _default_db_manager = DatabaseManager()
    return _default_db_manager
