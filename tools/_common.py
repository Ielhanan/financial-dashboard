"""
Shared utilities imported by all tool scripts.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Always load .env from the project root, regardless of where the script is run from
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


def require_env(*keys: str) -> dict:
    """
    Return a dict of {key: value} for each requested env var.
    Exits with a clear error if any are missing.
    """
    missing = [k for k in keys if not os.getenv(k)]
    if missing:
        print(f"[ERROR] Missing required environment variables: {', '.join(missing)}")
        print(f"        Set them in {ROOT / '.env'}")
        sys.exit(1)
    return {k: os.environ[k] for k in keys}


def tmp_path(filename: str) -> Path:
    """Return a path inside .tmp/, creating the directory if needed."""
    p = ROOT / ".tmp"
    p.mkdir(exist_ok=True)
    return p / filename
