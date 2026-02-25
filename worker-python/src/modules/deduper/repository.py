"""Repository interface for deduper SQL operations.

Implementation arrives in Phase 3.
"""

from __future__ import annotations

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import DeduperDatabaseError


class DeduperRepository:
    def __init__(self, config: DeduperConfig) -> None:
        self.config = config

    def healthcheck(self) -> bool:
        """Basic repository wiring check for Phase 2 scaffolding."""
        if not self.config.sqlite_path:
            raise DeduperDatabaseError("Invalid sqlite path")
        return True
