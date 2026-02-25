from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

from src.modules.deduper.config import validate_startup_env
from src.modules.deduper.logging_adapter import get_deduper_logger
from src.routes.deduper import router as deduper_router
from src.routes.index import router as index_router

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

startup_logger = get_deduper_logger(__name__)
try:
    validate_startup_env()
except Exception as exc:
    startup_logger.critical("event=startup_fatal error=%s", exc)
    raise SystemExit(1) from exc

app = FastAPI(title="NewsNexus Python Queuer", version="0.2.0")
app.include_router(index_router)
app.include_router(deduper_router)
