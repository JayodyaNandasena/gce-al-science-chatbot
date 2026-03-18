# All processing using local Ollama models.
# MODELS USED:
#   llama3      → subtopic detection from unit text  (text model)
#   moondream   → equation LaTeX extraction          (vision model, 1.7GB)
#   moondream   → chemical structure extraction      (vision model)
#
# IMAGE PROCESSING DECISION TREE:
#   1. Extract caption from PDF using PyMuPDF
#   2. Classify by caption keywords + heuristics
#      ├── diagram / graph / table  → use caption as content
#      ├── equation                 → moondream extracts LaTeX
#      ├── chemical_structure       → moondream extracts formula/reaction
#      └── decorative               → skip entirely
#
# ALL Ollama responses are cached to disk.
# Re-running the pipeline never calls Ollama twice for the same input.

import base64
import hashlib
import io
import json
import logging
import re

import fitz
import ollama
from PIL import Image

from config import (
    OLLAMA_TEXT_MODEL,
    CACHE_DIR,
    HEADING_PATTERNS,
)

logger = logging.getLogger(__name__)


# DISK CACHE  — avoids calling Ollama twice for the same prompt/image

def _cache_key(data: str | bytes) -> str:
    if isinstance(data, str):
        data = data.encode()
    return hashlib.md5(data).hexdigest()


def _read_cache(key: str) -> str | None:
    path = CACHE_DIR / f"{key}.txt"
    return path.read_text(encoding="utf-8") if path.exists() else None


def _write_cache(key: str, value: str) -> None:
    (CACHE_DIR / f"{key}.txt").write_text(value, encoding="utf-8")


# OLLAMA CALLERS

