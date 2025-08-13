## Running the Application

## Required Software

1. Python
2. Node.js
3. Docker and Docker Compose
4. [Poetry](https://python-poetry.org/docs/#installation)
5. Postgres libpq header files (e.g. `apt install libpq-dev` on Ubuntu, `brew install postgresql` on macOS)

### First-Time Setup

1. `cd` into `backend` and run `poetry install`.
2. `cd` into `frontend` and run `npm install`.

### Running the Application

1. From the root directory, run `docker compose up`.
2. In a separate terminal, `cd` into `backend` and run `poetry run uvicorn main:app --reload`.
3. In a separate terminal, `cd` into `frontend` and run `npm run dev`.

### Environment Variables

The frontend expects these environment variables, but sensible defaults are provided so you can skip this section for local development:

- `NEXT_PUBLIC_API_URL`: HTTP base URL for the backend (default: `http://localhost:8000`).
- `NEXT_PUBLIC_WS_URL`: WebSocket base URL for the backend (default: `ws://localhost:8000`).

To override, create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```
