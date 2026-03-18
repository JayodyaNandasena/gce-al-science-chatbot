# Creates the Pinecone index (if it doesn't exist) and upserts all vectors.
# Generates the vector IDs that link Pinecone records ↔ MySQL rows.

import logging
import time

from pinecone import Pinecone, ServerlessSpec

from chunker import Chunk
from config import (
    PINECONE_API_KEY,
    PINECONE_INDEX,
    PINECONE_DIM,
    PINECONE_METRIC,
)

logger = logging.getLogger(__name__)

UPSERT_BATCH = 100  # Pinecone recommended upsert batch size

_pc = Pinecone(api_key=PINECONE_API_KEY)


def ensure_index() -> None:
    """Create the Pinecone index if it doesn't already exist."""
    existing = [idx.name for idx in _pc.list_indexes()]
    if PINECONE_INDEX in existing:
        logger.info(f"  Pinecone index '{PINECONE_INDEX}' already exists.")
        return

    logger.info(f"  Creating Pinecone index '{PINECONE_INDEX}'…")
    _pc.create_index(
        name=PINECONE_INDEX,
        dimension=PINECONE_DIM,
        metric=PINECONE_METRIC,
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

    # Wait until the index is ready
    for _ in range(30):
        status = _pc.describe_index(PINECONE_INDEX).status
        if status.get("ready"):
            break
        logger.info("  Waiting for index to be ready…")
        time.sleep(5)

    logger.info("  Index ready.")


def make_vector_id(chunk: Chunk, global_index: int) -> str:
    """
    Generate a stable, readable vector ID.

    Format:  {subject_prefix}-u{unit}-p{page}-{index:04d}
    Example: bio-u2-p34-0042

    This exact ID is stored in both Pinecone and MySQL (chunks table)
    to link the two records together.
    """
    return (
        f"{chunk.subject[:3]}-"
        f"u{chunk.unit_number}-"
        f"p{chunk.page_start}-"
        f"{global_index:04d}"
    )


def upsert_chunks(
        chunks: list[Chunk],
        embeddings: list[list[float]],
) -> tuple[int, list[str]]:
    assert len(chunks) == len(embeddings), \
        "chunks and embeddings must have the same length"

    index = _pc.Index(PINECONE_INDEX)
    vector_ids = [make_vector_id(c, i) for i, c in enumerate(chunks)]

    # Group by namespace so we upsert into the correct subject namespace
    by_ns: dict[str, list[tuple[int, Chunk, list[float]]]] = {}
    for i, (chunk, vec) in enumerate(zip(chunks, embeddings)):
        by_ns.setdefault(chunk.namespace, []).append((i, chunk, vec))

    total = 0

    for namespace, items in by_ns.items():
        logger.info(f"  Upserting {len(items)} vectors → namespace '{namespace}'…")

        vectors = [
            {
                "id": vector_ids[i],
                "values": vec,
                "metadata": chunk.to_pinecone_metadata(),
            }
            for i, chunk, vec in items
        ]

        for start in range(0, len(vectors), UPSERT_BATCH):
            batch = vectors[start: start + UPSERT_BATCH]
            index.upsert(vectors=batch, namespace=namespace)
            total += len(batch)

    logger.info(f"  Upserted {total} vectors to Pinecone.")
    return total, vector_ids
