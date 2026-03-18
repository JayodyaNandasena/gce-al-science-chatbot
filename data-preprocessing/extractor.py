# Extracts raw text from each PDF unit using PyMuPDF.

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

from config import SUBJECT_PREFIXES, PINECONE_NAMESPACES

logger = logging.getLogger(__name__)


# Data classes

@dataclass
class ExtractedPage:
    page_num: int
    raw_text: str


@dataclass
class PDFUnit:
    file_path: Path
    subject: str  # "biology" | "chemistry" | "physics"
    subject_prefix: str  # "bio" | "che" | "phy"
    unit_number: int
    namespace: str  # Pinecone namespace (same as subject)
    pages: list[ExtractedPage] = field(default_factory=list)
    total_pages: int = 0


# Filename parser

def _parse_filename(path: Path) -> Optional[dict]:
    """
    Parse subject prefix and unit number from filename.
    Expected format: {prefix}_unit{n}.pdf   e.g. bio_unit1.pdf
    Returns None if filename doesn't match — file is skipped.
    """
    stem = path.stem.lower()
    pattern = rf"^({'|'.join(SUBJECT_PREFIXES)})_unit(\d+)$"
    m = re.match(pattern, stem)
    if not m:
        return None
    prefix = m.group(1)
    unit = int(m.group(2))
    return {
        "prefix": prefix,
        "unit_num": unit,
        "subject": PINECONE_NAMESPACES[prefix],
        "namespace": PINECONE_NAMESPACES[prefix],
    }


# Text cleaning

def _clean_text(raw: str) -> str:
    """Remove common PDF artefacts while preserving paragraph structure."""
    text = raw.replace("\f", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Join hyphenated words split across lines: "ther-\nmo" -> "thermo"
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    # Remove lines that are only a page number
    text = re.sub(r"^\s*\d{1,3}\s*$", "", text, flags=re.MULTILINE)
    return "\n".join(line.rstrip() for line in text.split("\n")).strip()


def _is_header_footer(page_height: float, bbox: tuple) -> bool:
    """Skip text blocks in the top 8% or bottom 8% of the page."""
    y0, y1 = bbox[1], bbox[3]
    return y1 < page_height * 0.08 or y0 > page_height * 0.92


# Core extractor

def extract_pdf(pdf_path: Path) -> Optional[PDFUnit]:
    """
    Extract all text from a single PDF unit file.
    Returns a PDFUnit, or None if the filename doesn't match the pattern.
    """
    meta = _parse_filename(pdf_path)
    if not meta:
        logger.warning(f"Skipping '{pdf_path.name}' — name must be like bio_unit1.pdf")
        return None

    doc = fitz.open(str(pdf_path))
    unit = PDFUnit(
        file_path=pdf_path,
        subject=meta["subject"],
        subject_prefix=meta["prefix"],
        unit_number=meta["unit_num"],
        namespace=meta["namespace"],
        total_pages=len(doc),
    )

    for page_index in range(len(doc)):
        fitz_page = doc[page_index]
        page_num = page_index + 1
        page_h = fitz_page.rect.height

        # Text extraction
        page_dict = fitz_page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
        text_blocks = []

        for block in page_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            if _is_header_footer(page_h, block["bbox"]):
                continue
            block_text = ""
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    block_text += span.get("text", "")
                block_text += "\n"
            text_blocks.append(block_text)

        raw_text = _clean_text("\n".join(text_blocks))

        unit.pages.append(ExtractedPage(
            page_num=page_num,
            raw_text=raw_text,
        ))

    doc.close()
    return unit


# Batch loader

def load_all_pdfs(pdf_dir: Path) -> list[PDFUnit]:
    """
    Load all valid PDF files from pdf_dir.
    Returns list of PDFUnit objects sorted by subject then unit number.
    """
    pdf_files = sorted(pdf_dir.glob("*.pdf"))
    if not pdf_files:
        raise FileNotFoundError(
            f"No PDF files found in '{pdf_dir.resolve()}'.\n"
            f"Place your PDFs there named like: bio_unit1.pdf, che_unit2.pdf"
        )

    units = []
    for pdf_path in pdf_files:
        print(f"  Reading: {pdf_path.name}")
        unit = extract_pdf(pdf_path)
        if unit:
            print(f"    ok {unit.subject.capitalize()} Unit {unit.unit_number}"
                  f" -- {unit.total_pages} pages")
            units.append(unit)

    units.sort(key=lambda u: (u.subject, u.unit_number))
    return units
