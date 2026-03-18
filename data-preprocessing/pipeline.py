# Main entry point. Orchestrates the full preprocessing pipeline.
#
# ORDER OF OPERATIONS (per unit):
#   1. Extract text from PDF (PyMuPDF)
#   2. Detect subtopics (Ollama llama3)
#   3. Split text into chunks
#   4. Embed all chunks (Ollama nomic-embed-text)
#   5. Upsert vectors (Pinecone)
#   6. Save metadata (MySQL)
#
# USAGE:
#   python pipeline.py # process everything
#   python pipeline.py --dry-run # test without writing to Pinecone/MySQL
#   python pipeline.py --subjects bio --units 1 # process one unit
#   python pipeline.py --no-resume # reprocess already-done units

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

from chunker import chunk_unit, Chunk
from config import PDF_DIR, OUTPUT_DIR, LOG_DIR
from db import setup_database, save_chunks, mark_unit_done, is_unit_done
from embedder import embed_chunks
from extractor import load_all_pdfs, PDFUnit
from upserter import ensure_index, upsert_chunks


# Logging

def _setup_logging(verbose: bool) -> logging.Logger:
    level = logging.DEBUG if verbose else logging.INFO
    log_file = LOG_DIR / f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    logging.basicConfig(
        level=level,
        format="%(asctime)s  %(levelname)-8s  %(name)s -- %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )
    return logging.getLogger("pipeline")


# JSON backup

def _backup_path(unit: PDFUnit) -> Path:
    return OUTPUT_DIR / f"{unit.subject_prefix}_unit{unit.unit_number}_chunks.json"


def _save_backup(chunks: list[Chunk], unit: PDFUnit) -> None:
    _backup_path(unit).write_text(
        json.dumps([c.to_dict() for c in chunks], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _load_backup(unit: PDFUnit) -> list[Chunk] | None:
    """Load chunks from JSON backup if it exists — skips re-running Ollama."""
    path = _backup_path(unit)
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return [
        Chunk(
            content=d["content"],
            content_type=d["content_type"],
            subject=d["subject"],
            unit_number=d["unit_number"],
            subtopic=d["subtopic"],
            source_file=d["source_file"],
            page_start=d["page_start"],
            page_end=d["page_end"],
            namespace=d["namespace"],
            latex=d.get("latex", ""),
            caption=d.get("caption", ""),
            image_url=d.get("image_url", ""),
        )
        for d in data
    ]


# Stats

class _Stats:
    def __init__(self):
        self.processed = 0
        self.skipped = 0
        self.chunks = 0
        self.upserted = 0
        self.errors: list[str] = []

    def print(self, log: logging.Logger) -> None:
        log.info("=" * 50)
        log.info("PIPELINE COMPLETE")
        log.info("=" * 50)
        log.info(f"  Units processed : {self.processed}")
        log.info(f"  Units skipped   : {self.skipped}  (already done)")
        log.info(f"  Total chunks    : {self.chunks}")
        log.info(f"  Vectors upserted: {self.upserted}")
        if self.errors:
            log.warning(f"  Errors ({len(self.errors)}):")
            for e in self.errors:
                log.warning(f"    * {e}")
        log.info("=" * 50)


# Pipeline

def run(
        pdf_dir: Path = PDF_DIR,
        resume: bool = True,
        dry_run: bool = False,
        verbose: bool = False,
        subjects: list[str] | None = None,
        units: list[int] | None = None,
) -> _Stats:
    log = _setup_logging(verbose)
    stats = _Stats()

    log.info("=" * 50)
    log.info("A/L Science Chatbot -- Preprocessing Pipeline")
    log.info("=" * 50)
    log.info(f"  PDF folder : {pdf_dir.resolve()}")
    log.info(f"  Resume     : {resume}")
    log.info(f"  Dry run    : {dry_run}")
    if subjects: log.info(f"  Subjects   : {subjects}")
    if units:    log.info(f"  Units      : {units}")
    log.info("")

    # Infrastructure
    if not dry_run:
        log.info("Setting up infrastructure...")
        setup_database()
        ensure_index()
        log.info("")

    # Load PDFs
    log.info("Loading PDFs...")
    try:
        all_units = load_all_pdfs(pdf_dir)
    except FileNotFoundError as e:
        log.error(str(e))
        sys.exit(1)

    if subjects:
        all_units = [u for u in all_units if u.subject_prefix in subjects]
    if units:
        all_units = [u for u in all_units if u.unit_number in units]

    log.info(f"  {len(all_units)} unit(s) to process.\n")

    # Process each unit
    for i, unit in enumerate(all_units, 1):
        label = (f"[{i}/{len(all_units)}] "
                 f"{unit.subject.capitalize()} Unit {unit.unit_number}")
        log.info(label)

        # Resume check
        if resume and not dry_run and is_unit_done(unit.subject, unit.unit_number):
            log.info("  Already processed -- skipping.\n")
            stats.skipped += 1
            continue

        # Load from JSON backup if it exists (skips Ollama re-processing)
        chunks = _load_backup(unit)
        if chunks:
            log.info(f"  Loaded {len(chunks)} chunks from JSON backup")
        else:
            try:
                chunks = chunk_unit(unit)
            except Exception as e:
                msg = f"Chunking failed: {e}"
                log.error(f"  ERROR: {msg}\n")
                stats.errors.append(f"{label}: {msg}")
                continue

            _save_backup(chunks, unit)
            log.info(f"  Backup saved -> {_backup_path(unit).name}")

        # Embed
        log.info(f"  Embedding {len(chunks)} chunks...")
        try:
            embeddings = embed_chunks(chunks)
        except Exception as e:
            msg = f"Embedding failed: {e}"
            log.error(f"  ERROR: {msg}\n")
            stats.errors.append(f"{label}: {msg}")
            continue

        if dry_run:
            log.info("  DRY RUN -- skipping Pinecone + MySQL writes.\n")
        else:
            # Upsert to Pinecone
            try:
                n_upserted, vector_ids = upsert_chunks(chunks, embeddings)
                stats.upserted += n_upserted
            except Exception as e:
                msg = f"Pinecone upsert failed: {e}"
                log.error(f"  ERROR: {msg}\n")
                stats.errors.append(f"{label}: {msg}")
                continue

            # Save to MySQL
            try:
                save_chunks(chunks, vector_ids)
                mark_unit_done(unit.subject, unit.unit_number,
                               unit.file_path.name, len(chunks))
            except Exception as e:
                msg = f"MySQL save failed: {e}"
                log.error(f"  ERROR: {msg}\n")
                stats.errors.append(f"{label}: {msg}")
                continue

        stats.processed += 1
        stats.chunks += len(chunks)
        log.info("")

    stats.print(log)
    return stats


# CLI

def main():
    parser = argparse.ArgumentParser(
        description="Preprocess A/L science PDFs into Pinecone vectors."
    )
    parser.add_argument("--pdf-dir", type=Path, default=PDF_DIR)
    parser.add_argument("--no-resume", action="store_true",
                        help="Reprocess even if unit was previously completed")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to Pinecone or MySQL")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--subjects", nargs="+", choices=["bio", "che", "phy"])
    parser.add_argument("--units", nargs="+", type=int)

    args = parser.parse_args()
    run(
        pdf_dir=args.pdf_dir,
        resume=not args.no_resume,
        dry_run=args.dry_run,
        verbose=args.verbose,
        subjects=args.subjects,
        units=args.units,
    )


if __name__ == "__main__":
    main()
