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

## Test setup

Install dev dependencies:

```bash
pip install -r requirements-dev.txt
```

Run tests:

```bash
make test
make test-fast
make test-contract
```

## Endpoints currently implemented

- `GET /`
- `GET /health`

## Next work

- Expand contract coverage for all edge cases in deduper routes.
- Add stronger unit test coverage for subprocess lifecycle paths.
- Finalize production run and deployment configuration.
