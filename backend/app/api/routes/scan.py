from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import os
import logging
from app.db.models import User
from app.core import security
from app.services import scanner

logger = logging.getLogger("backend")
router = APIRouter()

@router.post("/")
def trigger_scan(background_tasks: BackgroundTasks, current_user: User = Depends(security.get_current_user)):
    photos_dir_env = os.getenv("PHOTOS_DIR")
    if not photos_dir_env:
        logger.error("PHOTOS_DIR not set")
        raise HTTPException(status_code=400, detail="PHOTOS_DIR not configured")
    
    paths = [p.strip() for p in photos_dir_env.split(";") if p.strip()]
    valid_paths = []
    for p in paths:
        if os.path.exists(p):
            valid_paths.append(p)
        else:
            logger.error(f"Directory not found: {p}")
            raise HTTPException(status_code=400, detail=f"Directory not found: {p}")
            
    for p in valid_paths:
        background_tasks.add_task(scanner.scan_directory, p)
        
    return {"status": "Scan started", "directories": valid_paths}
