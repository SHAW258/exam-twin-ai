"""Schema initialization and migration management for CodeKnot relational store."""

import logging
import os
from typing import Optional, Union
from sqlalchemy import Engine, inspect, select, text

from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import Base
# Import domain models to ensure they are registered on Base.metadata
import src.learner_state.models  # noqa: F401
import src.learning_measurement.models  # noqa: F401

logger = logging.getLogger(__name__)


def _ensure_students_is_admin_column(engine: Engine) -> None:
    """Safely add `is_admin` column to existing `students` tables if missing."""
    try:
        inspector = inspect(engine)
        if "students" not in inspector.get_table_names():
            return
        existing_cols = {col["name"] for col in inspector.get_columns("students")}
        if "is_admin" not in existing_cols:
            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE students ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE")
                )
            logger.info("Migrated `students` table: added `is_admin` column.")
    except Exception as exc:
        logger.warning("Could not verify/add `is_admin` column on `students`: %s", exc)


def _ensure_tutor_chat_seq_column(engine: Engine) -> None:
    """Safely add monotonic `seq` column to existing `tutor_chat_messages` tables if missing."""
    try:
        inspector = inspect(engine)
        if "tutor_chat_messages" not in inspector.get_table_names():
            return
        existing_cols = {col["name"] for col in inspector.get_columns("tutor_chat_messages")}
        if "seq" not in existing_cols:
            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE tutor_chat_messages ADD COLUMN seq INTEGER NOT NULL DEFAULT 0")
                )
            logger.info("Migrated `tutor_chat_messages` table: added `seq` column.")
    except Exception as exc:
        logger.warning("Could not verify/add `seq` column on `tutor_chat_messages`: %s", exc)


def ensure_default_admin(target: Optional[DatabaseManager] = None) -> None:
    """Ensure a default platform administrator account exists in the `students` table."""
    from src.api.auth import hash_password
    from src.learner_state.models import Student

    db_mgr = target or get_db_manager()
    admin_username = os.getenv("CODEKNOT_ADMIN_USERNAME", "admin").strip()
    admin_email = os.getenv("CODEKNOT_ADMIN_EMAIL", "admin@codeknot.ai").strip().lower()
    admin_password = os.getenv("CODEKNOT_ADMIN_PASSWORD", "Admin1234")
    admin_full_name = os.getenv("CODEKNOT_ADMIN_NAME", "CodeKnot Administrator").strip()

    try:
        with db_mgr.get_session() as session:
            existing = session.execute(
                select(Student).where(
                    (Student.external_student_id == admin_username)
                    | (Student.email == admin_email)
                )
            ).scalars().first()

            if existing is None:
                admin_user = Student(
                    external_student_id=admin_username,
                    email=admin_email,
                    full_name=admin_full_name,
                    hashed_password=hash_password(admin_password),
                    is_active=True,
                    is_admin=True,
                )
                session.add(admin_user)
                logger.info("Seeded default admin account '%s' (%s).", admin_username, admin_email)
            else:
                changed = False
                if not getattr(existing, "is_admin", False):
                    existing.is_admin = True
                    changed = True
                if not existing.is_active:
                    existing.is_active = True
                    changed = True
                if not existing.hashed_password:
                    existing.hashed_password = hash_password(admin_password)
                    changed = True
                if changed:
                    logger.info("Updated existing admin account '%s' privileges.", existing.external_student_id)
    except Exception as exc:
        logger.warning("Could not ensure default admin account: %s", exc)


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
    _ensure_students_is_admin_column(engine)
    _ensure_tutor_chat_seq_column(engine)


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

    print("Initializing CodeKnot database tables...")
    try:
        create_tables()
        ensure_default_admin()
        print("Database schema successfully created and admin account verified.")
    except Exception as exc:
        print(f"Error initializing schema: {exc}", file=sys.stderr)
        sys.exit(1)
