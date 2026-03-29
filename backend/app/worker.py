import os
from celery import Celery

# Use the environment variables from docker-compose or default to localhost
redis_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "photoviewer_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.services.scanner"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
