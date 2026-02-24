from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
def home() -> str:
    return "<html><body><h1>News Nexus Python Queuer 01</h1></body></html>"


@router.api_route("/test", methods=["GET", "POST"])
async def test(request: Request) -> dict:
    try:
        body = await request.json()
        if isinstance(body, dict):
            return body
        return {}
    except Exception:
        return {}
