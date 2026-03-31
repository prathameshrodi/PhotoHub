#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID $WORKER_PID $BEAT_PID
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting Backend..."
cd backend
# Assuming uv is installed and handles the venv
# Redirecting uvicorn output has limits if python buffering is on, but uvicorn logs should go to file via python config
# We redirect stdout/stderr to a startup log just in case of environment failures
uv run uvicorn app.main:app --reload >> ../logs/backend_startup.log 2>&1 &
BACKEND_PID=$!

echo "Backend running on PID $BACKEND_PID"

echo "Starting Frontend..."
cd ../frontend
npm run dev >> ../logs/frontend_startup.log 2>&1 &
FRONTEND_PID=$!

echo "Frontend running on PID $FRONTEND_PID"

echo "Starting Celery Worker..."
cd ../backend
uv run celery -A app.worker.celery_app worker --loglevel=info >> ../logs/worker_startup.log 2>&1 &
WORKER_PID=$!
echo "Worker running on PID $WORKER_PID"

echo "Starting Celery Beat..."
uv run celery -A app.worker.celery_app beat --loglevel=info >> ../logs/beat_startup.log 2>&1 &
BEAT_PID=$!
echo "Beat running on PID $BEAT_PID"

wait
