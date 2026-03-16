from __future__ import annotations

from src.modules.queue.config import resolve_default_queue_store_path
from src.modules.queue.engine import GlobalQueueEngine
from src.modules.queue.store import QueueJobStore


global_queue_store = QueueJobStore(resolve_default_queue_store_path())
global_queue_engine = GlobalQueueEngine(global_queue_store)
