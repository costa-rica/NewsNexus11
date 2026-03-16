from __future__ import annotations

import json
import os
from collections.abc import Callable
from dataclasses import asdict
from pathlib import Path
from threading import Lock

from src.modules.queue.errors import QueueStoreError
from src.modules.queue.types import QueueJobRecord, QueueJobStatus, QueueJobStoreData


def _parse_job_status(value: object) -> QueueJobStatus:
    if not isinstance(value, str):
        raise QueueStoreError("Queue job record status is invalid")

    try:
        return QueueJobStatus(value)
    except ValueError as exc:
        raise QueueStoreError("Queue job record status is invalid") from exc


def _parse_job_record(value: object) -> QueueJobRecord:
    if not isinstance(value, dict):
        raise QueueStoreError("Queue job record must be an object")

    job_id = value.get("jobId")
    endpoint_name = value.get("endpointName")
    status = value.get("status")
    created_at = value.get("createdAt")
    started_at = value.get("startedAt")
    ended_at = value.get("endedAt")
    failure_reason = value.get("failureReason")
    logs = value.get("logs", [])
    parameters = value.get("parameters")
    result = value.get("result")

    if not isinstance(job_id, str) or job_id.strip() == "":
        raise QueueStoreError("Queue job record jobId must be a non-empty string")
    if not isinstance(endpoint_name, str) or endpoint_name.strip() == "":
        raise QueueStoreError("Queue job record endpointName must be a non-empty string")
    if not isinstance(created_at, str) or created_at.strip() == "":
        raise QueueStoreError("Queue job record createdAt must be a non-empty string")
    if started_at is not None and not isinstance(started_at, str):
        raise QueueStoreError("Queue job record startedAt must be a string when provided")
    if ended_at is not None and not isinstance(ended_at, str):
        raise QueueStoreError("Queue job record endedAt must be a string when provided")
    if failure_reason is not None and not isinstance(failure_reason, str):
        raise QueueStoreError("Queue job record failureReason must be a string when provided")
    if not isinstance(logs, list) or not all(isinstance(line, str) for line in logs):
        raise QueueStoreError("Queue job record logs must be an array of strings")
    if parameters is not None and not isinstance(parameters, dict):
        raise QueueStoreError("Queue job record parameters must be an object when provided")
    if result is not None and not isinstance(result, dict):
        raise QueueStoreError("Queue job record result must be an object when provided")

    return QueueJobRecord(
        jobId=job_id,
        endpointName=endpoint_name,
        status=_parse_job_status(status),
        createdAt=created_at,
        startedAt=started_at,
        endedAt=ended_at,
        failureReason=failure_reason,
        logs=logs,
        parameters=parameters,
        result=result,
    )


def _parse_store_data(raw_value: object) -> QueueJobStoreData:
    if not isinstance(raw_value, dict):
        raise QueueStoreError("Queue job store must be an object")

    raw_jobs = raw_value.get("jobs")
    if not isinstance(raw_jobs, list):
        raise QueueStoreError("Queue job store must include jobs array")

    return QueueJobStoreData(jobs=[_parse_job_record(raw_job) for raw_job in raw_jobs])


class QueueJobStore:
    def __init__(self, file_path: Path) -> None:
        self._file_path = file_path
        self._lock = Lock()

    @property
    def file_path(self) -> Path:
        return self._file_path

    def ensure_initialized(self) -> None:
        with self._lock:
            self._ensure_store_file()

    def get_jobs(self) -> list[QueueJobRecord]:
        with self._lock:
            return list(self._read_store_from_disk().jobs)

    def get_job_by_id(self, job_id: str) -> QueueJobRecord | None:
        with self._lock:
            return next(
                (job for job in self._read_store_from_disk().jobs if job.jobId == job_id),
                None,
            )

    def append_job(self, job: QueueJobRecord) -> None:
        with self._lock:
            store_data = self._read_store_from_disk()
            store_data.jobs.append(job)
            self._write_store_to_disk(store_data)

    def update_job(
        self,
        job_id: str,
        updater: Callable[[QueueJobRecord], QueueJobRecord],
    ) -> QueueJobRecord | None:
        with self._lock:
            store_data = self._read_store_from_disk()
            for index, existing_job in enumerate(store_data.jobs):
                if existing_job.jobId != job_id:
                    continue

                updated_job = updater(existing_job)
                validated_job = _parse_job_record(asdict(updated_job))
                store_data.jobs[index] = validated_job
                self._write_store_to_disk(store_data)
                return validated_job

            return None

    def get_latest_job_by_endpoint_name(self, endpoint_name: str) -> QueueJobRecord | None:
        with self._lock:
            matching_jobs = [
                job
                for job in self._read_store_from_disk().jobs
                if job.endpointName == endpoint_name
            ]
            if not matching_jobs:
                return None

            return max(matching_jobs, key=lambda job: job.createdAt)

    def replace_jobs(self, jobs: list[QueueJobRecord]) -> None:
        with self._lock:
            self._write_store_to_disk(QueueJobStoreData(jobs=list(jobs)))

    def _ensure_store_file(self) -> None:
        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self._file_path.exists():
            self._write_store_to_disk(QueueJobStoreData())

    def _read_store_from_disk(self) -> QueueJobStoreData:
        self._ensure_store_file()

        try:
            raw_text = self._file_path.read_text(encoding="utf-8")
            parsed_value = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise QueueStoreError("Queue job store contains invalid JSON") from exc
        except OSError as exc:
            raise QueueStoreError(f"Failed to read queue job store: {exc}") from exc

        return _parse_store_data(parsed_value)

    def _write_store_to_disk(self, store_data: QueueJobStoreData) -> None:
        self._file_path.parent.mkdir(parents=True, exist_ok=True)

        temp_path = self._file_path.with_name(
            f"{self._file_path.name}.{os.getpid()}.{id(self)}.tmp"
        )
        payload = json.dumps(asdict(store_data), indent=2) + "\n"

        try:
            temp_path.write_text(payload, encoding="utf-8")
            temp_path.replace(self._file_path)
        except OSError as exc:
            raise QueueStoreError(f"Failed to write queue job store: {exc}") from exc


def create_queue_job_store(file_path: Path) -> QueueJobStore:
    return QueueJobStore(file_path=file_path)
