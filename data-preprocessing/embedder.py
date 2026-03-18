# Generates embeddings using the local Ollama nomic-embed-text model.

import logging

import ollama

from chunker import Chunk
from config import OLLAMA_EMBED_MODEL, EMBEDDING_BATCH_SIZE

logger = logging.getLogger(__name__)


def embed_chunks(chunks: list[Chunk]) -> list[list[float]]:
    """
    Embed all chunks using local nomic-embed-text via Ollama.
    Returns 768-dim float vectors in the same order as input chunks.

    Prepends "search_document: " to each chunk so the model knows
    these are documents to be indexed (not queries).
    """
    all_embeddings: list[list[float]] = []

    for i, chunk in enumerate(chunks):
        # nomic-embed-text requires this prefix for document embedding
        prompt = f"search_document: {chunk.content}"
        response = ollama.embeddings(model=OLLAMA_EMBED_MODEL, prompt=prompt)
        all_embeddings.append(response["embedding"])

        if (i + 1) % EMBEDDING_BATCH_SIZE == 0 or (i + 1) == len(chunks):
            logger.debug(f"  Embedded {i + 1}/{len(chunks)} chunks")

    return all_embeddings


def embed_query(query: str) -> list[float]:
    """
    Embed a single query string.
    Prepends "search_query: " as required by nomic-embed-text.
    """
    prompt = f"search_query: {query}"
    response = ollama.embeddings(model=OLLAMA_EMBED_MODEL, prompt=prompt)
    return response["embedding"]
