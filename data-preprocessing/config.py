# Central configuration for the A/L Science preprocessing pipeline.
#
# CURRENT SETUP:
#   - Ollama llama3          -> subtopic detection
#   - Ollama nomic-embed-text -> embeddings (768-dim)
#   - Pinecone               -> vector storage
#   - MySQL local            -> chunk metadata
#
# FUTURE (when images are added manually):
#   - Ollama moondream       -> equations + chemical structures
#   - Next.js public/images/ -> image storage

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()



# MySQL configurations
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "al_chatbot")

# Pinecone configurations
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "")
PINECONE_DIM = 768  # nomic-embed-text output dimension
PINECONE_METRIC = "cosine"

PINECONE_NAMESPACES = {
    "bio": "biology",
    "che": "chemistry",
    "phy": "physics",
}

# Ollama models configuration
OLLAMA_TEXT_MODEL = "llama3"  # subtopic detection
OLLAMA_EMBED_MODEL = "nomic-embed-text"  # embeddings
EMBEDDING_BATCH_SIZE = 32  # log progress every N chunks

# PDF naming convention
SUBJECT_PREFIXES = ["bio", "che", "phy"]

# Paths (auto-created on startup)
PDF_DIR = Path("pdfs")  # All PDF files here
OUTPUT_DIR = Path("output")  # JSON chunk backups
CACHE_DIR = Path("cache")  # Ollama response cache
LOG_DIR = Path("logs")

for _d in [PDF_DIR, OUTPUT_DIR, CACHE_DIR, LOG_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# Chunking
CHUNK_SIZE = 600  # target tokens per chunk
CHUNK_OVERLAP = 80  # overlap tokens between chunks
MIN_CHUNK_LENGTH = 80  # discard chunks shorter than this (characters)

# Subtopic heading patterns (fallback if Ollama JSON fails)
HEADING_PATTERNS = [
    r"^\d+\.\d+\s+[A-Z]",  # 1.2 Some Heading
    r"^\d+\.\s+[A-Z]",  # 1. Some Heading
    r"^[A-Z][A-Z\s\-]{4,}$",  # ALL CAPS HEADING
    r"^[A-Z][a-zA-Z\s\-]{3,40}$",  # Short Titles
]
