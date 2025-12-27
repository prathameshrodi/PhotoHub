#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting Backend..."
cd backend
# Assuming uv is installed and handles the venv
# Redirecting uvicorn output has limits if python buffering is on, but uvicorn logs should go to file via python config
# We redirect stdout/stderr to a startup log just in case of environment failures
uv run uvicorn main:app --reload >> ../logs/backend_startup.log 2>&1 &
BACKEND_PID=$!

echo "Backend running on PID $BACKEND_PID"

echo "Starting Frontend..."
cd ../frontend
npm run dev >> ../logs/frontend_startup.log 2>&1 &
FRONTEND_PID=$!

echo "Frontend running on PID $FRONTEND_PID"

wait
