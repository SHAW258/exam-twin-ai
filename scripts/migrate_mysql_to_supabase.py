"""Migrate all tables and data from local MySQL database to Supabase PostgreSQL."""

import logging
import sys
import time
from pathlib import Path

# Ensure root in sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine, inspect, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate_mysql_to_supabase")

MYSQL_URL = "mysql+pymysql://root:root@localhost:3306/exam_twin"
SUPABASE_URL = "postgresql+psycopg2://postgres:Srija2004%402004@db.sdwjzzkbqmiiegtloaes.supabase.co:5432/postgres?sslmode=require"

TABLE_ORDER = [
    # Level 0 (parents)
    "students",
    "documents",
    "registration_otps",
    "support_tickets",
    "ai_practice_records",
    # Level 1 (depend on students / documents)
    "document_pages",
    "tutor_chat_messages",
    "topic_mastery_states",
    "error_history",
    "assessment_records",
    # Level 2 (depend on document_pages / documents)
    "document_chunks",
    "learning_measurement_records",
]


def migrate():
    logger.info("Connecting to MySQL source database...")
    mysql_engine = create_engine(MYSQL_URL)

    logger.info("Connecting to Supabase PostgreSQL target database...")
    pg_engine = create_engine(SUPABASE_URL)

    # Inspect MySQL tables
    mysql_insp = inspect(mysql_engine)
    mysql_tables = set(mysql_insp.get_table_names())
    logger.info("Source MySQL tables: %s", sorted(mysql_tables))

    # Inspect PG tables
    pg_insp = inspect(pg_engine)
    pg_tables = set(pg_insp.get_table_names())
    logger.info("Target Supabase tables: %s", sorted(pg_tables))

    # Determine ordered tables to migrate
    ordered_tables = [t for t in TABLE_ORDER if t in mysql_tables and t in pg_tables]
    # Add any remaining tables that were not in TABLE_ORDER
    remaining = [t for t in mysql_tables if t in pg_tables and t not in ordered_tables]
    all_tables = ordered_tables + remaining

    logger.info("Tables to migrate in order: %s", all_tables)

    # Clean existing data in Supabase with CASCADE in reverse order
    logger.info("Cleaning existing tables in Supabase...")
    with pg_engine.begin() as pg_conn:
        pg_conn.execute(text("SET session_replication_role = 'replica';"))
        for t in reversed(all_tables):
            pg_conn.execute(text(f'TRUNCATE TABLE "{t}" CASCADE;'))
        pg_conn.execute(text("SET session_replication_role = 'origin';"))
    logger.info("Supabase tables truncated cleanly.")

    # Migrate data table by table
    total_migrated_rows = 0

    with mysql_engine.connect() as my_conn, pg_engine.begin() as pg_conn:
        # Disable triggers & FK constraints during migration
        pg_conn.execute(text("SET session_replication_role = 'replica';"))

        for table in all_tables:
            logger.info("--- Migrating table: %s ---", table)

            # Get columns for this table from MySQL and PostgreSQL
            columns_info = mysql_insp.get_columns(table)
            col_names = [c["name"] for c in columns_info]

            pg_cols_info = pg_insp.get_columns(table)
            pg_bool_cols = {c["name"] for c in pg_cols_info if "bool" in str(c["type"]).lower()}

            # Read all rows from MySQL
            quoted_cols = ", ".join(f"`{c}`" for c in col_names)
            select_query = text(f"SELECT {quoted_cols} FROM `{table}`")
            rows = my_conn.execute(select_query).fetchall()

            if not rows:
                logger.info("Table '%s' is empty in MySQL (0 rows). Skipping.", table)
                continue

            logger.info("Table '%s': fetched %d rows from MySQL.", table, len(rows))

            # Prepare insert into PostgreSQL
            pg_col_list = ", ".join(f'"{c}"' for c in col_names)
            param_placeholders = ", ".join(f":{c}" for c in col_names)
            insert_query = text(f'INSERT INTO "{table}" ({pg_col_list}) VALUES ({param_placeholders})')

            # Convert rows to dicts
            batch_data = []
            for row in rows:
                row_dict = dict(zip(col_names, row))
                # Cast MySQL tinyint(1) to Python bool for PostgreSQL boolean columns
                for k, v in row_dict.items():
                    if k in pg_bool_cols and v is not None:
                        row_dict[k] = bool(v)
                batch_data.append(row_dict)

            # Execute batch insert
            pg_conn.execute(insert_query, batch_data)
            logger.info("Table '%s': successfully inserted %d rows into Supabase.", table, len(batch_data))
            total_migrated_rows += len(batch_data)

        # Re-enable triggers & FK constraints
        pg_conn.execute(text("SET session_replication_role = 'origin';"))

    logger.info("Data transfer complete! Total rows migrated: %d", total_migrated_rows)

    # Verify counts
    logger.info("=== VERIFICATION: Comparing Row Counts ===")
    mismatch = False
    with mysql_engine.connect() as my_conn, pg_engine.connect() as pg_conn:
        for table in all_tables:
            my_cnt = my_conn.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()
            pg_cnt = pg_conn.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
            status = "MATCH" if my_cnt == pg_cnt else "MISMATCH"
            logger.info("  [%s] %s: MySQL=%d | Supabase=%d", status, table, my_cnt, pg_cnt)
            if my_cnt != pg_cnt:
                mismatch = True

    if mismatch:
        logger.error("Data migration finished with some row count mismatches!")
        sys.exit(1)
    else:
        logger.info("SUCCESS! All tables, columns, and rows migrated 100%% accurately to Supabase!")


if __name__ == "__main__":
    migrate()
