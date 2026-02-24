from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="NewsNexus Python Queuer", version="0.1.0")


@app.get("/")
def home() -> dict[str, str]:
    return {"service": "NewsNexus Python Queuer", "framework": "FastAPI"}


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
