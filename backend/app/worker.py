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
    # Celery Beat Schedule
    beat_schedule={
        "scheduled_scan_every_hour": {
            "task": "scan_all_configured_directories_task",
            "schedule": 10*60, # Every DAY
        },
        "background_thumbnail_processing": {
            "task": "process_thumbnail_task",
            "schedule": 60*10, # Every 10 Mins
        },
        "background_location_processing": {
            "task": "process_location_task",
            "schedule": 60*10, # Every 10 Mins
        },
        "background_face_processing": {
            "task": "process_faces_task",
            "schedule": 60*10, # Every 15 Mins
        },
    }
)
