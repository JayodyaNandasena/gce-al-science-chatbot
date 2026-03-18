# Converts a PDFUnit into a flat list of text Chunks ready for embedding.
#
# For each unit:
#   1. Detect subtopics  (one llama3 call for the whole unit)
#   2. Split every page's text into overlapping chunks (~600 tokens each)
#   3. Assign each chunk its subtopic

import logging
import re
from dataclasses import dataclass

from config import CHUNK_SIZE, CHUNK_OVERLAP, MIN_CHUNK_LENGTH
from extractor import PDFUnit
from ollama_processor import detect_subtopics, assign_subtopic

logger = logging.getLogger(__name__)


# Chunk dataclass

@dataclass
class Chunk:
    """One unit of searchable text content."""
    content: str
    content_type: str
    subject: str
    unit_number: int
    subtopic: str
    source_file: str
    page_start: int
    page_end: int
    namespace: str
    latex: str = ""
    caption: str = ""
    image_url: str = ""

    def to_pinecone_metadata(self) -> dict:
        return {
            "content": self.content[:900],
            "content_type": self.content_type,
            "subject": self.subject,
            "unit_number": self.unit_number,
            "subtopic": self.subtopic,
            "source_file": self.source_file,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "latex": self.latex,
            "image_url": self.image_url,
        }

    def to_dict(self) -> dict:
        return {
            "content": self.content,
            "content_type": self.content_type,
            "subject": self.subject,
            "unit_number": self.unit_number,
            "subtopic": self.subtopic,
            "source_file": self.source_file,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "namespace": self.namespace,
            "latex": self.latex,
            "caption": self.caption,
            "image_url": self.image_url,
        }


# Helpers

def _approx_tokens(text: str) -> int:
    return len(text) // 4


def _split_sentences(text: str) -> list[str]:
    parts = []
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        for para in sentence.split("\n\n"):
            para = para.strip()
            if para:
                parts.append(para)
    return parts


def _chunk_text(text: str, page_num: int) -> list[tuple[str, int, int]]:
    """
    Split a page's text into overlapping chunks of ~CHUNK_SIZE tokens.
    Returns list of (chunk_text, page_start, page_end).
    """
    sentences = _split_sentences(text)
    chunks: list[tuple[str, int, int]] = []
    current: list[str] = []
    cur_tok = 0

    for sentence in sentences:
        s_tok = _approx_tokens(sentence)

        if cur_tok + s_tok > CHUNK_SIZE and current:
            text_out = " ".join(current).strip()
            if len(text_out) >= MIN_CHUNK_LENGTH:
                chunks.append((text_out, page_num, page_num))

            # Keep tail as overlap
            overlap: list[str] = []
            overlap_tok = 0
            for s in reversed(current):
                t = _approx_tokens(s)
                if overlap_tok + t <= CHUNK_OVERLAP:
                    overlap.insert(0, s)
                    overlap_tok += t
                else:
                    break
            current = overlap
            cur_tok = overlap_tok

        current.append(sentence)
        cur_tok += s_tok

    if current:
        text_out = " ".join(current).strip()
        if len(text_out) >= MIN_CHUNK_LENGTH:
            chunks.append((text_out, page_num, page_num))

    return chunks


# Main chunk builder

def chunk_unit(unit: PDFUnit) -> list[Chunk]:
    """
    Process one PDFUnit into a list of text Chunks.
    Step 1 - Detect subtopics  (one llama3 call for the whole unit)
    Step 2 - Split each page's text into overlapping chunks
    Step 3 - Assign each chunk its subtopic
    """
    all_chunks: list[Chunk] = []
    source_file = unit.file_path.name

    # Step 1: Subtopic detection
    full_text = "\n\n".join(
        p.raw_text for p in unit.pages if p.raw_text.strip()
    )
    logger.info("  Detecting subtopics...")
    subtopics = detect_subtopics(full_text, unit.subject, unit.unit_number)

    # Step 2 & 3: Text chunking
    logger.info("  Chunking text...")
    for page in unit.pages:
        if not page.raw_text.strip():
            continue
        for chunk_text, p_start, p_end in _chunk_text(page.raw_text, page.page_num):
            subtopic = assign_subtopic(chunk_text, subtopics)
            all_chunks.append(Chunk(
                content=chunk_text,
                content_type="text",
                subject=unit.subject,
                unit_number=unit.unit_number,
                subtopic=subtopic,
                source_file=source_file,
                page_start=p_start,
                page_end=p_end,
                namespace=unit.namespace,
            ))

    logger.info(f"  -> {len(all_chunks)} text chunks")
    return all_chunks
