"""Deduper-specific error types."""


class DeduperError(Exception):
    """Base exception for all deduper module errors."""


class DeduperConfigError(DeduperError):
    """Raised when deduper configuration is invalid or incomplete."""


class DeduperDatabaseError(DeduperError):
    """Raised for repository or SQLite related failures."""


class DeduperProcessorError(DeduperError):
    """Raised when a pipeline processor fails to execute."""
