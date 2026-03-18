# MySQL operations for the preprocessing pipeline.
#
# The vector_id column links every MySQL row to its Pinecone vector.
#
# TABLES CREATED HERE:
#   chunks          — one row per chunk upserted to Pinecone
#   processed_units — tracks which PDF units are done (for resume support)


import logging

import mysql.connector

from chunker import Chunk
from config import MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE

logger = logging.getLogger(__name__)


# Connection

def _connect(with_db: bool = True):
    """Return a new MySQL connection. Set with_db=False to connect before the DB exists."""
    kwargs = dict(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
    )
    if with_db:
        kwargs["database"] = MYSQL_DATABASE
    return mysql.connector.connect(**kwargs)


# Schema

def setup_database() -> None:
    """
    Create the database and preprocessing tables if they don't exist.
    Safe to call multiple times — all statements use IF NOT EXISTS.
    """
    # First connect without specifying the database (it may not exist yet)
    conn = _connect(with_db=False)
    cursor = conn.cursor()

    statements = [
        f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}`",
        f"USE `{MYSQL_DATABASE}`",

        # One row per chunk upserted to Pinecone
        """
        CREATE TABLE IF NOT EXISTS chunks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vector_id VARCHAR(120)  NOT NULL UNIQUE,
            content TEXT NOT NULL,
            content_type VARCHAR(30) NOT NULL,
            subject VARCHAR(20) NOT NULL,
            unit_number INT OT NULL,
            subtopic VARCHAR(200) NOT NULL,
            source_file VARCHAR(200) NOT NULL,
            page_start INT NOT NULL,
            page_end INT NOT NULL,
            namespace VARCHAR(20) NOT NULL,
            latex TEXT,
            caption TEXT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_vector (vector_id),
            INDEX idx_subject (subject),
            INDEX idx_unit (subject, unit_number),
            INDEX idx_subtopic (subtopic(100))
        )
        """,

        # Tracks completed PDF units — used for resume on crash
        """
        CREATE TABLE IF NOT EXISTS processed_units (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subject VARCHAR(20) NOT NULL,
            unit_number INT NOT NULL,
            source_file VARCHAR(200) NOT NULL,
            chunk_count INT NOT NULL DEFAULT 0,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_unit (subject, unit_number)
        )
        """,
    ]

    for sql in statements:
        sql = sql.strip()
        if not sql:
            continue
        try:
            cursor.execute(sql)
        except Exception as e:
            if "already exists" not in str(e).lower():
                logger.warning(f"Schema warning: {e}")

    conn.commit()
    cursor.close()
    conn.close()
    logger.info(f"  MySQL database '{MYSQL_DATABASE}' ready.")


# Chunk operations

def save_chunks(chunks: list[Chunk], vector_ids: list[str]) -> int:
    """
    Insert chunk metadata into MySQL.
    vector_ids must be in the same order as chunks.
    Uses INSERT IGNORE so re-runs don't fail on duplicate vector_ids.
    Returns the number of rows inserted.
    """
    assert len(chunks) == len(vector_ids)

    conn = _connect()
    cursor = conn.cursor()

    sql = """
        INSERT IGNORE INTO chunks
            (vector_id, content, content_type, subject, unit_number,
             subtopic, source_file, page_start, page_end, namespace,
             latex, caption, image_url)
        VALUES
            (%s, %s, %s, %s, %s,
             %s, %s, %s, %s, %s,
             %s, %s, %s)
    """

    rows = [
        (
            vid,
            chunk.content,
            chunk.content_type,
            chunk.subject,
            chunk.unit_number,
            chunk.subtopic,
            chunk.source_file,
            chunk.page_start,
            chunk.page_end,
            chunk.namespace,
            chunk.latex or None,
            chunk.caption or None,
            chunk.image_url or None,
        )
        for chunk, vid in zip(chunks, vector_ids)
    ]

    cursor.executemany(sql, rows)
    conn.commit()
    inserted = cursor.rowcount
    cursor.close()
    conn.close()

    logger.info(f"  Saved {inserted} chunk rows to MySQL.")
    return inserted


# Processed unit tracking

def mark_unit_done(subject: str, unit_number: int,
                   source_file: str, chunk_count: int) -> None:
    """Record that a PDF unit has been fully processed."""
    conn = _connect()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO processed_units (subject, unit_number, source_file, chunk_count)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            chunk_count  = VALUES(chunk_count),
            source_file  = VALUES(source_file),
            processed_at = CURRENT_TIMESTAMP
        """,
        (subject, unit_number, source_file, chunk_count)
    )
    conn.commit()
    cursor.close()
    conn.close()


def is_unit_done(subject: str, unit_number: int) -> bool:
    """Return True if this unit is already in the processed_units table."""
    conn = _connect()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM processed_units WHERE subject = %s AND unit_number = %s",
        (subject, unit_number)
    )
    found = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return found
