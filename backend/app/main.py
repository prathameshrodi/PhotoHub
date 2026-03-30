from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import logging
import os

from app.core import config
from app.db.session import init_db
from app.api.routes import auth, images, people, scan, locations, albums

#
# Setup Logging
logger = logging.getLogger("backend")

# Frontend Logger
frontend_logger = logging.getLogger("frontend")
file_handler = logging.FileHandler(
    os.path.join(config.settings.LOG_DIR, "frontend.log")
)
file_handler.setFormatter(
    logging.Formatter("%(asctime)s - FRONTEND - %(levelname)s - %(message)s")
)
frontend_logger.addHandler(file_handler)
frontend_logger.setLevel(logging.INFO)

app = FastAPI(title=config.settings.PROJECT_NAME)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.services.scanner import start_background_scanner


@app.on_event("startup")
def on_startup():
    init_db()
    # start_background_scanner()

from fastapi import APIRouter

# Create versioned API router
api_v1_router = APIRouter()

# Mount sub-routers to versioned router
api_v1_router.include_router(auth.router, tags=["auth"])
api_v1_router.include_router(images.router, prefix="/images", tags=["images"])
api_v1_router.include_router(people.router, prefix="/people", tags=["people"])
api_v1_router.include_router(scan.router, prefix="/scan", tags=["scan"])
api_v1_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_v1_router.include_router(albums.router, prefix="/albums", tags=["albums"])

# Logging Endpoint under utils
class LogMessage(BaseModel):
    level: str
    message: str
    context: dict = {}

@api_v1_router.post("/logs", tags=["utils"])
def log_frontend(log: LogMessage):
    msg = f"{log.message} | Context: {log.context}"
    if log.level.upper() == "ERROR":
        frontend_logger.error(msg)
    elif log.level.upper() == "WARN" or log.level.upper() == "WARNING":
        frontend_logger.warning(msg)
    else:
        frontend_logger.info(msg)
    return {"status": "ok"}

# Mount the versioned router to the app
app.include_router(api_v1_router, prefix="/api/v1")

