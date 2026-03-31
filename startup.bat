@echo off
echo Starting Photo Viewer...

:: Start Backend
:: Use >> to append to log files
start "Photo Viewer Backend" cmd /k "cd backend && uv run uvicorn app.main:app --reload >> ..\logs\backend_startup.log 2>&1"

:: Start Frontend
start "Photo Viewer Frontend" cmd /k "cd frontend && npm run dev >> ..\logs\frontend_startup.log 2>&1"

:: Start Celery Worker
start "Photo Viewer Worker" cmd /k "cd backend && uv run celery -A app.worker.celery_app worker --loglevel=info -P solo >> ..\logs\worker_startup.log 2>&1"

:: Start Celery Beat
start "Photo Viewer Beat" cmd /k "cd backend && uv run celery -A app.worker.celery_app beat --loglevel=info >> ..\logs\beat_startup.log 2>&1"

echo Servers and workers started in separate windows.
