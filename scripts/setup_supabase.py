"""Supabase PostgreSQL connection tester and schema initialization utility.

Usage:
    python scripts/setup_supabase.py
    python scripts/setup_supabase.py --url "postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
"""

import argparse
import logging
from pathlib import Path
import sys
import time

# Ensure project root is in python path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from src.database.connection import DatabaseManager
from src.database.schema import create_tables, ensure_default_admin

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("setup_supabase")


def main():
    parser = argparse.ArgumentParser(description="Initialize and verify Supabase PostgreSQL database.")
    parser.add_argument(
        "--url",
        type=str,
        default=None,
        help="Supabase PostgreSQL connection URI. Defaults to DATABASE_URL in .env / settings.",
    )
    args = parser.parse_args()

    logger.info("Initializing DatabaseManager for Supabase...")
    db_mgr = DatabaseManager(database_url=args.url)

    logger.info("Testing connection to target database...")
    start_time = time.time()
    try:
        with db_mgr.get_session() as session:
            result = session.execute(text("SELECT version(), current_database(), current_user;")).fetchone()
            latency = (time.time() - start_time) * 1000
            logger.info("Connection successful! Latency: %.1fms", latency)
            logger.info("Database: %s | User: %s", result[1], result[2])
            logger.info("Postgres Version: %s", result[0])
    except Exception as exc:
        logger.error("Failed to connect to Supabase database: %s", exc)
        logger.error(
            "\nTips for Supabase connections:\n"
            "1. If using the Connection Pooler (recommended for cloud/Render): port 6543 (transaction) or 5432 (session)\n"
            "   Format: postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require\n"
            "2. If using Direct Connection: port 5432\n"
            "   Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require\n"
            "3. If your password has special characters (e.g. $, @, #, %, +), ensure they are URL-encoded."
        )
        sys.exit(1)

    logger.info("Creating relational database tables...")
    try:
        create_tables(db_mgr)
        logger.info("All database tables created or confirmed.")
    except Exception as exc:
        logger.error("Failed to create tables: %s", exc)
        sys.exit(1)

    logger.info("Ensuring default platform admin account...")
    try:
        ensure_default_admin(db_mgr)
        logger.info("Default administrator account verified.")
    except Exception as exc:
        logger.error("Failed to seed admin account: %s", exc)
        sys.exit(1)

    logger.info("Supabase database setup is complete and fully operational!")


if __name__ == "__main__":
    main()
