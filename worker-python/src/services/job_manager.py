from __future__ import annotations

import os
import subprocess
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from pathlib import Path
from typing import Any


class JobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class JobRecord:
    id: int
    status: JobStatus
    created_at: str
    logs: list[str] = field(default_factory=list)
    report_id: int | None = None
    started_at: str | None = None
    completed_at: str | None = None
    exit_code: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    error: str | None = None
    process: subprocess.Popen[str] | None = None


class JobManager:
    def __init__(self) -> None:
        self.jobs: dict[int, JobRecord] = {}
        self.job_counter = 1
        self.lock = threading.Lock()

    def create_job(self, report_id: int | None = None) -> JobRecord:
        with self.lock:
            job_id = self.job_counter
            self.job_counter += 1
            job = JobRecord(
                id=job_id,
                status=JobStatus.PENDING,
                created_at=utc_now_iso(),
                report_id=report_id,
            )
            self.jobs[job_id] = job
            return job

    def get_job(self, job_id: int) -> JobRecord | None:
        return self.jobs.get(job_id)

    def list_jobs(self) -> list[dict[str, Any]]:
        return [
            {"jobId": job.id, "status": job.status, "createdAt": job.created_at}
            for job in self.jobs.values()
        ]

    def _deduper_command(self, report_id: int | None = None) -> list[str]:
        deduper_path = os.getenv("PATH_TO_MICROSERVICE_DEDUPER")
        python_venv = os.getenv("PATH_TO_PYTHON_VENV")

        if not deduper_path or not python_venv:
            raise RuntimeError("Missing environment variables for deduper or python venv")

        cmd = [
            f"{python_venv}/bin/python",
            f"{deduper_path}/src/main.py",
            "analyze_fast",
        ]
        if report_id is not None:
            cmd.extend(["--report-id", str(report_id)])

        return cmd

    def _run_deduper_job(self, job_id: int, report_id: int | None = None) -> None:
        job = self.get_job(job_id)
        if job is None:
            return

        try:
            job.status = JobStatus.RUNNING
            job.started_at = utc_now_iso()

            cmd = self._deduper_command(report_id=report_id)

            process = subprocess.Popen(cmd, text=True)
            job.process = process

            process.wait()
            job.stdout = "Process output streamed to terminal"
            job.stderr = "Process errors streamed to terminal"
            job.exit_code = process.returncode
            job.completed_at = utc_now_iso()

            if process.returncode == 0:
                job.status = JobStatus.COMPLETED
            else:
                job.status = JobStatus.FAILED

        except Exception as exc:  # pragma: no cover
            job.status = JobStatus.FAILED
            job.error = str(exc)
            job.completed_at = utc_now_iso()

    def start_deduper_job(self, job_id: int, report_id: int | None = None) -> None:
        thread = threading.Thread(target=self._run_deduper_job, args=(job_id, report_id))
        thread.daemon = True
        thread.start()

    def cancel_job(self, job_id: int) -> tuple[bool, str]:
        job = self.get_job(job_id)
        if job is None:
            return False, "Job not found"

        if job.status not in {JobStatus.PENDING, JobStatus.RUNNING}:
            return False, f"Cannot cancel job with status: {job.status}"

        try:
            if job.process is not None and job.process.poll() is None:
                job.process.terminate()
                time.sleep(1)
                if job.process.poll() is None:
                    job.process.kill()

            job.status = JobStatus.CANCELLED
            job.completed_at = utc_now_iso()
            return True, "Job cancelled successfully"
        except Exception as exc:
            return False, f"Failed to cancel job: {exc}"

    def health_summary(self) -> dict[str, Any]:
        deduper_path = os.getenv("PATH_TO_MICROSERVICE_DEDUPER")
        python_venv = os.getenv("PATH_TO_PYTHON_VENV")

        checks: dict[str, Any] = {
            "status": "healthy",
            "timestamp": utc_now_iso(),
            "environment": {
                "deduper_path_configured": bool(deduper_path),
                "python_venv_configured": bool(python_venv),
            },
            "jobs": {
                "total": len(self.jobs),
                "pending": len([j for j in self.jobs.values() if j.status == JobStatus.PENDING]),
                "running": len([j for j in self.jobs.values() if j.status == JobStatus.RUNNING]),
                "completed": len([j for j in self.jobs.values() if j.status == JobStatus.COMPLETED]),
                "failed": len([j for j in self.jobs.values() if j.status == JobStatus.FAILED]),
                "cancelled": len([j for j in self.jobs.values() if j.status == JobStatus.CANCELLED]),
            },
        }

        if deduper_path:
            checks["environment"]["deduper_path_exists"] = Path(deduper_path).exists()
            if not checks["environment"]["deduper_path_exists"]:
                checks["status"] = "unhealthy"

        return checks

    def cancel_all_active_jobs(self) -> list[int]:
        cancelled_jobs: list[int] = []

        for job in self.jobs.values():
            if job.status in {JobStatus.PENDING, JobStatus.RUNNING}:
                try:
                    if job.process is not None and job.process.poll() is None:
                        job.process.terminate()
                        time.sleep(0.5)
                        if job.process.poll() is None:
                            job.process.kill()

                    job.status = JobStatus.CANCELLED
                    job.completed_at = utc_now_iso()
                    cancelled_jobs.append(job.id)
                except Exception:
                    # Preserve Flask behavior: continue cancelling other jobs.
                    continue

        return cancelled_jobs

    def run_clear_table(self) -> dict[str, Any]:
        deduper_path = os.getenv("PATH_TO_MICROSERVICE_DEDUPER")
        python_venv = os.getenv("PATH_TO_PYTHON_VENV")

        if not deduper_path or not python_venv:
            raise RuntimeError("Missing environment variables for deduper or python venv")

        cancelled_jobs = self.cancel_all_active_jobs()

        cmd = [
            f"{python_venv}/bin/python",
            f"{deduper_path}/src/main.py",
            "clear_table",
            "-y",
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )

        response: dict[str, Any] = {
            "cleared": result.returncode == 0,
            "cancelledJobs": cancelled_jobs,
            "exitCode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "timestamp": utc_now_iso(),
        }

        if result.returncode != 0:
            response["error"] = "Clear table command failed"

        return response


job_manager = JobManager()
