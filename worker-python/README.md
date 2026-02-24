# NewsNexus Python Queuer (FastAPI)

This is the new FastAPI-based worker service for NewsNexus11.

## Current status

- FastAPI scaffold is initialized.
- Flask legacy service was moved to `worker-python-flask/`.
- Migration tasks are tracked in `docs/REQUIREMENTS_FASTAPI_TRANSITION_TODO.md`.

## Quick start

1. Create or reuse a virtual environment.
2. Install dependencies.
3. Run the API with Uvicorn.

```bash
cd worker-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 5000
```

## Endpoints currently implemented

- `GET /`
- `GET /health`

## Next work

- Implement deduper queue endpoints in FastAPI.
- Preserve request/response behavior needed by `api/` integration.
- Add tests and production run configuration.
