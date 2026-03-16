from __future__ import annotations

from dataclasses import asdict, is_dataclass

from fastapi import APIRouter, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from src.modules.queue.engine import CancelJobResult
from src.modules.queue.global_queue import global_queue_engine

router = APIRouter(prefix="/queue-info", tags=["queue-info"])
queue_engine = global_queue_engine


def _to_jsonable(value: object) -> object:
    if is_dataclass(value):
        return jsonable_encoder(asdict(value))

    return jsonable_encoder(value)


@router.get("/check-status/{job_id}")
def check_status(job_id: str) -> JSONResponse:
    normalized_job_id = job_id.strip()
    if normalized_job_id == "":
        raise HTTPException(status_code=400, detail="jobId route parameter is required")

    job = queue_engine.get_check_status(normalized_job_id)
    if job is None:
        return JSONResponse({"error": f"Job not found: {normalized_job_id}"}, status_code=404)

    return JSONResponse({"job": _to_jsonable(job)}, status_code=200)


@router.get("/latest-job")
def latest_job(endpoint_name: str | None = Query(default=None, alias="endpointName")) -> JSONResponse:
    if endpoint_name is None or endpoint_name.strip() == "":
        return JSONResponse(
            {"error": "endpointName query parameter is required"},
            status_code=400,
        )

    job = queue_engine.get_latest_job_by_endpoint_name(endpoint_name.strip())
    return JSONResponse({"job": _to_jsonable(job)}, status_code=200)


@router.get("/queue-status")
def queue_status() -> JSONResponse:
    queue_status_view = queue_engine.get_queue_status_view()
    return JSONResponse(_to_jsonable(queue_status_view), status_code=200)


@router.post("/cancel-job/{job_id}")
def cancel_job(job_id: str) -> JSONResponse:
    normalized_job_id = job_id.strip()
    if normalized_job_id == "":
        raise HTTPException(status_code=400, detail="jobId route parameter is required")

    result: CancelJobResult = queue_engine.cancel_job(normalized_job_id)
    if result.outcome == "not_found":
        return JSONResponse({"error": f"Job not found: {normalized_job_id}"}, status_code=404)

    return JSONResponse(_to_jsonable(result), status_code=200)
