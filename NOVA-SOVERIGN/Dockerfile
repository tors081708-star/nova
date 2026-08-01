# syntax=docker/dockerfile:1.6
# ---------------------------------------------------------------------------
# NOVA — Personal AI Assistant.
# Single container: Vite frontend built at stage 1, served by FastAPI at /.
# Bind only to 127.0.0.1 from docker-compose; this image listens on 0.0.0.0
# inside the container network.
# ---------------------------------------------------------------------------

# ============================ Stage 1: frontend ============================
FROM node:20-slim AS frontend
WORKDIR /fe

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY frontend/ ./
# Empty backend URL -> frontend calls /api relative to its own origin (same-origin).
ENV REACT_APP_BACKEND_URL=""
ENV VITE_BACKEND_URL=""
RUN yarn build

# ============================ Stage 2: backend =============================
FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FRONTEND_DIR=/app/frontend_dist

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
 && pip install --no-cache-dir --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ emergentintegrations

COPY backend/ ./
COPY --from=frontend /fe/dist /app/frontend_dist

RUN useradd -u 10001 -m nova && chown -R nova:nova /app
USER nova

EXPOSE 8001

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
