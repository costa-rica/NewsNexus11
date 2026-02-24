from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

from src.routes.deduper import router as deduper_router
from src.routes.index import router as index_router

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="NewsNexus Python Queuer", version="0.2.0")
app.include_router(index_router)
app.include_router(deduper_router)
