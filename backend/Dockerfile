# Using Python 3.10 slim as base
FROM python:3.10-slim

# Install system dependencies required for dlib and psycopg2
RUN apt-get update && apt-get install -y build-essential cmake libopenblas-dev liblapack-dev libx11-dev libgtk-3-dev libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv for fast package management
RUN pip install uv

# Copy requirements entirely
COPY requirements.txt .

# Set Full access to /app
RUN chmod -R 777 /app

# Install dependencies (incorporating celery and redis if not already there)
RUN uv pip install --system -r requirements.txt && \
    uv pip install --system celery redis

# Copy the rest of the application
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Command to run the application using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
