from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import logging
import os

from app.core import config
from app.db.session import init_db
from app.api.routes import auth, images, people, scan, locations

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


# Mount Routers
app.include_router(auth.router, tags=["auth"])
app.include_router(images.router, prefix="/images", tags=["images"])
app.include_router(people.router, prefix="/people", tags=["people"])
app.include_router(scan.router, prefix="/scan", tags=["scan"])
app.include_router(locations.router, prefix="/locations", tags=["locations"])


# Logging Endpoint (Keep at root for compatibility or move to util)
class LogMessage(BaseModel):
    level: str
    message: str
    context: dict = {}


@app.post("/logs", tags=["utils"])
def log_frontend(log: LogMessage):
    msg = f"{log.message} | Context: {log.context}"
    if log.level.upper() == "ERROR":
        frontend_logger.error(msg)
    elif log.level.upper() == "WARN" or log.level.upper() == "WARNING":
        frontend_logger.warning(msg)
    else:
        frontend_logger.info(msg)
    return {"status": "ok"}