def _call_text(prompt: str, cache_id: str) -> str:
    """
    Call llama3 with a text prompt. Cached.
    Used only for subtopic detection (once per unit).
    """
    cached = _read_cache(cache_id)
    if cached is not None:
        logger.debug(f"Cache hit (text): {cache_id[:12]}…")
        return cached

    try:
        response = ollama.chat(
            model=OLLAMA_TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        result = response["message"]["content"].strip()
        _write_cache(cache_id, result)
        return result

    except Exception as e:
        raise RuntimeError(
            f"Ollama text call failed: {e}\n"
            f"  → Is Ollama running?   ollama serve\n"
            f"  → Is model installed?  ollama pull {OLLAMA_TEXT_MODEL}"
        )


def _call_vision(prompt: str, image_bytes: bytes, cache_id: str, OLLAMA_VISION_MODEL="moondream") -> str:
    """
    Call moondream with an image + prompt. Cached.
    Used for equations and chemical structures only.
    """
    cached = _read_cache(cache_id)
    if cached is not None:
        logger.debug(f"Cache hit (vision): {cache_id[:12]}…")
        return cached

    try:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        response = ollama.chat(
            model=OLLAMA_VISION_MODEL,
            messages=[{
                "role": "user",
                "content": prompt,
                "images": [b64],
            }],
        )
        result = response["message"]["content"].strip()
        _write_cache(cache_id, result)
        return result

    except Exception as e:
        raise RuntimeError(
            f"Ollama vision call failed: {e}\n"
            f"  → Is Ollama running?   ollama serve\n"
            f"  → Is model installed?  ollama pull {OLLAMA_VISION_MODEL}"
        )


def _clean_json(raw: str) -> str:
    """Strip markdown code fences that Ollama sometimes adds around JSON."""
    raw = re.sub(r"^```json\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"^```\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"```$", "", raw).strip()
    return raw


# 1. SUBTOPIC DETECTION  (llama3, text, once per unit)

def detect_subtopics(unit_text: str, subject: str, unit_number: int) -> list[dict]:
    """
    Ask llama3 to identify all subtopics/sections in the unit text
    Falls back to regex-based detection if Ollama returns invalid JSON.
    """
    text_sample = unit_text[:8000]  # llama3 comfortable context limit

    prompt = f"""You are a Sri Lanka A/L {subject} teacher analyzing a government textbook.

Below is text from Unit {unit_number}. Find ALL distinct subtopics/sections in order.

Heading formats used in these textbooks:
  - Numbered:  "1.2 Cell Division"  or  "3. Organic Chemistry"
  - ALL CAPS:  "MITOSIS AND MEIOSIS"
  - Bold line: Short standalone line like "Types of Epithelium" (no number)

For each subtopic provide:
  1. subtopic: concise name (e.g. "Mitosis")
  2. start_phrase: the EXACT first 8-10 words of that section in the text below

Reply ONLY with a valid JSON array. No explanation. No markdown fences.
[
  {{"subtopic": "name", "start_phrase": "exact first words"}},
  ...
]

TEXT:
{text_sample}"""

    cache_id = _cache_key(f"subtopic_{subject}_{unit_number}_{unit_text[:300]}")
    raw = _call_text(prompt, cache_id)
    raw = _clean_json(raw)

    # Extract JSON array even if llama3 added surrounding text
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        raw = match.group(0)

    try:
        subtopics = json.loads(raw)
        logger.info(f"  Detected {len(subtopics)} subtopics in {subject} unit {unit_number}")
        return subtopics
    except json.JSONDecodeError:
        logger.warning("  Ollama subtopic JSON failed — using regex fallback")
        return _regex_subtopics(unit_text, unit_number)


def _regex_subtopics(unit_text: str, unit_number: int) -> list[dict]:
    """
    Regex fallback for subtopic detection.
    Used when Ollama returns unparseable JSON.
    Covers all heading styles defined in HEADING_PATTERNS.
    """
    subtopics = []
    for line in unit_text.split("\n"):
        line = line.strip()
        if not line:
            continue
        for pattern in HEADING_PATTERNS:
            if re.match(pattern, line):
                subtopics.append({
                    "subtopic": line[:80],
                    "start_phrase": " ".join(line.split()[:10]),
                })
                break

    if not subtopics:
        # Ultimate fallback — treat entire unit as one subtopic
        return [{"subtopic": f"Unit {unit_number}", "start_phrase": ""}]

    logger.info(f"  Regex fallback found {len(subtopics)} subtopics")
    return subtopics


def assign_subtopic(text: str, subtopics: list[dict]) -> str:
    """
    Assign the most appropriate subtopic to a chunk of text.
    Matches by looking for the subtopic's start_phrase in the chunk.
    Falls back to the first subtopic if nothing matches.
    """
    if not subtopics:
        return "General"

    assigned = subtopics[0]["subtopic"]
    for entry in subtopics:
        phrase = entry.get("start_phrase", "").strip()
        if phrase and phrase[:20].lower() in text.lower():
            assigned = entry["subtopic"]

    return assigned


# 2. CAPTION EXTRACTION  (PyMuPDF, no model)

def extract_caption(fitz_page: fitz.Page, image_bbox: tuple) -> str:
    """
    Find the figure caption for an image by reading the text just below it
    (or just above if nothing is found below).

    Government textbooks have captions like:
        "Figure 1.2  Simple squamous epithelium"
        "Fig. 3.4 – Le Chatelier's Principle"

    This uses PyMuPDF's clipped text extraction — no model call needed.
    """
    x0, y0, x1, y1 = image_bbox

    # Search 70px below the image
    below_rect = fitz.Rect(x0 - 10, y1, x1 + 10, y1 + 70)
    text = re.sub(r"\s+", " ", fitz_page.get_text("text", clip=below_rect).strip())
    if _is_caption(text):
        return text

    # Search 40px above the image (some books put captions above)
    above_rect = fitz.Rect(x0 - 10, y0 - 40, x1 + 10, y0)
    text = re.sub(r"\s+", " ", fitz_page.get_text("text", clip=above_rect).strip())
    if _is_caption(text):
        return text

    return ""


def _is_caption(text: str) -> bool:
    """
    Return True if this text looks like a figure caption.
    Starts with Figure/Fig/Diagram/Table, or is a short line without a full stop.
    """
    if not text or len(text) < 4:
        return False
    if re.match(r"^(fig(ure)?\.?|diagram|chart|graph|photo|plate|table)\s",
                text.lower()):
        return True
    if len(text) < 80 and not text.endswith("."):
        return True
    return False


# 3. IMAGE CLASSIFICATION  (keyword + heuristic, no model)

def classify_image(caption: str, subject: str, image_bytes: bytes) -> str:
    """
    Classify an image into one of these categories using caption keywords
    and image size heuristics. No model call needed.

    Returns:
        "diagram"            → use caption as content
        "graph"              → use caption as content
        "table_image"        → use caption as content
        "equation"           → call moondream for LaTeX
        "chemical_structure" → call moondream for formula/reaction
        "decorative"         → skip entirely
    """
    cap = caption.lower()

    # Skip decorative images
    if any(k in cap for k in ["logo", "border", "header", "footer", "icon"]):
        return "decorative"

    # Table
    if re.search(r"\btable\b", cap):
        return "table_image"

    # Graph / chart / plot
    if re.search(r"\b(graph|chart|plot|curve|histogram)\b", cap):
        return "graph"

    # Chemistry structural formulas and reactions
    if subject == "chemistry" and re.search(
            r"\b(structure|formula|reaction|mechanism|isomer|bond|compound|"
            r"synthesis|ester|acid|alkene|alkane|alcohol|aromatic|benzene)\b", cap
    ):
        return "chemical_structure"

    # Equation — keyword match or wide/short image heuristic
    if _is_equation(image_bytes, caption):
        return "equation"

    # Default — diagram
    return "diagram"


def _is_equation(image_bytes: bytes, caption: str) -> bool:
    """
    Equations are usually:
      - Captioned "Equation X" or "Eq. X"
      - OR wide and short images (aspect ratio > 4:1, small total area)
    """
    if re.match(r"^eq(uation)?\.?\s*\d*$", caption.lower().strip()):
        return True
    try:
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        if h > 0 and (w / h) > 4 and (w * h) < 120_000:
            return True
    except Exception:
        pass
    return False


# 4. EQUATION EXTRACTION  (moondream vision)

def extract_equation(image_bytes: bytes, surrounding_text: str) -> dict:
    """
    Use moondream to extract a physics/chemistry equation as LaTeX
    and a plain English reading.

    Returns: {"latex": "$F = ma$", "plain": "Force equals mass times acceleration"}
    """
    prompt = (
        f'This image contains a physics or mathematics equation from a '
        f'Sri Lanka A/L textbook.\n'
        f'Context: "{surrounding_text[:200]}"\n\n'
        f'Extract:\n'
        f'1. LaTeX string for the equation\n'
        f'2. Plain English reading  (e.g. "Force equals mass times acceleration")\n\n'
        f'Reply ONLY as valid JSON — no explanation, no markdown:\n'
        f'{{"latex": "<latex>", "plain": "<plain english>"}}'
    )

    cache_id = _cache_key(b"eq_" + image_bytes)
    raw = _call_vision(prompt, image_bytes, cache_id)
    raw = _clean_json(raw)

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        raw = match.group(0)

    try:
        data = json.loads(raw)
        return {
            "latex": data.get("latex", ""),
            "plain": data.get("plain", ""),
        }
    except json.JSONDecodeError:
        return {"latex": "", "plain": raw}


# 5. CHEMICAL STRUCTURE EXTRACTION  (moondream vision)

def extract_chemical_structure(image_bytes: bytes, surrounding_text: str) -> dict:
    """
    Use moondream to extract a chemical structure or reaction diagram.

    Returns: {
        "formula":     "C6H6",
        "iupac":       "benzene",
        "description": "hexagonal ring structure with alternating double bonds",
        "reaction":    "C2H4 + H2 → C2H6  [Ni catalyst, 150°C]"
    }
    Use "" for fields that don't apply.
    """
    prompt = (
        f'This image shows a chemical structure or reaction from a '
        f'Sri Lanka A/L chemistry textbook.\n'
        f'Context: "{surrounding_text[:200]}"\n\n'
        f'Extract (use "" if not applicable):\n'
        f'- formula: molecular formula (e.g. C6H6)\n'
        f'- iupac: IUPAC name if identifiable\n'
        f'- description: brief description of the structure\n'
        f'- reaction: if it shows a reaction, write as '
        f'"Reactants → Products  [conditions]"\n\n'
        f'Reply ONLY as valid JSON — no explanation, no markdown:\n'
        f'{{"formula": "", "iupac": "", "description": "", "reaction": ""}}'
    )

    cache_id = _cache_key(b"chem_" + image_bytes)
    raw = _call_vision(prompt, image_bytes, cache_id)
    raw = _clean_json(raw)

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        raw = match.group(0)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"formula": "", "iupac": "", "description": raw, "reaction": ""}


# 6. UNIFIED IMAGE PROCESSOR  (main entry point called by chunker.py)
def process_image(
        image_bytes: bytes,
        fitz_page: fitz.Page,
        image_bbox: tuple,
        surrounding_text: str,
        subject: str,
        page_num: int,
) -> dict | None:
    """
    Full image processing pipeline for one image:
    Returns a dict ready to become a Chunk, or None if image should be skipped.
    The "image_url" field is left empty — filled in by image_uploader.py.
    """

    # Step 1 — caption
    caption = extract_caption(fitz_page, image_bbox)

    # Step 2 — classify
    try:
        category = classify_image(caption, subject, image_bytes)
    except Exception as e:
        logger.error(f"  Classification error on page {page_num}: {e}")
        return None

    if category == "decorative":
        return None

    logger.debug(f"  p{page_num}: [{category}] caption='{caption[:60]}'")

    # Step 3 — process
    try:

        # Diagram / Graph / Table
        if category in ("diagram", "graph", "table_image"):
            if caption:
                content = f"[{category.upper()}] {caption}"
            else:
                snippet = surrounding_text[:120].replace("\n", " ").strip()
                content = f"[{category.upper()}] Figure on page {page_num} — {snippet}"

            return {
                "content": content,
                "content_type": category,
                "latex": "",
                "caption": caption,
                "image_url": "",
            }

        # Equation  (moondream)
        elif category == "equation":
            data = extract_equation(image_bytes, surrounding_text)
            parts = []
            if caption:          parts.append(f"Caption: {caption}")
            if data["latex"]:    parts.append(f"LaTeX: {data['latex']}")
            if data["plain"]:    parts.append(f"Plain: {data['plain']}")
            content = "[EQUATION] " + " | ".join(parts)

            return {
                "content": content,
                "content_type": "equation",
                "latex": data["latex"],
                "caption": caption,
                "image_url": "",
            }

        # Chemical Structure  (moondream)
        elif category == "chemical_structure":
            data = extract_chemical_structure(image_bytes, surrounding_text)
            parts = []
            if caption:                  parts.append(f"Caption: {caption}")
            if data.get("formula"):      parts.append(f"Formula: {data['formula']}")
            if data.get("iupac"):        parts.append(f"IUPAC: {data['iupac']}")
            if data.get("description"):  parts.append(f"Structure: {data['description']}")
            if data.get("reaction"):     parts.append(f"Reaction: {data['reaction']}")
            content = "[CHEMICAL STRUCTURE] " + " | ".join(parts)

            return {
                "content": content,
                "content_type": "chemical_structure",
                "latex": "",
                "caption": caption,
                "image_url": "",
            }

    except Exception as e:
        logger.error(f"  process_image ({category}) failed on page {page_num}: {e}")
        return None

    return None
