#!/bin/bash
# e2e-setup.sh — Start DB + backend + frontend. Keep alive for cleanup trap.
# Works on Windows (Git Bash) and Unix.
set -e

BACKEND_PORT=8080
FRONTEND_PORT=3000
DB_CONTAINER=nalagrow-pg
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"

cleanup() {
  echo ""
  echo "[e2e-setup] Cleaning up..."
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo "[e2e-setup] Frontend stopped"
  fi
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    echo "[e2e-setup] Backend stopped"
  fi
  docker stop "$DB_CONTAINER" 2>/dev/null && echo "[e2e-setup] DB stopped" || true
  echo "[e2e-setup] Done"
}
trap cleanup EXIT INT TERM

# --- PostgreSQL ---
echo "[e2e-setup] Starting PostgreSQL..."
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "[e2e-setup] DB already running"
elif docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  docker start "$DB_CONTAINER"
else
  docker run -d --name "$DB_CONTAINER" \
    -e POSTGRES_USER=nalagrow \
    -e POSTGRES_PASSWORD=nalagrow \
    -e POSTGRES_DB=nalagrow \
    -p 5432:5432 \
    postgres:16-alpine
fi

echo "[e2e-setup] Waiting for DB..."
for i in $(seq 1 30); do
  if docker exec "$DB_CONTAINER" pg_isready -U nalagrow -q 2>/dev/null; then
    echo "[e2e-setup] DB is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then echo "[e2e-setup] ERROR: DB not ready"; exit 1; fi
  sleep 1
done

# --- Backend ---
echo "[e2e-setup] Starting backend..."
cd "$REPO_ROOT/backend"
ALLOWED_ORIGIN="http://localhost:${FRONTEND_PORT}" \
DATABASE_URL="postgres://nalagrow:nalagrow@localhost:5432/nalagrow?sslmode=disable" \
./nala-grow-backend.exe &
BACKEND_PID=$!

echo "[e2e-setup] Waiting for backend..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:${BACKEND_PORT}/health" > /dev/null 2>&1; then
    echo "[e2e-setup] Backend is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then echo "[e2e-setup] ERROR: Backend not ready"; exit 1; fi
  sleep 1
done

# --- Frontend ---
echo "[e2e-setup] Starting frontend..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo "[e2e-setup] Waiting for frontend..."
for i in $(seq 1 60); do
  if curl -s "http://localhost:${FRONTEND_PORT}" > /dev/null 2>&1; then
    echo "[e2e-setup] Frontend is ready"
    break
  fi
  if [ "$i" -eq 60 ]; then echo "[e2e-setup] ERROR: Frontend not ready"; exit 1; fi
  sleep 1
done

echo "[e2e-setup] All services running. Waiting for Cypress to finish..."
# Keep alive — Cypress kills this process when tests finish, triggering cleanup trap
while true; do sleep 5; done
