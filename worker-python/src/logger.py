"""Centralized Loguru logger configuration for worker-python.

Implements LOGGING_PYTHON_V06 requirements:
- Development: terminal only, DEBUG level
- Testing: terminal + file, INFO level, rotation, enqueue
- Production: file only, INFO level, rotation, enqueue
"""

from __future__ import annotations

import os
import sys

from loguru import logger

VALID_ENVIRONMENTS = {"development", "testing", "production"}

FORMAT_CONSOLE = (
    "{time:HH:mm:ss.SSS} | {level} | {module}:{function}:{line} | {message}"
)
FORMAT_FILE = (
    "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level} | {module}:{function}:{line} | {message}"
)


def _validate_env() -> tuple[str, str, str | None]:
    """Validate required env vars per LOGGING_PYTHON_V06. Returns (name_app, run_env, path_to_logs)."""
    name_app = os.getenv("NAME_APP", "").strip()
    run_environment = os.getenv("RUN_ENVIRONMENT", "").strip()

    errors: list[str] = []

    if not name_app:
        errors.append("NAME_APP is missing or empty")
    if not run_environment:
        errors.append("RUN_ENVIRONMENT is missing or empty")
    elif run_environment not in VALID_ENVIRONMENTS:
        errors.append(
            f"RUN_ENVIRONMENT='{run_environment}' is invalid. "
            f"Must be one of: {', '.join(sorted(VALID_ENVIRONMENTS))}"
        )

    path_to_logs: str | None = None
    if run_environment in {"testing", "production"}:
        path_to_logs = os.getenv("PATH_TO_LOGS", "").strip()
        if not path_to_logs:
            errors.append("PATH_TO_LOGS is required in testing/production")

    if errors:
        for err in errors:
            print(f"CRITICAL | {err}", file=sys.stderr)
        raise SystemExit(1)

    return name_app, run_environment, path_to_logs


def setup_logger() -> None:
    """Configure loguru sinks based on RUN_ENVIRONMENT."""
    name_app, run_environment, path_to_logs = _validate_env()

    logger.remove()

    default_mb = int(os.getenv("LOG_MAX_SIZE_IN_MB", "3"))
    default_files = int(os.getenv("LOG_MAX_FILES", "3"))
    rotation = f"{default_mb} MB"
    retention = default_files

    if run_environment == "development":
        logger.add(
            sys.stderr,
            format=FORMAT_CONSOLE,
            level="DEBUG",
            backtrace=True,
            diagnose=True,
        )

    elif run_environment == "testing":
        logger.add(
            sys.stderr,
            format=FORMAT_CONSOLE,
            level="INFO",
            backtrace=True,
            diagnose=True,
            enqueue=True,
        )
        logger.add(
            os.path.join(path_to_logs, f"{name_app}.log"),
            format=FORMAT_FILE,
            level="INFO",
            rotation=rotation,
            retention=retention,
            backtrace=True,
            diagnose=True,
            enqueue=True,
        )

    elif run_environment == "production":
        logger.add(
            os.path.join(path_to_logs, f"{name_app}.log"),
            format=FORMAT_FILE,
            level="INFO",
            rotation=rotation,
            retention=retention,
            backtrace=True,
            diagnose=True,
            enqueue=True,
        )

    _install_excepthook()


def _install_excepthook() -> None:
    """Install sys.excepthook to log uncaught exceptions before exit."""
    def _handle_exception(exc_type, exc_value, exc_traceback):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        logger.opt(exception=(exc_type, exc_value, exc_traceback)).critical(
            "Uncaught exception"
        )

    sys.excepthook = _handle_exception
