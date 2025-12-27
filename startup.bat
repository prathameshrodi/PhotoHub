@echo off
echo Starting Photo Viewer...

:: Start Backend
:: Use >> to append to log files
start "Photo Viewer Backend" cmd /k "cd backend && uv run uvicorn main:app --reload >> ..\logs\backend_startup.log 2>&1"

:: Start Frontend
start "Photo Viewer Frontend" cmd /k "cd frontend && npm run dev >> ..\logs\frontend_startup.log 2>&1"

echo Servers started in separate windows.
